/**
 * Quick Test Script - Verify API Response Format
 * Run with: node test-api-response.js
 */

const axios = require('axios');

async function testAPI() {
  const baseURL = 'http://localhost:5000/api/v1';
  
  console.log('🧪 Testing Device API Response Format\n');
  console.log('━'.repeat(80));
  
  try {
    console.log('\n📡 Fetching devices from:', `${baseURL}/devices`);
    const response = await axios.get(`${baseURL}/devices`);
    
    console.log('\n✅ Response Status:', response.status);
    console.log('✅ Response Success:', response.data.success);
    console.log('✅ Total Devices:', response.data.data?.length || 0);
    
    if (response.data.data && response.data.data.length > 0) {
      const device = response.data.data[0];
      
      console.log('\n📱 First Device Details:');
      console.log('   Device ID:', device.deviceId);
      console.log('   Name:', device.name);
      console.log('   Status:', device.status);
      console.log('   Has latestReading:', !!device.latestReading);
      
      if (device.latestReading) {
        console.log('\n📊 Latest Reading:');
        console.log('   Structure:', Object.keys(device.latestReading).join(', '));
        console.log('   Raw Data:', JSON.stringify(device.latestReading, null, 2));
        
        // Check field names
        console.log('\n🔍 Field Name Analysis:');
        console.log('   Has "ph" (lowercase):', 'ph' in device.latestReading);
        console.log('   Has "pH" (capital H):', 'pH' in device.latestReading);
        console.log('   Has "tds":', 'tds' in device.latestReading);
        console.log('   Has "turbidity":', 'turbidity' in device.latestReading);
        console.log('   Has "timestamp":', 'timestamp' in device.latestReading);
        
        // Check data types
        console.log('\n📐 Data Types:');
        console.log('   ph type:', typeof device.latestReading.ph);
        console.log('   tds type:', typeof device.latestReading.tds);
        console.log('   turbidity type:', typeof device.latestReading.turbidity);
        console.log('   timestamp type:', typeof device.latestReading.timestamp);
        
        // Validate frontend condition
        const hasValidPh = typeof device.latestReading.ph === 'number';
        const hasValidTds = typeof device.latestReading.tds === 'number';
        const hasValidTurbidity = typeof device.latestReading.turbidity === 'number';
        
        console.log('\n✅ Frontend Validation Check:');
        console.log('   latestReading exists:', !!device.latestReading);
        console.log('   ph is number:', hasValidPh);
        console.log('   tds is number:', hasValidTds);
        console.log('   turbidity is number:', hasValidTurbidity);
        console.log('   ALL CONDITIONS MET:', device.latestReading && hasValidPh && hasValidTds && hasValidTurbidity);
        
        if (!(device.latestReading && hasValidPh && hasValidTds && hasValidTurbidity)) {
          console.log('\n❌ PROBLEM IDENTIFIED: Frontend condition would FAIL');
          console.log('   This means "No sensor data available" would be shown');
        } else {
          console.log('\n✅ Frontend condition would PASS - data should display');
        }
      } else {
        console.log('\n❌ PROBLEM: latestReading is null/undefined');
        console.log('   This is why "No sensor data available" appears');
      }
      
      console.log('\n📄 Full Device Object:');
      console.log(JSON.stringify(device, null, 2));
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  Server is not running!');
      console.error('   Please start the server first: npm start');
    }
  }
  
  console.log('\n' + '━'.repeat(80));
}

testAPI();
