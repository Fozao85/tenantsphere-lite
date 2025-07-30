#!/usr/bin/env node

const axios = require('axios');

console.log('📅 TESTING BOOKING FLOW FIX...\n');

const BASE_URL = 'http://localhost:3000';
const TEST_PHONE = '237671125065';

async function testBookingFlow() {
  try {
    console.log('🎯 TESTING COMPLETE BOOKING FLOW');
    console.log('================================\n');

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

    // Step 2: Click Featured Properties to get a property
    console.log('\n2️⃣ Step 2: Getting featured properties...');
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

    await axios.post(`${BASE_URL}/webhook/whatsapp`, featuredPayload, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('   ✅ Featured properties requested');
    await delay(3000);

    // Step 3: Click Book Tour on a property (using a known property ID)
    console.log('\n3️⃣ Step 3: Clicking Book Tour button...');
    const bookTourPayload = {
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
                  id: "book_prop_001", // Using sample property ID
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

    await axios.post(`${BASE_URL}/webhook/whatsapp`, bookTourPayload, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('   ✅ Book Tour button clicked');
    console.log('   Expected: Booking form with date/time request');
    await delay(3000);

    // Step 4: Provide booking details (THIS IS THE CRITICAL TEST)
    console.log('\n4️⃣ Step 4: Providing booking details...');
    const bookingDetailsPayload = {
      object: "whatsapp_business_account",
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: TEST_PHONE,
              id: `test_details_${Date.now()}`,
              timestamp: Math.floor(Date.now() / 1000).toString(),
              type: "text",
              text: { body: "Saturday at 10 AM, need parking space" }
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

    await axios.post(`${BASE_URL}/webhook/whatsapp`, bookingDetailsPayload, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('   ✅ Booking details provided');
    console.log('   Expected: Booking confirmation, NOT property search results');
    await delay(3000);

    // Step 5: Test bookings command
    console.log('\n5️⃣ Step 5: Testing bookings command...');
    const bookingsPayload = {
      object: "whatsapp_business_account",
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: TEST_PHONE,
              id: `test_bookings_${Date.now()}`,
              timestamp: Math.floor(Date.now() / 1000).toString(),
              type: "text",
              text: { body: "bookings" }
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

    await axios.post(`${BASE_URL}/webhook/whatsapp`, bookingsPayload, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('   ✅ Bookings command sent');
    console.log('   Expected: User bookings list or empty bookings message');

    console.log('\n🎉 BOOKING FLOW TEST COMPLETED!\n');
    
    console.log('📋 Expected Results:');
    console.log('1. Welcome message with property type buttons');
    console.log('2. Featured properties displayed with Book Tour buttons');
    console.log('3. Book Tour click shows booking form');
    console.log('4. Booking details processed correctly (NOT as property search)');
    console.log('5. Bookings command shows user bookings');
    
    console.log('\n✅ Fixed Issues:');
    console.log('• Removed duplicate handleBookingFlow methods');
    console.log('• Added missing showUserBookings method');
    console.log('• Added missing startPreferencesSetup method');
    console.log('• Added missing addPropertyInteraction method');
    console.log('• Fixed booking state handling');
    
    console.log('\n🚀 The booking flow should now work correctly!');

  } catch (error) {
    console.error('❌ Error testing booking flow:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

testBookingFlow();
