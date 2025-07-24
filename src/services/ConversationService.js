const DatabaseService = require('./DatabaseService');
const { collections } = require('../config/firebase');
const Conversation = require('../models/Conversation');
const { logger } = require('../utils/logger');

class ConversationService extends DatabaseService {
  constructor() {
    super();
    this.collection = collections.CONVERSATIONS;
  }

  // Create a new conversation
  async createConversation(conversationData) {
    try {
      const conversation = new Conversation(conversationData);
      const errors = conversation.validate();
      
      if (errors.length > 0) {
        throw new Error(`Validation failed: ${errors.join(', ')}`);
      }

      const result = await this.create(this.collection, conversation.toFirestore(), conversation.id);
      logger.info(`Conversation created: ${conversation.id}`);
      return result;
    } catch (error) {
      logger.error('Error creating conversation:', error);
      throw error;
    }
  }

  // Get conversation by ID
  async getConversation(id) {
    try {
      const data = await this.getById(this.collection, id);
      return data ? Conversation.fromFirestore({ id: data.id, data: () => data }) : null;
    } catch (error) {
      logger.error(`Error getting conversation ${id}:`, error);
      throw error;
    }
  }

  // Get or create conversation for user
  async getOrCreateConversation(userId, whatsappId) {
    try {
      // Try to find existing active conversation
      const conversations = await this.getAll(this.collection, {
        userId,
        status: 'active'
      });

      if (conversations.length > 0) {
        // Return the most recent active conversation
        const conversation = conversations.sort((a, b) => 
          new Date(b.lastMessageAt) - new Date(a.lastMessageAt)
        )[0];
        
        return Conversation.fromFirestore({ id: conversation.id, data: () => conversation });
      }

      // Create new conversation
      const conversationData = {
        userId,
        whatsappId,
        status: 'active',
        currentFlow: 'welcome',
        currentStep: 'start'
      };

      return await this.createConversation(conversationData);
    } catch (error) {
      logger.error(`Error getting or creating conversation for user ${userId}:`, error);
      throw error;
    }
  }

  // Update conversation
  async updateConversation(id, updateData) {
    try {
      const existingConversation = await this.getConversation(id);
      if (!existingConversation) {
        throw new Error('Conversation not found');
      }

      const updatedConversation = new Conversation({ ...existingConversation, ...updateData });
      const errors = updatedConversation.validate();
      
      if (errors.length > 0) {
        throw new Error(`Validation failed: ${errors.join(', ')}`);
      }

      const result = await this.update(this.collection, id, updatedConversation.toFirestore());
      logger.info(`Conversation updated: ${id}`);
      return result;
    } catch (error) {
      logger.error(`Error updating conversation ${id}:`, error);
      throw error;
    }
  }

