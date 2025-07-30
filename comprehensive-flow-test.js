#!/usr/bin/env node

const axios = require('axios');
const { initializeFirebase } = require('./src/config/firebase');
const PropertyService = require('./src/services/PropertyService');

console.log('🔬 COMPREHENSIVE REAL ESTATE CHATBOT FLOW TESTING\n');
console.log('=================================================\n');

const BASE_URL = 'http://localhost:3000';
const TEST_PHONE = '237671125065';

class ChatbotFlowTester {
  constructor() {
    this.testResults = [];
    this.currentStep = 0;
    this.propertyService = null;
  }

  async initialize() {
    console.log('🔧 Initializing test environment...');
    try {
      initializeFirebase();
      this.propertyService = new PropertyService();
      console.log('   ✅ Firebase initialized');
      console.log('   ✅ PropertyService ready');
      
      // Check database connectivity
      const properties = await this.propertyService.getProperties({}, { limit: 1 });
      console.log(`   ✅ Database connected (${properties.length} properties accessible)`);
      
      return true;
    } catch (error) {
      console.error('   ❌ Initialization failed:', error.message);
      return false;
    }
  }

  async testStep(stepName, testFunction) {
    this.currentStep++;
    console.log(`\n${this.currentStep}️⃣ TESTING: ${stepName}`);
    console.log('─'.repeat(50));
    
    try {
      const result = await testFunction();
      this.testResults.push({ step: stepName, status: 'PASS', result });
      console.log(`   ✅ PASS: ${stepName}`);
      return result;
    } catch (error) {
      this.testResults.push({ step: stepName, status: 'FAIL', error: error.message });
      console.error(`   ❌ FAIL: ${stepName} - ${error.message}`);
      throw error;
    }
  }

