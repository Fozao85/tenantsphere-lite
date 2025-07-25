const logger = require('../utils/logger');
const NLPService = require('./NLPService');
const ConversationService = require('./ConversationService');

class ConversationFlowService {
  constructor() {
    this.nlpService = new NLPService();
    this.conversationService = new ConversationService();
    
    // Define conversation flows and their states
    this.flows = {
      'property_search': {
        states: ['initial', 'awaiting_criteria', 'showing_results', 'refining_search', 'completed'],
        transitions: this.getPropertySearchTransitions()
      },
      'booking': {
        states: ['initial', 'selecting_property', 'awaiting_details', 'confirming_booking', 'completed'],
        transitions: this.getBookingTransitions()
      },
      'preference_setup': {
        states: ['initial', 'collecting_location', 'collecting_budget', 'collecting_type', 'collecting_amenities', 'completed'],
        transitions: this.getPreferenceSetupTransitions()
      },
      'support': {
        states: ['initial', 'identifying_issue', 'providing_solution', 'escalating', 'completed'],
        transitions: this.getSupportTransitions()
      },
      'onboarding': {
        states: ['welcome', 'explaining_features', 'setting_preferences', 'first_search', 'completed'],
        transitions: this.getOnboardingTransitions()
      }
    };

    // Context retention settings
    this.contextRetentionHours = 24;
    this.maxContextSwitches = 3;
  }

  // Determine appropriate conversation flow based on user intent and context
  async determineFlow(user, conversation, messageText, messageType = 'text') {
    try {
      // Analyze user intent
      const intent = await this.nlpService.analyzeIntent(messageText);
      
      // Check if user is new (onboarding flow)
      if (this.isNewUser(user)) {
        return await this.initiateFlow(conversation, 'onboarding', 'welcome');
      }

      // Check for explicit flow requests
      const explicitFlow = this.detectExplicitFlowRequest(messageText, intent);
      if (explicitFlow) {
        return await this.initiateFlow(conversation, explicitFlow.flow, explicitFlow.state);
      }

      // Continue existing flow if active and valid
      if (conversation.currentFlow && this.isFlowActive(conversation)) {
        return await this.continueFlow(conversation, messageText, intent);
      }

      // Determine new flow based on intent
      const newFlow = this.mapIntentToFlow(intent);
      return await this.initiateFlow(conversation, newFlow.flow, newFlow.state);

    } catch (error) {
      logger.error('Error determining conversation flow:', error);
      return await this.initiateFlow(conversation, 'property_search', 'initial');
    }
  }

  // Check if user is new and needs onboarding
  isNewUser(user) {
    const daysSinceRegistration = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const hasMinimalInteractions = (user.interactions || []).length < 5;
    const hasNoPreferences = !user.preferences || Object.keys(user.preferences).length === 0;
    
    return daysSinceRegistration < 1 && hasMinimalInteractions && hasNoPreferences;
  }

  // Detect explicit flow requests from user messages
  detectExplicitFlowRequest(messageText, intent) {
    const lowerText = messageText.toLowerCase();
    
    // Booking flow triggers
    if (lowerText.includes('book') || lowerText.includes('schedule') || lowerText.includes('tour') || intent.intent === 'book_tour') {
      return { flow: 'booking', state: 'initial' };
    }
    
    // Support flow triggers
    if (lowerText.includes('help') || lowerText.includes('support') || lowerText.includes('problem') || intent.intent === 'help') {
      return { flow: 'support', state: 'initial' };
    }
    
    // Preference setup triggers
    if (lowerText.includes('preferences') || lowerText.includes('settings') || lowerText.includes('profile')) {
      return { flow: 'preference_setup', state: 'initial' };
    }
    
    return null;
  }

  // Check if current flow is still active
  isFlowActive(conversation) {
    if (!conversation.currentFlow || !conversation.lastActivity) return false;
    
    const hoursSinceActivity = (Date.now() - new Date(conversation.lastActivity).getTime()) / (1000 * 60 * 60);
    return hoursSinceActivity < this.contextRetentionHours;
  }

  // Map user intent to appropriate conversation flow
  mapIntentToFlow(intent) {
    const intentFlowMap = {
      'search_property': { flow: 'property_search', state: 'initial' },
      'book_tour': { flow: 'booking', state: 'initial' },
      'help': { flow: 'support', state: 'initial' },
      'greeting': { flow: 'property_search', state: 'initial' },
      'info_request': { flow: 'support', state: 'initial' },
      'preference_update': { flow: 'preference_setup', state: 'initial' }
    };

    return intentFlowMap[intent.intent] || { flow: 'property_search', state: 'initial' };
  }

