#!/usr/bin/env node

require('dotenv').config();
const { initializeFirebase } = require('./src/config/firebase');
const PropertySearchService = require('./src/services/PropertySearchService');

console.log('🔍 Testing Simple Property Search...\n');

async function testSimpleSearch() {
  try {
    initializeFirebase();
    const searchService = new PropertySearchService();
    
    console.log('1️⃣ Testing studio search...');
    const studios = await searchService.searchProperties({ propertyType: 'studio' });
    console.log(`   ✅ Found ${studios.length} studios`);
    
    console.log('2️⃣ Testing sandpit search...');
    const sandpit = await searchService.searchProperties({ location: 'sandpit' });
    console.log(`   ✅ Found ${sandpit.length} properties in sandpit`);
    
    console.log('3️⃣ Testing no criteria search...');
    const all = await searchService.searchProperties({});
    console.log(`   ✅ Found ${all.length} total properties`);
    
    console.log('\n🎉 Simple search test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSimpleSearch();
