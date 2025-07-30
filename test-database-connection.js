#!/usr/bin/env node

require('dotenv').config();
const { initializeFirebase } = require('./src/config/firebase');
const PropertyService = require('./src/services/PropertyService');

console.log('🔍 Testing Database Connection...\n');

async function testDatabaseConnection() {
  try {
    console.log('1️⃣ Initializing Firebase...');
    initializeFirebase();
    console.log('   ✅ Firebase initialized successfully');

    console.log('2️⃣ Testing PropertyService...');
    const propertyService = new PropertyService();
    console.log('   ✅ PropertyService created');

    console.log('3️⃣ Attempting to retrieve properties...');
    
    try {
      // Test getProperties method
      const properties = await propertyService.getProperties({}, { limit: 10 });
      console.log(`   ✅ Retrieved ${properties.length} properties from database`);
      
      if (properties.length > 0) {
        console.log('\n📋 Sample Properties:');
        properties.slice(0, 3).forEach((property, index) => {
          console.log(`   ${index + 1}. ${property.title || 'Untitled'} - ${property.location || 'No location'} - ${property.price || 'No price'}`);
        });
      } else {
        console.log('   ⚠️  No properties found in database');
      }

    } catch (dbError) {
      console.log('   ❌ Database query failed:', dbError.message);
      
      console.log('\n4️⃣ Testing fallback with mock data...');
      
      // Test if we can create a sample property
      try {
        const sampleProperty = {
          title: 'Test Property',
          description: 'A test property for database connection',
          location: 'Buea',
          price: 50000,
          propertyType: 'apartment',
          bedrooms: 2,
          bathrooms: 1,
          status: 'available'
        };
        
        console.log('   📝 Attempting to create test property...');
        const result = await propertyService.createProperty(sampleProperty);
        console.log('   ✅ Test property created successfully:', result.id);
        
        // Try to retrieve it
        const retrievedProperty = await propertyService.getProperty(result.id);
        console.log('   ✅ Test property retrieved successfully');
        
        // Clean up - delete the test property
        await propertyService.deleteProperty(result.id);
        console.log('   ✅ Test property cleaned up');
        
      } catch (createError) {
        console.log('   ❌ Could not create test property:', createError.message);
      }
    }

    console.log('\n🎉 Database connection test completed!');

  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Check if Firebase credentials are available
console.log('🔧 Checking environment configuration...');
console.log(`   Firebase Project ID: ${process.env.FIREBASE_PROJECT_ID || 'Not set'}`);
console.log(`   Firebase Service Account: ${process.env.FIREBASE_SERVICE_ACCOUNT_PATH ? 'Set' : 'Not set'}`);
console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
console.log('');

// Run the test
testDatabaseConnection();
