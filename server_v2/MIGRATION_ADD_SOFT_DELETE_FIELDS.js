/**
 * MongoDB Migration Script
 * Adds soft delete fields to existing collections
 * 
 * Run with: node MIGRATION_ADD_SOFT_DELETE_FIELDS.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/water-quality-monitoring';

async function migrate() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    console.log('\n📝 Adding soft delete fields to devices...');
    const devicesResult = await db.collection('devices').updateMany(
      { isDeleted: { $exists: false } },
      {
        $set: {
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
          scheduledPermanentDeletionAt: null,
        },
      }
    );
    console.log(`✅ Updated ${devicesResult.modifiedCount} devices`);

    console.log('\n📝 Adding soft delete fields to alerts...');
    const alertsResult = await db.collection('alerts').updateMany(
      { isDeleted: { $exists: false } },
      {
        $set: {
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
          scheduledPermanentDeletionAt: null,
        },
      }
    );
    console.log(`✅ Updated ${alertsResult.modifiedCount} alerts`);

    console.log('\n📝 Adding soft delete fields to sensor readings...');
    const readingsResult = await db.collection('sensor_readings').updateMany(
      { isDeleted: { $exists: false } },
      {
        $set: {
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
          scheduledPermanentDeletionAt: null,
        },
      }
    );
    console.log(`✅ Updated ${readingsResult.modifiedCount} sensor readings`);

    console.log('\n📊 Migration Summary:');
    console.log(`  - Devices:         ${devicesResult.modifiedCount} updated`);
    console.log(`  - Alerts:          ${alertsResult.modifiedCount} updated`);
    console.log(`  - Sensor Readings: ${readingsResult.modifiedCount} updated`);
    console.log(`  - Total:           ${devicesResult.modifiedCount + alertsResult.modifiedCount + readingsResult.modifiedCount} documents`);

    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run migration
migrate();