  // Initiate a new conversation flow
  async initiateFlow(conversation, flowName, initialState) {
    try {
      if (!this.flows[flowName]) {
        logger.warn(`Unknown flow: ${flowName}, defaulting to property_search`);
        flowName = 'property_search';
        initialState = 'initial';
      }

      await this.conversationService.updateConversation(conversation.id, {
        currentFlow: flowName,
        currentStep: initialState,
        flowHistory: [...(conversation.flowHistory || []), {
          flow: flowName,
          startedAt: new Date(),
          previousFlow: conversation.currentFlow
        }],
        lastActivity: new Date()
      });

      logger.info(`Initiated flow ${flowName} with state ${initialState} for conversation ${conversation.id}`);
      
      return {
        flow: flowName,
        state: initialState,
        action: 'initiated',
        nextActions: this.getNextActions(flowName, initialState)
      };

    } catch (error) {
      logger.error('Error initiating flow:', error);
      throw error;
    }
  }

  // Continue existing conversation flow
  async continueFlow(conversation, messageText, intent) {
    try {
      const currentFlow = conversation.currentFlow;
      const currentState = conversation.currentStep;
      
      // Get flow transitions
      const transitions = this.flows[currentFlow].transitions;
      const stateTransitions = transitions[currentState];
      
      if (!stateTransitions) {
        logger.warn(`No transitions defined for state ${currentState} in flow ${currentFlow}`);
        return await this.initiateFlow(conversation, 'property_search', 'initial');
      }

      // Determine next state based on user input and intent
      const nextState = await this.determineNextState(stateTransitions, messageText, intent, conversation);
      
      // Update conversation state
      await this.conversationService.updateConversation(conversation.id, {
        currentStep: nextState,
        lastActivity: new Date(),
        stepHistory: [...(conversation.stepHistory || []), {
          from: currentState,
          to: nextState,
          timestamp: new Date(),
          trigger: intent.intent
        }]
      });

      logger.info(`Continued flow ${currentFlow}: ${currentState} -> ${nextState}`);
      
      return {
        flow: currentFlow,
        state: nextState,
        action: 'continued',
        previousState: currentState,
        nextActions: this.getNextActions(currentFlow, nextState)
      };

    } catch (error) {
      logger.error('Error continuing flow:', error);
      return await this.initiateFlow(conversation, 'property_search', 'initial');
    }
  }

  // Determine next state based on current state and user input
  async determineNextState(stateTransitions, messageText, intent, conversation) {
    // Check for explicit state transitions first
    for (const transition of stateTransitions) {
      if (await this.evaluateTransitionCondition(transition.condition, messageText, intent, conversation)) {
        return transition.nextState;
      }
    }

    // Default to staying in current state if no transition matches
    return conversation.currentStep;
  }

  // Evaluate transition condition
  async evaluateTransitionCondition(condition, messageText, intent, conversation) {
    switch (condition.type) {
      case 'intent':
        return intent.intent === condition.value;
      
      case 'keyword':
        return messageText.toLowerCase().includes(condition.value.toLowerCase());
      
      case 'pattern':
        const regex = new RegExp(condition.value, 'i');
        return regex.test(messageText);
      
      case 'context':
        return this.evaluateContextCondition(condition.value, conversation);
      
      case 'always':
        return true;
      
      default:
        return false;
    }
  }

  // Evaluate context-based conditions
  evaluateContextCondition(contextCondition, conversation) {
    switch (contextCondition) {
      case 'has_search_results':
        return conversation.lastSearchResults && conversation.lastSearchResults.length > 0;
      
      case 'has_selected_property':
        return conversation.currentPropertyId !== undefined;
      
      case 'has_booking_details':
        return conversation.bookingDetails !== undefined;
      
      case 'is_first_interaction':
        return !conversation.stepHistory || conversation.stepHistory.length === 0;
      
      default:
        return false;
    }
  }

  // Get next possible actions for current flow and state
  getNextActions(flowName, stateName) {
    const flow = this.flows[flowName];
    if (!flow || !flow.transitions[stateName]) return [];

    return flow.transitions[stateName].map(transition => ({
      action: transition.action,
      description: transition.description,
      trigger: transition.condition
    }));
  }

