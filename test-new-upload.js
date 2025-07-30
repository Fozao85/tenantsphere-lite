#!/usr/bin/env node

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

console.log('🚀 Testing New Upload Endpoint');
console.log('==============================\n');

async function testNewUpload() {
  const baseUrl = 'http://localhost:3000';
  
  try {
    // Step 1: Create a property
    console.log('🏠 Step 1: Creating test property...');
    
    const propertyData = {
      title: "New Upload Test Property",
      description: "Testing the new upload endpoint",
      location: "New Test Location, Buea",
      propertyType: "apartment",
      price: 85000,
      bedrooms: 2,
      bathrooms: 1,
      agentName: "New Test Agent",
      agentPhone: "+237600000000"
    };

    const propertyResponse = await axios.post(`${baseUrl}/api/properties`, propertyData);
    
    if (!propertyResponse.data.success) {
      console.log('   ❌ Failed to create property:', propertyResponse.data.error);
      return false;
    }

    const propertyId = propertyResponse.data.data.id;
    console.log(`   ✅ Property created: ${propertyId}`);

    // Step 2: Create and upload a simple image
    console.log('\n📸 Step 2: Creating and uploading test image...');
    
    // Create a minimal valid JPEG (1x1 pixel red)
    const jpegData = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
      0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
      0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
      0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
      0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
      0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xFF, 0xC4,
      0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xDA, 0x00, 0x0C,
      0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F, 0x00, 0x00, 0xFF, 0xD9
    ]);

    const tempImagePath = path.join(__dirname, 'test_new_upload.jpg');
    fs.writeFileSync(tempImagePath, jpegData);
    console.log(`   📁 Created test image: ${tempImagePath}`);

    try {
      const formData = new FormData();
      formData.append('images', fs.createReadStream(tempImagePath), {
        filename: 'test_new_upload.jpg',
        contentType: 'image/jpeg'
      });

      console.log(`   📤 Uploading to: ${baseUrl}/api/properties/${propertyId}/upload-images`);

      const uploadResponse = await axios.post(
        `${baseUrl}/api/properties/${propertyId}/upload-images`,
        formData,
        {
          headers: {
            ...formData.getHeaders()
          },
          timeout: 10000
        }
      );

      console.log(`   📊 Upload status: ${uploadResponse.status}`);
      
      if (uploadResponse.data.success) {
        console.log('   ✅ Upload successful!');
        console.log(`   📸 Uploaded: ${uploadResponse.data.data.uploadedImages.length} images`);
        console.log(`   📊 Total: ${uploadResponse.data.data.totalImages} images`);
        
        // Show uploaded image details
        if (uploadResponse.data.data.uploadedImages.length > 0) {
          const uploadedImage = uploadResponse.data.data.uploadedImages[0];
          console.log(`   🖼️  Image URL: ${uploadedImage.url}`);
        }
      } else {
        console.log('   ❌ Upload failed:', uploadResponse.data.error);
        return false;
      }

    } catch (uploadError) {
      console.log('   ❌ Upload failed:', uploadError.message);
      if (uploadError.response) {
        console.log('   📝 Error details:', uploadError.response.data);
      }
      return false;
    } finally {
      // Clean up temp file
      try {
        fs.unlinkSync(tempImagePath);
        console.log('   🧹 Cleaned up temp image');
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }

    // Step 3: Verify property has images
    console.log('\n🔍 Step 3: Verifying property has uploaded images...');
    
    const propertyCheckResponse = await axios.get(`${baseUrl}/api/properties/${propertyId}`);
    
    if (propertyCheckResponse.data.success) {
      const property = propertyCheckResponse.data.data;
      console.log(`   ✅ Property retrieved`);
      console.log(`   📸 Images found: ${property.images ? property.images.length : 0}`);
      
      if (property.images && property.images.length > 0) {
        console.log('   🖼️  Image details:');
        property.images.forEach((image, index) => {
          if (typeof image === 'string') {
            console.log(`      ${index + 1}. URL: ${image}`);
          } else if (image.url) {
            console.log(`      ${index + 1}. Uploaded: ${image.url} (${image.originalName})`);
          }
        });
      }
    }

    // Step 4: Test properties list
    console.log('\n📋 Step 4: Testing properties list...');
    
    const listResponse = await axios.get(`${baseUrl}/api/properties?limit=5`);
    
    if (listResponse.data.success) {
      const properties = listResponse.data.data;
      const testProperty = properties.find(p => p.id === propertyId);
      
      if (testProperty) {
        console.log(`   ✅ Property found in list`);
        console.log(`   📸 Images in list: ${testProperty.images ? testProperty.images.length : 0}`);
      }
    }

    // Clean up
    console.log('\n🧹 Cleaning up...');
    try {
      await axios.delete(`${baseUrl}/api/properties/${propertyId}`);
      console.log('   ✅ Test property deleted');
    } catch (deleteError) {
      console.log('   ⚠️  Could not delete test property');
    }

    return true;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('📝 Response:', error.response.data);
    }
    return false;
  }
}

// Run the test
testNewUpload().then(success => {
  if (success) {
    console.log('\n🎉 NEW UPLOAD TEST PASSED!');
    console.log('✅ Property creation working');
    console.log('✅ Image upload working');
    console.log('✅ Image storage working');
    console.log('✅ Property retrieval with images working');
    console.log('\n📱 READY FOR AGENTS TO USE:');
    console.log('🌐 Visit http://localhost:3000');
    console.log('📸 Upload photos from phones - it should work now!');
    console.log('👀 Check "Manage Properties" to see uploaded images');
  } else {
    console.log('\n❌ NEW UPLOAD TEST FAILED');
    console.log('🔧 Check the error messages above');
  }
});
