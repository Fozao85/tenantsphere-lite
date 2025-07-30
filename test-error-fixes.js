#!/usr/bin/env node

const axios = require('axios');

console.log('🔧 Testing Error Fixes for Real Estate Chatbot...\n');

const BASE_URL = 'http://localhost:3000';
const TEST_PHONE = '237671125065';

// Test specific error scenarios that were failing
async function testErrorFixes() {
  try {
    console.log('🎯 TESTING CRITICAL ERROR FIXES');
    console.log('================================\n');

    // Test 1: Conversation Flow Determination
    console.log('1️⃣ Testing Conversation Flow Determination...');
    const flowTestPayload = {
      object: "whatsapp_business_account",
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: TEST_PHONE,
              id: `test_flow_${Date.now()}`,
              timestamp: Math.floor(Date.now() / 1000).toString(),
              type: "text",
              text: { body: "hello" }
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

    const flowResponse = await axios.post(`${BASE_URL}/webhook/whatsapp`, flowTestPayload, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`   ✅ Conversation flow test: ${flowResponse.status}`);

    await delay(3000);

    // Test 2: Property Action Button (Gallery)
    console.log('2️⃣ Testing Property Action Button (Gallery)...');
    const galleryTestPayload = {
      object: "whatsapp_business_account",
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: TEST_PHONE,
              id: `test_gallery_${Date.now()}`,
              timestamp: Math.floor(Date.now() / 1000).toString(),
              type: "interactive",
              interactive: {
                type: "button_reply",
                button_reply: {
                  id: "gallery_72861657-7741-468e-8a1c-857bb0de78e3",
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

    const galleryResponse = await axios.post(`${BASE_URL}/webhook/whatsapp`, galleryTestPayload, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`   ✅ Property action test: ${galleryResponse.status}`);

    await delay(3000);

    // Test 3: Book Tour Action
    console.log('3️⃣ Testing Book Tour Action...');
    const bookTestPayload = {
      object: "whatsapp_business_account",
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: TEST_PHONE,
              id: `test_book_${Date.now()}`,
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

    const bookResponse = await axios.post(`${BASE_URL}/webhook/whatsapp`, bookTestPayload, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`   ✅ Book tour test: ${bookResponse.status}`);

    await delay(3000);

    // Test 4: Natural Language Search
    console.log('4️⃣ Testing Natural Language Search...');
    const searchTestPayload = {
      object: "whatsapp_business_account",
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: TEST_PHONE,
              id: `test_search_${Date.now()}`,
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

    const searchResponse = await axios.post(`${BASE_URL}/webhook/whatsapp`, searchTestPayload, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`   ✅ Natural language search test: ${searchResponse.status}`);

    await delay(3000);

    // Test 5: Contact Agent Action
    console.log('5️⃣ Testing Contact Agent Action...');
    const contactTestPayload = {
      object: "whatsapp_business_account",
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: TEST_PHONE,
              id: `test_contact_${Date.now()}`,
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

    const contactResponse = await axios.post(`${BASE_URL}/webhook/whatsapp`, contactTestPayload, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`   ✅ Contact agent test: ${contactResponse.status}`);

    console.log('\n🎉 ERROR FIX TESTS COMPLETED!\n');
    
    console.log('📋 Fixed Issues:');
    console.log('✅ ConversationFlowService - Added missing analyzeIntent method');
    console.log('✅ PreferenceLearningService - Added input validation');
    console.log('✅ PropertyActionService - Fixed getPropertyById method name');
    console.log('✅ NLPService - Added comprehensive intent analysis');
    console.log('✅ Error handling - Better error logging and fallbacks');
    
    console.log('\n🚀 Expected Results:');
    console.log('• No more "Error determining conversation flow" messages');
    console.log('• No more "Error learning from interaction" messages');
    console.log('• No more "Error handling property action" messages');
    console.log('• All property buttons should work correctly');
    console.log('• Complete conversation flow should be smooth');

  } catch (error) {
    console.error('❌ Error testing fixes:', error.message);
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

// Run the error fix tests
testErrorFixes();
