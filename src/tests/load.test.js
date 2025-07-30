const request = require('supertest');
const app = require('../server');
const logger = require('../utils/logger');

describe('TenantSphere Load Tests', () => {
  let server;

  beforeAll(async () => {
    server = app.listen(0);
    logger.info('Load test server started');
  });

  afterAll(async () => {
    if (server) {
      server.close();
      logger.info('Load test server closed');
    }
  });

  describe('Concurrent User Simulation', () => {
    test('should handle 50 concurrent users', async () => {
      const concurrentUsers = 50;
      const messagesPerUser = 5;
      const startTime = Date.now();

      logger.info(`Starting load test: ${concurrentUsers} concurrent users, ${messagesPerUser} messages each`);

      // Create promises for all user sessions
      const userSessions = Array(concurrentUsers).fill().map((_, userIndex) => 
        simulateUserSession(userIndex, messagesPerUser)
      );

      // Execute all sessions concurrently
      const results = await Promise.allSettled(userSessions);
      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      // Analyze results
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      logger.info(`Load test completed in ${totalDuration}ms`);
      logger.info(`Successful sessions: ${successful}/${concurrentUsers}`);
      logger.info(`Failed sessions: ${failed}/${concurrentUsers}`);

      // Assertions
      expect(successful).toBeGreaterThan(concurrentUsers * 0.9); // At least 90% success rate
      expect(totalDuration).toBeLessThan(60000); // Should complete within 1 minute
    }, 120000); // 2 minute timeout

    test('should handle burst traffic', async () => {
      const burstSize = 100;
      const startTime = Date.now();

      logger.info(`Starting burst test: ${burstSize} simultaneous requests`);

      // Create burst of health check requests
      const promises = Array(burstSize).fill().map((_, index) => 
        request(app)
          .get('/health')
          .timeout(5000)
      );

      const results = await Promise.allSettled(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      ).length;

      logger.info(`Burst test completed in ${duration}ms`);
      logger.info(`Successful requests: ${successful}/${burstSize}`);

      expect(successful).toBeGreaterThan(burstSize * 0.8); // At least 80% success rate
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });

    test('should maintain performance under sustained load', async () => {
      const duration = 30000; // 30 seconds
      const requestsPerSecond = 10;
      const interval = 1000 / requestsPerSecond;

      logger.info(`Starting sustained load test: ${requestsPerSecond} req/sec for ${duration/1000} seconds`);

      const startTime = Date.now();
      const results = [];
      let requestCount = 0;

      // Function to send a single request
      const sendRequest = async () => {
        const reqStartTime = Date.now();
        try {
          const response = await request(app)
            .post('/webhook/whatsapp')
            .send(createLoadTestMessage(requestCount++))
            .timeout(5000);
          
          const reqEndTime = Date.now();
          results.push({
            success: response.status === 200,
            responseTime: reqEndTime - reqStartTime,
            timestamp: reqEndTime
          });
        } catch (error) {
          const reqEndTime = Date.now();
          results.push({
            success: false,
            responseTime: reqEndTime - reqStartTime,
            timestamp: reqEndTime,
            error: error.message
          });
        }
      };

      // Send requests at regular intervals
      const intervalId = setInterval(sendRequest, interval);

      // Stop after specified duration
      await new Promise(resolve => setTimeout(resolve, duration));
      clearInterval(intervalId);

      // Wait for any pending requests
      await new Promise(resolve => setTimeout(resolve, 2000));

      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      // Analyze results
      const successfulRequests = results.filter(r => r.success).length;
      const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      const maxResponseTime = Math.max(...results.map(r => r.responseTime));
      const minResponseTime = Math.min(...results.map(r => r.responseTime));

      logger.info(`Sustained load test completed:`);
      logger.info(`Total requests: ${results.length}`);
      logger.info(`Successful: ${successfulRequests} (${(successfulRequests/results.length*100).toFixed(1)}%)`);
      logger.info(`Average response time: ${averageResponseTime.toFixed(2)}ms`);
      logger.info(`Min response time: ${minResponseTime}ms`);
      logger.info(`Max response time: ${maxResponseTime}ms`);

      // Assertions
      expect(successfulRequests / results.length).toBeGreaterThan(0.95); // 95% success rate
      expect(averageResponseTime).toBeLessThan(2000); // Average response under 2 seconds
      expect(maxResponseTime).toBeLessThan(10000); // Max response under 10 seconds
    }, 60000); // 1 minute timeout
  });

  describe('Memory and Resource Usage', () => {
    test('should not have memory leaks during extended operation', async () => {
      const initialMemory = process.memoryUsage();
      const iterations = 1000;

      logger.info(`Memory leak test: ${iterations} iterations`);
      logger.info(`Initial memory usage: ${JSON.stringify(initialMemory)}`);

      // Simulate extended operation
      for (let i = 0; i < iterations; i++) {
        await request(app)
          .post('/webhook/whatsapp')
          .send(createLoadTestMessage(i));

        // Force garbage collection every 100 iterations if available
        if (i % 100 === 0 && global.gc) {
          global.gc();
        }
      }

      // Force final garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      logger.info(`Final memory usage: ${JSON.stringify(finalMemory)}`);

      // Calculate memory increase
      const heapIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const heapIncreasePercent = (heapIncrease / initialMemory.heapUsed) * 100;

      logger.info(`Heap increase: ${heapIncrease} bytes (${heapIncreasePercent.toFixed(2)}%)`);

      // Memory should not increase by more than 50% (allowing for some normal growth)
      expect(heapIncreasePercent).toBeLessThan(50);
    });
  });

  describe('Database Performance', () => {
    test('should handle concurrent database operations', async () => {
      const concurrentOperations = 20;
      const startTime = Date.now();

      logger.info(`Database performance test: ${concurrentOperations} concurrent operations`);

      // Simulate concurrent database operations through API calls
      const promises = Array(concurrentOperations).fill().map((_, index) => {
        const userPhone = `123456789${index.toString().padStart(2, '0')}`;
        return simulateUserJourney(userPhone);
      });

      const results = await Promise.allSettled(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      const successful = results.filter(r => r.status === 'fulfilled').length;

      logger.info(`Database test completed in ${duration}ms`);
      logger.info(`Successful operations: ${successful}/${concurrentOperations}`);

      expect(successful).toBeGreaterThan(concurrentOperations * 0.8); // 80% success rate
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
    });
  });

  describe('Error Recovery', () => {
    test('should recover from temporary failures', async () => {
      const requestCount = 50;
      const results = [];

      logger.info(`Error recovery test: ${requestCount} requests with potential failures`);

      // Send requests that might encounter various error conditions
      for (let i = 0; i < requestCount; i++) {
        try {
          const response = await request(app)
            .post('/webhook/whatsapp')
            .send(createErrorTestMessage(i))
            .timeout(5000);

          results.push({ success: true, status: response.status });
        } catch (error) {
          results.push({ success: false, error: error.message });
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const successfulRequests = results.filter(r => r.success).length;
      const successRate = successfulRequests / requestCount;

      logger.info(`Error recovery test completed:`);
      logger.info(`Successful requests: ${successfulRequests}/${requestCount} (${(successRate*100).toFixed(1)}%)`);

      // Should handle at least 90% of requests successfully even with error conditions
      expect(successRate).toBeGreaterThan(0.9);
    });
  });
});

// Helper function to simulate a complete user session
async function simulateUserSession(userIndex, messageCount) {
  const userPhone = `123456789${userIndex.toString().padStart(3, '0')}`;
  const sessionStartTime = Date.now();

  try {
    // Simulate user conversation flow
    const messages = [
      'Hello',
      '2 bedroom apartment in Molyko',
      'show me more details',
      'I want to book a tour',
      'tomorrow at 2 PM'
    ];

    for (let i = 0; i < Math.min(messageCount, messages.length); i++) {
      const response = await request(app)
        .post('/webhook/whatsapp')
        .send(createMockMessage(userPhone, `msg_${userIndex}_${i}`, messages[i]))
        .timeout(10000);

      if (response.status !== 200) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      // Random delay between messages (100-500ms)
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));
    }

    const sessionDuration = Date.now() - sessionStartTime;
    return { userIndex, success: true, duration: sessionDuration };

  } catch (error) {
    const sessionDuration = Date.now() - sessionStartTime;
    return { userIndex, success: false, duration: sessionDuration, error: error.message };
  }
}

// Helper function to simulate a complete user journey
async function simulateUserJourney(userPhone) {
  const journey = [
    { type: 'greeting', message: 'Hello' },
    { type: 'search', message: 'I need a 2 bedroom apartment' },
    { type: 'interaction', buttonId: 'view_property_123' },
    { type: 'booking', message: 'I want to book a tour' },
    { type: 'confirmation', message: 'yes, confirm the booking' }
  ];

  for (let i = 0; i < journey.length; i++) {
    const step = journey[i];
    let message;

    if (step.type === 'interaction') {
      message = createMockInteractiveMessage(userPhone, `journey_${i}`, step.buttonId);
    } else {
      message = createMockMessage(userPhone, `journey_${i}`, step.message);
    }

    const response = await request(app)
      .post('/webhook/whatsapp')
      .send(message)
      .timeout(5000);

    if (response.status !== 200) {
      throw new Error(`Journey step ${i} failed with status ${response.status}`);
    }

    // Small delay between steps
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return { userPhone, success: true };
}

// Helper function to create load test message
function createLoadTestMessage(index) {
  const messages = [
    'Hello',
    'I need an apartment',
    'Show me properties in Molyko',
    '2 bedroom under 80000',
    'I want to book a tour'
  ];

  const userPhone = `load_test_${index}`;
  const messageBody = messages[index % messages.length];

  return createMockMessage(userPhone, `load_${index}`, messageBody);
}

// Helper function to create error test message
function createErrorTestMessage(index) {
  const errorMessages = [
    '', // Empty message
    'a'.repeat(1000), // Very long message
    '🏠🏠🏠🏠🏠', // Emoji-heavy message
    '<script>alert("test")</script>', // Potential XSS
    null, // Null message
  ];

  const userPhone = `error_test_${index}`;
  const messageBody = errorMessages[index % errorMessages.length];

  return createMockMessage(userPhone, `error_${index}`, messageBody);
}

// Helper function to create mock WhatsApp message
function createMockMessage(from, messageId, body) {
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
            profile: { name: 'Load Test User' },
            wa_id: from
          }],
          messages: [{
            from: from,
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

// Helper function to create mock interactive message
function createMockInteractiveMessage(from, messageId, buttonId) {
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
            profile: { name: 'Load Test User' },
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
                title: 'Test Button'
              }
            }
          }]
        },
        field: 'messages'
      }]
    }]
  };
}

module.exports = {
  simulateUserSession,
  simulateUserJourney,
  createLoadTestMessage,
  createMockMessage,
  createMockInteractiveMessage
};
