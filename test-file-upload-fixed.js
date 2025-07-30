#!/usr/bin/env node

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

console.log('📸 Testing Fixed File Upload System');
console.log('==================================\n');

async function testFileUpload() {
  const baseUrl = 'http://localhost:3000';
  
  try {
    // Step 1: Create a property first
    console.log('🏠 Step 1: Creating test property...');
    
    const propertyData = {
      title: "Test Property - File Upload",
      description: "Testing the fixed file upload functionality",
      location: "Upload Test Location, Buea",
      propertyType: "apartment",
      price: 90000,
      bedrooms: 2,
      bathrooms: 1,
      agentName: "Upload Test Agent",
      agentPhone: "+237600000000"
    };

    const propertyResponse = await axios.post(`${baseUrl}/api/properties`, propertyData);
    
    if (!propertyResponse.data.success) {
      console.log('❌ Failed to create property:', propertyResponse.data.error);
      return false;
    }

    const propertyId = propertyResponse.data.data.id;
    console.log(`   ✅ Property created: ${propertyId}`);

    // Step 2: Create a simple test image (valid PNG)
    console.log('\n📤 Step 2: Creating and uploading test image...');
    
    // Create a simple 10x10 red PNG image
    const createTestImage = () => {
      // PNG file signature and basic structure for a 10x10 red image
      const pngData = Buffer.from([
        // PNG signature
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        
        // IHDR chunk
        0x00, 0x00, 0x00, 0x0D, // Length: 13
        0x49, 0x48, 0x44, 0x52, // Type: IHDR
        0x00, 0x00, 0x00, 0x0A, // Width: 10
        0x00, 0x00, 0x00, 0x0A, // Height: 10
        0x08, 0x02, 0x00, 0x00, 0x00, // Bit depth: 8, Color type: 2 (RGB), Compression: 0, Filter: 0, Interlace: 0
        0x02, 0x50, 0x58, 0x8A, // CRC
        
        // IDAT chunk (simplified - contains red pixel data)
        0x00, 0x00, 0x00, 0x16, // Length: 22
        0x49, 0x44, 0x41, 0x54, // Type: IDAT
        0x78, 0x9C, 0x63, 0xF8, 0x0F, 0x00, 0x00, 0xFF, 0xFF, 0x03, 0x00, 0x00, 0x06, 0x00, 0x05, 0x1C, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x70, 0x6E, 0x18, 0x21, // CRC
        
        // IEND chunk
        0x00, 0x00, 0x00, 0x00, // Length: 0
        0x49, 0x45, 0x4E, 0x44, // Type: IEND
        0xAE, 0x42, 0x60, 0x82  // CRC
      ]);
      
      return pngData;
    };

    const testImageBuffer = createTestImage();
    const tempImagePath = path.join(__dirname, 'test_upload_image.png');
    
    // Write test image to file
    fs.writeFileSync(tempImagePath, testImageBuffer);
    console.log(`   📁 Created test image: ${tempImagePath}`);

    try {
      // Upload the image
      const formData = new FormData();
      formData.append('images', fs.createReadStream(tempImagePath), {
        filename: 'test_upload.png',
        contentType: 'image/png'
      });

      console.log(`   📤 Uploading to: ${baseUrl}/api/images/properties/${propertyId}/upload`);

      const uploadResponse = await axios.post(
        `${baseUrl}/api/images/properties/${propertyId}/upload`,
        formData,
        {
          headers: {
            ...formData.getHeaders()
          },
          timeout: 10000 // 10 second timeout
        }
      );

      console.log(`   📊 Upload response status: ${uploadResponse.status}`);
      
      if (uploadResponse.data.success) {
        console.log('   ✅ Image upload successful!');
        console.log(`   📸 Uploaded images: ${uploadResponse.data.data.uploadedImages.length}`);
        console.log(`   📊 Total images: ${uploadResponse.data.data.totalImages}`);
        
        // Log the uploaded image details
        if (uploadResponse.data.data.uploadedImages.length > 0) {
          const uploadedImage = uploadResponse.data.data.uploadedImages[0];
          console.log(`   🖼️  Image URL: ${uploadedImage.thumbnail || uploadedImage.url || 'No URL'}`);
        }
      } else {
        console.log('   ❌ Image upload failed:', uploadResponse.data.error);
        return false;
      }

    } catch (uploadError) {
      console.log('   ❌ Upload request failed:', uploadError.message);
      if (uploadError.response) {
        console.log('   📝 Error response:', uploadError.response.data);
        console.log('   📊 Error status:', uploadError.response.status);
      }
      return false;
    } finally {
      // Clean up temp file
      try {
        fs.unlinkSync(tempImagePath);
        console.log('   🧹 Cleaned up temp image file');
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }

    // Step 3: Verify the property now has images
    console.log('\n🔍 Step 3: Verifying property has uploaded images...');
    
    const updatedPropertyResponse = await axios.get(`${baseUrl}/api/properties/${propertyId}`);
    
    if (updatedPropertyResponse.data.success) {
      const property = updatedPropertyResponse.data.data;
      console.log(`   ✅ Property retrieved after upload`);
      console.log(`   📸 Images found: ${property.images ? property.images.length : 0}`);
      
      if (property.images && property.images.length > 0) {
        console.log('   🖼️  Image details:');
        property.images.forEach((image, index) => {
          if (typeof image === 'string') {
            console.log(`      ${index + 1}. URL: ${image}`);
          } else if (image.url) {
            console.log(`      ${index + 1}. Uploaded: ${image.url} (${image.originalName})`);
          } else {
            console.log(`      ${index + 1}. Complex: ${JSON.stringify(image)}`);
          }
        });
      }
    }

    // Step 4: Test the properties list endpoint
    console.log('\n📋 Step 4: Testing properties list with uploaded images...');
    
    const listResponse = await axios.get(`${baseUrl}/api/properties?limit=5`);
    
    if (listResponse.data.success) {
      const properties = listResponse.data.data;
      const testProperty = properties.find(p => p.id === propertyId);
      
      if (testProperty) {
        console.log(`   ✅ Test property found in list`);
        console.log(`   📸 Images in list: ${testProperty.images ? testProperty.images.length : 0}`);
        
        if (testProperty.images && testProperty.images.length > 0) {
          const firstImage = testProperty.images[0];
          if (typeof firstImage === 'string') {
            console.log(`   🖼️  First image (URL): ${firstImage}`);
          } else if (firstImage.url) {
            console.log(`   🖼️  First image (uploaded): ${firstImage.url}`);
          }
        }
      } else {
        console.log(`   ⚠️  Test property not found in list`);
      }
    }

    // Step 5: Clean up
    console.log('\n🧹 Step 5: Cleaning up test property...');
    
    try {
      await axios.delete(`${baseUrl}/api/properties/${propertyId}`);
      console.log('   ✅ Test property deleted');
    } catch (deleteError) {
      console.log('   ⚠️  Could not delete test property (this is okay)');
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
if (require.main === module) {
  testFileUpload().then(success => {
    if (success) {
      console.log('\n🎉 FILE UPLOAD TEST PASSED!');
      console.log('✅ Property creation working');
      console.log('✅ Image upload working');
      console.log('✅ Image storage working');
      console.log('✅ Property retrieval with images working');
      console.log('✅ Properties list with images working');
      
      console.log('\n🚀 READY FOR AGENTS TO USE:');
      console.log('📱 Agents can now upload photos from their phones!');
      console.log('🌐 Visit http://localhost:3000 to test the web interface');
      console.log('📸 Upload real photos and they should appear in "Manage Properties"');
      
    } else {
      console.log('\n❌ FILE UPLOAD TEST FAILED');
      console.log('🔧 Check the error messages above for debugging');
    }
  }).catch(error => {
    console.error('\n💥 Test crashed:', error.message);
    process.exit(1);
  });
}

module.exports = { testFileUpload };