  // Add message to conversation
  async addMessage(conversationId, messageData) {
    try {
      const conversation = await this.getConversation(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const message = conversation.addMessage(messageData);
      await this.update(this.collection, conversationId, conversation.toFirestore());
      
      logger.info(`Message added to conversation ${conversationId}`, {
        messageId: message.id,
        type: message.type,
        direction: message.direction
      });

      return message;
    } catch (error) {
      logger.error(`Error adding message to conversation ${conversationId}:`, error);
      throw error;
    }
  }

  // Update conversation flow
  async updateFlow(conversationId, flow, step = 'start', context = {}) {
    try {
      const conversation = await this.getConversation(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      conversation.updateFlow(flow, step, context);
      const result = await this.update(this.collection, conversationId, conversation.toFirestore());
      
      logger.info(`Conversation flow updated: ${conversationId}`, {
        flow,
        step,
        context: Object.keys(context)
      });

      return result;
    } catch (error) {
      logger.error(`Error updating conversation flow ${conversationId}:`, error);
      throw error;
    }
  }

  // Update conversation context
  async updateContext(conversationId, context) {
    try {
      const conversation = await this.getConversation(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      conversation.context = { ...conversation.context, ...context };
      conversation.updatedAt = new Date();
      conversation.session.lastActivity = new Date();

      const result = await this.update(this.collection, conversationId, conversation.toFirestore());
      logger.info(`Conversation context updated: ${conversationId}`);
      return result;
    } catch (error) {
      logger.error(`Error updating conversation context ${conversationId}:`, error);
      throw error;
    }
  }

  // Update discovered preferences
  async updateDiscoveredPreferences(conversationId, preferences) {
    try {
      const conversation = await this.getConversation(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      conversation.updateDiscoveredPreferences(preferences);
      const result = await this.update(this.collection, conversationId, conversation.toFirestore());
      
      logger.info(`Discovered preferences updated: ${conversationId}`, { preferences });
      return result;
    } catch (error) {
      logger.error(`Error updating discovered preferences ${conversationId}:`, error);
      throw error;
    }
  }

  // Add shown property
  async addShownProperty(conversationId, propertyId) {
    try {
      const conversation = await this.getConversation(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      conversation.addShownProperty(propertyId);
      const result = await this.update(this.collection, conversationId, conversation.toFirestore());
      
      logger.info(`Property ${propertyId} added to shown list for conversation ${conversationId}`);
      return result;
    } catch (error) {
      logger.error(`Error adding shown property to conversation ${conversationId}:`, error);
      throw error;
    }
  }

  // Add booking to conversation
  async addBooking(conversationId, bookingId) {
    try {
      const conversation = await this.getConversation(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      conversation.addBooking(bookingId);
      const result = await this.update(this.collection, conversationId, conversation.toFirestore());
      
      logger.info(`Booking ${bookingId} added to conversation ${conversationId}`);
      return result;
    } catch (error) {
      logger.error(`Error adding booking to conversation ${conversationId}:`, error);
      throw error;
    }
  }

  // Pause conversation
  async pauseConversation(conversationId) {
    try {
      const conversation = await this.getConversation(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      conversation.pause();
      const result = await this.update(this.collection, conversationId, conversation.toFirestore());
      
      logger.info(`Conversation paused: ${conversationId}`);
      return result;
    } catch (error) {
      logger.error(`Error pausing conversation ${conversationId}:`, error);
      throw error;
    }
  }

  // Resume conversation
  async resumeConversation(conversationId) {
    try {
      const conversation = await this.getConversation(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      conversation.resume();
      const result = await this.update(this.collection, conversationId, conversation.toFirestore());
      
      logger.info(`Conversation resumed: ${conversationId}`);
      return result;
    } catch (error) {
      logger.error(`Error resuming conversation ${conversationId}:`, error);
      throw error;
    }
  }

  // End conversation
  async endConversation(conversationId, goalCompleted = false, goalType = null) {
    try {
      const conversation = await this.getConversation(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      conversation.end(goalCompleted, goalType);
      const result = await this.update(this.collection, conversationId, conversation.toFirestore());
      
      logger.info(`Conversation ended: ${conversationId}`, { goalCompleted, goalType });
      return result;
    } catch (error) {
      logger.error(`Error ending conversation ${conversationId}:`, error);
      throw error;
    }
  }

  // Get conversations by user
  async getConversationsByUser(userId, status = null) {
    try {
      const filters = { userId };
      if (status) filters.status = status;

      const conversations = await this.getAll(this.collection, filters, {
        field: 'lastMessageAt',
        direction: 'desc'
      });

      return conversations.map(conv => 
        Conversation.fromFirestore({ id: conv.id, data: () => conv })
      );
    } catch (error) {
      logger.error(`Error getting conversations for user ${userId}:`, error);
      throw error;
    }
  }

  // Get stale conversations
  async getStaleConversations(hoursThreshold = 24) {
    try {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - hoursThreshold);

      const conversations = await this.getAll(this.collection, {
        status: 'active'
      });

      return conversations.filter(conv => 
        new Date(conv.lastMessageAt) < cutoffTime
      );
    } catch (error) {
      logger.error('Error getting stale conversations:', error);
      throw error;
    }
  }

  // Get conversation analytics
  async getConversationAnalytics(conversationId) {
    try {
      const conversation = await this.getConversation(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      return {
        summary: conversation.getSummary(),
        duration: conversation.getDuration(),
        messageStats: {
          total: conversation.totalMessages,
          recent: conversation.recentMessages.length,
          avgResponseTime: conversation.metrics.responseTime.length > 0 
            ? conversation.metrics.responseTime.reduce((a, b) => a + b) / conversation.metrics.responseTime.length 
            : 0
        },
        engagement: {
          propertiesShown: conversation.session.propertiesShown.length,
          bookingsCreated: conversation.session.bookingsCreated.length,
          goalCompleted: conversation.metrics.goalCompleted,
          goalType: conversation.metrics.goalType
        },
        preferences: conversation.discoveredPreferences
      };
    } catch (error) {
      logger.error(`Error getting conversation analytics ${conversationId}:`, error);
      throw error;
    }
  }

  // Cleanup old conversations
  async cleanupOldConversations(daysOld = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const oldConversations = await this.getAll(this.collection, {
        status: 'ended'
      });

      const toDelete = oldConversations.filter(conv => 
        new Date(conv.updatedAt) < cutoffDate
      );

      if (toDelete.length > 0) {
        await this.batchDelete(this.collection, toDelete.map(conv => conv.id));
        logger.info(`Cleaned up ${toDelete.length} old conversations`);
      }

      return toDelete.length;
    } catch (error) {
      logger.error('Error cleaning up old conversations:', error);
      throw error;
    }
  }
}

module.exports = ConversationService;