  async sendMessage(messageType, payload) {
    const response = await axios.post(`${BASE_URL}/webhook/whatsapp`, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    
    if (response.status !== 200) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  }

  createTextMessage(text) {
    return {
      object: "whatsapp_business_account",
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: TEST_PHONE,
              id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              timestamp: Math.floor(Date.now() / 1000).toString(),
              type: "text",
              text: { body: text }
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
  }

  createButtonMessage(buttonId, title) {
    return {
      object: "whatsapp_business_account",
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: TEST_PHONE,
              id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              timestamp: Math.floor(Date.now() / 1000).toString(),
              type: "interactive",
              interactive: {
                type: "button_reply",
                button_reply: {
                  id: buttonId,
                  title: title
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
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async runAllTests() {
    console.log('🚀 Starting comprehensive chatbot flow testing...\n');
    
    if (!await this.initialize()) {
      console.error('❌ Failed to initialize test environment');
      return;
    }

    try {
      // Test 1: Welcome Flow
      await this.testStep('Welcome Message Flow', async () => {
        const response = await this.sendMessage('text', this.createTextMessage('hello'));
        await this.delay(2000);
        return { status: response.status, message: 'Welcome message sent successfully' };
      });

      // Test 2: Apartment Type Selection
      await this.testStep('Apartment Button Click', async () => {
        const response = await this.sendMessage('button', this.createButtonMessage('search_apartments', '🏢 Apartments'));
        await this.delay(2000);
        return { status: response.status, message: 'Apartment type selection should appear' };
      });

      // Test 3: Studio Selection
      await this.testStep('Studio Apartment Selection', async () => {
        const response = await this.sendMessage('button', this.createButtonMessage('search_studio', '🏠 Studio'));
        await this.delay(3000);
        return { status: response.status, message: 'Studio properties should be displayed' };
      });

      // Test 4: Database Verification - Check if studios exist
      await this.testStep('Database Studio Verification', async () => {
        const studios = await this.propertyService.getProperties({ propertyType: 'studio' }, { limit: 10 });
        if (studios.length === 0) {
          throw new Error('No studio properties found in database');
        }
        return { count: studios.length, message: `Found ${studios.length} studio properties in database` };
      });

      // Test 5: House Type Selection
      await this.testStep('House Button Click', async () => {
        const response = await this.sendMessage('button', this.createButtonMessage('search_houses', '🏠 Houses'));
        await this.delay(2000);
        return { status: response.status, message: 'House type selection should appear' };
      });

      // Test 6: Family House Selection
      await this.testStep('Family House Selection', async () => {
        const response = await this.sendMessage('button', this.createButtonMessage('search_family_house', '🏠 Family House'));
        await this.delay(3000);
        return { status: response.status, message: 'Family house properties should be displayed' };
      });

      // Test 7: Featured Properties
      await this.testStep('Featured Properties', async () => {
        const response = await this.sendMessage('button', this.createButtonMessage('show_featured', '⭐ Featured'));
        await this.delay(3000);
        return { status: response.status, message: 'Featured properties should be displayed' };
      });

      // Test 8: Natural Language Search
      await this.testStep('Natural Language Search', async () => {
        const response = await this.sendMessage('text', this.createTextMessage('studio in molyko under 600000'));
        await this.delay(3000);
        return { status: response.status, message: 'Natural language search should return relevant properties' };
      });

      // Test 9: Property Action Buttons (using a known property ID)
      await this.testStep('Property Action Buttons', async () => {
        const properties = await this.propertyService.getProperties({}, { limit: 1 });
        if (properties.length === 0) {
          throw new Error('No properties available for action testing');
        }
        
        const propertyId = properties[0].id;
        const response = await this.sendMessage('button', this.createButtonMessage(`book_${propertyId}`, '📅 Book Tour'));
        await this.delay(2000);
        return { status: response.status, propertyId, message: 'Property action should be processed' };
      });

      // Test 10: Contact Agent
      await this.testStep('Contact Agent Flow', async () => {
        const properties = await this.propertyService.getProperties({}, { limit: 1 });
        const propertyId = properties[0].id;
        const response = await this.sendMessage('button', this.createButtonMessage(`contact_${propertyId}`, '👨‍💼 Contact Agent'));
        await this.delay(2000);
        return { status: response.status, message: 'Contact agent flow should be initiated' };
      });

      // Test 11: Save Property Flow
      await this.testStep('Save Property Flow', async () => {
        const properties = await this.propertyService.getProperties({}, { limit: 1 });
        const propertyId = properties[0].id;
        const response = await this.sendMessage('button', this.createButtonMessage(`save_${propertyId}`, '💾 Save Property'));
        await this.delay(2000);
        return { status: response.status, message: 'Save property flow should work' };
      });

      // Test 12: Gallery View Flow
      await this.testStep('Gallery View Flow', async () => {
        const properties = await this.propertyService.getProperties({}, { limit: 1 });
        const propertyId = properties[0].id;
        const response = await this.sendMessage('button', this.createButtonMessage(`gallery_${propertyId}`, '📸 View Gallery'));
        await this.delay(2000);
        return { status: response.status, message: 'Gallery view should work' };
      });

      // Test 13: Help Flow
      await this.testStep('Help Flow', async () => {
        const response = await this.sendMessage('text', this.createTextMessage('help'));
        await this.delay(2000);
        return { status: response.status, message: 'Help flow should provide assistance' };
      });

      // Test 14: Different Property Types
      await this.testStep('1 Bedroom Apartment Search', async () => {
        const response = await this.sendMessage('button', this.createButtonMessage('search_1bedroom', '🏠 1 Bedroom'));
        await this.delay(3000);
        return { status: response.status, message: '1 bedroom apartments should be displayed' };
      });

      // Test 15: 2+ Bedroom Search
      await this.testStep('2+ Bedroom Apartment Search', async () => {
        const response = await this.sendMessage('button', this.createButtonMessage('search_2bedroom_plus', '🏠 2+ Bedrooms'));
        await this.delay(3000);
        return { status: response.status, message: '2+ bedroom apartments should be displayed' };
      });

      // Test 16: Location-based Search
      await this.testStep('Location-based Natural Search', async () => {
        const response = await this.sendMessage('text', this.createTextMessage('house in sandpit'));
        await this.delay(3000);
        return { status: response.status, message: 'Location-based search should return relevant properties' };
      });

      // Test 17: Price-based Search
      await this.testStep('Price-based Natural Search', async () => {
        const response = await this.sendMessage('text', this.createTextMessage('apartment under 500000'));
        await this.delay(3000);
        return { status: response.status, message: 'Price-based search should return affordable properties' };
      });

      // Test 18: Complex Search
      await this.testStep('Complex Natural Search', async () => {
        const response = await this.sendMessage('text', this.createTextMessage('2 bedroom house in great soppo under 800000 with parking'));
        await this.delay(3000);
        return { status: response.status, message: 'Complex search should parse all criteria' };
      });

      console.log('\n🎉 ALL COMPREHENSIVE TESTS COMPLETED!');
      this.printTestSummary();

    } catch (error) {
      console.error('\n💥 TEST SUITE FAILED:', error.message);
      this.printTestSummary();
    }
  }

  printTestSummary() {
    console.log('\n📊 TEST SUMMARY');
    console.log('================');
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${this.testResults.length}`);
    
    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.testResults.filter(r => r.status === 'FAIL').forEach(test => {
        console.log(`   • ${test.step}: ${test.error}`);
      });
    }
    
    console.log('\n✅ PASSED TESTS:');
    this.testResults.filter(r => r.status === 'PASS').forEach(test => {
      console.log(`   • ${test.step}`);
    });
  }
}

// Run the comprehensive test
const tester = new ChatbotFlowTester();
tester.runAllTests().catch(console.error);
