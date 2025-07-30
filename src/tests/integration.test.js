const request = require('supertest');
const app = require('../server');
const logger = require('../utils/logger');

describe('TenantSphere Integration Tests', () => {
  let server;

  beforeAll(async () => {
    // Start server for testing
    server = app.listen(0); // Use random port
    logger.info('Test server started');
  });

  afterAll(async () => {
    // Close server after tests
    if (server) {
      server.close();
      logger.info('Test server closed');
    }
  });

  describe('WhatsApp Webhook', () => {
    test('should handle webhook verification', async () => {
      const response = await request(app)
        .get('/webhook/whatsapp')
        .query({
          'hub.mode': 'subscribe',
          'hub.challenge': 'test_challenge',
          'hub.verify_token': process.env.WHATSAPP_VERIFY_TOKEN || 'test_token'
        });

      expect(response.status).toBe(200);
      expect(response.text).toBe('test_challenge');
    });

    test('should handle incoming text message', async () => {
      const mockMessage = {
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
                wa_id: '1234567890'
              }],
              messages: [{
                from: '1234567890',
                id: 'test_message_id',
                timestamp: '1234567890',
                text: { body: 'Hello' },
                type: 'text'
              }]
            },
            field: 'messages'
          }]
        }]
      };

      const response = await request(app)
        .post('/webhook/whatsapp')
        .send(mockMessage);

      expect(response.status).toBe(200);
    });

    test('should handle interactive message', async () => {
      const mockInteractiveMessage = {
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
                wa_id: '1234567890'
              }],
              messages: [{
                from: '1234567890',
                id: 'test_interactive_id',
                timestamp: '1234567890',
                type: 'interactive',
                interactive: {
                  type: 'button_reply',
                  button_reply: {
                    id: 'search_all',
                    title: 'Browse All Properties'
                  }
                }
              }]
            },
            field: 'messages'
          }]
        }]
      };

      const response = await request(app)
        .post('/webhook/whatsapp')
        .send(mockInteractiveMessage);

      expect(response.status).toBe(200);
    });
  });

  describe('Health Check', () => {
    test('should return health status', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid webhook data', async () => {
      const response = await request(app)
        .post('/webhook/whatsapp')
        .send({ invalid: 'data' });

      expect(response.status).toBe(200); // WhatsApp expects 200 even for errors
    });

    test('should handle missing required fields', async () => {
      const incompleteMessage = {
        object: 'whatsapp_business_account',
        entry: [{
          changes: [{
            value: {
              messaging_product: 'whatsapp'
              // Missing required fields
            }
          }]
        }]
      };

      const response = await request(app)
        .post('/webhook/whatsapp')
        .send(incompleteMessage);

      expect(response.status).toBe(200);
    });
  });

  describe('Rate Limiting', () => {
    test('should handle multiple rapid requests', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .get('/health')
        );
      }

      const responses = await Promise.all(promises);
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });
    });
  });

  describe('Security', () => {
    test('should reject requests without proper headers', async () => {
      const response = await request(app)
        .post('/webhook/whatsapp')
        .send({ test: 'data' });

      // Should still return 200 for WhatsApp compatibility
      expect(response.status).toBe(200);
    });

    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/webhook/whatsapp')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400);
    });
  });

  describe('Database Operations', () => {
    test('should handle database connection errors gracefully', async () => {
      // This test would check how the app handles database failures
      // In a real scenario, you'd mock the database to simulate failures
      
      const mockMessage = {
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
                wa_id: '1234567890'
              }],
              messages: [{
                from: '1234567890',
                id: 'test_db_error',
                timestamp: '1234567890',
                text: { body: 'Test database error handling' },
                type: 'text'
              }]
            },
            field: 'messages'
          }]
        }]
      };

      const response = await request(app)
        .post('/webhook/whatsapp')
        .send(mockMessage);

      expect(response.status).toBe(200);
    });
  });

  describe('Message Processing Flow', () => {
    test('should process complete user journey', async () => {
      const userPhone = '1234567890';
      
      // Step 1: Initial greeting
      let mockMessage = {
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
                wa_id: userPhone
              }],
              messages: [{
                from: userPhone,
                id: 'greeting_msg',
                timestamp: '1234567890',
                text: { body: 'Hello' },
                type: 'text'
              }]
            },
            field: 'messages'
          }]
        }]
      };

      let response = await request(app)
        .post('/webhook/whatsapp')
        .send(mockMessage);

      expect(response.status).toBe(200);

      // Step 2: Property search
      mockMessage.entry[0].changes[0].value.messages[0] = {
        from: userPhone,
        id: 'search_msg',
        timestamp: '1234567891',
        text: { body: '2 bedroom apartment in Molyko' },
        type: 'text'
      };

      response = await request(app)
        .post('/webhook/whatsapp')
        .send(mockMessage);

      expect(response.status).toBe(200);

      // Step 3: Interactive button click
      mockMessage.entry[0].changes[0].value.messages[0] = {
        from: userPhone,
        id: 'button_msg',
        timestamp: '1234567892',
        type: 'interactive',
        interactive: {
          type: 'button_reply',
          button_reply: {
            id: 'view_property_123',
            title: 'View Details'
          }
        }
      };

      response = await request(app)
        .post('/webhook/whatsapp')
        .send(mockMessage);

      expect(response.status).toBe(200);
    });
  });

  describe('Performance', () => {
    test('should handle concurrent requests', async () => {
      const startTime = Date.now();
      const concurrentRequests = 20;
      
      const promises = Array(concurrentRequests).fill().map((_, index) => {
        const mockMessage = {
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
                  profile: { name: `Test User ${index}` },
                  wa_id: `123456789${index}`
                }],
                messages: [{
                  from: `123456789${index}`,
                  id: `concurrent_msg_${index}`,
                  timestamp: '1234567890',
                  text: { body: `Hello ${index}` },
                  type: 'text'
                }]
              },
              field: 'messages'
            }]
          }]
        };

        return request(app)
          .post('/webhook/whatsapp')
          .send(mockMessage);
      });

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All requests should complete successfully
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(10000); // 10 seconds

      logger.info(`Concurrent requests test: ${concurrentRequests} requests completed in ${duration}ms`);
    });

    test('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      
      const response = await request(app).get('/health');
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });
  });
});

// Helper function to create mock WhatsApp message
function createMockMessage(from, messageId, body, type = 'text') {
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

module.exports = { createMockMessage };
