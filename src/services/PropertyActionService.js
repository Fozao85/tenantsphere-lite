const { logger } = require('../utils/logger');
const WhatsAppService = require('./WhatsAppService');
const PropertyService = require('./PropertyService');
const UserService = require('./UserService');
const ConversationService = require('./ConversationService');

class PropertyActionService {
  constructor() {
    this.whatsapp = new WhatsAppService();
    this.propertyService = new PropertyService();
    this.userService = new UserService();
    this.conversationService = new ConversationService();
  }

  // Handle property action button clicks
  async handlePropertyAction(actionId, user, conversation, from) {
    try {
      logger.info(`Handling property action: ${actionId} from ${from}`);

      // Parse action ID to get action type and property ID
      const [action, propertyId] = actionId.split('_', 2);

      if (!propertyId) {
        await this.whatsapp.sendTextMessage(from, "Invalid property action. Please try again.");
        return;
      }

      // Get property details
      const property = await this.propertyService.getPropertyById(propertyId);
      if (!property) {
        await this.whatsapp.sendTextMessage(from, "Property not found. It may have been removed or is no longer available.");
        return;
      }

      // Route to appropriate action handler
      switch (action) {
        case 'view':
          await this.handleViewDetails(property, user, conversation, from);
          break;
        case 'gallery':
          await this.handleViewGallery(property, user, conversation, from);
          break;
        case 'book':
          await this.handleBookTour(property, user, conversation, from);
          break;
        case 'contact':
          await this.handleContactAgent(property, user, conversation, from);
          break;
        case 'save':
          await this.handleSaveProperty(property, user, conversation, from);
          break;
        case 'share':
          await this.handleShareProperty(property, user, conversation, from);
          break;
        case 'details':
          await this.handleMoreDetails(property, user, conversation, from);
          break;
        default:
          await this.whatsapp.sendTextMessage(from, "Unknown action. Please try again.");
      }

      // Track user interaction
      await this.trackPropertyInteraction(user.id, propertyId, action);

    } catch (error) {
      logger.error('Error handling property action:', error);
      await this.whatsapp.sendTextMessage(from, 
        "Sorry, I encountered an error processing your request. Please try again."
      );
    }
  }

  // Handle view property details
  async handleViewDetails(property, user, conversation, from) {
    const PropertyDisplayService = require('./PropertyDisplayService');
    const displayService = new PropertyDisplayService();
    
    await this.whatsapp.sendTextMessage(from, "📋 Loading detailed property information...");
    await displayService.sendDetailedPropertyCard(property, from);
  }

  // Handle view property gallery
  async handleViewGallery(property, user, conversation, from) {
    const PropertyDisplayService = require('./PropertyDisplayService');
    const displayService = new PropertyDisplayService();
    
    await displayService.sendPropertyGallery(property, from);
  }

  // Handle book property tour
  async handleBookTour(property, user, conversation, from) {
    try {
      const message = `📅 *Book Property Tour*\n\n🏠 *Property:* ${property.title || property.type}\n📍 *Location:* ${property.location}\n\nTo book a tour, please provide:\n\n1️⃣ *Preferred date* (e.g., "Tomorrow", "Monday", "25th January")\n2️⃣ *Preferred time* (e.g., "Morning", "2 PM", "After 4 PM")\n3️⃣ *Your contact number* (if different from WhatsApp)\n\nExample: "I'd like to visit tomorrow afternoon around 3 PM, my number is +237 XXX XXX XXX"\n\nWhat's your preferred date and time?`;

      await this.whatsapp.sendTextMessage(from, message);

      // Update conversation to await booking details
      await this.conversationService.updateConversation(conversation.id, {
        currentFlow: 'booking',
        currentStep: 'awaiting_booking_details',
        currentPropertyId: property.id,
        lastActivity: new Date()
      });

    } catch (error) {
      logger.error('Error handling book tour:', error);
      await this.whatsapp.sendTextMessage(from, "Sorry, I couldn't process your booking request. Please try again or contact our agents directly.");
    }
  }

  // Handle contact agent
  async handleContactAgent(property, user, conversation, from) {
    try {
      let message = `👨‍💼 *Contact Agent*\n\n🏠 *Property:* ${property.title || property.type}\n📍 *Location:* ${property.location}\n\n`;

      if (property.agent) {
        message += `*Agent Details:*\n`;
        message += `👤 *Name:* ${property.agent.name}\n`;
        
        if (property.agent.phone) {
          message += `📞 *Phone:* ${property.agent.phone}\n`;
        }
        
        if (property.agent.email) {
          message += `📧 *Email:* ${property.agent.email}\n`;
        }
        
        if (property.agent.whatsapp) {
          message += `💬 *WhatsApp:* ${property.agent.whatsapp}\n`;
        }
        
        message += `\n💡 *Tip:* Mention this property when you contact the agent.`;
      } else {
        message += `*General Contact:*\n`;
        message += `📞 *Phone:* +237 XXX XXX XXX\n`;
        message += `📧 *Email:* agents@tenantsphere.com\n`;
        message += `💬 *WhatsApp:* This number\n`;
        message += `\n💡 *Property Reference:* ${property.id}`;
      }

      const buttons = [
        { id: `call_agent_${property.id}`, title: '📞 Call Now' },
        { id: `whatsapp_agent_${property.id}`, title: '💬 WhatsApp' },
        { id: `book_${property.id}`, title: '📅 Book Tour' }
      ];

      await this.whatsapp.sendButtonMessage(from, message, buttons);

    } catch (error) {
      logger.error('Error handling contact agent:', error);
      await this.whatsapp.sendTextMessage(from, "Sorry, I couldn't load agent contact information. Please try again.");
    }
  }

