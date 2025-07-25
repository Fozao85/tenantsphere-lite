const WhatsAppService = require('./WhatsAppService');
const UserService = require('./UserService');
const ConversationService = require('./ConversationService');
const PropertyService = require('./PropertyService');
const { logger } = require('../utils/logger');

class MessageHandlerService {
  constructor() {
    this.whatsapp = new WhatsAppService();
    this.userService = new UserService();
    this.conversationService = new ConversationService();
    this.propertyService = new PropertyService();
  }

  // Main message processing entry point
  async processMessage(messageData) {
    try {
      const { from, id: messageId, type, timestamp } = messageData;
      
      logger.info(`Processing ${type} message from ${from}`, { messageId });

      // Mark message as read
      await this.whatsapp.markMessageAsRead(messageId);

      // Get or create user
      const user = await this.getOrCreateUser(from, messageData);
      
      // Get or create conversation
      const conversation = await this.conversationService.getOrCreateConversation(user.id, from);

      // Add message to conversation
      await this.conversationService.addMessage(conversation.id, {
        type,
        direction: 'incoming',
        content: this.extractMessageContent(messageData),
        metadata: { messageId, timestamp }
      });

      // Process based on message type
      switch (type) {
        case 'text':
          await this.handleTextMessage(user, conversation, messageData);
          break;
        case 'interactive':
          await this.handleInteractiveMessage(user, conversation, messageData);
          break;
        case 'image':
          await this.handleImageMessage(user, conversation, messageData);
          break;
        case 'location':
          await this.handleLocationMessage(user, conversation, messageData);
          break;
        default:
          await this.handleUnsupportedMessage(user, conversation, messageData);
      }

    } catch (error) {
      logger.error('Error processing message:', error);
      // Send error message to user
      try {
        await this.whatsapp.sendTextMessage(
          messageData.from,
          "Sorry, I encountered an error processing your message. Please try again or contact support."
        );
      } catch (sendError) {
        logger.error('Error sending error message:', sendError);
      }
    }
  }

  // Handle text messages
  async handleTextMessage(user, conversation, messageData) {
    const messageText = messageData.text.body.toLowerCase().trim();
    const from = messageData.from;

    logger.info(`Handling text message: "${messageText}" from ${from}`);

    // Check for common commands first
    if (await this.handleCommonCommands(user, conversation, messageText, from)) {
      return;
    }

    // Handle based on current conversation flow
    switch (conversation.currentFlow) {
      case 'welcome':
        await this.handleWelcomeFlow(user, conversation, messageText, from);
        break;
      case 'property_search':
        await this.handlePropertySearchFlow(user, conversation, messageText, from);
        break;
      case 'booking':
        await this.handleBookingFlow(user, conversation, messageText, from);
        break;
      case 'preferences':
        await this.handlePreferencesFlow(user, conversation, messageText, from);
        break;
      default:
        await this.handleDefaultFlow(user, conversation, messageText, from);
    }
  }

  // Handle interactive messages (buttons, lists)
  async handleInteractiveMessage(user, conversation, messageData) {
    const interactive = messageData.interactive;
    const from = messageData.from;

    if (interactive.type === 'button_reply') {
      const buttonId = interactive.button_reply.id;
      await this.handleButtonResponse(user, conversation, buttonId, from);
    } else if (interactive.type === 'list_reply') {
      const listId = interactive.list_reply.id;
      await this.handleListResponse(user, conversation, listId, from);
    }
  }

  // Handle common commands
  async handleCommonCommands(user, conversation, messageText, from) {
    const commands = {
      'start': () => this.sendWelcomeMessage(user, from),
      'help': () => this.sendHelpMessage(from),
      'menu': () => this.sendMainMenu(user, from),
      'search': () => this.startPropertySearch(user, conversation, from),
      'preferences': () => this.startPreferencesSetup(user, conversation, from),
      'bookings': () => this.showUserBookings(user, from),
      'stop': () => this.handleOptOut(user, from)
    };

    const command = commands[messageText];
    if (command) {
      await command();
      return true;
    }

    return false;
  }

