require('dotenv').config();
const redis = require('redis');

/**
 * Deep Clean Redis - Remove ALL Bull queue data
 * Use this when the queue is inconsistent
 */

async function deepCleanRedis() {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.error('❌ REDIS_URL not configured in .env file');
    process.exit(1);
  }

  console.log('🔄 Connecting to Redis...');
  console.log(`📍 Redis URL: ${redisUrl.replace(/:[^:]*@/, ':****@')}`);

  const client = redis.createClient({ url: redisUrl });

  try {
    await client.connect();
    console.log('✅ Connected to Redis\n');

    // Get all Bull queue keys
    const pattern = 'bull:email-notifications:*';
    console.log(`🔍 Searching for keys matching: ${pattern}`);
    
    const keys = await client.keys(pattern);
    console.log(`📊 Found ${keys.length} keys\n`);

    if (keys.length === 0) {
      console.log('✨ No keys to clean!');
      await client.quit();
      process.exit(0);
    }

    // Show sample of keys
    console.log('Sample keys found:');
    keys.slice(0, 10).forEach(key => console.log(`   - ${key}`));
    if (keys.length > 10) {
      console.log(`   ... and ${keys.length - 10} more\n`);
    } else {
      console.log();
    }

    // Delete all keys
    console.log('🗑️  Deleting all Bull queue keys...');
    
    let deleted = 0;
    const batchSize = 100;
    
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);
      await client.del(batch);
      deleted += batch.length;
      console.log(`   Deleted ${deleted}/${keys.length} keys...`);
    }

    console.log(`\n✅ Successfully deleted ${deleted} keys!`);

    // Verify
    const remainingKeys = await client.keys(pattern);
    console.log(`\n📊 Remaining keys: ${remainingKeys.length}`);

    if (remainingKeys.length > 0) {
      console.log('\n⚠️  Some keys remain:');
      remainingKeys.forEach(key => console.log(`   - ${key}`));
    }

    await client.quit();
    console.log('\n✅ Done! Redis connection closed.');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (client.isOpen) {
      await client.quit();
    }
    process.exit(1);
  }
}

// Run the script
deepCleanRedis();