  // Handle flow completion
  async completeFlow(conversation, flowName, completionData = {}) {
    try {
      await this.conversationService.updateConversation(conversation.id, {
        currentFlow: null,
        currentStep: null,
        completedFlows: [...(conversation.completedFlows || []), {
          flow: flowName,
          completedAt: new Date(),
          data: completionData
        }],
        lastActivity: new Date()
      });

      logger.info(`Completed flow ${flowName} for conversation ${conversation.id}`);
      
      return {
        flow: flowName,
        action: 'completed',
        data: completionData
      };

    } catch (error) {
      logger.error('Error completing flow:', error);
      throw error;
    }
  }

  // Handle flow interruption (user switches context)
  async interruptFlow(conversation, newFlow, reason = 'user_request') {
    try {
      const currentFlow = conversation.currentFlow;
      const currentState = conversation.currentStep;

      // Save interrupted flow state
      await this.conversationService.updateConversation(conversation.id, {
        interruptedFlows: [...(conversation.interruptedFlows || []), {
          flow: currentFlow,
          state: currentState,
          interruptedAt: new Date(),
          reason: reason
        }]
      });

      logger.info(`Interrupted flow ${currentFlow} at state ${currentState}, switching to ${newFlow}`);
      
      // Initiate new flow
      return await this.initiateFlow(conversation, newFlow, 'initial');

    } catch (error) {
      logger.error('Error interrupting flow:', error);
      throw error;
    }
  }

  // Resume interrupted flow
  async resumeFlow(conversation, flowName) {
    try {
      const interruptedFlows = conversation.interruptedFlows || [];
      const flowToResume = interruptedFlows.find(f => f.flow === flowName);
      
      if (!flowToResume) {
        logger.warn(`No interrupted flow found for ${flowName}`);
        return await this.initiateFlow(conversation, flowName, 'initial');
      }

      // Remove from interrupted flows
      const updatedInterruptedFlows = interruptedFlows.filter(f => f.flow !== flowName);
      
      await this.conversationService.updateConversation(conversation.id, {
        currentFlow: flowName,
        currentStep: flowToResume.state,
        interruptedFlows: updatedInterruptedFlows,
        lastActivity: new Date()
      });

      logger.info(`Resumed flow ${flowName} at state ${flowToResume.state}`);
      
      return {
        flow: flowName,
        state: flowToResume.state,
        action: 'resumed',
        nextActions: this.getNextActions(flowName, flowToResume.state)
      };

    } catch (error) {
      logger.error('Error resuming flow:', error);
      throw error;
    }
  }

  // Get conversation context summary
  async getContextSummary(conversation) {
    return {
      currentFlow: conversation.currentFlow,
      currentState: conversation.currentStep,
      flowHistory: conversation.flowHistory || [],
      interruptedFlows: conversation.interruptedFlows || [],
      completedFlows: conversation.completedFlows || [],
      lastActivity: conversation.lastActivity,
      isActive: this.isFlowActive(conversation)
    };
  }

  // Property Search Flow Transitions
  getPropertySearchTransitions() {
    return {
      'initial': [
        { condition: { type: 'intent', value: 'search_property' }, nextState: 'awaiting_criteria', action: 'collect_criteria', description: 'Collect search criteria' },
        { condition: { type: 'keyword', value: 'browse' }, nextState: 'showing_results', action: 'show_all_properties', description: 'Show all properties' },
        { condition: { type: 'always' }, nextState: 'awaiting_criteria', action: 'prompt_criteria', description: 'Prompt for search criteria' }
      ],
      'awaiting_criteria': [
        { condition: { type: 'pattern', value: '\\d+\\s*(bedroom|bed)' }, nextState: 'showing_results', action: 'search_properties', description: 'Search with criteria' },
        { condition: { type: 'keyword', value: 'location' }, nextState: 'showing_results', action: 'search_properties', description: 'Search by location' },
        { condition: { type: 'always' }, nextState: 'showing_results', action: 'search_properties', description: 'Search with any criteria' }
      ],
      'showing_results': [
        { condition: { type: 'keyword', value: 'more' }, nextState: 'showing_results', action: 'show_more_results', description: 'Show more results' },
        { condition: { type: 'keyword', value: 'refine' }, nextState: 'refining_search', action: 'refine_criteria', description: 'Refine search criteria' },
        { condition: { type: 'intent', value: 'book_tour' }, nextState: 'completed', action: 'switch_to_booking', description: 'Switch to booking flow' }
      ],
      'refining_search': [
        { condition: { type: 'always' }, nextState: 'showing_results', action: 'search_with_refined_criteria', description: 'Search with refined criteria' }
      ]
    };
  }

