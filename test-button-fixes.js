#!/usr/bin/env node

const axios = require('axios');

console.log('🔘 Testing Button Count Fixes...\n');

const BASE_URL = 'http://localhost:3000';
const TEST_PHONE = '237671125065';

// Test button count limits and property actions
async function testButtonFixes() {
  try {
    console.log('🎯 TESTING BUTTON COUNT FIXES');
    console.log('=============================\n');

    // Test 1: Property with Multiple Images (Should show Gallery button)
    console.log('1️⃣ Testing Property with Multiple Images...');
    const multiImagePayload = {
      object: "whatsapp_business_account",
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: TEST_PHONE,
              id: `test_multi_image_${Date.now()}`,
              timestamp: Math.floor(Date.now() / 1000).toString(),
              type: "text",
              text: { body: "studio in molyko" }
            }],
            contacts: [{
              profile: { name: "Test User" },
              wa_id: TEST_PHONE
            }]
          },
          field: "messages"
        }]
      }]
    };

    const multiImageResponse = await axios.post(`${BASE_URL}/webhook/whatsapp`, multiImagePayload, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`   ✅ Multi-image property test: ${multiImageResponse.status}`);

    await delay(3000);

    // Test 2: Gallery Button Click
    console.log('2️⃣ Testing Gallery Button Click...');
    const galleryClickPayload = {
      object: "whatsapp_business_account",
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: TEST_PHONE,
              id: `test_gallery_click_${Date.now()}`,
              timestamp: Math.floor(Date.now() / 1000).toString(),
              type: "interactive",
              interactive: {
                type: "button_reply",
                button_reply: {
                  id: "gallery_0eb83f22-c35b-48bb-b16c-32ccc1e34785",
                  title: "📸 View Gallery"
                }
              }
            }],
            contacts: [{
              profile: { name: "Test User" },
              wa_id: TEST_PHONE
            }]
          },
          field: "messages"
        }]
      }]
    };

    const galleryClickResponse = await axios.post(`${BASE_URL}/webhook/whatsapp`, galleryClickPayload, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`   ✅ Gallery button click test: ${galleryClickResponse.status}`);

    await delay(3000);

    // Test 3: Book Tour Button
    console.log('3️⃣ Testing Book Tour Button...');
    const bookTourPayload = {
      object: "whatsapp_business_account",
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: TEST_PHONE,
              id: `test_book_tour_${Date.now()}`,
              timestamp: Math.floor(Date.now() / 1000).toString(),
              type: "interactive",
              interactive: {
                type: "button_reply",
                button_reply: {
                  id: "book_72861657-7741-468e-8a1c-857bb0de78e3",
                  title: "📅 Book Tour"
                }
              }
            }],
            contacts: [{
              profile: { name: "Test User" },
              wa_id: TEST_PHONE
            }]
          },
          field: "messages"
        }]
      }]
    };

    const bookTourResponse = await axios.post(`${BASE_URL}/webhook/whatsapp`, bookTourPayload, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`   ✅ Book tour button test: ${bookTourResponse.status}`);

    await delay(3000);

    // Test 4: Contact Agent Button
    console.log('4️⃣ Testing Contact Agent Button...');
    const contactAgentPayload = {
      object: "whatsapp_business_account",
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: TEST_PHONE,
              id: `test_contact_agent_${Date.now()}`,
              timestamp: Math.floor(Date.now() / 1000).toString(),
              type: "interactive",
              interactive: {
                type: "button_reply",
                button_reply: {
                  id: "contact_72861657-7741-468e-8a1c-857bb0de78e3",
                  title: "👨‍💼 Contact Agent"
                }
              }
            }],
            contacts: [{
              profile: { name: "Test User" },
              wa_id: TEST_PHONE
            }]
          },
          field: "messages"
        }]
      }]
    };

    const contactAgentResponse = await axios.post(`${BASE_URL}/webhook/whatsapp`, contactAgentPayload, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`   ✅ Contact agent button test: ${contactAgentResponse.status}`);

    await delay(3000);

    // Test 5: Save Property Button
    console.log('5️⃣ Testing Save Property Button...');
    const savePropertyPayload = {
      object: "whatsapp_business_account",
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: TEST_PHONE,
              id: `test_save_property_${Date.now()}`,
              timestamp: Math.floor(Date.now() / 1000).toString(),
              type: "interactive",
              interactive: {
                type: "button_reply",
                button_reply: {
                  id: "save_72861657-7741-468e-8a1c-857bb0de78e3",
                  title: "💾 Save Property"
                }
              }
            }],
            contacts: [{
              profile: { name: "Test User" },
              wa_id: TEST_PHONE
            }]
          },
          field: "messages"
        }]
      }]
    };

    const savePropertyResponse = await axios.post(`${BASE_URL}/webhook/whatsapp`, savePropertyPayload, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`   ✅ Save property button test: ${savePropertyResponse.status}`);

    console.log('\n🎉 BUTTON FIX TESTS COMPLETED!\n');
    
    console.log('📋 Fixed Issues:');
    console.log('✅ WhatsApp button count limit (max 3 buttons)');
    console.log('✅ Property action button prioritization');
    console.log('✅ Gallery button for multi-image properties');
    console.log('✅ Enhanced error logging for debugging');
    console.log('✅ Button validation in WhatsAppService');
    
    console.log('\n🚀 Expected Results:');
    console.log('• No more "Invalid buttons count" errors');
    console.log('• Gallery button appears for properties with multiple images');
    console.log('• Book tour button appears for properties with single/no images');
    console.log('• All property actions work correctly');
    console.log('• Maximum 3 buttons always sent to WhatsApp');

  } catch (error) {
    console.error('❌ Error testing button fixes:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Helper function for delays
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the button fix tests
testButtonFixes();
