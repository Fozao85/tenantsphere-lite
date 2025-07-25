const { logger } = require('../utils/logger');
const MessageHandlerService = require('../services/MessageHandlerService');

// Verify WhatsApp webhook (GET request)
const verifyWhatsAppWebhook = (req, res) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    logger.info('WhatsApp webhook verification attempt', { mode, token });

    if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
      logger.info('✅ WhatsApp webhook verified successfully');
      res.status(200).send(challenge);
    } else {
      logger.warn('❌ WhatsApp webhook verification failed');
      res.status(403).send('Forbidden');
    }
  } catch (error) {
    logger.error('Error verifying WhatsApp webhook:', error);
    res.status(500).send('Internal Server Error');
  }
};

// Handle WhatsApp webhook (POST request)
const handleWhatsAppWebhook = async (req, res) => {
  try {
    let body = req.body;

    // Handle Buffer data
    if (Buffer.isBuffer(body)) {
      body = JSON.parse(body.toString());
    }

    logger.info('WhatsApp webhook received', {
      body: JSON.stringify(body, null, 2)
    });

    // Acknowledge receipt immediately
    res.status(200).send('OK');

    // Process webhook data
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'messages') {
            await processWhatsAppMessage(change.value);
          }
        }
      }
    }
  } catch (error) {
    logger.error('Error handling WhatsApp webhook:', error);
    res.status(500).send('Internal Server Error');
  }
};

// Process incoming WhatsApp messages
const processWhatsAppMessage = async (messageData) => {
  try {
    const messages = messageData.messages || [];
    const contacts = messageData.contacts || [];
    const messageHandler = new MessageHandlerService();

    for (const message of messages) {
      const contact = contacts.find(c => c.wa_id === message.from);

      logger.info('Processing WhatsApp message', {
        from: message.from,
        type: message.type,
        messageId: message.id,
        contact: contact?.profile?.name
      });

      // Add contact info to message data
      const enrichedMessage = {
        ...message,
        contacts: contact ? [contact] : []
      };

      // Process the message using our message handler
      await messageHandler.processMessage(enrichedMessage);
    }

    // Handle status updates (message delivery, read receipts, etc.)
    const statuses = messageData.statuses || [];
    for (const status of statuses) {
      logger.info('WhatsApp status update', {
        messageId: status.id,
        status: status.status,
        timestamp: status.timestamp
      });

      // TODO: Update notification delivery status in database
      // This can be implemented later for delivery tracking
    }

  } catch (error) {
    logger.error('Error processing WhatsApp message:', error);
  }
};

module.exports = {
  verifyWhatsAppWebhook,
  handleWhatsAppWebhook
};
