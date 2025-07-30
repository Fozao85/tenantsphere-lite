#!/usr/bin/env node

require('dotenv').config();
const { initializeFirebase } = require('./src/config/firebase');
const PropertyService = require('./src/services/PropertyService');

console.log('🖼️ Testing Property Images and Data Structure...\n');

async function testPropertyImages() {
  try {
    console.log('1️⃣ Initializing Firebase...');
    initializeFirebase();
    console.log('   ✅ Firebase initialized successfully');

    console.log('2️⃣ Creating PropertyService...');
    const propertyService = new PropertyService();
    console.log('   ✅ PropertyService created');

    console.log('3️⃣ Retrieving properties to check image data...');
    const properties = await propertyService.getProperties({}, { limit: 3 });
    console.log(`   ✅ Retrieved ${properties.length} properties`);

    if (properties.length > 0) {
      console.log('\n📋 Property Image Analysis:');
      properties.forEach((property, index) => {
        console.log(`\n   Property ${index + 1}:`);
        console.log(`   ID: ${property.id}`);
        console.log(`   Title: ${property.title || 'No title'}`);
        console.log(`   Location: ${property.location || 'No location'}`);
        console.log(`   Images: ${property.images ? property.images.length + ' images' : 'No images'}`);
        
        if (property.images && property.images.length > 0) {
          console.log(`   Image URLs:`);
          property.images.forEach((img, imgIndex) => {
            console.log(`     ${imgIndex + 1}. ${img}`);
          });
        } else {
          console.log(`   ⚠️  No images found for this property`);
        }
      });

      // Add sample images to properties that don't have them
      console.log('\n4️⃣ Adding sample images to properties without images...');
      
      const sampleImages = [
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&h=600&fit=crop'
      ];

      for (let i = 0; i < properties.length; i++) {
        const property = properties[i];
        
        if (!property.images || property.images.length === 0) {
          console.log(`   📸 Adding images to property: ${property.title || property.id}`);
          
          // Add 2-3 random sample images
          const numImages = Math.floor(Math.random() * 2) + 2; // 2-3 images
          const propertyImages = [];
          
          for (let j = 0; j < numImages; j++) {
            const randomIndex = Math.floor(Math.random() * sampleImages.length);
            propertyImages.push(sampleImages[randomIndex]);
          }
          
          try {
            await propertyService.updateProperty(property.id, {
              images: propertyImages,
              lastUpdated: new Date()
            });
            console.log(`   ✅ Added ${propertyImages.length} images to property ${property.id}`);
          } catch (updateError) {
            console.log(`   ❌ Failed to update property ${property.id}: ${updateError.message}`);
          }
        } else {
          console.log(`   ✅ Property ${property.id} already has ${property.images.length} images`);
        }
      }

      console.log('\n5️⃣ Verifying updated properties...');
      const updatedProperties = await propertyService.getProperties({}, { limit: 3 });
      
      updatedProperties.forEach((property, index) => {
        console.log(`\n   Updated Property ${index + 1}:`);
        console.log(`   ID: ${property.id}`);
        console.log(`   Images: ${property.images ? property.images.length + ' images' : 'No images'}`);
        
        if (property.images && property.images.length > 0) {
          console.log(`   First image: ${property.images[0]}`);
        }
      });

    } else {
      console.log('   ⚠️  No properties found in database');
    }

    console.log('\n🎉 Property image test completed!');

  } catch (error) {
    console.error('❌ Property image test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testPropertyImages();
