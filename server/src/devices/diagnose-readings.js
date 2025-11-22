/**
 * Diagnostic Script - Check Device and Sensor Reading Data
 * 
 * This script helps diagnose why sensor readings aren't showing up in the UI
 * Run with: node src/devices/diagnose-readings.js
 */

const mongoose = require('mongoose');
const { Device, SensorReading } = require('./device.Model');
require('dotenv').config();

async function diagnose() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MongoDB URI not found in environment variables');
      console.error('   Please set MONGO_URI or MONGODB_URI in .env file');
      return;
    }
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Get all devices
    console.log('📋 Fetching all devices...');
    const devices = await Device.find().limit(10);
    console.log(`Found ${devices.length} devices\n`);

    // Check each device for sensor readings
    for (const device of devices) {
      console.log('━'.repeat(80));
      console.log(`\n📱 Device: ${device.name || 'Unnamed'}`);
      console.log(`   ID (MongoDB _id): ${device._id}`);
      console.log(`   Device ID: "${device.deviceId}"`);
      console.log(`   Status: ${device.status}`);
      console.log(`   Registration: ${device.registrationStatus}`);
      console.log(`   Last Seen: ${device.lastSeen}\n`);

      // Check for sensor readings with exact match
      const exactReadings = await SensorReading.find({ deviceId: device.deviceId })
        .sort({ timestamp: -1 })
        .limit(5);
      
      console.log(`   📊 Sensor Readings (exact match): ${exactReadings.length} found`);
      
      if (exactReadings.length > 0) {
        console.log(`   Latest Reading:`);
        const latest = exactReadings[0];
        console.log(`     - pH: ${latest.pH}`);
        console.log(`     - TDS: ${latest.tds} ppm`);
        console.log(`     - Turbidity: ${latest.turbidity} NTU`);
        console.log(`     - Timestamp: ${latest.timestamp}`);
      } else {
        // Try to find with trimmed deviceId
        const trimmedReadings = await SensorReading.aggregate([
          {
            $match: {
              $expr: {
                $eq: [
                  { $trim: { input: { $toString: '$deviceId' } } },
                  device.deviceId.trim()
                ]
              }
            }
          },
          { $limit: 5 },
          { $sort: { timestamp: -1 } }
        ]);
        
        console.log(`   📊 Sensor Readings (trimmed match): ${trimmedReadings.length} found`);
        
        if (trimmedReadings.length > 0) {
          console.log(`   ⚠️  WARNING: Readings found with trimmed match!`);
          console.log(`   This indicates whitespace issues in deviceId fields`);
          const latest = trimmedReadings[0];
          console.log(`     - Stored deviceId: "${latest.deviceId}"`);
          console.log(`     - Device deviceId: "${device.deviceId}"`);
        }
      }
      
      // Check for case-insensitive match
      const caseInsensitiveReadings = await SensorReading.find({
        deviceId: new RegExp(`^${device.deviceId}$`, 'i')
      }).limit(1);
      
      if (caseInsensitiveReadings.length > 0 && exactReadings.length === 0) {
        console.log(`   ⚠️  WARNING: Readings found with case-insensitive match!`);
        console.log(`   This indicates case mismatch between device and readings`);
        console.log(`     - Reading deviceId: "${caseInsensitiveReadings[0].deviceId}"`);
        console.log(`     - Device deviceId: "${device.deviceId}"`);
      }
      
      console.log();
    }

    console.log('━'.repeat(80));
    console.log('\n🔍 Checking for orphaned sensor readings...');
    
    // Find all unique deviceIds in sensor readings
    const readingDeviceIds = await SensorReading.distinct('deviceId');
    console.log(`Found ${readingDeviceIds.length} unique deviceIds in sensor readings:`);
    
    for (const readingDeviceId of readingDeviceIds) {
      const device = await Device.findOne({ deviceId: readingDeviceId });
      const count = await SensorReading.countDocuments({ deviceId: readingDeviceId });
      
      if (!device) {
        console.log(`   ❌ Orphaned: "${readingDeviceId}" (${count} readings, no matching device)`);
      } else {
        console.log(`   ✅ Matched: "${readingDeviceId}" (${count} readings)`);
      }
    }

    console.log('\n━'.repeat(80));
    console.log('\n📊 Summary Statistics:');
    const totalDevices = await Device.countDocuments();
    const totalReadings = await SensorReading.countDocuments();
    const onlineDevices = await Device.countDocuments({ status: 'online' });
    const registeredDevices = await Device.countDocuments({ registrationStatus: 'registered' });
    
    console.log(`   Total Devices: ${totalDevices}`);
    console.log(`   Total Sensor Readings: ${totalReadings}`);
    console.log(`   Online Devices: ${onlineDevices}`);
    console.log(`   Registered Devices: ${registeredDevices}`);
    console.log();

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run diagnostic
diagnose();
