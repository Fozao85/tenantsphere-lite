const { v4: uuidv4 } = require('uuid');

class Conversation {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.userId = data.userId;
    this.whatsappId = data.whatsappId; // WhatsApp user ID
    this.status = data.status || 'active'; // active, paused, ended
    this.currentFlow = data.currentFlow || 'welcome'; // welcome, property_search, booking, preferences, etc.
    this.currentStep = data.currentStep || 'start';
    this.context = data.context || {}; // Current conversation context/state
    this.language = data.language || 'en';
    this.lastMessageAt = data.lastMessageAt || new Date();
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    
    // Message history (limited to recent messages for performance)
    this.recentMessages = data.recentMessages || [];
    this.totalMessages = data.totalMessages || 0;
    
    // User preferences discovered during conversation
    this.discoveredPreferences = data.discoveredPreferences || {
      budget: null,
      location: null,
      propertyType: null,
      bedrooms: null,
      amenities: []
    };
    
    // Current session data
    this.session = data.session || {
      startedAt: new Date(),
      lastActivity: new Date(),
      messageCount: 0,
      propertiesShown: [],
      bookingsCreated: []
    };
    
    // Conversation metrics
    this.metrics = data.metrics || {
      responseTime: [], // Array of response times
      userSatisfaction: null,
      goalCompleted: false,
      goalType: null // property_found, booking_made, info_provided
    };
  }

  // Convert to Firestore document
  toFirestore() {
    return {
      id: this.id,
      userId: this.userId,
      whatsappId: this.whatsappId,
      status: this.status,
      currentFlow: this.currentFlow,
      currentStep: this.currentStep,
      context: this.context,
      language: this.language,
      lastMessageAt: this.lastMessageAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      recentMessages: this.recentMessages,
      totalMessages: this.totalMessages,
      discoveredPreferences: this.discoveredPreferences,
      session: this.session,
      metrics: this.metrics
    };
  }

  // Create from Firestore document
  static fromFirestore(doc) {
    const data = doc.data();
    return new Conversation({
      id: doc.id,
      ...data
    });
  }

  // Add a message to the conversation
  addMessage(message) {
    const messageData = {
      id: uuidv4(),
      timestamp: new Date(),
      type: message.type, // text, image, button, list, etc.
      direction: message.direction, // incoming, outgoing
      content: message.content,
      metadata: message.metadata || {}
    };

    // Add to recent messages (keep only last 20 for performance)
    this.recentMessages.push(messageData);
    if (this.recentMessages.length > 20) {
      this.recentMessages.shift();
    }

    this.totalMessages++;
    this.session.messageCount++;
    this.lastMessageAt = new Date();
    this.session.lastActivity = new Date();
    this.updatedAt = new Date();

    return messageData;
  }

  // Update conversation flow and step
  updateFlow(flow, step = 'start', context = {}) {
    this.currentFlow = flow;
    this.currentStep = step;
    this.context = { ...this.context, ...context };
    this.updatedAt = new Date();
    this.session.lastActivity = new Date();
  }

  // Update discovered preferences
  updateDiscoveredPreferences(preferences) {
    this.discoveredPreferences = { ...this.discoveredPreferences, ...preferences };
    this.updatedAt = new Date();
  }

  // Add property to shown list
  addShownProperty(propertyId) {
    if (!this.session.propertiesShown.includes(propertyId)) {
      this.session.propertiesShown.push(propertyId);
      this.updatedAt = new Date();
    }
  }

  // Add booking to session
  addBooking(bookingId) {
    if (!this.session.bookingsCreated.includes(bookingId)) {
      this.session.bookingsCreated.push(bookingId);
      this.updatedAt = new Date();
    }
  }

  // Check if conversation is stale (no activity for a while)
  isStale(hoursThreshold = 24) {
    const now = new Date();
    const hoursSinceLastActivity = (now - this.lastMessageAt) / (1000 * 60 * 60);
    return hoursSinceLastActivity > hoursThreshold;
  }

  // Pause conversation
  pause() {
    this.status = 'paused';
    this.updatedAt = new Date();
  }

  // Resume conversation
  resume() {
    this.status = 'active';
    this.session.lastActivity = new Date();
    this.updatedAt = new Date();
  }

  // End conversation
  end(goalCompleted = false, goalType = null) {
    this.status = 'ended';
    this.metrics.goalCompleted = goalCompleted;
    this.metrics.goalType = goalType;
    this.updatedAt = new Date();
  }

  // Get conversation summary
  getSummary() {
    return {
      id: this.id,
      userId: this.userId,
      status: this.status,
      currentFlow: this.currentFlow,
      totalMessages: this.totalMessages,
      propertiesShown: this.session.propertiesShown.length,
      bookingsCreated: this.session.bookingsCreated.length,
      duration: this.getDuration(),
      lastActivity: this.lastMessageAt
    };
  }

  // Get conversation duration
  getDuration() {
    const now = this.status === 'ended' ? this.updatedAt : new Date();
    const durationMs = now - this.createdAt;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  // Get last user message
  getLastUserMessage() {
    return this.recentMessages
      .filter(msg => msg.direction === 'incoming')
      .pop();
  }

  // Get last bot message
  getLastBotMessage() {
    return this.recentMessages
      .filter(msg => msg.direction === 'outgoing')
      .pop();
  }

  // Check if user has seen property
  hasSeenProperty(propertyId) {
    return this.session.propertiesShown.includes(propertyId);
  }

  // Validation
  validate() {
    const errors = [];

    if (!this.userId || this.userId.trim().length === 0) {
      errors.push('User ID is required');
    }

    if (!this.whatsappId || this.whatsappId.trim().length === 0) {
      errors.push('WhatsApp ID is required');
    }

    const validStatuses = ['active', 'paused', 'ended'];
    if (!validStatuses.includes(this.status)) {
      errors.push('Invalid conversation status');
    }

    return errors;
  }
}

module.exports = Conversation;
