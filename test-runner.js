const express = require('express');
const request = require('supertest');
const logger = require('./src/utils/logger');

// Import our main app
const app = require('./src/server');

class TenantSphereTestRunner {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    };
  }

  // Helper to create mock WhatsApp message
  createMockMessage(from, messageId, body, type = 'text') {
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
              profile: { name: 'Test User' },
              wa_id: from
            }],
            messages: [{
              from: from,
              id: messageId,
              timestamp: Date.now().toString(),
              text: { body: body },
              type: type
            }]
          },
          field: 'messages'
        }]
      }]
    };
  }

  // Helper to create mock interactive message
  createMockInteractiveMessage(from, messageId, buttonId, title = 'Test Button') {
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
              profile: { name: 'Test User' },
              wa_id: from
            }],
            messages: [{
              from: from,
              id: messageId,
              timestamp: Date.now().toString(),
              type: 'interactive',
              interactive: {
                type: 'button_reply',
                button_reply: {
                  id: buttonId,
                  title: title
                }
              }
            }]
          },
          field: 'messages'
        }]
      }]
    };
  }

  // Test basic server functionality
  async testBasicFunctionality() {
    console.log('\n🔧 Testing Basic Functionality...');
    
    try {
      // Test health endpoint
      const healthResponse = await request(app).get('/health');
      this.recordTest('Health Check', healthResponse.status === 200, 
        `Expected 200, got ${healthResponse.status}`);

      // Test webhook verification
      const webhookResponse = await request(app)
        .get('/webhook/whatsapp')
        .query({
          'hub.mode': 'subscribe',
          'hub.challenge': 'test_challenge',
          'hub.verify_token': process.env.WHATSAPP_VERIFY_TOKEN || 'test_token'
        });
      
      this.recordTest('Webhook Verification', webhookResponse.status === 200 && webhookResponse.text === 'test_challenge',
        `Expected challenge response, got ${webhookResponse.status}: ${webhookResponse.text}`);

    } catch (error) {
      this.recordTest('Basic Functionality', false, error.message);
    }
  }

  // Test user onboarding flow
  async testOnboardingFlow() {
    console.log('\n👋 Testing User Onboarding Flow...');
    
    const testUser = '+237671125001';
    
    try {
      // Test initial greeting
      const greetingMessage = this.createMockMessage(testUser, 'greeting_1', 'Hello');
      const greetingResponse = await request(app)
        .post('/webhook/whatsapp')
        .send(greetingMessage);
      
      this.recordTest('Initial Greeting', greetingResponse.status === 200,
        `Expected 200, got ${greetingResponse.status}`);

      // Test onboarding button click
      const onboardingMessage = this.createMockInteractiveMessage(testUser, 'onboard_1', 'ready_onboarding', "I'm Ready!");
      const onboardingResponse = await request(app)
        .post('/webhook/whatsapp')
        .send(onboardingMessage);
      
      this.recordTest('Onboarding Button', onboardingResponse.status === 200,
        `Expected 200, got ${onboardingResponse.status}`);

    } catch (error) {
      this.recordTest('Onboarding Flow', false, error.message);
    }
  }

  // Test property search functionality
  async testPropertySearch() {
    console.log('\n🔍 Testing Property Search...');
    
    const testUser = '+237671125002';
    
    try {
      // Test natural language search
      const searchMessage = this.createMockMessage(testUser, 'search_1', '2 bedroom apartment in Molyko under 80000');
      const searchResponse = await request(app)
        .post('/webhook/whatsapp')
        .send(searchMessage);
      
      this.recordTest('Natural Language Search', searchResponse.status === 200,
        `Expected 200, got ${searchResponse.status}`);

      // Test property search menu
      const menuMessage = this.createMockInteractiveMessage(testUser, 'menu_1', 'search_all', 'Browse All Properties');
      const menuResponse = await request(app)
        .post('/webhook/whatsapp')
        .send(menuMessage);
      
      this.recordTest('Property Search Menu', menuResponse.status === 200,
        `Expected 200, got ${menuResponse.status}`);

      // Test filtered search
      const filterMessage = this.createMockInteractiveMessage(testUser, 'filter_1', 'filter_search', 'Filtered Search');
      const filterResponse = await request(app)
        .post('/webhook/whatsapp')
        .send(filterMessage);
      
      this.recordTest('Filtered Search', filterResponse.status === 200,
        `Expected 200, got ${filterResponse.status}`);

    } catch (error) {
      this.recordTest('Property Search', false, error.message);
    }
  }

  // Test interactive property browsing
  async testInteractivePropertyBrowsing() {
    console.log('\n🎨 Testing Interactive Property Browsing...');
    
    const testUser = '+237671125003';
    
    try {
      // Test property view action
      const viewMessage = this.createMockInteractiveMessage(testUser, 'view_1', 'view_property_123', 'View Details');
      const viewResponse = await request(app)
        .post('/webhook/whatsapp')
        .send(viewMessage);
      
      this.recordTest('Property View Action', viewResponse.status === 200,
        `Expected 200, got ${viewResponse.status}`);

      // Test property save action
      const saveMessage = this.createMockInteractiveMessage(testUser, 'save_1', 'save_property_123', 'Save Property');
      const saveResponse = await request(app)
        .post('/webhook/whatsapp')
        .send(saveMessage);
      
      this.recordTest('Property Save Action', saveResponse.status === 200,
        `Expected 200, got ${saveResponse.status}`);

      // Test property gallery
      const galleryMessage = this.createMockInteractiveMessage(testUser, 'gallery_1', 'gallery_property_123', 'View Gallery');
      const galleryResponse = await request(app)
        .post('/webhook/whatsapp')
        .send(galleryMessage);
      
      this.recordTest('Property Gallery', galleryResponse.status === 200,
        `Expected 200, got ${galleryResponse.status}`);

    } catch (error) {
      this.recordTest('Interactive Property Browsing', false, error.message);
    }
  }

  // Test booking functionality
  async testBookingFlow() {
    console.log('\n📅 Testing Booking Flow...');
    
    const testUser = '+237671125004';
    
    try {
      // Test booking initiation
      const bookingMessage = this.createMockInteractiveMessage(testUser, 'book_1', 'book_property_123', 'Book Tour');
      const bookingResponse = await request(app)
        .post('/webhook/whatsapp')
        .send(bookingMessage);
      
      this.recordTest('Booking Initiation', bookingResponse.status === 200,
        `Expected 200, got ${bookingResponse.status}`);

      // Test booking details submission
      const detailsMessage = this.createMockMessage(testUser, 'details_1', 'Tomorrow at 2 PM, my number is +237671125004');
      const detailsResponse = await request(app)
        .post('/webhook/whatsapp')
        .send(detailsMessage);
      
      this.recordTest('Booking Details', detailsResponse.status === 200,
        `Expected 200, got ${detailsResponse.status}`);

      // Test booking confirmation
      const confirmMessage = this.createMockInteractiveMessage(testUser, 'confirm_1', 'confirm_booking', 'Yes, Confirm');
      const confirmResponse = await request(app)
        .post('/webhook/whatsapp')
        .send(confirmMessage);
      
      this.recordTest('Booking Confirmation', confirmResponse.status === 200,
        `Expected 200, got ${confirmResponse.status}`);

    } catch (error) {
      this.recordTest('Booking Flow', false, error.message);
    }
  }

  // Test recommendation system
  async testRecommendationSystem() {
    console.log('\n⭐ Testing Recommendation System...');
    
    const testUser = '+237671125005';
    
    try {
      // Test recommendations request
      const recoMessage = this.createMockInteractiveMessage(testUser, 'reco_1', 'get_recommendations', 'Get Recommendations');
      const recoResponse = await request(app)
        .post('/webhook/whatsapp')
        .send(recoMessage);
      
      this.recordTest('Recommendations Request', recoResponse.status === 200,
        `Expected 200, got ${recoResponse.status}`);

      // Test personalized recommendations
      const personalMessage = this.createMockMessage(testUser, 'personal_1', 'show me recommended properties');
      const personalResponse = await request(app)
        .post('/webhook/whatsapp')
        .send(personalMessage);
      
      this.recordTest('Personalized Recommendations', personalResponse.status === 200,
        `Expected 200, got ${personalResponse.status}`);

    } catch (error) {
      this.recordTest('Recommendation System', false, error.message);
    }
  }

  // Test conversation flow management
  async testConversationFlow() {
    console.log('\n🗣️ Testing Conversation Flow Management...');
    
    const testUser = '+237671125006';
    
    try {
      // Test flow switching
      const helpMessage = this.createMockMessage(testUser, 'help_1', 'I need help');
      const helpResponse = await request(app)
        .post('/webhook/whatsapp')
        .send(helpMessage);
      
      this.recordTest('Flow Switching (Help)', helpResponse.status === 200,
        `Expected 200, got ${helpResponse.status}`);

      // Test preference setup flow
      const prefMessage = this.createMockMessage(testUser, 'pref_1', 'update my preferences');
      const prefResponse = await request(app)
        .post('/webhook/whatsapp')
        .send(prefMessage);
      
      this.recordTest('Preference Setup Flow', prefResponse.status === 200,
        `Expected 200, got ${prefResponse.status}`);

      // Test context awareness
      const contextMessage = this.createMockMessage(testUser, 'context_1', 'I want something in Molyko');
      const contextResponse = await request(app)
        .post('/webhook/whatsapp')
        .send(contextMessage);
      
      this.recordTest('Context Awareness', contextResponse.status === 200,
        `Expected 200, got ${contextResponse.status}`);

    } catch (error) {
      this.recordTest('Conversation Flow', false, error.message);
    }
  }

  // Test error handling
  async testErrorHandling() {
    console.log('\n🛡️ Testing Error Handling...');
    
    try {
      // Test invalid message format
      const invalidResponse = await request(app)
        .post('/webhook/whatsapp')
        .send({ invalid: 'data' });
      
      this.recordTest('Invalid Message Format', invalidResponse.status === 200,
        `Expected 200 (graceful handling), got ${invalidResponse.status}`);

      // Test malformed JSON
      const malformedResponse = await request(app)
        .post('/webhook/whatsapp')
        .set('Content-Type', 'application/json')
        .send('invalid json');
      
      this.recordTest('Malformed JSON', malformedResponse.status === 400,
        `Expected 400, got ${malformedResponse.status}`);

      // Test empty message
      const emptyMessage = this.createMockMessage('+237671125007', 'empty_1', '');
      const emptyResponse = await request(app)
        .post('/webhook/whatsapp')
        .send(emptyMessage);
      
      this.recordTest('Empty Message', emptyResponse.status === 200,
        `Expected 200, got ${emptyResponse.status}`);

    } catch (error) {
      this.recordTest('Error Handling', false, error.message);
    }
  }

  // Test performance under load
  async testPerformance() {
    console.log('\n⚡ Testing Performance...');
    
    try {
      const startTime = Date.now();
      const concurrentRequests = 10;
      
      const promises = Array(concurrentRequests).fill().map((_, index) => {
        const testUser = `+23767112500${index}`;
        const message = this.createMockMessage(testUser, `perf_${index}`, 'Hello');
        return request(app).post('/webhook/whatsapp').send(message);
      });

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      const successCount = results.filter(r => r.status === 200).length;
      const successRate = successCount / concurrentRequests;

      this.recordTest('Concurrent Requests', successRate >= 0.9,
        `${successCount}/${concurrentRequests} requests succeeded in ${duration}ms`);

      this.recordTest('Response Time', duration < 5000,
        `${concurrentRequests} requests completed in ${duration}ms`);

    } catch (error) {
      this.recordTest('Performance', false, error.message);
    }
  }

  // Record test result
  recordTest(testName, passed, details = '') {
    this.testResults.total++;
    if (passed) {
      this.testResults.passed++;
      console.log(`  ✅ ${testName}`);
    } else {
      this.testResults.failed++;
      console.log(`  ❌ ${testName}: ${details}`);
    }
    
    this.testResults.details.push({
      name: testName,
      passed,
      details
    });
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Starting TenantSphere Full Functionality Test Suite...\n');
    
    const startTime = Date.now();

    try {
      await this.testBasicFunctionality();
      await this.testOnboardingFlow();
      await this.testPropertySearch();
      await this.testInteractivePropertyBrowsing();
      await this.testBookingFlow();
      await this.testRecommendationSystem();
      await this.testConversationFlow();
      await this.testErrorHandling();
      await this.testPerformance();
    } catch (error) {
      console.error('Test suite error:', error);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    this.printResults(duration);
  }

  // Print test results
  printResults(duration) {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    
    const passRate = ((this.testResults.passed / this.testResults.total) * 100).toFixed(1);
    
    console.log(`Total Tests: ${this.testResults.total}`);
    console.log(`Passed: ${this.testResults.passed} ✅`);
    console.log(`Failed: ${this.testResults.failed} ❌`);
    console.log(`Pass Rate: ${passRate}%`);
    console.log(`Duration: ${duration}ms`);
    
    if (this.testResults.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.testResults.details
        .filter(test => !test.passed)
        .forEach(test => {
          console.log(`  - ${test.name}: ${test.details}`);
        });
    }
    
    console.log('\n' + '='.repeat(60));
    
    if (passRate >= 90) {
      console.log('🎉 EXCELLENT! System is ready for deployment.');
    } else if (passRate >= 75) {
      console.log('⚠️  GOOD! Some issues need attention before deployment.');
    } else {
      console.log('🚨 CRITICAL! Major issues must be fixed before deployment.');
    }
    
    console.log('='.repeat(60));
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const testRunner = new TenantSphereTestRunner();
  testRunner.runAllTests().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = TenantSphereTestRunner;