  // Booking Flow Transitions
  getBookingTransitions() {
    return {
      'initial': [
        { condition: { type: 'context', value: 'has_selected_property' }, nextState: 'awaiting_details', action: 'collect_booking_details', description: 'Collect booking details' },
        { condition: { type: 'always' }, nextState: 'selecting_property', action: 'prompt_property_selection', description: 'Prompt property selection' }
      ],
      'selecting_property': [
        { condition: { type: 'pattern', value: 'property|view|book' }, nextState: 'awaiting_details', action: 'collect_booking_details', description: 'Collect booking details' }
      ],
      'awaiting_details': [
        { condition: { type: 'pattern', value: '\\d{1,2}(st|nd|rd|th)|tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday' }, nextState: 'confirming_booking', action: 'confirm_booking', description: 'Confirm booking details' }
      ],
      'confirming_booking': [
        { condition: { type: 'keyword', value: 'yes' }, nextState: 'completed', action: 'create_booking', description: 'Create booking' },
        { condition: { type: 'keyword', value: 'no' }, nextState: 'awaiting_details', action: 'modify_booking', description: 'Modify booking details' }
      ]
    };
  }

  // Preference Setup Flow Transitions
  getPreferenceSetupTransitions() {
    return {
      'initial': [
        { condition: { type: 'always' }, nextState: 'collecting_location', action: 'ask_location_preference', description: 'Ask for location preference' }
      ],
      'collecting_location': [
        { condition: { type: 'always' }, nextState: 'collecting_budget', action: 'ask_budget_preference', description: 'Ask for budget preference' }
      ],
      'collecting_budget': [
        { condition: { type: 'always' }, nextState: 'collecting_type', action: 'ask_type_preference', description: 'Ask for property type preference' }
      ],
      'collecting_type': [
        { condition: { type: 'always' }, nextState: 'collecting_amenities', action: 'ask_amenity_preference', description: 'Ask for amenity preferences' }
      ],
      'collecting_amenities': [
        { condition: { type: 'always' }, nextState: 'completed', action: 'save_preferences', description: 'Save all preferences' }
      ]
    };
  }

  // Support Flow Transitions
  getSupportTransitions() {
    return {
      'initial': [
        { condition: { type: 'always' }, nextState: 'identifying_issue', action: 'identify_issue', description: 'Identify user issue' }
      ],
      'identifying_issue': [
        { condition: { type: 'keyword', value: 'technical' }, nextState: 'providing_solution', action: 'provide_technical_help', description: 'Provide technical help' },
        { condition: { type: 'keyword', value: 'booking' }, nextState: 'providing_solution', action: 'provide_booking_help', description: 'Provide booking help' },
        { condition: { type: 'keyword', value: 'agent' }, nextState: 'escalating', action: 'escalate_to_agent', description: 'Escalate to human agent' },
        { condition: { type: 'always' }, nextState: 'providing_solution', action: 'provide_general_help', description: 'Provide general help' }
      ],
      'providing_solution': [
        { condition: { type: 'keyword', value: 'solved' }, nextState: 'completed', action: 'mark_resolved', description: 'Mark issue as resolved' },
        { condition: { type: 'keyword', value: 'agent' }, nextState: 'escalating', action: 'escalate_to_agent', description: 'Escalate to human agent' }
      ],
      'escalating': [
        { condition: { type: 'always' }, nextState: 'completed', action: 'connect_to_agent', description: 'Connect to human agent' }
      ]
    };
  }

  // Onboarding Flow Transitions
  getOnboardingTransitions() {
    return {
      'welcome': [
        { condition: { type: 'always' }, nextState: 'explaining_features', action: 'explain_features', description: 'Explain app features' }
      ],
      'explaining_features': [
        { condition: { type: 'keyword', value: 'ready' }, nextState: 'setting_preferences', action: 'setup_preferences', description: 'Set up user preferences' },
        { condition: { type: 'keyword', value: 'skip' }, nextState: 'first_search', action: 'skip_to_search', description: 'Skip to first search' },
        { condition: { type: 'always' }, nextState: 'setting_preferences', action: 'setup_preferences', description: 'Set up user preferences' }
      ],
      'setting_preferences': [
        { condition: { type: 'always' }, nextState: 'first_search', action: 'start_first_search', description: 'Start first property search' }
      ],
      'first_search': [
        { condition: { type: 'always' }, nextState: 'completed', action: 'complete_onboarding', description: 'Complete onboarding process' }
      ]
    };
  }
}

module.exports = ConversationFlowService;
