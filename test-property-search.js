#!/usr/bin/env node

require('dotenv').config();
const { initializeFirebase } = require('./src/config/firebase');
const PropertySearchService = require('./src/services/PropertySearchService');

console.log('🔍 Testing Property Search Functionality...\n');

async function testPropertySearch() {
  try {
    console.log('1️⃣ Initializing Firebase...');
    initializeFirebase();
    console.log('   ✅ Firebase initialized successfully');

    console.log('2️⃣ Creating PropertySearchService...');
    const searchService = new PropertySearchService();
    console.log('   ✅ PropertySearchService created');
    console.log(`   📊 Database available: ${searchService.isAvailable ? 'Yes (Firestore)' : 'No (Mock)'}`);

    // Test different search scenarios
    const testCases = [
      {
        name: 'Search for apartments',
        criteria: { propertyType: 'apartment' }
      },
      {
        name: 'Search for houses',
        criteria: { propertyType: 'house' }
      },
      {
        name: 'Search for studios',
        criteria: { propertyType: 'studio' }
      },
      {
        name: 'Search in sandpit',
        criteria: { location: 'sandpit' }
      },
      {
        name: 'Search in molyko',
        criteria: { location: 'molyko' }
      },
      {
        name: 'Search with price range',
        criteria: { priceRange: { min: 400000, max: 600000 } }
      },
      {
        name: 'Search all properties (no criteria)',
        criteria: {}
      }
    ];

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`\n${i + 3}️⃣ ${testCase.name}...`);
      
      try {
        const results = await searchService.searchProperties(testCase.criteria);
        console.log(`   ✅ Found ${results.length} properties`);
        
        if (results.length > 0) {
          console.log('   📋 Sample results:');
          results.slice(0, 3).forEach((property, index) => {
            console.log(`      ${index + 1}. ${property.title || 'Untitled'} - ${property.location || 'No location'} - ${property.propertyType || 'No type'} - ${property.price || 'No price'}`);
          });
        } else {
          console.log('   ⚠️  No properties found for this criteria');
        }
        
      } catch (searchError) {
        console.log(`   ❌ Search failed: ${searchError.message}`);
      }
    }

    console.log('\n🎉 Property search test completed!');

  } catch (error) {
    console.error('❌ Property search test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testPropertySearch();
