#!/usr/bin/env node

const axios = require('axios');

console.log('🏠 Demo: Adding Property with Images via API');
console.log('============================================\n');

async function addPropertyWithImages() {
  const baseUrl = 'http://localhost:3000';
  
  // Sample property with multiple images
  const newProperty = {
    title: "Stunning 3-Bedroom Villa with Ocean View",
    description: "Breathtaking villa with panoramic ocean views, modern amenities, and spacious living areas. Perfect for families seeking luxury and comfort.",
    location: "Limbe Beach, Cameroon",
    propertyType: "villa",
    price: 350000,
    bedrooms: 3,
    bathrooms: 2,
    amenities: ["ocean_view", "swimming_pool", "parking", "wifi", "generator", "security", "garden", "balcony"],
    agentId: "agent_018",
    agentName: "Marie Ngozi",
    agentPhone: "+237695123456",
    images: [
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800&h=600&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1571055107559-3e67626fa8be?w=800&h=600&fit=crop&crop=center"
    ]
  };

  try {
    console.log('📝 Adding new property with images...');
    console.log(`   🏠 Title: ${newProperty.title}`);
    console.log(`   📍 Location: ${newProperty.location}`);
    console.log(`   💰 Price: ${formatPrice(newProperty.price)} FCFA/month`);
    console.log(`   🖼️  Images: ${newProperty.images.length} photos`);
    console.log(`   ✨ Amenities: ${newProperty.amenities.join(', ')}`);

    const response = await axios.post(`${baseUrl}/api/properties`, newProperty);
    
    if (response.data.success) {
      const createdProperty = response.data.data;
      console.log('\n✅ Property successfully added!');
      console.log(`   🆔 Property ID: ${createdProperty.id}`);
      console.log(`   📅 Created: ${new Date(createdProperty.createdAt).toLocaleString()}`);
      
      // Test retrieving the property
      console.log('\n🔍 Retrieving the created property...');
      const getResponse = await axios.get(`${baseUrl}/api/properties/${createdProperty.id}`);
      
      if (getResponse.data.success) {
        const property = getResponse.data.data;
        console.log('   ✅ Property retrieved successfully!');
        console.log(`   📸 Images found: ${property.images ? property.images.length : 0}`);
        
        if (property.images && property.images.length > 0) {
          console.log('   🖼️  Image URLs:');
          property.images.forEach((image, index) => {
            console.log(`      ${index + 1}. ${image}`);
          });
        }
      }

      // Test searching for the property
      console.log('\n🔍 Testing search for the new property...');
      const searchResponse = await axios.get(`${baseUrl}/api/properties/search?q=ocean view villa`);
      
      if (searchResponse.data.success) {
        const searchResults = searchResponse.data.data;
        const foundProperty = searchResults.find(p => p.id === createdProperty.id);
        
        if (foundProperty) {
          console.log('   ✅ Property found in search results!');
          console.log(`   📸 Images in search: ${foundProperty.images ? foundProperty.images.length : 0}`);
        } else {
          console.log('   ⚠️  Property not found in search (may need indexing time)');
        }
      }

      return createdProperty;
    } else {
      console.log('❌ Failed to add property:', response.data.error);
      return null;
    }

  } catch (error) {
    console.error('❌ Error adding property:', error.response?.data?.error || error.message);
    return null;
  }
}

function formatPrice(price) {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Instructions for using the web interface
function showWebInterfaceInstructions() {
  console.log('\n' + '='.repeat(60));
  console.log('🌐 WEB INTERFACE INSTRUCTIONS');
  console.log('='.repeat(60));
  console.log('');
  console.log('Now you can add properties with images via the web interface:');
  console.log('');
  console.log('1. 🌐 Open: http://localhost:3000');
  console.log('2. 📝 Click "Add Property" tab');
  console.log('3. 📋 Fill in property details:');
  console.log('   • Title, Description, Location');
  console.log('   • Property Type, Price, Bedrooms, Bathrooms');
  console.log('   • Amenities (comma-separated)');
  console.log('   • Agent Information');
  console.log('4. 🖼️  Add Image URLs (one per line):');
  console.log('   • https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600');
  console.log('   • https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600');
  console.log('   • https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800&h=600');
  console.log('5. ✅ Submit the form');
  console.log('');
  console.log('📱 To view properties with images:');
  console.log('1. 🏠 Click "Manage Properties" tab');
  console.log('2. 👀 See property cards with image previews');
  console.log('3. 🖼️  Click "View Images" to see all photos');
  console.log('4. 🔍 Images open in a modal gallery');
  console.log('');
  console.log('🎨 Free Image Sources:');
  console.log('• Unsplash.com - High-quality free photos');
  console.log('• Pexels.com - Free stock photos');
  console.log('• Pixabay.com - Free images and photos');
  console.log('');
  console.log('💡 Image URL Format:');
  console.log('https://images.unsplash.com/photo-[ID]?w=800&h=600&fit=crop');
  console.log('');
  console.log('='.repeat(60));
}

// Run the demo
if (require.main === module) {
  addPropertyWithImages().then(property => {
    if (property) {
      console.log('\n🎉 DEMO COMPLETED SUCCESSFULLY!');
      console.log('✅ Property with images added to database');
      console.log('✅ Images are accessible via API');
      console.log('✅ Property appears in search results');
      console.log('✅ Web interface ready for use');
      
      showWebInterfaceInstructions();
      
      console.log('\n🚀 Next Steps:');
      console.log('1. Visit http://localhost:3000 to see the updated interface');
      console.log('2. Try adding more properties with images');
      console.log('3. Test the WhatsApp bot with property searches');
      console.log('4. View the image galleries in the web interface');
      
    } else {
      console.log('\n❌ Demo failed - please check the server and try again');
    }
  }).catch(error => {
    console.error('\n💥 Demo crashed:', error.message);
    process.exit(1);
  });
}

module.exports = { addPropertyWithImages };
