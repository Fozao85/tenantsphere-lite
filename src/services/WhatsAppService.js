const axios = require('axios');
const { logger } = require('../utils/logger');

class WhatsAppService {
  constructor() {
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.baseURL = `https://graph.facebook.com/v18.0/${this.phoneNumberId}`;
    
    // Initialize axios instance
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // Send a text message
  async sendTextMessage(to, message) {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: {
          body: message
        }
      };

      const response = await this.api.post('/messages', payload);
      
      logger.info(`Text message sent to ${to}`, {
        messageId: response.data.messages[0].id,
        status: response.data.messages[0].message_status
      });

      return {
        success: true,
        messageId: response.data.messages[0].id,
        status: response.data.messages[0].message_status
      };
    } catch (error) {
      logger.error(`Error sending text message to ${to}:`, error.response?.data || error.message);
      throw error;
    }
  }

  // Send a message with buttons
  async sendButtonMessage(to, bodyText, buttons, headerText = null, footerText = null) {
    try {
      // Validate button count (WhatsApp allows max 3 buttons)
      if (!buttons || buttons.length === 0) {
        throw new Error('At least 1 button is required');
      }
      if (buttons.length > 3) {
        logger.warn(`Too many buttons (${buttons.length}), limiting to 3`);
        buttons = buttons.slice(0, 3);
      }

      const payload = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: {
            text: bodyText
          },
          action: {
            buttons: buttons.map((button, index) => ({
              type: 'reply',
              reply: {
                id: button.id || `btn_${index}`,
                title: button.title.substring(0, 20) // WhatsApp limit
              }
            }))
          }
        }
      };

      if (headerText) {
        payload.interactive.header = {
          type: 'text',
          text: headerText
        };
      }

      if (footerText) {
        payload.interactive.footer = {
          text: footerText
        };
      }

      const response = await this.api.post('/messages', payload);
      
      logger.info(`Button message sent to ${to}`, {
        messageId: response.data.messages[0].id,
        buttonsCount: buttons.length
      });

      return {
        success: true,
        messageId: response.data.messages[0].id,
        status: response.data.messages[0].message_status
      };
    } catch (error) {
      logger.error(`Error sending button message to ${to}:`, error.response?.data || error.message);
      throw error;
    }
  }

  // Send a list message
  async sendListMessage(to, bodyText, buttonText, sections, headerText = null, footerText = null) {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'interactive',
        interactive: {
          type: 'list',
          header: headerText ? {
            type: 'text',
            text: headerText
          } : undefined,
          body: {
            text: bodyText
          },
          footer: footerText ? {
            text: footerText
          } : undefined,
          action: {
            button: buttonText,
            sections: sections.map(section => ({
              title: section.title,
              rows: section.rows.map(row => ({
                id: row.id,
                title: row.title.substring(0, 24), // WhatsApp limit
                description: row.description ? row.description.substring(0, 72) : undefined
              }))
            }))
          }
        }
      };

      const response = await this.api.post('/messages', payload);
      
      logger.info(`List message sent to ${to}`, {
        messageId: response.data.messages[0].id,
        sectionsCount: sections.length
      });

      return {
        success: true,
        messageId: response.data.messages[0].id,
        status: response.data.messages[0].message_status
      };
    } catch (error) {
      logger.error(`Error sending list message to ${to}:`, error.response?.data || error.message);
      throw error;
    }
  }

  // Send an image message
  async sendImageMessage(to, imageUrl, caption = null) {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'image',
        image: {
          link: imageUrl,
          caption: caption
        }
      };

      const response = await this.api.post('/messages', payload);
      
      logger.info(`Image message sent to ${to}`, {
        messageId: response.data.messages[0].id,
        imageUrl: imageUrl
      });

      return {
        success: true,
        messageId: response.data.messages[0].id,
        status: response.data.messages[0].message_status
      };
    } catch (error) {
      logger.error(`Error sending image message to ${to}:`, error.response?.data || error.message);
      throw error;
    }
  }

  // Send a template message
  async sendTemplateMessage(to, templateName, languageCode = 'en', parameters = []) {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: languageCode
          },
          components: parameters.length > 0 ? [
            {
              type: 'body',
              parameters: parameters.map(param => ({
                type: 'text',
                text: param
              }))
            }
          ] : undefined
        }
      };

      const response = await this.api.post('/messages', payload);
      
      logger.info(`Template message sent to ${to}`, {
        messageId: response.data.messages[0].id,
        template: templateName
      });

      return {
        success: true,
        messageId: response.data.messages[0].id,
        status: response.data.messages[0].message_status
      };
    } catch (error) {
      logger.error(`Error sending template message to ${to}:`, error.response?.data || error.message);
      throw error;
    }
  }

  // Mark message as read
  async markMessageAsRead(messageId) {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId
      };

      await this.api.post('/messages', payload);
      logger.info(`Message marked as read: ${messageId}`);
      
      return { success: true };
    } catch (error) {
      logger.error(`Error marking message as read ${messageId}:`, error.response?.data || error.message);
      throw error;
    }
  }

  // Get media URL
  async getMediaUrl(mediaId) {
    try {
      const response = await axios.get(`https://graph.facebook.com/v18.0/${mediaId}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      return response.data.url;
    } catch (error) {
      logger.error(`Error getting media URL for ${mediaId}:`, error.response?.data || error.message);
      throw error;
    }
  }

  // Download media
  async downloadMedia(mediaUrl) {
    try {
      const response = await axios.get(mediaUrl, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        responseType: 'stream'
      });

      return response.data;
    } catch (error) {
      logger.error(`Error downloading media from ${mediaUrl}:`, error.response?.data || error.message);
      throw error;
    }
  }

  // Validate webhook signature
  validateWebhookSignature(payload, signature) {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.WHATSAPP_WEBHOOK_SECRET || '')
      .update(payload)
      .digest('hex');
    
    return `sha256=${expectedSignature}` === signature;
  }

  // Helper method to format phone number
  formatPhoneNumber(phone) {
    // Remove any non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // If it starts with 237 (Cameroon code), return as is
    if (cleaned.startsWith('237')) {
      return cleaned;
    }
    
    // If it starts with +237, remove the +
    if (phone.startsWith('+237')) {
      return cleaned;
    }
    
    // If it's a local number, add 237
    if (cleaned.length === 9) {
      return `237${cleaned}`;
    }
    
    return cleaned;
  }

  // Check if service is configured
  isConfigured() {
    return !!(this.accessToken && this.phoneNumberId);
  }
}

module.exports = WhatsAppService;
