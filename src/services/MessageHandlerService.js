const WhatsAppService = require('./WhatsAppService');
const UserService = require('./UserService');
const ConversationService = require('./ConversationService');
const PropertyService = require('./PropertyService');
const PropertySearchService = require('./PropertySearchService');
const PropertyDisplayService = require('./PropertyDisplayService');
const PropertyActionService = require('./PropertyActionService');
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

  // Process intelligent search query
  async processSearchQuery(user, conversation, messageText, from) {
    try {
      logger.info(`Processing search query from ${from}: "${messageText}"`);

      // Use NLP to parse the user's query
      const searchCriteria = this.nlpService.parseUserQuery(messageText);

      // Get user preferences for better ranking
      const userPreferences = user.preferences || {};

      // Search properties using intelligent search
      const properties = await this.propertySearchService.searchProperties(searchCriteria, userPreferences);

      if (properties.length === 0) {
        await this.handleNoResults(user, conversation, messageText, from, searchCriteria);
        return;
      }

      // Send search results
      await this.sendPropertyResults(user, conversation, properties, from);

    } catch (error) {
      logger.error('Error processing search query:', error);
      await this.whatsapp.sendTextMessage(from,
        "Sorry, I encountered an error while searching. Please try again or contact support."
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

      // Get user preferences and search history for better recommendations
      const userPreferences = user.preferences || {};

      // Build search criteria based on user preferences
      const searchCriteria = {
        availability: true,
        propertyType: userPreferences.preferredPropertyTypes,
        priceRange: userPreferences.priceRange,
        amenities: userPreferences.preferredAmenities
      };

      const properties = await this.propertySearchService.searchProperties(searchCriteria, userPreferences);

      if (properties.length === 0) {
        await this.whatsapp.sendTextMessage(from,
          "🤔 I don't have enough information about your preferences yet. Let's start with a search to learn what you like!"
        );
        await this.startFilteredSearch(user, conversation, from);
        return;
      }

      const message = `⭐ *Recommended for You*\n\nBased on your preferences, here are properties I think you'll love:`;
      await this.whatsapp.sendTextMessage(from, message);

      await this.sendPropertyResults(user, conversation, properties, from);

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
}

module.exports = MessageHandlerService;