  // Handle save property
  async handleSaveProperty(property, user, conversation, from) {
    try {
      // Add property to user's saved properties
      await this.userService.addSavedProperty(user.id, property.id);

      const message = `💾 *Property Saved!*\n\n🏠 ${property.title || property.type}\n📍 ${property.location}\n\nThis property has been added to your saved list. You can view all your saved properties anytime from the main menu.`;

      const buttons = [
        { id: `view_saved_properties`, title: '📋 View Saved' },
        { id: `book_${property.id}`, title: '📅 Book Tour' },
        { id: `continue_browsing`, title: '🔍 Continue Browsing' }
      ];

      await this.whatsapp.sendButtonMessage(from, message, buttons);

      logger.info(`Property ${property.id} saved by user ${user.id}`);

    } catch (error) {
      logger.error('Error saving property:', error);
      await this.whatsapp.sendTextMessage(from, "Sorry, I couldn't save the property right now. Please try again later.");
    }
  }

  // Handle share property
  async handleShareProperty(property, user, conversation, from) {
    try {
      const shareMessage = `🏠 *Check out this property!*\n\n*${property.title || property.type}*\n📍 ${property.location}\n💰 ${this.formatPrice(property.price)} FCFA/month\n\n`;
      
      if (property.bedrooms !== undefined) {
        shareMessage += `🛏️ ${property.bedrooms === 0 ? 'Studio' : property.bedrooms + ' bedrooms'}\n`;
      }
      
      if (property.amenities && property.amenities.length > 0) {
        shareMessage += `✨ ${property.amenities.slice(0, 3).join(', ')}\n`;
      }
      
      shareMessage += `\n🔗 Property ID: ${property.id}\n\nFound via Tenantsphere - Your trusted property finder! 🏠`;

      await this.whatsapp.sendTextMessage(from, 
        `📤 *Share Property*\n\nHere's a shareable message for this property. You can copy and send it to anyone:\n\n---\n\n${shareMessage}\n\n---\n\nYou can also forward the property images and details directly from our chat.`
      );

      // Send the property image for easy sharing
      if (property.images && property.images.length > 0) {
        await this.whatsapp.sendImageMessage(from, property.images[0], shareMessage);
      }

    } catch (error) {
      logger.error('Error sharing property:', error);
      await this.whatsapp.sendTextMessage(from, "Sorry, I couldn't generate the share message. Please try again.");
    }
  }

  // Handle more details request
  async handleMoreDetails(property, user, conversation, from) {
    try {
      let message = `📋 *Additional Property Details*\n\n`;
      
      // Property specifications
      if (property.yearBuilt) {
        message += `🏗️ *Year Built:* ${property.yearBuilt}\n`;
      }
      
      if (property.floorLevel) {
        message += `🏢 *Floor Level:* ${property.floorLevel}\n`;
      }
      
      if (property.totalFloors) {
        message += `🏢 *Total Floors:* ${property.totalFloors}\n`;
      }
      
      if (property.size) {
        message += `📐 *Size:* ${property.size} sqm\n`;
      }
      
      // Utilities and costs
      if (property.utilities) {
        message += `\n💡 *Utilities:*\n`;
        if (property.utilities.electricity) message += `⚡ Electricity: ${property.utilities.electricity}\n`;
        if (property.utilities.water) message += `💧 Water: ${property.utilities.water}\n`;
        if (property.utilities.internet) message += `📶 Internet: ${property.utilities.internet}\n`;
      }
      
      // Additional costs
      if (property.deposit) {
        message += `\n💰 *Security Deposit:* ${this.formatPrice(property.deposit)} FCFA\n`;
      }
      
      if (property.agentFee) {
        message += `💼 *Agent Fee:* ${this.formatPrice(property.agentFee)} FCFA\n`;
      }
      
      // Neighborhood info
      if (property.neighborhood) {
        message += `\n🏘️ *Neighborhood:* ${property.neighborhood}\n`;
      }
      
      if (property.nearbyPlaces && property.nearbyPlaces.length > 0) {
        message += `\n📍 *Nearby Places:*\n`;
        property.nearbyPlaces.forEach(place => {
          message += `• ${place}\n`;
        });
      }
      
      // Property rules
      if (property.rules && property.rules.length > 0) {
        message += `\n📋 *Property Rules:*\n`;
        property.rules.forEach(rule => {
          message += `• ${rule}\n`;
        });
      }

      const buttons = [
        { id: `book_${property.id}`, title: '📅 Book Tour' },
        { id: `contact_${property.id}`, title: '📞 Contact Agent' },
        { id: `save_${property.id}`, title: '💾 Save Property' }
      ];

      await this.whatsapp.sendButtonMessage(from, message, buttons);

    } catch (error) {
      logger.error('Error showing more details:', error);
      await this.whatsapp.sendTextMessage(from, "Sorry, I couldn't load additional details. Please try again.");
    }
  }

  // Track property interaction for analytics and recommendations
  async trackPropertyInteraction(userId, propertyId, action) {
    try {
      // This would typically save to analytics database
      logger.info(`User ${userId} performed ${action} on property ${propertyId}`);
      
      // Update user's interaction history for better recommendations
      await this.userService.addPropertyInteraction(userId, {
        propertyId,
        action,
        timestamp: new Date()
      });

    } catch (error) {
      logger.warn('Could not track property interaction:', error.message);
    }
  }

  // Format price with proper comma separation
  formatPrice(price) {
    if (!price) return 'Price on request';
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
}

module.exports = PropertyActionService;
