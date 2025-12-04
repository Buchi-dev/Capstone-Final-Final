/**
 * MongoDB Migration Script
 * 
 * Purpose: Add sensor validity flags to existing sensor readings
 * Date: December 4, 2025
 * Related: BUG FIX #2 - Sensor Validity Flags
 * 
 * This migration adds pH_valid, tds_valid, and turbidity_valid fields
 * to all existing sensor reading documents, defaulting to true.
 * 
 * IMPORTANT: Run this BEFORE deploying the updated server code.
 */

// MongoDB Shell Commands
// Run these commands in MongoDB shell or MongoDB Compass

// 1. Check how many documents need migration
db.sensorReadings.countDocuments({ pH_valid: { $exists: false } });

// 2. Add validity flags to all existing records (default to true)
db.sensorReadings.updateMany(
  { pH_valid: { $exists: false } },
  { 
    $set: { 
      pH_valid: true, 
      tds_valid: true, 
      turbidity_valid: true 
    } 
  }
);

// 3. Verify migration completed successfully
db.sensorReadings.countDocuments({ 
  pH_valid: { $exists: true },
  tds_valid: { $exists: true },
  turbidity_valid: { $exists: true }
});

// 4. Sample check - view a few migrated documents
db.sensorReadings.find().limit(3).pretty();

// Expected Output:
// {
//   _id: ObjectId("..."),
//   deviceId: "arduino_r4_AABBCCDDEEFF",
//   pH: 7.2,
//   tds: 450,
//   turbidity: 12.5,
//   pH_valid: true,        // ✅ ADDED
//   tds_valid: true,       // ✅ ADDED
//   turbidity_valid: true, // ✅ ADDED
//   timestamp: ISODate("2025-12-04T10:30:00.000Z"),
//   createdAt: ISODate("2025-12-04T10:30:01.123Z")
// }

// ═══════════════════════════════════════════════════════════════════════════
// Optional: Rollback Migration (if needed)
// ═══════════════════════════════════════════════════════════════════════════

// Remove validity flags from all documents
db.sensorReadings.updateMany(
  {},
  { 
    $unset: { 
      pH_valid: "", 
      tds_valid: "", 
      turbidity_valid: "" 
    } 
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Node.js Migration Script (Alternative - if you prefer programmatic approach)
// ═══════════════════════════════════════════════════════════════════════════

/*
import mongoose from 'mongoose';

async function migrateSensorReadings() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/puretrack');
    
    console.log('✅ Connected to MongoDB');
    
    // Count documents needing migration
    const needsMigration = await mongoose.connection.db
      .collection('sensorReadings')
      .countDocuments({ pH_valid: { $exists: false } });
    
    console.log(`📊 Documents needing migration: ${needsMigration}`);
    
    if (needsMigration === 0) {
      console.log('✅ No migration needed - all documents already have validity flags');
      process.exit(0);
    }
    
    // Perform migration
    const result = await mongoose.connection.db
      .collection('sensorReadings')
      .updateMany(
        { pH_valid: { $exists: false } },
        { 
          $set: { 
            pH_valid: true, 
            tds_valid: true, 
            turbidity_valid: true 
          } 
        }
      );
    
    console.log(`✅ Migration completed: ${result.modifiedCount} documents updated`);
    
    // Verify migration
    const hasValidityFlags = await mongoose.connection.db
      .collection('sensorReadings')
      .countDocuments({ 
        pH_valid: { $exists: true },
        tds_valid: { $exists: true },
        turbidity_valid: { $exists: true }
      });
    
    console.log(`✅ Verification: ${hasValidityFlags} documents now have validity flags`);
    
    // Sample check
    const sample = await mongoose.connection.db
      .collection('sensorReadings')
      .find()
      .limit(3)
      .toArray();
    
    console.log('📋 Sample migrated documents:');
    console.log(JSON.stringify(sample, null, 2));
    
    await mongoose.disconnect();
    console.log('✅ Migration complete - database disconnected');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateSensorReadings();
*/

// ═══════════════════════════════════════════════════════════════════════════
// Migration Checklist
// ═══════════════════════════════════════════════════════════════════════════

/*
Pre-Migration:
[ ] Backup production database
[ ] Test migration on staging database first
[ ] Verify backup can be restored

Migration:
[ ] Run count query to see how many documents need migration
[ ] Run updateMany to add validity flags
[ ] Verify count matches expected number
[ ] Check sample documents to confirm fields added

Post-Migration:
[ ] Deploy updated server code
[ ] Monitor logs for validity flag warnings
[ ] Verify new sensor readings include validity flags
[ ] Check analytics queries still work correctly

Rollback (if needed):
[ ] Stop server
[ ] Run rollback migration (remove validity flags)
[ ] Restore from backup if necessary
[ ] Deploy previous server version
*/