  // Send welcome message
  async sendWelcomeMessage(user, from) {
    const greeting = user.getGreeting();
    const welcomeText = `${greeting} Welcome to Tenantsphere! 🏠

I'm here to help you find the perfect rental property in Buea. Here's what I can do:

🔍 Search for properties
📋 Show property details
📅 Book property tours
⚙️ Set your preferences
📊 Track your bookings

What would you like to do today?`;

    const buttons = [
      { id: 'search_properties', title: '🔍 Search Properties' },
      { id: 'set_preferences', title: '⚙️ Set Preferences' },
      { id: 'view_bookings', title: '📅 My Bookings' }
    ];

    await this.whatsapp.sendButtonMessage(from, welcomeText, buttons);
    await this.conversationService.updateFlow(user.id, 'welcome', 'menu_shown');
  }

  // Send help message
  async sendHelpMessage(from) {
    const helpText = `🆘 *Help & Commands*

Here are the commands you can use:

• *start* - Show welcome message
• *menu* - Show main menu
• *search* - Search for properties
• *preferences* - Set your preferences
• *bookings* - View your bookings
• *help* - Show this help message
• *stop* - Opt out of notifications

You can also just tell me what you're looking for, like:
• "I need a 2-bedroom apartment in Molyko"
• "Show me properties under 80,000 XAF"
• "Book a tour for tomorrow"

Need human assistance? Contact our support team at +237123456789`;

    await this.whatsapp.sendTextMessage(from, helpText);
  }

  // Send main menu
  async sendMainMenu(user, from) {
    const menuText = `🏠 *Main Menu*

What would you like to do?`;

    const sections = [
      {
        title: "Property Search",
        rows: [
          { id: 'search_all', title: '🔍 Browse All Properties', description: 'See all available properties' },
          { id: 'search_filtered', title: '🎯 Filtered Search', description: 'Search with specific criteria' },
          { id: 'search_recommended', title: '⭐ Recommended', description: 'Properties matching your preferences' }
        ]
      },
      {
        title: "Account & Settings",
        rows: [
          { id: 'set_preferences', title: '⚙️ Set Preferences', description: 'Update your search preferences' },
          { id: 'view_bookings', title: '📅 My Bookings', description: 'View and manage your bookings' },
          { id: 'view_profile', title: '👤 My Profile', description: 'View your profile information' }
        ]
      }
    ];

    await this.whatsapp.sendListMessage(from, menuText, 'Select Option', sections);
  }

  // Start property search
  async startPropertySearch(user, conversation, from) {
    const searchText = `🔍 *Property Search*

Let's find your perfect home! How would you like to search?`;

    const buttons = [
      { id: 'search_by_location', title: '📍 By Location' },
      { id: 'search_by_budget', title: '💰 By Budget' },
      { id: 'search_by_type', title: '🏠 By Type' }
    ];

    await this.whatsapp.sendButtonMessage(from, searchText, buttons);
    await this.conversationService.updateFlow(conversation.id, 'property_search', 'search_method');
  }

  // Handle property search flow
  async handlePropertySearchFlow(user, conversation, messageText, from) {
    switch (conversation.currentStep) {
      case 'location_input':
        await this.handleLocationInput(user, conversation, messageText, from);
        break;
      case 'budget_input':
        await this.handleBudgetInput(user, conversation, messageText, from);
        break;
      case 'type_input':
        await this.handleTypeInput(user, conversation, messageText, from);
        break;
      default:
        await this.handleGeneralSearch(user, conversation, messageText, from);
    }
  }

  // Handle general search query
  async handleGeneralSearch(user, conversation, messageText, from) {
    try {
      // Extract search criteria from natural language
      const searchCriteria = this.extractSearchCriteria(messageText);
      
      // Search properties
      const properties = await this.propertyService.searchProperties(messageText, {
        status: 'available',
        ...searchCriteria
      });

      if (properties.length === 0) {
        await this.whatsapp.sendTextMessage(from, 
          "Sorry, I couldn't find any properties matching your criteria. Try adjusting your search or contact our agents for more options."
        );
        return;
      }

      // Show first few properties
      await this.showPropertyResults(user, properties.slice(0, 5), from);
      
      // Update conversation context
      await this.conversationService.updateContext(conversation.id, {
        lastSearch: messageText,
        searchResults: properties.map(p => p.id),
        currentResultIndex: 5
      });

    } catch (error) {
      logger.error('Error in general search:', error);
      await this.whatsapp.sendTextMessage(from, 
        "I encountered an error while searching. Please try again or use the menu options."
      );
    }
  }

