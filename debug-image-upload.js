#!/usr/bin/env node

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

console.log('🔍 Debugging Image Upload Issue');
console.log('================================\n');

async function debugImageUpload() {
  const baseUrl = 'http://localhost:3000';
  
  try {
    // Step 1: Create a property first
    console.log('🏠 Step 1: Creating a test property...');
    
    const propertyData = {
      title: "Debug Test Property",
      description: "Testing image upload functionality",
      location: "Debug Location, Buea",
      propertyType: "apartment",
      price: 75000,
      bedrooms: 2,
      bathrooms: 1,
      agentName: "Debug Agent",
      agentPhone: "+237600000000"
    };

    const propertyResponse = await axios.post(`${baseUrl}/api/properties`, propertyData);
    
    if (!propertyResponse.data.success) {
      console.log('❌ Failed to create property:', propertyResponse.data.error);
      return false;
    }

    const propertyId = propertyResponse.data.data.id;
    console.log(`   ✅ Property created: ${propertyId}`);
    console.log(`   📝 Title: ${propertyResponse.data.data.title}`);

    // Step 2: Check property before image upload
    console.log('\n📋 Step 2: Checking property before image upload...');
    
    const beforeResponse = await axios.get(`${baseUrl}/api/properties/${propertyId}`);
    
    if (beforeResponse.data.success) {
      const property = beforeResponse.data.data;
      console.log(`   ✅ Property retrieved`);
      console.log(`   📸 Images before upload: ${property.images ? property.images.length : 0}`);
      console.log(`   🔍 Images data:`, property.images);
    }

    // Step 3: Create a simple test image
    console.log('\n📤 Step 3: Creating and uploading test image...');
    
    // Create a simple 100x100 red square PNG
    const createSimpleImage = () => {
      const width = 100;
      const height = 100;
      const channels = 3; // RGB
      const data = Buffer.alloc(width * height * channels);
      
      // Fill with red color
      for (let i = 0; i < data.length; i += channels) {
        data[i] = 255;     // Red
        data[i + 1] = 0;   // Green
        data[i + 2] = 0;   // Blue
      }
      
      return data;
    };

    // For now, let's create a minimal PNG file
    const pngHeader = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
      0x49, 0x48, 0x44, 0x52, // IHDR
      0x00, 0x00, 0x00, 0x01, // Width: 1
      0x00, 0x00, 0x00, 0x01, // Height: 1
      0x08, 0x02, 0x00, 0x00, 0x00, // Bit depth, color type, compression, filter, interlace
      0x90, 0x77, 0x53, 0xDE, // CRC
      0x00, 0x00, 0x00, 0x0C, // IDAT chunk length
      0x49, 0x44, 0x41, 0x54, // IDAT
      0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01,
      0xE2, 0x21, 0xBC, 0x33, // CRC
      0x00, 0x00, 0x00, 0x00, // IEND chunk length
      0x49, 0x45, 0x4E, 0x44, // IEND
      0xAE, 0x42, 0x60, 0x82  // CRC
    ]);

    const tempImagePath = path.join(__dirname, 'debug_test_image.png');
    fs.writeFileSync(tempImagePath, pngHeader);
    console.log(`   📁 Created test image: ${tempImagePath}`);

    try {
      // Upload the image
      const formData = new FormData();
      formData.append('images', fs.createReadStream(tempImagePath), {
        filename: 'debug_test.png',
        contentType: 'image/png'
      });

      console.log(`   📤 Uploading to: ${baseUrl}/api/images/properties/${propertyId}/upload`);

      const uploadResponse = await axios.post(
        `${baseUrl}/api/images/properties/${propertyId}/upload`,
        formData,
        {
          headers: {
            ...formData.getHeaders()
          }
        }
      );

      console.log(`   📊 Upload response status: ${uploadResponse.status}`);
      console.log(`   📝 Upload response:`, uploadResponse.data);

      if (uploadResponse.data.success) {
        console.log('   ✅ Image upload successful!');
        console.log(`   📸 Uploaded images: ${uploadResponse.data.data.uploadedImages.length}`);
        console.log(`   📊 Total images: ${uploadResponse.data.data.totalImages}`);
      } else {
        console.log('   ❌ Image upload failed:', uploadResponse.data.error);
      }

    } catch (uploadError) {
      console.log('   ❌ Upload request failed:', uploadError.message);
      if (uploadError.response) {
        console.log('   📝 Error response:', uploadError.response.data);
        console.log('   📊 Error status:', uploadError.response.status);
      }
    } finally {
      // Clean up temp file
      try {
        fs.unlinkSync(tempImagePath);
        console.log('   🧹 Cleaned up temp image file');
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }

    // Step 4: Check property after image upload
    console.log('\n🔍 Step 4: Checking property after image upload...');
    
    const afterResponse = await axios.get(`${baseUrl}/api/properties/${propertyId}`);
    
    if (afterResponse.data.success) {
      const property = afterResponse.data.data;
      console.log(`   ✅ Property retrieved after upload`);
      console.log(`   📸 Images after upload: ${property.images ? property.images.length : 0}`);
      console.log(`   🔍 Images data:`, JSON.stringify(property.images, null, 2));
    }

    // Step 5: Test the properties list endpoint
    console.log('\n📋 Step 5: Testing properties list endpoint...');
    
    const listResponse = await axios.get(`${baseUrl}/api/properties?limit=5`);
    
    if (listResponse.data.success) {
      const properties = listResponse.data.data;
      const testProperty = properties.find(p => p.id === propertyId);
      
      if (testProperty) {
        console.log(`   ✅ Test property found in list`);
        console.log(`   📸 Images in list: ${testProperty.images ? testProperty.images.length : 0}`);
        console.log(`   🔍 List images data:`, JSON.stringify(testProperty.images, null, 2));
      } else {
        console.log(`   ⚠️  Test property not found in list`);
      }
    }

    // Step 6: Clean up
    console.log('\n🧹 Step 6: Cleaning up...');
    
    try {
      await axios.delete(`${baseUrl}/api/properties/${propertyId}`);
      console.log('   ✅ Test property deleted');
    } catch (deleteError) {
      console.log('   ⚠️  Could not delete test property');
    }

    return true;

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    if (error.response) {
      console.error('📝 Response:', error.response.data);
    }
    return false;
  }
}

// Run the debug
if (require.main === module) {
  debugImageUpload().then(success => {
    if (success) {
      console.log('\n🔍 DEBUG COMPLETED');
      console.log('Check the output above to identify the issue');
    } else {
      console.log('\n❌ DEBUG FAILED');
    }
  }).catch(error => {
    console.error('\n💥 Debug crashed:', error.message);
    process.exit(1);
  });
}

module.exports = { debugImageUpload };
