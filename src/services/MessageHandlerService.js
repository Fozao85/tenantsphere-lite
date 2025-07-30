const WhatsAppService = require('./WhatsAppService');
const UserService = require('./UserService');
const ConversationService = require('./ConversationService');
const PropertyService = require('./PropertyService');
const PropertySearchService = require('./PropertySearchService');
const PropertyDisplayService = require('./PropertyDisplayService');
const PropertyActionService = require('./PropertyActionService');
const RecommendationService = require('./RecommendationService');
const PreferenceLearningService = require('./PreferenceLearningService');
const ConversationFlowService = require('./ConversationFlowService');
const NLPService = require('./NLPService');
const { logger } = require('../utils/logger');

class MessageHandlerService {
  constructor() {
    this.whatsapp = new WhatsAppService();
    this.userService = new UserService();
    this.conversationService = new ConversationService();
    this.propertyService = new PropertyService();
    this.propertySearchService = new PropertySearchService();
    this.propertyDisplayService = new PropertyDisplayService();
    this.propertyActionService = new PropertyActionService();
    this.recommendationService = new RecommendationService();
    this.preferenceLearningService = new PreferenceLearningService();
    this.conversationFlowService = new ConversationFlowService();
    this.nlpService = new NLPService();
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

      // Determine conversation flow
      const messageText = this.extractMessageContent(messageData);
      let flowResult;
      try {
        flowResult = await this.conversationFlowService.determineFlow(
          user, conversation, messageText, type
        );
        logger.info(`Flow determined: ${flowResult.flow} - ${flowResult.state} (${flowResult.action})`);
      } catch (flowError) {
        logger.error('Error determining conversation flow:', {
          message: flowError.message,
          stack: flowError.stack,
          user: user.id,
          conversation: conversation.id,
          messageText: messageText
        });
        // Fallback to default flow
        flowResult = {
          flow: 'property_search',
          state: 'initial',
          action: 'initiated'
        };
        logger.info(`Using fallback flow: ${flowResult.flow} - ${flowResult.state} (${flowResult.action})`);
      }

      // Process based on message type with flow context
      switch (type) {
        case 'text':
          await this.handleTextMessageInFlow(user, conversation, messageData, flowResult);
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

      // Learn from user interaction
      try {
        await this.learnFromInteraction(user, messageData, flowResult);
      } catch (learningError) {
        logger.error('Error learning from interaction:', {
          message: learningError.message,
          stack: learningError.stack,
          user: user.id,
          messageType: messageData.type,
          flow: flowResult.flow
        });
      }

    } catch (error) {
      logger.error('Error processing message:', {
        message: error.message,
        stack: error.stack,
        from: messageData.from,
        messageType: messageData.type,
        messageId: messageData.id
      });
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
    try {
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
    } catch (error) {
      logger.error('Error in handleTextMessage:', {
        message: error.message,
        stack: error.stack,
        messageData: messageData,
        conversationFlow: conversation?.currentFlow
      });
      throw error; // Re-throw to be caught by main error handler
    }
  }

  // Handle text messages with flow context
  async handleTextMessageInFlow(user, conversation, messageData, flowResult) {
    try {
      const messageText = messageData.text.body.toLowerCase().trim();
      const from = messageData.from;

      logger.info(`Handling text message in flow: "${messageText}" from ${from}`, {
        flow: flowResult.flow,
        state: flowResult.state,
        action: flowResult.action
      });

      // Check for common commands first
      if (await this.handleCommonCommands(user, conversation, messageText, from)) {
        return;
      }

      // Handle based on determined flow and state
      switch (flowResult.flow) {
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
    } catch (error) {
      logger.error('Error in handleTextMessageInFlow:', {
        message: error.message,
        stack: error.stack,
        messageData: messageData,
        flowResult: flowResult,
        conversationFlow: conversation?.currentFlow
      });
      throw error; // Re-throw to be caught by main error handler
    }
  }

  // Handle welcome flow
  async handleWelcomeFlow(user, conversation, messageText, from) {
    await this.sendWelcomeMessage(user, from);

    // Update conversation flow
    try {
      await this.conversationService.updateConversation(conversation.id, {
        currentFlow: 'main_menu',
        lastActivity: new Date()
      });
    } catch (error) {
      logger.warn('Could not update conversation:', error.message);
    }
  }

  // Handle property search flow
  async handlePropertySearchFlow(user, conversation, messageText, from) {
    // Route based on current step in the search flow
    switch (conversation.currentStep) {
      case 'awaiting_search_query':
      case 'awaiting_smart_search':
      case 'awaiting_advanced_search':
        await this.processSearchQuery(user, conversation, messageText, from);
        break;
      default:
        // Start new search
        await this.startPropertySearch(user, conversation, from);
    }
  }

  // Handle booking flow
  async handleBookingFlow(user, conversation, messageText, from) {
    await this.showUserBookings(user, from);
  }

  // Handle preferences flow
  async handlePreferencesFlow(user, conversation, messageText, from) {
    await this.startPreferencesSetup(user, conversation, from);
  }

  // Handle default flow
  async handleDefaultFlow(user, conversation, messageText, from) {
    // For any unrecognized flow, show the main menu
    await this.sendMainMenu(user, from);
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

  // Handle list responses (menu selections)
  async handleListResponse(user, conversation, listId, from) {
    try {
      logger.info(`Handling list response: ${listId} from ${from}`);

      switch (listId) {
        // Property Search Options
        case 'search_all':
          await this.browseAllProperties(user, conversation, from);
          break;
        case 'search_filtered':
          await this.startFilteredSearch(user, conversation, from);
          break;
        case 'search_recommended':
          await this.showRecommendedProperties(user, conversation, from);
          break;
        case 'smart_search':
          await this.startSmartSearch(user, conversation, from);
          break;
        case 'browse_featured':
          await this.showFeaturedProperties(user, conversation, from);
          break;
        case 'filter_search':
          await this.startAdvancedFilters(user, conversation, from);
          break;

        // Property Actions
        case 'show_more_results':
          await this.showMoreResults(user, conversation, from);
          break;
        case 'refine_search':
          await this.startPropertySearch(user, conversation, from);
          break;
        case 'contact_agent':
          await this.contactAgent(user, conversation, from);
          break;
        case 'new_search':
          await this.startPropertySearch(user, conversation, from);
          break;
        case 'save_search':
          await this.saveCurrentSearch(user, conversation, from);
          break;

        // No Results Actions
        case 'show_featured':
          await this.showFeaturedProperties(user, conversation, from);
          break;
        case 'broaden_search':
          await this.broadenSearch(user, conversation, from);
          break;

        default:
          await this.whatsapp.sendTextMessage(from, "I didn't understand that option. Please try again or use the main menu.");
          await this.sendMainMenu(user, from);
      }

    } catch (error) {
      logger.error('Error handling list response:', error);
      await this.whatsapp.sendTextMessage(from,
        "Sorry, I encountered an error processing your selection. Please try again."
      );
    }
  }

  // Handle button responses (interactive button clicks)
  async handleButtonResponse(user, conversation, buttonId, from) {
    try {
      logger.info(`Handling button response: ${buttonId} from ${from}`);

      // Check if it's a property action (view_, book_, contact_, save_, etc.)
      if (this.isPropertyAction(buttonId)) {
        await this.propertyActionService.handlePropertyAction(buttonId, user, conversation, from);
        return;
      }

      // Handle other button actions
      switch (buttonId) {
        // Welcome message property type selections
        case 'search_apartments':
          await this.searchByPropertyType(user, conversation, 'apartment', from);
          break;
        case 'search_houses':
          await this.searchByPropertyType(user, conversation, 'house', from);
          break;
        case 'show_featured':
          await this.showFeaturedProperties(from);
          break;

        // Search and browsing actions
        case 'smart_search':
          await this.startSmartSearch(user, conversation, from);
          break;
        case 'browse_featured':
          await this.showFeaturedProperties(user, conversation, from);
          break;
        case 'filter_search':
          await this.startAdvancedFilters(user, conversation, from);
          break;

        // Result navigation
        case 'show_more_results':
          await this.showMoreResults(user, conversation, from);
          break;
        case 'browse_carousel':
          await this.startPropertyCarousel(user, conversation, from);
          break;
        case 'compare_properties':
          await this.startPropertyComparison(user, conversation, from);
          break;

        // User actions
        case 'new_search':
          await this.startPropertySearch(user, conversation, from);
          break;
        case 'save_search':
          await this.saveCurrentSearch(user, conversation, from);
          break;
        case 'refine_search':
          await this.startPropertySearch(user, conversation, from);
          break;
        case 'contact_agent':
          await this.contactAgent(user, conversation, from);
          break;

        // Navigation actions
        case 'main_menu':
          await this.sendMainMenu(user, from);
          break;
        case 'continue_browsing':
          await this.startPropertySearch(user, conversation, from);
          break;
        case 'view_saved_properties':
          await this.showSavedProperties(user, conversation, from);
          break;

        // Carousel navigation
        case buttonId.startsWith('next_') ? buttonId : null:
          await this.handleCarouselNavigation(user, conversation, buttonId, from);
          break;
        case buttonId.startsWith('prev_') ? buttonId : null:
          await this.handleCarouselNavigation(user, conversation, buttonId, from);
          break;

        default:
          await this.whatsapp.sendTextMessage(from, "I didn't understand that action. Please try again or use the main menu.");
          await this.sendMainMenu(user, from);
      }

    } catch (error) {
      logger.error('Error handling button response:', error);
      await this.whatsapp.sendTextMessage(from,
        "Sorry, I encountered an error processing your action. Please try again."
      );
    }
  }

  // Check if button ID is a property action
  isPropertyAction(buttonId) {
    const propertyActions = ['view_', 'book_', 'contact_', 'save_', 'share_', 'gallery_', 'details_'];
    return propertyActions.some(action => buttonId.startsWith(action));
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
    // Skip conversation flow update for now - will be handled elsewhere
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

I can help you find the perfect property! You can:

📝 *Tell me what you're looking for* (e.g., "2 bedroom apartment in Molyko under 80,000 FCFA")
📍 *Search by location*
💰 *Search by budget*
🏠 *Search by property type*

What would you like to do?`;

    const buttons = [
      { id: 'smart_search', title: '🤖 Smart Search' },
      { id: 'browse_featured', title: '⭐ Featured Properties' },
      { id: 'filter_search', title: '🔧 Advanced Filters' }
    ];

    await this.whatsapp.sendButtonMessage(from, searchText, buttons);

    // Update conversation to await search query
    await this.conversationService.updateConversation(conversation.id, {
      currentFlow: 'property_search',
      currentStep: 'awaiting_search_query',
      lastActivity: new Date()
    });
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

  // Handle general search (default case for property search flow)
  async handleGeneralSearch(user, conversation, messageText, from) {
    try {
      logger.info(`Handling general search from ${from}: "${messageText}"`);

      // Process the search query using the intelligent search system
      await this.processSearchQuery(user, conversation, messageText, from);

    } catch (error) {
      logger.error('Error in handleGeneralSearch:', {
        message: error.message,
        stack: error.stack,
        from: from,
        messageText: messageText
      });

      await this.whatsapp.sendTextMessage(from,
        "Sorry, I encountered an error while processing your search. Please try again or contact support."
      );
    }
  }

  // Process intelligent search query
  async processSearchQuery(user, conversation, messageText, from) {
    try {
      logger.info(`Processing search query from ${from}: "${messageText}"`);

      // Handle greeting messages
      if (this.isGreeting(messageText)) {
        await this.sendWelcomeMessage(from);
        return;
      }

      // Use NLP to parse the user's query
      let searchCriteria;
      try {
        searchCriteria = this.nlpService.parseUserQuery(messageText);
        logger.info('Search criteria parsed successfully:', searchCriteria);
      } catch (nlpError) {
        logger.error('Error parsing search query with NLP:', nlpError);
        searchCriteria = { intent: 'search' };
      }

      // Get user preferences for better ranking
      const userPreferences = user.preferences || {};

      // Search properties using intelligent search
      let properties = [];
      try {
        properties = await this.propertySearchService.searchProperties(searchCriteria, userPreferences);
        logger.info(`Property search completed, found ${properties.length} properties`);
      } catch (searchError) {
        logger.error('Error in property search service:', {
          message: searchError.message,
          stack: searchError.stack,
          searchCriteria: searchCriteria
        });

        // Try fallback search
        try {
          properties = await this.fallbackSearch(messageText);
          logger.info(`Fallback search completed, found ${properties.length} properties`);
        } catch (fallbackError) {
          logger.error('Fallback search also failed:', fallbackError);
          await this.whatsapp.sendTextMessage(from,
            "I'm having trouble searching right now. Let me show you some featured properties instead!"
          );
          await this.showFeaturedProperties(from);
          return;
        }
      }

      if (properties.length === 0) {
        await this.handleNoResults(user, conversation, messageText, from, searchCriteria);
        return;
      }

      // Send search results
      await this.sendPropertyResults(user, conversation, properties, from);

    } catch (error) {
      logger.error('Error processing search query:', {
        message: error.message,
        stack: error.stack,
        from: from,
        messageText: messageText
      });

      await this.whatsapp.sendTextMessage(from,
        "Sorry, I encountered an error while searching. Let me show you some available properties instead!"
      );

      // Try to show some properties as fallback
      try {
        await this.showFeaturedProperties(from);
      } catch (fallbackError) {
        logger.error('Even fallback failed:', fallbackError);
        await this.whatsapp.sendTextMessage(from,
          "I'm experiencing technical difficulties. Please try again in a few minutes or contact support."
        );
      }
    }
  }

  // Check if message is a greeting
  isGreeting(messageText) {
    const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'greetings'];
    const normalizedText = messageText.toLowerCase().trim();
    return greetings.some(greeting => normalizedText === greeting || normalizedText.startsWith(greeting + ' '));
  }

  // Send welcome message
  async sendWelcomeMessage(from) {
    const welcomeMessage = `👋 Hello! Welcome to TenantSphere!

I'm here to help you find the perfect rental property in Buea.

🏠 *What I can help you with:*
• Find apartments, houses, studios, and more
• Search by location, price, and amenities
• Book property tours
• Get property recommendations

🔍 *Try searching like this:*
• "2 bedroom apartment in Molyko"
• "Cheap studio with parking"
• "House under 100000 in Great Soppo"

What type of property are you looking for?`;

    const buttons = [
      { id: 'search_apartments', title: '🏢 Apartments' },
      { id: 'search_houses', title: '🏠 Houses' },
      { id: 'show_featured', title: '⭐ Featured' }
    ];

    await this.whatsapp.sendButtonMessage(from, welcomeMessage, buttons);
  }

  // Fallback search when main search fails
  async fallbackSearch(messageText) {
    try {
      // Simple text-based search using PropertyService
      const properties = await this.propertyService.searchProperties(messageText);
      return properties || [];
    } catch (error) {
      logger.error('Fallback search failed:', error);
      return [];
    }
  }

  // Search by property type (from welcome message buttons)
  async searchByPropertyType(user, conversation, propertyType, from) {
    try {
      logger.info(`Searching for ${propertyType} properties for user ${from}`);

      // Send immediate response
      await this.whatsapp.sendTextMessage(from,
        `🏠 Great choice! Let me find ${propertyType}s for you...`
      );

      // Search for properties of the specified type
      const searchCriteria = {
        propertyType: propertyType,
        intent: 'search'
      };

      const userPreferences = user.preferences || {};
      let properties = [];

      try {
        properties = await this.propertySearchService.searchProperties(searchCriteria, userPreferences);
        logger.info(`Found ${properties.length} ${propertyType} properties`);
      } catch (searchError) {
        logger.error('Error searching by property type:', searchError);
        // Fallback to all properties filtered by type
        try {
          const allProperties = await this.propertyService.getAllProperties();
          properties = allProperties.filter(p =>
            p.propertyType && p.propertyType.toLowerCase() === propertyType.toLowerCase()
          );
        } catch (fallbackError) {
          logger.error('Fallback search also failed:', fallbackError);
        }
      }

      if (properties.length === 0) {
        await this.handleNoResults(user, conversation, `${propertyType} properties`, from, searchCriteria);
        return;
      }

      // Send property results
      await this.sendPropertyResults(user, conversation, properties, from);

    } catch (error) {
      logger.error('Error in searchByPropertyType:', {
        message: error.message,
        stack: error.stack,
        propertyType: propertyType,
        from: from
      });

      await this.whatsapp.sendTextMessage(from,
        `Sorry, I encountered an error while searching for ${propertyType}s. Let me show you some featured properties instead!`
      );

      // Fallback to featured properties
      await this.showFeaturedProperties(from);
    }
  }

  // Show featured properties
  async showFeaturedProperties(from) {
    try {
      // Get some sample properties
      const properties = await this.propertyService.getAllProperties({ limit: 5 });

      if (properties && properties.length > 0) {
        await this.sendPropertyResults(null, null, properties, from);
      } else {
        await this.whatsapp.sendTextMessage(from,
          "I don't have any properties to show right now. Please check back later or contact our support team."
        );
      }
    } catch (error) {
      logger.error('Error showing featured properties:', error);
      await this.whatsapp.sendTextMessage(from,
        "I'm having trouble loading properties right now. Please try again later."
      );
    }
  }

  // Handle no search results
  async handleNoResults(user, conversation, messageText, from, searchCriteria) {
    let message = "🔍 I couldn't find any properties matching your exact criteria.\n\n";

    // Suggest alternatives based on what was searched
    if (searchCriteria.location) {
      message += `📍 Try searching in nearby areas like Molyko, Great Soppo, or Buea Town.\n`;
    }

    if (searchCriteria.priceRange) {
      message += `💰 Consider adjusting your budget range.\n`;
    }

    if (searchCriteria.propertyType) {
      message += `🏠 Try looking at different property types.\n`;
    }

    message += `\n💡 *Suggestions:*\n`;
    message += `• Try "cheap apartments in Molyko"\n`;
    message += `• Try "2 bedroom house under 100000"\n`;
    message += `• Try "studio with parking"\n\n`;
    message += `Or I can show you our featured properties?`;

    const buttons = [
      { id: 'show_featured', title: '⭐ Featured Properties' },
      { id: 'broaden_search', title: '🔍 Broaden Search' },
      { id: 'contact_agent', title: '👨‍💼 Contact Agent' }
    ];

    await this.whatsapp.sendButtonMessage(from, message, buttons);
  }

  // Send property search results with enhanced display
  async sendPropertyResults(user, conversation, properties, from) {
    try {
      const resultCount = properties.length;
      const headerMessage = `🏠 *Found ${resultCount} Properties*\n\nHere are the best matches for you:`;

      await this.whatsapp.sendTextMessage(from, headerMessage);

      // Send top 3 properties using enhanced display service
      const topProperties = properties.slice(0, 3);

      for (let i = 0; i < topProperties.length; i++) {
        const property = topProperties[i];
        await this.propertyDisplayService.sendDetailedPropertyCard(property, from, i + 1);

        // Small delay between messages to avoid rate limiting
        if (i < topProperties.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // If there are more properties, offer browsing options
      if (properties.length > 3) {
        const moreMessage = `📋 I found ${properties.length - 3} more properties. How would you like to continue?`;

        const buttons = [
          { id: 'show_more_results', title: '📋 Show More' },
          { id: 'browse_carousel', title: '🎠 Browse Carousel' },
          { id: 'compare_properties', title: '🔍 Compare Properties' }
        ];

        await this.whatsapp.sendButtonMessage(from, moreMessage, buttons);
      } else {
        // Show enhanced action options
        const actionMessage = `🎯 *What would you like to do next?*`;

        const buttons = [
          { id: 'new_search', title: '🔍 New Search' },
          { id: 'save_search', title: '💾 Save Search' },
          { id: 'browse_featured', title: '⭐ Featured Properties' }
        ];

        await this.whatsapp.sendButtonMessage(from, actionMessage, buttons);
      }

      // Update conversation state with enhanced data
      await this.conversationService.updateConversation(conversation.id, {
        currentStep: 'viewing_results',
        lastSearchResults: properties.map(p => p.id),
        currentResultIndex: 3,
        totalResults: properties.length,
        lastActivity: new Date()
      });

    } catch (error) {
      logger.error('Error sending property results:', error);
      await this.whatsapp.sendTextMessage(from,
        "Sorry, I had trouble displaying the results. Please try again."
      );
    }
  }



  // Format price with proper comma separation
  formatPrice(price) {
    if (!price) return 'Price on request';
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  // Browse all available properties
  async browseAllProperties(user, conversation, from) {
    try {
      await this.whatsapp.sendTextMessage(from, "🔍 Loading all available properties...");

      // Get all available properties
      const properties = await this.propertySearchService.searchProperties({
        availability: true
      }, user.preferences);

      if (properties.length === 0) {
        await this.whatsapp.sendTextMessage(from,
          "😔 No properties are currently available. Please check back later or contact our agents."
        );
        return;
      }

      await this.sendPropertyResults(user, conversation, properties, from);

    } catch (error) {
      logger.error('Error browsing all properties:', error);
      await this.whatsapp.sendTextMessage(from,
        "Sorry, I couldn't load the properties right now. Please try again later."
      );
    }
  }

  // Start filtered search with criteria selection
  async startFilteredSearch(user, conversation, from) {
    const message = `🎯 *Filtered Search*

Let's find properties that match your specific needs. You can search by:

📍 Location (e.g., "Molyko", "Great Soppo")
💰 Budget (e.g., "under 80000", "50000 to 100000")
🏠 Property type (e.g., "apartment", "house", "studio")
🛏️ Bedrooms (e.g., "2 bedroom", "studio")
✨ Amenities (e.g., "parking", "generator", "furnished")

*Example searches:*
• "2 bedroom apartment in Molyko under 80000"
• "furnished studio with parking"
• "house in Great Soppo with generator"

What are you looking for?`;

    await this.whatsapp.sendTextMessage(from, message);

    // Update conversation to await search query
    await this.conversationService.updateConversation(conversation.id, {
      currentFlow: 'property_search',
      currentStep: 'awaiting_search_query',
      lastActivity: new Date()
    });
  }

  // Show recommended properties based on user preferences
  async showRecommendedProperties(user, conversation, from) {
    try {
      await this.whatsapp.sendTextMessage(from, "⭐ Finding personalized recommendations...");

      // Use the recommendation service for intelligent recommendations
      const recommendations = await this.recommendationService.generateRecommendations(user, 8);

      if (recommendations.length === 0) {
        await this.whatsapp.sendTextMessage(from,
          "🤔 I don't have enough information about your preferences yet. Let's start with a search to learn what you like!"
        );
        await this.startFilteredSearch(user, conversation, from);
        return;
      }

      const message = `⭐ *Personalized Recommendations*\n\nBased on your preferences and behavior, here are ${recommendations.length} properties I think you'll love:`;
      await this.whatsapp.sendTextMessage(from, message);

      await this.sendPropertyResults(user, conversation, recommendations, from);

      // Track recommendation interaction
      await this.preferenceLearningService.learnFromInteraction(user.id, {
        action: 'view_recommendations',
        recommendationCount: recommendations.length,
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Error showing recommended properties:', error);
      await this.whatsapp.sendTextMessage(from,
        "Sorry, I couldn't load recommendations right now. Let's try a regular search instead."
      );
      await this.startFilteredSearch(user, conversation, from);
    }
  }

  // Start smart search with natural language processing
  async startSmartSearch(user, conversation, from) {
    const message = `🤖 *Smart Search*

Just tell me what you're looking for in natural language! I'll understand and find the perfect properties for you.

*Examples:*
• "I need a cheap 2 bedroom apartment in Molyko"
• "Show me furnished studios with parking under 60000"
• "Find me a house in Great Soppo with generator and water"
• "I want something near UB campus under 80000"

What kind of property are you looking for?`;

    await this.whatsapp.sendTextMessage(from, message);

    // Update conversation to await smart search query
    await this.conversationService.updateConversation(conversation.id, {
      currentFlow: 'property_search',
      currentStep: 'awaiting_smart_search',
      lastActivity: new Date()
    });
  }

  // Show featured properties
  async showFeaturedProperties(user, conversation, from) {
    try {
      await this.whatsapp.sendTextMessage(from, "⭐ Loading featured properties...");

      const properties = await this.propertySearchService.getFeaturedProperties(8);

      if (properties.length === 0) {
        await this.whatsapp.sendTextMessage(from,
          "No featured properties available right now. Let me show you our latest properties instead."
        );
        await this.browseAllProperties(user, conversation, from);
        return;
      }

      const message = `⭐ *Featured Properties*\n\nHere are our top-rated and most popular properties:`;
      await this.whatsapp.sendTextMessage(from, message);

      await this.sendPropertyResults(user, conversation, properties, from);

    } catch (error) {
      logger.error('Error showing featured properties:', error);
      await this.whatsapp.sendTextMessage(from,
        "Sorry, I couldn't load featured properties. Let me show you all available properties instead."
      );
      await this.browseAllProperties(user, conversation, from);
    }
  }

  // Start advanced filters
  async startAdvancedFilters(user, conversation, from) {
    const message = `🔧 *Advanced Filters*

Let's set up detailed search criteria:

1️⃣ **Location**: Which area interests you?
2️⃣ **Budget**: What's your price range?
3️⃣ **Property Type**: Apartment, house, studio?
4️⃣ **Bedrooms**: How many bedrooms?
5️⃣ **Amenities**: What features do you need?

You can specify multiple criteria like:
"2-3 bedroom apartment in Molyko or Great Soppo, 60000-100000 FCFA, with parking and generator"

What are your search criteria?`;

    await this.whatsapp.sendTextMessage(from, message);

    // Update conversation to await advanced search query
    await this.conversationService.updateConversation(conversation.id, {
      currentFlow: 'property_search',
      currentStep: 'awaiting_advanced_search',
      lastActivity: new Date()
    });
  }

  // Show more results from previous search
  async showMoreResults(user, conversation, from) {
    try {
      // Get previous search results from conversation context
      const lastSearchResults = conversation.lastSearchResults || [];

      if (lastSearchResults.length === 0) {
        await this.whatsapp.sendTextMessage(from,
          "No previous search results found. Let's start a new search!"
        );
        await this.startPropertySearch(user, conversation, from);
        return;
      }

      // Get the next batch of properties
      const startIndex = conversation.currentResultIndex || 3;
      const endIndex = Math.min(startIndex + 3, lastSearchResults.length);

      if (startIndex >= lastSearchResults.length) {
        await this.whatsapp.sendTextMessage(from,
          "You've seen all the results! Would you like to start a new search?"
        );

        const buttons = [
          { id: 'new_search', title: '🔍 New Search' },
          { id: 'refine_search', title: '🎯 Refine Search' },
          { id: 'main_menu', title: '🏠 Main Menu' }
        ];

        await this.whatsapp.sendButtonMessage(from, "What would you like to do?", buttons);
        return;
      }

      // Get property details for the next batch
      const moreProperties = [];
      for (let i = startIndex; i < endIndex; i++) {
        try {
          const property = await this.propertyService.getPropertyById(lastSearchResults[i]);
          if (property) {
            moreProperties.push(property);
          }
        } catch (error) {
          logger.warn(`Could not load property ${lastSearchResults[i]}:`, error.message);
        }
      }

      if (moreProperties.length === 0) {
        await this.whatsapp.sendTextMessage(from,
          "No more properties to show. Let's start a new search!"
        );
        await this.startPropertySearch(user, conversation, from);
        return;
      }

      await this.whatsapp.sendTextMessage(from,
        `📋 Showing ${moreProperties.length} more properties (${endIndex} of ${lastSearchResults.length}):`
      );

      await this.sendPropertyResults(user, conversation, moreProperties, from);

      // Update current result index
      await this.conversationService.updateConversation(conversation.id, {
        currentResultIndex: endIndex,
        lastActivity: new Date()
      });

    } catch (error) {
      logger.error('Error showing more results:', error);
      await this.whatsapp.sendTextMessage(from,
        "Sorry, I couldn't load more results. Let's start a new search."
      );
      await this.startPropertySearch(user, conversation, from);
    }
  }

  // Contact agent
  async contactAgent(user, conversation, from) {
    const message = `👨‍💼 *Contact Our Agents*

Our experienced agents are ready to help you find the perfect property!

📞 **Phone**: +237 XXX XXX XXX
📧 **Email**: agents@tenantsphere.com
💬 **WhatsApp**: This number
🕒 **Hours**: Monday - Saturday, 8AM - 6PM

You can also tell me what you're looking for and I'll make sure our agents get your requirements!

What would you like to do?`;

    const buttons = [
      { id: 'send_requirements', title: '📝 Send Requirements' },
      { id: 'schedule_call', title: '📞 Schedule Call' },
      { id: 'main_menu', title: '🏠 Main Menu' }
    ];

    await this.whatsapp.sendButtonMessage(from, message, buttons);
  }

  // Save current search
  async saveCurrentSearch(user, conversation, from) {
    try {
      // Implementation for saving search preferences
      await this.whatsapp.sendTextMessage(from,
        "💾 Search saved! I'll remember your preferences for future recommendations."
      );

      // Update user preferences based on current search
      if (conversation.lastSearchCriteria) {
        await this.userService.updateUserPreferences(user.id, conversation.lastSearchCriteria);
      }

      await this.sendMainMenu(user, from);

    } catch (error) {
      logger.error('Error saving search:', error);
      await this.whatsapp.sendTextMessage(from,
        "Sorry, I couldn't save your search right now. Your preferences are still remembered for this session."
      );
    }
  }

  // Broaden search criteria
  async broadenSearch(user, conversation, from) {
    const message = `🔍 *Broaden Your Search*

Let's try with more flexible criteria:

• **Expand location**: Include nearby areas
• **Increase budget**: Consider slightly higher prices
• **Different property types**: Look at apartments, houses, and studios
• **Flexible amenities**: Focus on essential features only

Would you like me to:`;

    const buttons = [
      { id: 'expand_location', title: '📍 Expand Location' },
      { id: 'increase_budget', title: '💰 Increase Budget' },
      { id: 'any_property_type', title: '🏠 Any Property Type' },
      { id: 'essential_only', title: '✨ Essential Features Only' }
    ];

    await this.whatsapp.sendButtonMessage(from, message, buttons);
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

  // Start property carousel browsing
  async startPropertyCarousel(user, conversation, from) {
    try {
      const lastSearchResults = conversation.lastSearchResults || [];

      if (lastSearchResults.length === 0) {
        await this.whatsapp.sendTextMessage(from, "No properties to browse. Let's start a new search!");
        await this.startPropertySearch(user, conversation, from);
        return;
      }

      await this.whatsapp.sendTextMessage(from, "🎠 Starting carousel browsing...");

      // Get properties for carousel
      const properties = [];
      for (const propertyId of lastSearchResults.slice(0, 10)) {
        try {
          const property = await this.propertyService.getPropertyById(propertyId);
          if (property) properties.push(property);
        } catch (error) {
          logger.warn(`Could not load property ${propertyId} for carousel`);
        }
      }

      if (properties.length === 0) {
        await this.whatsapp.sendTextMessage(from, "Properties are no longer available. Let's start a new search!");
        await this.startPropertySearch(user, conversation, from);
        return;
      }

      // Start carousel at index 0
      await this.propertyDisplayService.sendPropertyCarousel(properties, 0, from);

      // Update conversation state
      await this.conversationService.updateConversation(conversation.id, {
        currentStep: 'browsing_carousel',
        carouselProperties: properties.map(p => p.id),
        carouselIndex: 0,
        lastActivity: new Date()
      });

    } catch (error) {
      logger.error('Error starting property carousel:', error);
      await this.whatsapp.sendTextMessage(from, "Sorry, I couldn't start the carousel. Let's try a regular search instead.");
      await this.startPropertySearch(user, conversation, from);
    }
  }

  // Start property comparison
  async startPropertyComparison(user, conversation, from) {
    try {
      const lastSearchResults = conversation.lastSearchResults || [];

      if (lastSearchResults.length < 2) {
        await this.whatsapp.sendTextMessage(from, "Need at least 2 properties to compare. Let's search for more properties first!");
        await this.startPropertySearch(user, conversation, from);
        return;
      }

      // Get top 3 properties for comparison
      const properties = [];
      for (const propertyId of lastSearchResults.slice(0, 3)) {
        try {
          const property = await this.propertyService.getPropertyById(propertyId);
          if (property) properties.push(property);
        } catch (error) {
          logger.warn(`Could not load property ${propertyId} for comparison`);
        }
      }

      if (properties.length < 2) {
        await this.whatsapp.sendTextMessage(from, "Not enough properties available for comparison. Let's search for more!");
        await this.startPropertySearch(user, conversation, from);
        return;
      }

      await this.propertyDisplayService.sendPropertyComparison(properties, from);

    } catch (error) {
      logger.error('Error starting property comparison:', error);
      await this.whatsapp.sendTextMessage(from, "Sorry, I couldn't compare the properties. Please try again.");
    }
  }

  // Handle carousel navigation
  async handleCarouselNavigation(user, conversation, buttonId, from) {
    try {
      const [action, indexStr] = buttonId.split('_');
      const currentIndex = parseInt(indexStr);
      const carouselProperties = conversation.carouselProperties || [];

      if (carouselProperties.length === 0) {
        await this.whatsapp.sendTextMessage(from, "No properties in carousel. Let's start a new search!");
        await this.startPropertySearch(user, conversation, from);
        return;
      }

      let newIndex;
      if (action === 'next') {
        newIndex = Math.min(currentIndex + 1, carouselProperties.length - 1);
      } else if (action === 'prev') {
        newIndex = Math.max(currentIndex - 1, 0);
      } else {
        return;
      }

      // Get properties for carousel display
      const properties = [];
      for (const propertyId of carouselProperties) {
        try {
          const property = await this.propertyService.getPropertyById(propertyId);
          if (property) properties.push(property);
        } catch (error) {
          logger.warn(`Could not load property ${propertyId} for carousel navigation`);
        }
      }

      if (properties.length === 0) {
        await this.whatsapp.sendTextMessage(from, "Properties are no longer available. Let's start a new search!");
        await this.startPropertySearch(user, conversation, from);
        return;
      }

      // Send updated carousel
      await this.propertyDisplayService.sendPropertyCarousel(properties, newIndex, from);

      // Update conversation state
      await this.conversationService.updateConversation(conversation.id, {
        carouselIndex: newIndex,
        lastActivity: new Date()
      });

    } catch (error) {
      logger.error('Error handling carousel navigation:', error);
      await this.whatsapp.sendTextMessage(from, "Sorry, I couldn't navigate the carousel. Please try again.");
    }
  }

  // Show saved properties
  async showSavedProperties(user, conversation, from) {
    try {
      const savedPropertyIds = user.savedProperties || [];

      if (savedPropertyIds.length === 0) {
        await this.whatsapp.sendTextMessage(from,
          "💾 You haven't saved any properties yet. Start browsing to save properties you like!"
        );
        await this.startPropertySearch(user, conversation, from);
        return;
      }

      await this.whatsapp.sendTextMessage(from,
        `💾 *Your Saved Properties* (${savedPropertyIds.length})\n\nHere are the properties you've saved:`
      );

      // Load and display saved properties
      const savedProperties = [];
      for (const propertyId of savedPropertyIds.slice(0, 5)) {
        try {
          const property = await this.propertyService.getPropertyById(propertyId);
          if (property) {
            savedProperties.push(property);
            await this.propertyDisplayService.sendPropertyQuickView(property, from);
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
        } catch (error) {
          logger.warn(`Could not load saved property ${propertyId}`);
        }
      }

      if (savedPropertyIds.length > 5) {
        await this.whatsapp.sendTextMessage(from,
          `📋 Showing 5 of ${savedPropertyIds.length} saved properties. Contact us to see all your saved properties.`
        );
      }

      const buttons = [
        { id: 'new_search', title: '🔍 New Search' },
        { id: 'contact_agent', title: '👨‍💼 Contact Agent' },
        { id: 'main_menu', title: '🏠 Main Menu' }
      ];

      await this.whatsapp.sendButtonMessage(from, "What would you like to do next?", buttons);

    } catch (error) {
      logger.error('Error showing saved properties:', error);
      await this.whatsapp.sendTextMessage(from, "Sorry, I couldn't load your saved properties. Please try again.");
    }
  }

  // Learn from user interactions for personalization
  async learnFromInteraction(user, messageData, flowResult) {
    try {
      const interaction = {
        action: this.getInteractionAction(messageData, flowResult),
        messageType: messageData.type,
        flow: flowResult.flow,
        state: flowResult.state,
        timestamp: new Date()
      };

      // Add property-specific data if available
      if (messageData.propertyId) {
        interaction.propertyId = messageData.propertyId;
      }

      // Add search-specific data if it's a search interaction
      if (flowResult.flow === 'property_search' && messageData.type === 'text') {
        try {
          const messageContent = this.extractMessageContent(messageData);
          const searchTerms = this.nlpService.extractSearchTerms(messageContent);
          interaction.searchTerms = searchTerms;
          interaction.searchMethod = 'text';
        } catch (searchTermsError) {
          logger.warn('Could not extract search terms:', searchTermsError.message);
          interaction.searchTerms = [];
        }
      }

      try {
        await this.preferenceLearningService.learnFromInteraction(user.id, interaction);
      } catch (learningError) {
        logger.warn('Could not learn from interaction:', learningError.message);
      }

    } catch (error) {
      logger.warn('Could not learn from interaction:', error.message);
    }
  }

  // Get interaction action type for learning
  getInteractionAction(messageData, flowResult) {
    if (messageData.type === 'interactive') {
      const buttonId = messageData.interactive.button_reply?.id || messageData.interactive.list_reply?.id;
      if (buttonId) {
        if (buttonId.startsWith('view_')) return 'view';
        if (buttonId.startsWith('book_')) return 'book';
        if (buttonId.startsWith('save_')) return 'save';
        if (buttonId.startsWith('contact_')) return 'contact';
        if (buttonId.startsWith('share_')) return 'share';
      }
    }

    if (flowResult.flow === 'property_search') return 'search';
    if (flowResult.flow === 'booking') return 'book';

    return 'general';
  }

  // Handle onboarding flow
  async handleOnboardingFlow(user, conversation, messageText, from, state, action) {
    switch (state) {
      case 'welcome':
        await this.whatsapp.sendTextMessage(from,
          `🎉 *Welcome to TenantSphere!*\n\nI'm your AI property assistant. I can help you:\n\n🔍 Find properties that match your needs\n📅 Book property tours\n💾 Save your favorite properties\n⭐ Get personalized recommendations\n\nLet me show you around! Ready to get started?`
        );

        const buttons = [
          { id: 'ready_onboarding', title: '✅ I\'m Ready!' },
          { id: 'skip_onboarding', title: '⏭️ Skip Tour' }
        ];

        await this.whatsapp.sendButtonMessage(from, "What would you like to do?", buttons);
        break;

      case 'explaining_features':
        await this.whatsapp.sendTextMessage(from,
          `🚀 *Here's what I can do for you:*\n\n🤖 **Smart Search**: Just tell me what you're looking for in natural language\n📊 **Personalized Recommendations**: I learn your preferences over time\n📸 **Rich Property Details**: Photos, amenities, and all the details you need\n📅 **Easy Booking**: Schedule property tours with just a few taps\n\nWould you like to set up your preferences now?`
        );
        break;

      default:
        await this.startPropertySearch(user, conversation, from);
    }
  }

  // Handle booking flow
  async handleBookingFlow(user, conversation, messageText, from, state) {
    switch (state) {
      case 'awaiting_details':
        // Process booking details from user message
        await this.processBookingDetails(user, conversation, messageText, from);
        break;

      case 'confirming_booking':
        if (messageText.toLowerCase().includes('yes') || messageText.toLowerCase().includes('confirm')) {
          await this.confirmBooking(user, conversation, from);
        } else {
          await this.whatsapp.sendTextMessage(from, "Please provide your preferred date and time for the property tour.");
        }
        break;

      default:
        await this.whatsapp.sendTextMessage(from, "Let's book a property tour! Which property interests you?");
    }
  }

  // Handle preference setup flow
  async handlePreferenceSetupFlow(user, conversation, messageText, from, state) {
    switch (state) {
      case 'collecting_location':
        await this.collectLocationPreference(user, messageText, from);
        break;

      case 'collecting_budget':
        await this.collectBudgetPreference(user, messageText, from);
        break;

      case 'collecting_type':
        await this.collectPropertyTypePreference(user, messageText, from);
        break;

      case 'collecting_amenities':
        await this.collectAmenityPreferences(user, messageText, from);
        break;

      default:
        await this.whatsapp.sendTextMessage(from, "Let's set up your preferences! What locations interest you?");
    }
  }

  // Handle support flow
  async handleSupportFlow(user, conversation, messageText, from, state) {
    switch (state) {
      case 'identifying_issue':
        await this.identifyUserIssue(messageText, from);
        break;

      case 'providing_solution':
        await this.provideSolution(messageText, from);
        break;

      default:
        await this.whatsapp.sendTextMessage(from, "I'm here to help! What can I assist you with today?");
    }
  }

  // Process booking details
  async processBookingDetails(user, conversation, messageText, from) {
    try {
      // Extract date and time from message
      const bookingDetails = await this.nlpService.extractBookingDetails(messageText);

      if (bookingDetails.date || bookingDetails.time) {
        // Save booking details
        await this.conversationService.updateConversation(conversation.id, {
          bookingDetails: {
            ...conversation.bookingDetails,
            ...bookingDetails,
            userMessage: messageText
          }
        });

        // Confirm booking details
        let confirmMessage = `📅 *Booking Confirmation*\n\n`;
        if (bookingDetails.date) confirmMessage += `📆 Date: ${bookingDetails.date}\n`;
        if (bookingDetails.time) confirmMessage += `⏰ Time: ${bookingDetails.time}\n`;
        confirmMessage += `\nIs this correct?`;

        const buttons = [
          { id: 'confirm_booking', title: '✅ Yes, Confirm' },
          { id: 'modify_booking', title: '✏️ Modify Details' }
        ];

        await this.whatsapp.sendButtonMessage(from, confirmMessage, buttons);
      } else {
        await this.whatsapp.sendTextMessage(from,
          "I couldn't understand the date/time. Please try again with something like:\n• Tomorrow at 2 PM\n• Monday morning\n• 25th January at 3:30 PM"
        );
      }

    } catch (error) {
      logger.error('Error processing booking details:', error);
      await this.whatsapp.sendTextMessage(from, "Sorry, I had trouble processing your booking details. Please try again.");
    }
  }

  // Confirm booking
  async confirmBooking(user, conversation, from) {
    try {
      const bookingDetails = conversation.bookingDetails;

      // Here you would typically save to database and send confirmation
      await this.whatsapp.sendTextMessage(from,
        `✅ *Booking Confirmed!*\n\nYour property tour has been scheduled. Our agent will contact you soon to confirm the details.\n\n📞 If you need to make changes, please contact us directly.\n\nThank you for using TenantSphere! 🏠`
      );

      // Complete the booking flow
      await this.conversationFlowService.completeFlow(conversation, 'booking', bookingDetails);

    } catch (error) {
      logger.error('Error confirming booking:', error);
      await this.whatsapp.sendTextMessage(from, "Sorry, I couldn't confirm your booking. Please try again or contact our agents.");
    }
  }

  // Collect location preference
  async collectLocationPreference(user, messageText, from) {
    const locations = await this.nlpService.extractLocations(messageText);

    if (locations.length > 0) {
      await this.userService.updateUserPreferences(user.id, {
        preferredLocations: locations
      });

      await this.whatsapp.sendTextMessage(from,
        `✅ Great! I've noted your location preferences: ${locations.join(', ')}\n\nWhat's your budget range for monthly rent?`
      );
    } else {
      await this.whatsapp.sendTextMessage(from,
        "Please tell me which areas you're interested in (e.g., Molyko, Great Soppo, Mile 16)"
      );
    }
  }

  // Collect budget preference
  async collectBudgetPreference(user, messageText, from) {
    const budget = await this.nlpService.extractPriceRange(messageText);

    if (budget.min || budget.max) {
      await this.userService.updateUserPreferences(user.id, {
        budgetRange: budget
      });

      await this.whatsapp.sendTextMessage(from,
        `💰 Budget noted! What type of property are you looking for? (apartment, house, studio)`
      );
    } else {
      await this.whatsapp.sendTextMessage(from,
        "Please tell me your budget range (e.g., 'under 80000', '50000 to 100000', 'around 75000')"
      );
    }
  }

  // Collect property type preference
  async collectPropertyTypePreference(user, messageText, from) {
    const propertyTypes = await this.nlpService.extractPropertyTypes(messageText);

    if (propertyTypes.length > 0) {
      await this.userService.updateUserPreferences(user.id, {
        preferredPropertyTypes: propertyTypes
      });

      await this.whatsapp.sendTextMessage(from,
        `🏠 Property type preferences saved! What amenities are important to you? (e.g., parking, generator, furnished)`
      );
    } else {
      await this.whatsapp.sendTextMessage(from,
        "Please specify the property type you prefer (apartment, house, studio, etc.)"
      );
    }
  }

  // Collect amenity preferences
  async collectAmenityPreferences(user, messageText, from) {
    const amenities = await this.nlpService.extractAmenities(messageText);

    await this.userService.updateUserPreferences(user.id, {
      preferredAmenities: amenities
    });

    await this.whatsapp.sendTextMessage(from,
      `✨ Perfect! Your preferences have been saved. I'll use these to provide personalized recommendations.\n\nReady to start searching for properties?`
    );

    const buttons = [
      { id: 'start_search', title: '🔍 Start Searching' },
      { id: 'get_recommendations', title: '⭐ Get Recommendations' }
    ];

    await this.whatsapp.sendButtonMessage(from, "What would you like to do?", buttons);
  }

  // Identify user issue for support
  async identifyUserIssue(messageText, from) {
    const intent = await this.nlpService.analyzeIntent(messageText);

    if (intent.intent === 'technical_issue') {
      await this.whatsapp.sendTextMessage(from,
        `🔧 I understand you're having a technical issue. Here are some quick solutions:\n\n• Try refreshing the chat\n• Check your internet connection\n• Clear your browser cache\n\nIf the problem persists, I can connect you with our technical support team.`
      );
    } else if (intent.intent === 'booking_issue') {
      await this.whatsapp.sendTextMessage(from,
        `📅 Having trouble with booking? I can help you:\n\n• Schedule a new property tour\n• Modify existing booking\n• Cancel a booking\n• Contact the property agent\n\nWhat specifically do you need help with?`
      );
    } else {
      await this.whatsapp.sendTextMessage(from,
        `I'm here to help! Our support team can assist with:\n\n• Property search issues\n• Booking problems\n• Account questions\n• Technical difficulties\n\nWould you like me to connect you with a human agent?`
      );
    }
  }

  // Provide solution for support
  async provideSolution(messageText, from) {
    if (messageText.toLowerCase().includes('solved') || messageText.toLowerCase().includes('fixed')) {
      await this.whatsapp.sendTextMessage(from,
        `🎉 Great! I'm glad I could help resolve your issue. Is there anything else you need assistance with?`
      );
    } else {
      await this.whatsapp.sendTextMessage(from,
        `Let me connect you with one of our human agents who can provide more detailed assistance. They'll be with you shortly!`
      );
    }
  }
}

module.exports = MessageHandlerService;
