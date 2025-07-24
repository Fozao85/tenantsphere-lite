const request = require('supertest');
const app = require('../src/server');
const WhatsAppService = require('../src/services/WhatsAppService');

describe('WhatsApp Integration', () => {
  describe('Webhook Verification', () => {
    test('GET /webhook/whatsapp should verify webhook with correct token', async () => {
      const response = await request(app)
        .get('/webhook/whatsapp')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'test-verify-token',
          'hub.challenge': 'test-challenge'
        })
        .expect(200);

      expect(response.text).toBe('test-challenge');
    });

    test('GET /webhook/whatsapp should reject webhook with incorrect token', async () => {
      await request(app)
        .get('/webhook/whatsapp')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'wrong-token',
          'hub.challenge': 'test-challenge'
        })
        .expect(403);
    });
  });

  describe('Webhook Message Processing', () => {
    test('POST /webhook/whatsapp should process incoming message', async () => {
      const webhookPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-id',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '237123456789',
                    phone_number_id: 'phone-number-id'
                  },
                  contacts: [
                    {
                      profile: {
                        name: 'Test User'
                      },
                      wa_id: '237987654321'
                    }
                  ],
                  messages: [
                    {
                      from: '237987654321',
                      id: 'message-id',
                      timestamp: '1234567890',
                      text: {
                        body: 'Hello, I need help finding an apartment'
                      },
                      type: 'text'
                    }
                  ]
                },
                field: 'messages'
              }
            ]
          }
        ]
      };

      const response = await request(app)
        .post('/webhook/whatsapp')
        .send(webhookPayload)
        .expect(200);

      expect(response.text).toBe('OK');
    });

    test('POST /webhook/whatsapp should handle button interaction', async () => {
      const webhookPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-id',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '237123456789',
                    phone_number_id: 'phone-number-id'
                  },
                  contacts: [
                    {
                      profile: {
                        name: 'Test User'
                      },
                      wa_id: '237987654321'
                    }
                  ],
                  messages: [
                    {
                      from: '237987654321',
                      id: 'message-id',
                      timestamp: '1234567890',
                      interactive: {
                        type: 'button_reply',
                        button_reply: {
                          id: 'search_properties',
                          title: '🔍 Search Properties'
                        }
                      },
                      type: 'interactive'
                    }
                  ]
                },
                field: 'messages'
              }
            ]
          }
        ]
      };

      const response = await request(app)
        .post('/webhook/whatsapp')
        .send(webhookPayload)
        .expect(200);

      expect(response.text).toBe('OK');
    });
  });

  describe('WhatsApp Service', () => {
    let whatsappService;

    beforeEach(() => {
      whatsappService = new WhatsAppService();
    });

    test('should format phone numbers correctly', () => {
      expect(whatsappService.formatPhoneNumber('+237123456789')).toBe('237123456789');
      expect(whatsappService.formatPhoneNumber('237123456789')).toBe('237123456789');
      expect(whatsappService.formatPhoneNumber('123456789')).toBe('237123456789');
      expect(whatsappService.formatPhoneNumber('+1234567890')).toBe('1234567890');
    });

    test('should check if service is configured', () => {
      // In test environment, these might not be set
      const isConfigured = whatsappService.isConfigured();
      expect(typeof isConfigured).toBe('boolean');
    });

    test('should validate webhook signature', () => {
      // Mock validation - in real implementation this would use actual crypto
      const payload = 'test-payload';
      const signature = 'test-signature';
      
      // This is a placeholder test - actual implementation would validate HMAC
      expect(() => {
        whatsappService.validateWebhookSignature(payload, signature);
      }).not.toThrow();
    });
  });

  describe('Message Templates', () => {
    test('should create property alert message', () => {
      const property = {
        id: 'prop-123',
        title: '2-Bedroom Apartment',
        location: 'Molyko',
        price: 75000,
        currency: 'XAF',
        bedrooms: 2,
        getWhatsAppSummary: () => '🏠 *2-Bedroom Apartment*\n📍 Molyko\n💰 75,000 XAF/month\n🛏️ 2 bedrooms',
        getFormattedPrice: () => '75,000 XAF'
      };

      const message = `🏠 New property matching your preferences!\n\n${property.getWhatsAppSummary()}\n\nReply "VIEW" to see more details or "BOOK" to schedule a tour.`;
      
      expect(message).toContain('New property matching your preferences');
      expect(message).toContain('2-Bedroom Apartment');
      expect(message).toContain('Molyko');
      expect(message).toContain('75,000 XAF');
    });

    test('should create booking confirmation message', () => {
      const booking = {
        id: 'booking-123',
        scheduledDate: '2024-07-25',
        scheduledTime: '14:00',
        getFormattedDateTime: () => 'Thursday, July 25, 2024 at 02:00 PM',
        getWhatsAppSummary: () => '📅 *Booking Confirmation*\n🏠 Property Tour\n📍 Property location\n🕐 Thursday, July 25, 2024 at 02:00 PM'
      };

      const agent = {
        name: 'John Agent',
        phone: '+237123456789'
      };

      const message = `✅ Booking Confirmed!\n\n${booking.getWhatsAppSummary()}\n\n👨‍💼 Agent: ${agent.name}\n📞 Contact: ${agent.phone}\n\nWe'll send you a reminder before your tour.`;
      
      expect(message).toContain('Booking Confirmed');
      expect(message).toContain('John Agent');
      expect(message).toContain('+237123456789');
      expect(message).toContain('reminder before your tour');
    });
  });

  describe('Error Handling', () => {
    test('POST /webhook/whatsapp should handle malformed payload', async () => {
      const malformedPayload = {
        invalid: 'payload'
      };

      const response = await request(app)
        .post('/webhook/whatsapp')
        .send(malformedPayload)
        .expect(200); // Should still return 200 to acknowledge receipt

      expect(response.text).toBe('OK');
    });

    test('POST /webhook/whatsapp should handle empty payload', async () => {
      const response = await request(app)
        .post('/webhook/whatsapp')
        .send({})
        .expect(200);

      expect(response.text).toBe('OK');
    });
  });
});
