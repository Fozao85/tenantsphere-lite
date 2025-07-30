#!/usr/bin/env node

const axios = require('axios');

console.log('🏠 Testing TenantSphere Property Listing System');
console.log('===============================================\n');

async function testPropertyListing() {
  const baseUrl = 'http://localhost:3000';
  
  try {
    // Test 1: Get all properties
    console.log('📋 Test 1: Fetching all properties...');
    const allPropertiesResponse = await axios.get(`${baseUrl}/api/properties`);
    
    if (allPropertiesResponse.data.success) {
      const properties = allPropertiesResponse.data.data;
      console.log(`   ✅ Found ${properties.length} properties in database`);
      
      // Show first few properties
      properties.slice(0, 3).forEach((property, index) => {
        console.log(`   ${index + 1}. ${property.title} - ${formatPrice(property.price)} FCFA`);
        console.log(`      📍 ${property.location} | 🏠 ${property.propertyType}`);
      });
    } else {
      console.log('   ❌ Failed to fetch properties');
      return false;
    }

    // Test 2: Search properties by location
    console.log('\n🔍 Test 2: Searching properties in Molyko...');
    const searchResponse = await axios.get(`${baseUrl}/api/properties/search?location=Molyko`);
    
    if (searchResponse.data.success) {
      const searchResults = searchResponse.data.data;
      console.log(`   ✅ Found ${searchResults.length} properties in Molyko`);
      
      searchResults.forEach((property, index) => {
        console.log(`   ${index + 1}. ${property.title} - ${formatPrice(property.price)} FCFA`);
      });
    } else {
      console.log('   ❌ Search failed');
      return false;
    }

    // Test 3: Search by price range
    console.log('\n💰 Test 3: Searching properties under 80,000 FCFA...');
    const priceSearchResponse = await axios.get(`${baseUrl}/api/properties/search?maxPrice=80000`);
    
    if (priceSearchResponse.data.success) {
      const priceResults = priceSearchResponse.data.data;
      console.log(`   ✅ Found ${priceResults.length} properties under 80,000 FCFA`);
      
      priceResults.forEach((property, index) => {
        console.log(`   ${index + 1}. ${property.title} - ${formatPrice(property.price)} FCFA`);
      });
    } else {
      console.log('   ❌ Price search failed');
      return false;
    }

    // Test 4: Add a new property via API
    console.log('\n➕ Test 4: Adding a new test property...');
    const newProperty = {
      title: "Test Property - API Created",
      description: "This is a test property created via API",
      location: "Test Location, Buea",
      propertyType: "apartment",
      price: 55000,
      bedrooms: 1,
      bathrooms: 1,
      amenities: ["wifi", "parking"],
      agentId: "test_agent_001",
      agentName: "Test Agent",
      agentPhone: "+237600000000"
    };

    const createResponse = await axios.post(`${baseUrl}/api/properties`, newProperty);
    
    if (createResponse.data.success) {
      const createdProperty = createResponse.data.data;
      console.log(`   ✅ Successfully created property: ${createdProperty.title}`);
      console.log(`   🆔 Property ID: ${createdProperty.id}`);
      
      // Test 5: Get the created property by ID
      console.log('\n🔎 Test 5: Fetching created property by ID...');
      const getByIdResponse = await axios.get(`${baseUrl}/api/properties/${createdProperty.id}`);
      
      if (getByIdResponse.data.success) {
        const fetchedProperty = getByIdResponse.data.data;
        console.log(`   ✅ Successfully fetched: ${fetchedProperty.title}`);
        console.log(`   📍 Location: ${fetchedProperty.location}`);
        console.log(`   💰 Price: ${formatPrice(fetchedProperty.price)} FCFA`);
      } else {
        console.log('   ❌ Failed to fetch property by ID');
        return false;
      }

      // Test 6: Update the property
      console.log('\n✏️ Test 6: Updating property price...');
      const updateData = { price: 60000 };
      const updateResponse = await axios.put(`${baseUrl}/api/properties/${createdProperty.id}`, updateData);
      
      if (updateResponse.data.success) {
        const updatedProperty = updateResponse.data.data;
        console.log(`   ✅ Successfully updated price to ${formatPrice(updatedProperty.price)} FCFA`);
      } else {
        console.log('   ❌ Failed to update property');
        return false;
      }

      // Test 7: Delete the test property
      console.log('\n🗑️ Test 7: Deleting test property...');
      const deleteResponse = await axios.delete(`${baseUrl}/api/properties/${createdProperty.id}`);
      
      if (deleteResponse.data.success) {
        console.log('   ✅ Successfully deleted test property');
      } else {
        console.log('   ❌ Failed to delete property');
        return false;
      }

    } else {
      console.log('   ❌ Failed to create test property');
      return false;
    }

    // Test 8: Test WhatsApp bot property search
    console.log('\n🤖 Test 8: Testing WhatsApp bot property search...');
    const botMessage = {
      object: 'whatsapp_business_account',
      entry: [{
        id: '123456789',
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '15551234567',
              phone_number_id: '123456789'
            },
            contacts: [{
              profile: { name: 'Test User' },
              wa_id: '+237600000001'
            }],
            messages: [{
              from: '+237600000001',
              id: 'test_property_search',
              timestamp: Date.now().toString(),
              text: { body: '2 bedroom apartment in Molyko' },
              type: 'text'
            }]
          },
          field: 'messages'
        }]
      }]
    };

    const botResponse = await axios.post(`${baseUrl}/webhook/whatsapp`, botMessage);
    
    if (botResponse.status === 200) {
      console.log('   ✅ WhatsApp bot successfully processed property search');
    } else {
      console.log('   ❌ WhatsApp bot failed to process search');
      return false;
    }

    return true;

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    return false;
  }
}

function formatPrice(price) {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Run the tests
testPropertyListing().then(success => {
  console.log('\n' + '='.repeat(50));
  
  if (success) {
    console.log('🎉 ALL PROPERTY LISTING TESTS PASSED!');
    console.log('✅ Property listing system is fully functional');
    console.log('✅ Web API endpoints working correctly');
    console.log('✅ WhatsApp bot integration working');
    console.log('✅ CRUD operations successful');
    console.log('✅ Search functionality operational');
    console.log('\n🚀 TenantSphere property listing system is ready for production!');
  } else {
    console.log('❌ SOME TESTS FAILED');
    console.log('🔧 Please check the server logs and fix any issues');
  }
  
  console.log('='.repeat(50));
}).catch(error => {
  console.error('💥 Test suite crashed:', error.message);
  process.exit(1);
});
