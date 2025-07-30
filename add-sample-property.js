#!/usr/bin/env node

const axios = require('axios');

console.log('🏠 Adding Sample Properties to TenantSphere');
console.log('==========================================\n');

// Sample properties to add
const newProperties = [
  {
    title: "Luxury 3-Bedroom Penthouse in Molyko Heights",
    description: "Stunning penthouse with panoramic views of Mount Cameroon. Features modern kitchen, spacious living area, and private balcony. Perfect for executives and families.",
    location: "Molyko Heights, Buea",
    propertyType: "apartment",
    price: 200000,
    bedrooms: 3,
    bathrooms: 2,
    amenities: ["wifi", "parking", "generator", "security", "balcony", "mountain_view", "modern_kitchen"],
    agentId: "agent_011",
    agentName: "Patricia Ndive",
    agentPhone: "+237691234567",
    images: [
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1560449752-8d4b7b8b8b8b?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1560449752-8d4b7b8b8b8c?w=800&h=600&fit=crop"
    ]
  },
  {
    title: "Cozy 1-Bedroom Cottage in Bokwango Village",
    description: "Charming cottage surrounded by lush greenery. Ideal for nature lovers seeking tranquility while staying close to town amenities.",
    location: "Bokwango Village, Buea",
    propertyType: "house",
    price: 65000,
    bedrooms: 1,
    bathrooms: 1,
    amenities: ["garden", "water", "quiet_area", "nature_view", "fresh_air"],
    agentId: "agent_012",
    agentName: "Emmanuel Tabe",
    agentPhone: "+237682345678",
    images: [
      "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1449824913935-59a10b8d2001?w=800&h=600&fit=crop"
    ]
  },
  {
    title: "Modern Student Hostel - 20 Rooms Available",
    description: "Purpose-built student accommodation with individual rooms, shared kitchen, study areas, and 24/7 security. Walking distance to University of Buea.",
    location: "Mile 17, Buea",
    propertyType: "hostel",
    price: 25000,
    bedrooms: 1,
    bathrooms: 1,
    amenities: ["wifi", "security", "study_area", "shared_kitchen", "laundry", "24_7_access"],
    agentId: "agent_013",
    agentName: "Dr. Francis Mbua",
    agentPhone: "+237693456789",
    images: [
      "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1555854877-bab0e564b8d6?w=800&h=600&fit=crop"
    ]
  },
  {
    title: "Executive 4-Bedroom Mansion in Government Residential Area",
    description: "Prestigious mansion in the heart of GRA. Features swimming pool, large compound, servant quarters, and premium security. Perfect for diplomats and executives.",
    location: "GRA, Buea",
    propertyType: "mansion",
    price: 500000,
    bedrooms: 4,
    bathrooms: 4,
    amenities: ["swimming_pool", "parking", "generator", "security", "servant_quarters", "large_compound", "prestigious_location"],
    agentId: "agent_014",
    agentName: "Barrister Jane Fon",
    agentPhone: "+237674567890",
    images: [
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1613490493576-7fde63acd812?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1613490493576-7fde63acd813?w=800&h=600&fit=crop"
    ]
  },
  {
    title: "Affordable 2-Bedroom Flat in New Layout",
    description: "Budget-friendly apartment in developing area. Great for young families and first-time renters. Basic amenities with room for personal touches.",
    location: "New Layout, Buea",
    propertyType: "apartment",
    price: 42000,
    bedrooms: 2,
    bathrooms: 1,
    amenities: ["water", "basic_electricity", "affordable", "developing_area"],
    agentId: "agent_015",
    agentName: "Moses Che",
    agentPhone: "+237685678901",
    images: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop"
    ]
  }
];

async function addProperties() {
  const baseUrl = 'http://localhost:3000';
  let successCount = 0;
  let failCount = 0;

  console.log(`📝 Adding ${newProperties.length} new properties...\n`);

  for (let i = 0; i < newProperties.length; i++) {
    const property = newProperties[i];
    
    try {
      console.log(`${i + 1}. Adding: ${property.title}`);
      console.log(`   📍 Location: ${property.location}`);
      console.log(`   💰 Price: ${formatPrice(property.price)} FCFA/month`);
      console.log(`   🏠 Type: ${property.propertyType}`);
      console.log(`   🖼️ Images: ${property.images.length} photos`);

      const response = await axios.post(`${baseUrl}/api/properties`, property);
      
      if (response.data.success) {
        console.log(`   ✅ Successfully added! ID: ${response.data.data.id}`);
        successCount++;
      } else {
        console.log(`   ❌ Failed: ${response.data.error}`);
        failCount++;
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.response?.data?.error || error.message}`);
      failCount++;
    }
    
    console.log(''); // Empty line for readability
  }

  // Summary
  console.log('='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Successfully added: ${successCount} properties`);
  console.log(`❌ Failed to add: ${failCount} properties`);
  console.log(`📋 Total processed: ${newProperties.length} properties`);
  
  if (successCount > 0) {
    console.log('\n🎉 New properties have been added to TenantSphere!');
    console.log('🌐 Visit http://localhost:3000 to view them in the dashboard');
    console.log('📱 Test the WhatsApp bot to search for the new properties');
  }

  // Test the new properties
  if (successCount > 0) {
    console.log('\n🔍 Testing search for new properties...');
    
    try {
      // Search for penthouse
      const searchResponse = await axios.get(`${baseUrl}/api/properties/search?q=penthouse`);
      if (searchResponse.data.success && searchResponse.data.data.length > 0) {
        console.log(`   ✅ Found ${searchResponse.data.data.length} penthouse(s)`);
      }

      // Search for properties over 400,000
      const luxuryResponse = await axios.get(`${baseUrl}/api/properties/search?minPrice=400000`);
      if (luxuryResponse.data.success) {
        console.log(`   ✅ Found ${luxuryResponse.data.data.length} luxury properties over 400,000 FCFA`);
      }

      // Search for student accommodation
      const studentResponse = await axios.get(`${baseUrl}/api/properties/search?q=student`);
      if (studentResponse.data.success) {
        console.log(`   ✅ Found ${studentResponse.data.data.length} student accommodation(s)`);
      }

    } catch (error) {
      console.log('   ⚠️ Search test failed, but properties were added successfully');
    }
  }

  return successCount > 0;
}

function formatPrice(price) {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Run the script
if (require.main === module) {
  addProperties().then(success => {
    if (success) {
      console.log('\n🚀 Property addition completed successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ No properties were added successfully.');
      process.exit(1);
    }
  }).catch(error => {
    console.error('\n💥 Script failed:', error.message);
    process.exit(1);
  });
}

module.exports = { newProperties, addProperties };
