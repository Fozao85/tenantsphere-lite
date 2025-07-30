#!/usr/bin/env node

const axios = require('axios');

console.log('🚀 Quick Image Display Test');
console.log('===========================\n');

async function quickTest() {
  const baseUrl = 'http://localhost:3000';
  
  try {
    console.log('📝 Adding property with URL images...');
    
    const propertyData = {
      title: "Quick Test Property with Images",
      description: "Testing image display in manage properties",
      location: "Test Location, Buea",
      propertyType: "apartment",
      price: 75000,
      bedrooms: 2,
      bathrooms: 1,
      agentName: "Test Agent",
      agentPhone: "+237600000000",
      images: [
        "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop"
      ]
    };

    const response = await axios.post(`${baseUrl}/api/properties`, propertyData);
    
    if (response.data.success) {
      const property = response.data.data;
      console.log('✅ Property created successfully!');
      console.log(`🆔 ID: ${property.id}`);
      console.log(`📸 Images: ${property.images ? property.images.length : 0}`);
      
      console.log('\n🔍 Checking property retrieval...');
      const getResponse = await axios.get(`${baseUrl}/api/properties/${property.id}`);
      
      if (getResponse.data.success) {
        const retrievedProperty = getResponse.data.data;
        console.log('✅ Property retrieved successfully!');
        console.log(`📸 Retrieved images: ${retrievedProperty.images ? retrievedProperty.images.length : 0}`);
        
        if (retrievedProperty.images && retrievedProperty.images.length > 0) {
          console.log('🖼️  Image URLs:');
          retrievedProperty.images.forEach((img, i) => {
            console.log(`   ${i + 1}. ${img}`);
          });
        }
      }
      
      console.log('\n📋 Checking properties list...');
      const listResponse = await axios.get(`${baseUrl}/api/properties?limit=3`);
      
      if (listResponse.data.success) {
        const properties = listResponse.data.data;
        const testProp = properties.find(p => p.id === property.id);
        
        if (testProp) {
          console.log('✅ Property found in list!');
          console.log(`📸 List images: ${testProp.images ? testProp.images.length : 0}`);
        }
      }
      
      console.log('\n🎉 SUCCESS! Property with images created.');
      console.log('👀 Now go to http://localhost:3000 and click "Manage Properties"');
      console.log('📸 You should see the property with image preview!');
      
      return property.id;
    } else {
      console.log('❌ Failed:', response.data.error);
      return null;
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

// Run the test
quickTest().then(propertyId => {
  if (propertyId) {
    console.log(`\n✅ Test completed! Property ID: ${propertyId}`);
    console.log('🌐 Visit http://localhost:3000 and check "Manage Properties" tab');
  } else {
    console.log('\n❌ Test failed');
  }
});
