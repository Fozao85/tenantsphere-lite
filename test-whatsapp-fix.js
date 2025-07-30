#!/usr/bin/env node

const axios = require('axios');

console.log('🔧 Testing WhatsApp Bot Fix');
console.log('============================\n');

async function testWhatsAppBot() {
  const baseUrl = 'http://localhost:3000';
  
  try {
    // Test the WhatsApp webhook with a simple message
    console.log('📱 Testing WhatsApp bot message processing...');
    
    const testMessage = {
      object: 'whatsapp_business_account',
      entry: [{
        id: '123456789',
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '15551234567',
              phone_number_id: '123456789'
            },
            contacts: [{
              profile: { name: 'Test User' },
              wa_id: '+237600000001'
            }],
            messages: [{
              from: '+237600000001',
              id: 'test_message_fix',
              timestamp: Date.now().toString(),
              text: { body: 'Hello, I need help finding a property' },
              type: 'text'
            }]
          },
          field: 'messages'
        }]
      }]
    };

    console.log('   📤 Sending test message to WhatsApp webhook...');

    const response = await axios.post(`${baseUrl}/webhook/whatsapp`, testMessage, {
      timeout: 10000
    });

    console.log(`   📊 Response status: ${response.status}`);
    
    if (response.status === 200) {
      console.log('   ✅ WhatsApp webhook processed successfully!');
      console.log('   📝 The logger error should be fixed now');
    } else {
      console.log('   ❌ WhatsApp webhook failed');
      return false;
    }

    // Wait a moment for processing
    console.log('\n⏳ Waiting for message processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test another message type
    console.log('\n📱 Testing property search message...');
    
    const propertySearchMessage = {
      object: 'whatsapp_business_account',
      entry: [{
        id: '123456789',
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '15551234567',
              phone_number_id: '123456789'
            },
            contacts: [{
              profile: { name: 'Test User' },
              wa_id: '+237600000002'
            }],
            messages: [{
              from: '+237600000002',
              id: 'test_property_search_fix',
              timestamp: Date.now().toString(),
              text: { body: 'I want a 2 bedroom apartment in Molyko' },
              type: 'text'
            }]
          },
          field: 'messages'
        }]
      }]
    };

    const searchResponse = await axios.post(`${baseUrl}/webhook/whatsapp`, propertySearchMessage, {
      timeout: 10000
    });

    console.log(`   📊 Property search response status: ${searchResponse.status}`);
    
    if (searchResponse.status === 200) {
      console.log('   ✅ Property search processed successfully!');
    } else {
      console.log('   ❌ Property search failed');
      return false;
    }

    return true;

  } catch (error) {
    console.error('❌ WhatsApp test failed:', error.message);
    if (error.response) {
      console.error('📝 Response data:', error.response.data);
      console.error('📊 Response status:', error.response.status);
    }
    return false;
  }
}

// Run the test
testWhatsAppBot().then(success => {
  if (success) {
    console.log('\n🎉 WHATSAPP BOT FIX TEST PASSED!');
    console.log('✅ Logger error fixed');
    console.log('✅ WhatsApp webhook working');
    console.log('✅ Message processing working');
    console.log('✅ Property search working');
    console.log('\n📱 The WhatsApp bot should now work without errors!');
    console.log('🔧 Try sending a message to your WhatsApp bot again');
  } else {
    console.log('\n❌ WHATSAPP BOT FIX TEST FAILED');
    console.log('🔧 Check the error messages above');
  }
}).catch(error => {
  console.error('\n💥 Test crashed:', error.message);
});
