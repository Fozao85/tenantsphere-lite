#!/usr/bin/env node

require('dotenv').config();
const { initializeFirebase } = require('./src/config/firebase');
const PropertyService = require('./src/services/PropertyService');

console.log('🔍 Testing Raw Property Data Structure...\n');

async function testRawProperties() {
  try {
    console.log('1️⃣ Initializing Firebase...');
    initializeFirebase();
    console.log('   ✅ Firebase initialized successfully');

    console.log('2️⃣ Creating PropertyService...');
    const propertyService = new PropertyService();
    console.log('   ✅ PropertyService created');

    console.log('3️⃣ Retrieving raw properties...');
    const properties = await propertyService.getProperties({}, { limit: 5 });
    console.log(`   ✅ Retrieved ${properties.length} properties`);

    if (properties.length > 0) {
      console.log('\n📋 Raw Property Data Structure:');
      properties.forEach((property, index) => {
        console.log(`\n   Property ${index + 1}:`);
        console.log(`   ID: ${property.id}`);
        console.log(`   Raw Data:`, JSON.stringify(property, null, 4));
      });
    } else {
      console.log('   ⚠️  No properties found');
    }

    console.log('\n🎉 Raw property data test completed!');

  } catch (error) {
    console.error('❌ Raw property data test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testRawProperties();
