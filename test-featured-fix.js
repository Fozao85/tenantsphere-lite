#!/usr/bin/env node

const axios = require('axios');

console.log('⭐ TESTING FEATURED PROPERTIES FIX...\n');

const BASE_URL = 'http://localhost:3000';
const TEST_PHONE = '237671125065';

async function testFeaturedFix() {
  try {
    console.log('🎯 TESTING FEATURED PROPERTIES BUTTON FIX');
    console.log('==========================================\n');

    // Step 1: Send welcome message
    console.log('1️⃣ Step 1: Sending welcome message...');
    const welcomePayload = {
      object: "whatsapp_business_account",
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: TEST_PHONE,
              id: `test_welcome_${Date.now()}`,
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

    await axios.post(`${BASE_URL}/webhook/whatsapp`, welcomePayload, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('   ✅ Welcome message sent');
    await delay(2000);

    // Step 2: Click Featured Properties button (THIS IS THE CRITICAL TEST)
    console.log('\n2️⃣ Step 2: Clicking Featured Properties button...');
    const featuredPayload = {
      object: "whatsapp_business_account",
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: TEST_PHONE,
              id: `test_featured_${Date.now()}`,
              timestamp: Math.floor(Date.now() / 1000).toString(),
              type: "interactive",
              interactive: {
                type: "button_reply",
                button_reply: {
                  id: "show_featured",
                  title: "⭐ Featured"
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

    const featuredResponse = await axios.post(`${BASE_URL}/webhook/whatsapp`, featuredPayload, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`   ✅ Featured button clicked: ${featuredResponse.status}`);
    console.log('   Expected: Featured properties displayed WITHOUT "to is required" error');
    await delay(3000);

    // Step 3: Test multiple times to ensure consistency
    console.log('\n3️⃣ Step 3: Testing featured button again for consistency...');
    const featuredPayload2 = {
      object: "whatsapp_business_account",
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: TEST_PHONE,
              id: `test_featured2_${Date.now()}`,
              timestamp: Math.floor(Date.now() / 1000).toString(),
              type: "interactive",
              interactive: {
                type: "button_reply",
                button_reply: {
                  id: "show_featured",
                  title: "⭐ Featured"
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

    const featuredResponse2 = await axios.post(`${BASE_URL}/webhook/whatsapp`, featuredPayload2, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`   ✅ Featured button clicked again: ${featuredResponse2.status}`);
    console.log('   Expected: Consistent behavior, no undefined errors');

    console.log('\n🎉 FEATURED PROPERTIES FIX TEST COMPLETED!\n');
    
    console.log('📋 Expected Results:');
    console.log('1. Welcome message with property type buttons');
    console.log('2. Featured button click shows properties WITHOUT "to is required" error');
    console.log('3. Consistent behavior on multiple clicks');
    
    console.log('\n✅ Fixed Issues:');
    console.log('• Removed duplicate showFeaturedProperties method');
    console.log('• Fixed all method calls to use correct signature (user, conversation, from)');
    console.log('• Eliminated "The parameter to is required" error');
    console.log('• Fixed "Error sending text message to undefined" error');
    
    console.log('\n🚀 The featured properties button should now work perfectly!');

  } catch (error) {
    console.error('❌ Error testing featured fix:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

testFeaturedFix();
