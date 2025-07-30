#!/usr/bin/env node

require('dotenv').config();
const { initializeFirebase } = require('../src/config/firebase');
const PropertyService = require('../src/services/PropertyService');

// Initialize Firebase
initializeFirebase();

const propertyService = new PropertyService();

// Sample properties for Buea area
const sampleProperties = [
  {
    title: "Modern 2-Bedroom Apartment in Molyko",
    description: "Beautiful modern apartment with great views of Mount Cameroon. Fully furnished with modern amenities.",
    location: "Molyko, Buea",
    propertyType: "apartment",
    price: 75000,
    bedrooms: 2,
    bathrooms: 1,
    amenities: ["wifi", "parking", "generator", "water", "security"],
    agentId: "agent_001",
    agentName: "John Mbah",
    agentPhone: "+237671234567",
    status: "available",
    verified: true,
    images: ["https://via.placeholder.com/400x300?text=Modern+Apartment"]
  },
  {
    title: "Spacious 3-Bedroom House in Great Soppo",
    description: "Large family house with garden and parking space. Perfect for families.",
    location: "Great Soppo, Buea",
    propertyType: "house",
    price: 120000,
    bedrooms: 3,
    bathrooms: 2,
    amenities: ["garden", "parking", "generator", "water", "fence"],
    agentId: "agent_002",
    agentName: "Mary Tabi",
    agentPhone: "+237682345678",
    status: "available",
    verified: true,
    images: ["https://via.placeholder.com/400x300?text=Family+House"]
  },
  {
    title: "Affordable Studio in Mile 16",
    description: "Cozy studio apartment perfect for students or young professionals.",
    location: "Mile 16, Buea",
    propertyType: "studio",
    price: 35000,
    bedrooms: 0,
    bathrooms: 1,
    amenities: ["wifi", "water", "security"],
    agentId: "agent_003",
    agentName: "Peter Ngwa",
    agentPhone: "+237693456789",
    status: "available",
    verified: true,
    images: ["https://via.placeholder.com/400x300?text=Studio+Apartment"]
  },
  {
    title: "Luxury Villa in Bonduma",
    description: "Exclusive villa with swimming pool and beautiful mountain views.",
    location: "Bonduma, Buea",
    propertyType: "villa",
    price: 300000,
    bedrooms: 4,
    bathrooms: 3,
    amenities: ["swimming_pool", "garden", "parking", "generator", "water", "security", "wifi"],
    agentId: "agent_004",
    agentName: "Sarah Fon",
    agentPhone: "+237674567890",
    status: "available",
    verified: true,
    images: ["https://via.placeholder.com/400x300?text=Luxury+Villa"]
  },
  {
    title: "Student-Friendly 1-Bedroom in Molyko",
    description: "Perfect for university students. Close to University of Buea campus.",
    location: "Molyko, Buea",
    propertyType: "apartment",
    price: 45000,
    bedrooms: 1,
    bathrooms: 1,
    amenities: ["wifi", "water", "security", "study_area"],
    agentId: "agent_005",
    agentName: "David Che",
    agentPhone: "+237685678901",
    status: "available",
    verified: true,
    images: ["https://via.placeholder.com/400x300?text=Student+Apartment"]
  },
  {
    title: "Executive 2-Bedroom Duplex in Buea Town",
    description: "Modern duplex in the heart of Buea town. Great for professionals.",
    location: "Buea Town",
    propertyType: "duplex",
    price: 150000,
    bedrooms: 2,
    bathrooms: 2,
    amenities: ["parking", "generator", "water", "security", "wifi", "balcony"],
    agentId: "agent_006",
    agentName: "Grace Moki",
    agentPhone: "+237696789012",
    status: "available",
    verified: true,
    images: ["https://via.placeholder.com/400x300?text=Executive+Duplex"]
  },
  {
    title: "Budget-Friendly Room in Muea",
    description: "Single room with shared facilities. Very affordable for students.",
    location: "Muea, Buea",
    propertyType: "room",
    price: 20000,
    bedrooms: 1,
    bathrooms: 1,
    amenities: ["water", "shared_kitchen"],
    agentId: "agent_007",
    agentName: "Paul Njie",
    agentPhone: "+237687890123",
    status: "available",
    verified: true,
    images: ["https://via.placeholder.com/400x300?text=Budget+Room"]
  },
  {
    title: "Family House with Garden in Bokwango",
    description: "Large house with beautiful garden and mountain views.",
    location: "Bokwango, Buea",
    propertyType: "house",
    price: 90000,
    bedrooms: 3,
    bathrooms: 2,
    amenities: ["garden", "parking", "water", "mountain_view"],
    agentId: "agent_008",
    agentName: "Helen Ashu",
    agentPhone: "+237698901234",
    status: "available",
    verified: true,
    images: ["https://via.placeholder.com/400x300?text=Garden+House"]
  },
  {
    title: "Modern Studio near UB Campus",
    description: "Brand new studio apartment with modern fittings. Walking distance to campus.",
    location: "Molyko, Buea",
    propertyType: "studio",
    price: 40000,
    bedrooms: 0,
    bathrooms: 1,
    amenities: ["wifi", "generator", "water", "security", "modern_fittings"],
    agentId: "agent_009",
    agentName: "James Tiku",
    agentPhone: "+237689012345",
    status: "available",
    verified: true,
    images: ["https://via.placeholder.com/400x300?text=Modern+Studio"]
  },
  {
    title: "Spacious 4-Bedroom House in Clerks Quarters",
    description: "Large family house in quiet residential area.",
    location: "Clerks Quarters, Buea",
    propertyType: "house",
    price: 180000,
    bedrooms: 4,
    bathrooms: 3,
    amenities: ["parking", "garden", "generator", "water", "security", "quiet_area"],
    agentId: "agent_010",
    agentName: "Rose Mbua",
    agentPhone: "+237690123456",
    status: "available",
    verified: true,
    images: ["https://via.placeholder.com/400x300?text=Large+House"]
  }
];

async function seedProperties() {
  console.log('🌱 Starting property seeding...');
  
  let successCount = 0;
  let errorCount = 0;

  for (const propertyData of sampleProperties) {
    try {
      // Add timestamps
      propertyData.createdAt = new Date();
      propertyData.updatedAt = new Date();
      
      const property = await propertyService.createProperty(propertyData);
      console.log(`✅ Created: ${property.title} (ID: ${property.id})`);
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to create: ${propertyData.title}`, error.message);
      errorCount++;
    }
  }

  console.log('\n🎉 Seeding completed!');
  console.log(`✅ Successfully created: ${successCount} properties`);
  console.log(`❌ Failed to create: ${errorCount} properties`);
  console.log(`📊 Total processed: ${sampleProperties.length} properties`);
  
  if (successCount > 0) {
    console.log('\n🏠 Your TenantSphere database now has sample properties!');
    console.log('🌐 Visit http://localhost:3000 to manage properties');
    console.log('📱 Test the WhatsApp bot by searching for properties');
  }
}

// Run seeder
if (require.main === module) {
  seedProperties()
    .then(() => {
      console.log('\n✅ Seeding process completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Seeding process failed:', error);
      process.exit(1);
    });
}

module.exports = { seedProperties, sampleProperties };