  // Show property results
  async showPropertyResults(user, properties, from) {
    for (const property of properties) {
      // Send property summary
      await this.whatsapp.sendTextMessage(from, property.getWhatsAppSummary());
      
      // Send first image if available
      if (property.images && property.images.length > 0) {
        await this.whatsapp.sendImageMessage(from, property.images[0]);
      }

      // Send action buttons
      const buttons = [
        { id: `view_${property.id}`, title: '👁️ View Details' },
        { id: `book_${property.id}`, title: '📅 Book Tour' },
        { id: `next_property`, title: '➡️ Next Property' }
      ];

      await this.whatsapp.sendButtonMessage(from, 
        "What would you like to do with this property?", 
        buttons
      );

      // Track property view
      await this.propertyService.incrementViewCount(property.id);
      await this.userService.addViewedProperty(user.id, property.id);
    }
  }

  // Extract search criteria from natural language
  extractSearchCriteria(text) {
    const criteria = {};
    const lowerText = text.toLowerCase();

    // Extract location
    const locations = ['molyko', 'mile 16', 'bonduma', 'buea town', 'great soppo'];
    for (const location of locations) {
      if (lowerText.includes(location)) {
        criteria.location = location;
        break;
      }
    }

    // Extract price
    const priceMatch = lowerText.match(/(\d+)[,\s]*(\d+)?\s*(xaf|francs?|cfa)/i);
    if (priceMatch) {
      const price = parseInt(priceMatch[1] + (priceMatch[2] || ''));
      if (lowerText.includes('under') || lowerText.includes('below') || lowerText.includes('max')) {
        criteria.maxPrice = price;
      } else if (lowerText.includes('above') || lowerText.includes('over') || lowerText.includes('min')) {
        criteria.minPrice = price;
      }
    }

    // Extract bedrooms
    const bedroomMatch = lowerText.match(/(\d+)[- ]?bedroom/i);
    if (bedroomMatch) {
      criteria.bedrooms = parseInt(bedroomMatch[1]);
    }

    // Extract property type
    if (lowerText.includes('apartment')) criteria.propertyType = 'apartment';
    if (lowerText.includes('house')) criteria.propertyType = 'house';
    if (lowerText.includes('studio')) criteria.propertyType = 'studio';

    return criteria;
  }

  // Get or create user
  async getOrCreateUser(whatsappId, messageData) {
    try {
      let user = await this.userService.getUserByWhatsAppId(whatsappId);

      if (!user) {
        // Format phone number correctly
        const formattedPhone = whatsappId.startsWith('+') ? whatsappId : `+${whatsappId}`;

        // Create new user
        const userData = {
          whatsappId: whatsappId,
          phone: formattedPhone,
          name: messageData.contacts?.[0]?.profile?.name || null,
          optedIn: true
        };

        logger.info('Creating new user with data:', {
          whatsappId: userData.whatsappId,
          phone: userData.phone,
          name: userData.name
        });

        user = await this.userService.createUser(userData);
        logger.info(`Created new user: ${user.id} for WhatsApp ID: ${whatsappId}`);
      }

      return user;
    } catch (error) {
      logger.error('Error getting or creating user:', {
        whatsappId,
        message: error.message,
        code: error.code,
        details: error.details
      });
      throw error;
    }
  }

  // Extract message content based on type
  extractMessageContent(messageData) {
    switch (messageData.type) {
      case 'text':
        return messageData.text.body;
      case 'interactive':
        if (messageData.interactive.type === 'button_reply') {
          return messageData.interactive.button_reply.title;
        } else if (messageData.interactive.type === 'list_reply') {
          return messageData.interactive.list_reply.title;
        }
        break;
      case 'image':
        return `[Image: ${messageData.image.caption || 'No caption'}]`;
      case 'location':
        return `[Location: ${messageData.location.latitude}, ${messageData.location.longitude}]`;
      default:
        return `[${messageData.type} message]`;
    }
  }

  // Handle unsupported message types
  async handleUnsupportedMessage(user, conversation, messageData) {
    const supportedTypes = "I can understand text messages, buttons, images, and locations. Please try sending a text message or use the menu options.";
    await this.whatsapp.sendTextMessage(messageData.from, supportedTypes);
  }
}

module.exports = MessageHandlerService;
