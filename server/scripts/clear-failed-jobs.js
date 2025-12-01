require('dotenv').config();
const Queue = require('bull');

/**
 * Script to clear failed email jobs from Redis
 * Run with: node scripts/clear-failed-jobs.js
 */

async function clearFailedJobs() {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.error('❌ REDIS_URL not configured in .env file');
    process.exit(1);
  }

  console.log('🔄 Connecting to Redis...');
  console.log(`📍 Redis URL: ${redisUrl.replace(/:[^:]*@/, ':****@')}`); // Hide password

  let emailQueue;

  try {
    // Create queue connection
    emailQueue = new Queue('email-notifications', redisUrl);

    console.log('✅ Connected to Redis queue\n');

    // Get current stats
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      emailQueue.getWaitingCount(),
      emailQueue.getActiveCount(),
      emailQueue.getCompletedCount(),
      emailQueue.getFailedCount(),
      emailQueue.getDelayedCount(),
    ]);

    console.log('📊 Current Queue Statistics:');
    console.log(`   Waiting:   ${waiting}`);
    console.log(`   Active:    ${active}`);
    console.log(`   Completed: ${completed}`);
    console.log(`   Failed:    ${failed} ⚠️`);
    console.log(`   Delayed:   ${delayed}\n`);

    if (failed === 0) {
      console.log('✨ No failed jobs to clear!');
      await emailQueue.close();
      process.exit(0);
    }

    // Get failed jobs details
    console.log('🔍 Failed Jobs Details:');
    const failedJobs = await emailQueue.getFailed();
    
    failedJobs.forEach((job, index) => {
      console.log(`\n   Job ${index + 1}:`);
      console.log(`   - ID: ${job.id}`);
      console.log(`   - Recipient: ${job.data?.recipient?.email || 'Unknown'}`);
      console.log(`   - Alert ID: ${job.data?.data?.alert?.alertId || 'N/A'}`);
      console.log(`   - Attempts: ${job.attemptsMade}`);
      console.log(`   - Failed Reason: ${job.failedReason || 'Unknown'}`);
    });

    console.log('\n❓ Do you want to:');
    console.log('   1. Remove all failed jobs (recommended)');
    console.log('   2. Retry all failed jobs');
    console.log('   3. Exit without changes');

    // For non-interactive script, auto-remove
    console.log('\n🗑️  Removing all failed jobs...');
    
    // Method 1: Clean failed jobs older than 0ms (removes all)
    const removed1 = await emailQueue.clean(0, 'failed');
    console.log(`   Method 1 (clean): Processed ${removed1.length} jobs`);
    
    // Method 2: Get and manually remove each failed job
    const failedJobsToRemove = await emailQueue.getFailed(0, -1);
    let manuallyRemoved = 0;
    
    for (const job of failedJobsToRemove) {
      try {
        await job.remove();
        manuallyRemoved++;
        console.log(`   ✓ Removed job ${job.id}`);
      } catch (err) {
        console.log(`   ✗ Failed to remove job ${job.id}: ${err.message}`);
      }
    }
    
    console.log(`   Method 2 (manual): Removed ${manuallyRemoved} jobs`);
    
    // Method 3: Clean all job types to be thorough
    console.log('\n🧹 Deep cleaning all job states...');
    await emailQueue.clean(0, 'completed');
    await emailQueue.clean(0, 'wait');
    await emailQueue.clean(0, 'active');
    await emailQueue.clean(0, 'delayed');
    await emailQueue.clean(0, 'paused');
    
    console.log(`✅ Successfully cleaned queue!`);

    // Verify
    const [newWaiting, newActive, newCompleted, newFailed, newDelayed] = await Promise.all([
      emailQueue.getWaitingCount(),
      emailQueue.getActiveCount(),
      emailQueue.getCompletedCount(),
      emailQueue.getFailedCount(),
      emailQueue.getDelayedCount(),
    ]);
    
    console.log(`\n📊 Updated Queue Statistics:`);
    console.log(`   Waiting:   ${newWaiting}`);
    console.log(`   Active:    ${newActive}`);
    console.log(`   Completed: ${newCompleted}`);
    console.log(`   Failed:    ${newFailed}`);
    console.log(`   Delayed:   ${newDelayed}`);

    await emailQueue.close();
    console.log('\n✅ Done! Queue connection closed.');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (emailQueue) {
      await emailQueue.close();
    }
    process.exit(1);
  }
}

// Run the script
clearFailedJobs();
