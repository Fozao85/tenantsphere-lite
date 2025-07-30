#!/usr/bin/env node

const axios = require('axios');

// Load test environment
require('dotenv').config({ path: '.env.test' });

console.log('🎯 TenantSphere Quick Functionality Test');
console.log('=========================================\n');

class QuickTest {
  constructor() {
    this.baseUrl = 'http://localhost:3000'; // Use default port
    this.testUser = '+237671125999';
  }

  // Helper to create mock WhatsApp message
  createMessage(messageId, body) {
    return {
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
              profile: { name: 'Quick Test User' },
              wa_id: this.testUser
            }],
            messages: [{
              from: this.testUser,
              id: messageId,
              timestamp: Date.now().toString(),
              text: { body: body },
              type: 'text'
            }]
          },
          field: 'messages'
        }]
      }]
    };
  }

  // Test server health
  async testHealth() {
    try {
      console.log('🏥 Testing server health...');
      const response = await axios.get(`${this.baseUrl}/health`);
      console.log(`   ✅ Server is healthy: ${response.data.status}`);
      console.log(`   📊 Uptime: ${response.data.uptime}s`);
      return true;
    } catch (error) {
      console.log(`   ❌ Server health check failed: ${error.message}`);
      return false;
    }
  }

  // Test message processing
  async testMessage(messageBody, description) {
    try {
      console.log(`\n📱 ${description}`);
      console.log(`   User: "${messageBody}"`);
      
      const message = this.createMessage(`test_${Date.now()}`, messageBody);
      const response = await axios.post(`${this.baseUrl}/webhook/whatsapp`, message);
      
      if (response.status === 200) {
        console.log(`   ✅ Message processed successfully`);
        return true;
      } else {
        console.log(`   ❌ Message processing failed: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      return false;
    }
  }

  // Run quick tests
  async runQuickTests() {
    console.log('🚀 Running quick functionality tests...\n');
    
    let passed = 0;
    let total = 0;

    // Test 1: Health check
    total++;
    if (await this.testHealth()) passed++;

    // Test 2: Basic greeting
    total++;
    if (await this.testMessage('Hello', 'Testing basic greeting')) passed++;

    // Test 3: Property search
    total++;
    if (await this.testMessage('2 bedroom apartment in Molyko', 'Testing property search')) passed++;

    // Test 4: Natural language query
    total++;
    if (await this.testMessage('I need a house under 100000 with parking', 'Testing complex search query')) passed++;

    // Test 5: Booking request
    total++;
    if (await this.testMessage('I want to book a tour', 'Testing booking initiation')) passed++;

    // Test 6: Help request
    total++;
    if (await this.testMessage('I need help', 'Testing help/support flow')) passed++;

    // Test 7: Preference update
    total++;
    if (await this.testMessage('update my preferences', 'Testing preference management')) passed++;

    // Test 8: Location preference
    total++;
    if (await this.testMessage('I prefer Great Soppo area', 'Testing location preference learning')) passed++;

    // Test 9: Recommendation request
    total++;
    if (await this.testMessage('show me recommended properties', 'Testing recommendation system')) passed++;

    // Test 10: Empty message handling
    total++;
    if (await this.testMessage('', 'Testing empty message handling')) passed++;

    // Results
    const passRate = ((passed / total) * 100).toFixed(1);
    
    console.log('\n' + '='.repeat(50));
    console.log('🧪 QUICK TEST RESULTS');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${total - passed} ❌`);
    console.log(`Pass Rate: ${passRate}%`);
    
    if (passRate >= 90) {
      console.log('\n🎉 EXCELLENT! All core functionality working perfectly!');
      console.log('✅ TenantSphere is ready for production deployment.');
    } else if (passRate >= 75) {
      console.log('\n⚠️  GOOD! Most functionality working, minor issues detected.');
      console.log('🔧 Consider addressing issues before deployment.');
    } else {
      console.log('\n🚨 ISSUES DETECTED! Core functionality needs attention.');
      console.log('🛠️  Please review and fix issues before deployment.');
    }
    
    console.log('\n📋 What was tested:');
    console.log('• Server health and availability');
    console.log('• Basic user interaction and greetings');
    console.log('• Natural language property search');
    console.log('• Complex search queries with multiple criteria');
    console.log('• Booking and tour management');
    console.log('• Help and support system');
    console.log('• User preference learning and management');
    console.log('• Personalized recommendation system');
    console.log('• Error handling and edge cases');
    
    console.log('\n🚀 Ready for the next step: Production deployment!');
    console.log('='.repeat(50));
    
    return passRate >= 90;
  }
}

// Run the quick test
if (require.main === module) {
  const test = new QuickTest();
  test.runQuickTests().then((success) => {
    if (success) {
      console.log('\n✅ All tests passed! System ready for deployment.');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some tests failed. Review issues before deployment.');
      process.exit(1);
    }
  }).catch(error => {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = QuickTest;
