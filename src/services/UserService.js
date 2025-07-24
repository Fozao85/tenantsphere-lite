const DatabaseService = require('./DatabaseService');
const { collections } = require('../config/firebase');
const User = require('../models/User');
const { logger } = require('../utils/logger');

class UserService extends DatabaseService {
  constructor() {
    super();
    this.collection = collections.USERS;
  }

  // Create a new user
  async createUser(userData) {
    try {
      const user = new User(userData);
      const errors = user.validate();
      
      if (errors.length > 0) {
        throw new Error(`Validation failed: ${errors.join(', ')}`);
      }

      const result = await this.create(this.collection, user.toFirestore(), user.id);
      logger.info(`User created: ${user.id}`);
      return result;
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  // Get user by ID
  async getUser(id) {
    try {
      const data = await this.getById(this.collection, id);
      return data ? User.fromFirestore({ id: data.id, data: () => data }) : null;
    } catch (error) {
      logger.error(`Error getting user ${id}:`, error);
      throw error;
    }
  }

  // Get user by WhatsApp ID
  async getUserByWhatsAppId(whatsappId) {
    try {
      const users = await this.getAll(this.collection, { whatsappId });
      return users.length > 0 ? User.fromFirestore({ id: users[0].id, data: () => users[0] }) : null;
    } catch (error) {
      logger.error(`Error getting user by WhatsApp ID ${whatsappId}:`, error);
      throw error;
    }
  }

  // Get user by phone number
  async getUserByPhone(phone) {
    try {
      const users = await this.getAll(this.collection, { phone });
      return users.length > 0 ? User.fromFirestore({ id: users[0].id, data: () => users[0] }) : null;
    } catch (error) {
      logger.error(`Error getting user by phone ${phone}:`, error);
      throw error;
    }
  }

  // Update user
  async updateUser(id, updateData) {
    try {
      const existingUser = await this.getUser(id);
      if (!existingUser) {
        throw new Error('User not found');
      }

      const updatedUser = new User({ ...existingUser, ...updateData });
      const errors = updatedUser.validate();
      
      if (errors.length > 0) {
        throw new Error(`Validation failed: ${errors.join(', ')}`);
      }

      const result = await this.update(this.collection, id, updatedUser.toFirestore());
      logger.info(`User updated: ${id}`);
      return result;
    } catch (error) {
      logger.error(`Error updating user ${id}:`, error);
      throw error;
    }
  }

  // Delete user
  async deleteUser(id) {
    try {
      const result = await this.delete(this.collection, id);
      logger.info(`User deleted: ${id}`);
      return result;
    } catch (error) {
      logger.error(`Error deleting user ${id}:`, error);
      throw error;
    }
  }

  // Update user preferences
  async updateUserPreferences(id, preferences) {
    try {
      const user = await this.getUser(id);
      if (!user) {
        throw new Error('User not found');
      }

      user.updatePreferences(preferences);
      const result = await this.update(this.collection, id, user.toFirestore());
      logger.info(`User preferences updated: ${id}`);
      return result;
    } catch (error) {
      logger.error(`Error updating user preferences ${id}:`, error);
      throw error;
    }
  }

  // Opt user in for notifications
  async optInUser(id) {
    try {
      const user = await this.getUser(id);
      if (!user) {
        throw new Error('User not found');
      }

      user.optIn();
      const result = await this.update(this.collection, id, user.toFirestore());
      logger.info(`User opted in: ${id}`);
      return result;
    } catch (error) {
      logger.error(`Error opting in user ${id}:`, error);
      throw error;
    }
  }

  // Opt user out of notifications
  async optOutUser(id) {
    try {
      const user = await this.getUser(id);
      if (!user) {
        throw new Error('User not found');
      }

      user.optOut();
      const result = await this.update(this.collection, id, user.toFirestore());
      logger.info(`User opted out: ${id}`);
      return result;
    } catch (error) {
      logger.error(`Error opting out user ${id}:`, error);
      throw error;
    }
  }

  // Add viewed property to user
  async addViewedProperty(userId, propertyId) {
    try {
      const user = await this.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.addViewedProperty(propertyId);
      const result = await this.update(this.collection, userId, user.toFirestore());
      logger.info(`Added viewed property ${propertyId} to user ${userId}`);
      return result;
    } catch (error) {
      logger.error(`Error adding viewed property to user ${userId}:`, error);
      throw error;
    }
  }

  // Add booking to user
  async addBooking(userId, bookingId) {
    try {
      const user = await this.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.addBooking(bookingId);
      const result = await this.update(this.collection, userId, user.toFirestore());
      logger.info(`Added booking ${bookingId} to user ${userId}`);
      return result;
    } catch (error) {
      logger.error(`Error adding booking to user ${userId}:`, error);
      throw error;
    }
  }

  // Update conversation state
  async updateConversationState(userId, state) {
    try {
      const user = await this.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.updateConversationState(state);
      const result = await this.update(this.collection, userId, user.toFirestore());
      logger.info(`Updated conversation state for user ${userId}: ${state}`);
      return result;
    } catch (error) {
      logger.error(`Error updating conversation state for user ${userId}:`, error);
      throw error;
    }
  }

  // Get all opted-in users
  async getOptedInUsers() {
    try {
      return await this.getAll(this.collection, { optedIn: true, isActive: true });
    } catch (error) {
      logger.error('Error getting opted-in users:', error);
      throw error;
    }
  }

  // Get users by preferences (for property matching)
  async getUsersForPropertyAlert(property) {
    try {
      const optedInUsers = await this.getOptedInUsers();
      
      // Filter users whose preferences match the property
      const matchingUsers = optedInUsers.filter(userData => {
        const user = new User(userData);
        return user.matchesPreferences(property);
      });

      return matchingUsers;
    } catch (error) {
      logger.error('Error getting users for property alert:', error);
      throw error;
    }
  }

  // Get user statistics
  async getUserStats(userId) {
    try {
      const user = await this.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      return {
        totalBookings: user.bookings.length,
        totalViewedProperties: user.viewedProperties.length,
        memberSince: user.createdAt,
        lastInteraction: user.lastInteraction,
        optedIn: user.optedIn,
        hasPreferences: Object.values(user.preferences).some(pref => 
          pref !== null && (Array.isArray(pref) ? pref.length > 0 : true)
        )
      };
    } catch (error) {
      logger.error(`Error getting user stats ${userId}:`, error);
      throw error;
    }
  }

  // Search users (admin function)
  async searchUsers(searchTerm, filters = {}) {
    try {
      let users = await this.getAll(this.collection, filters);

      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        users = users.filter(user => 
          (user.name && user.name.toLowerCase().includes(searchLower)) ||
          (user.phone && user.phone.includes(searchTerm)) ||
          (user.whatsappId && user.whatsappId.includes(searchTerm))
        );
      }

      return users;
    } catch (error) {
      logger.error('Error searching users:', error);
      throw error;
    }
  }

  // Get inactive users (for cleanup or re-engagement)
  async getInactiveUsers(daysSinceLastInteraction = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastInteraction);

      const allUsers = await this.getAll(this.collection, { isActive: true });
      
      return allUsers.filter(user => 
        !user.lastInteraction || new Date(user.lastInteraction) < cutoffDate
      );
    } catch (error) {
      logger.error('Error getting inactive users:', error);
      throw error;
    }
  }

  // Bulk update users
  async bulkUpdateUsers(updates) {
    try {
      const updatePromises = updates.map(({ id, data }) => 
        this.updateUser(id, data)
      );
      
      const results = await Promise.allSettled(updatePromises);
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      logger.info(`Bulk update completed: ${successful} successful, ${failed} failed`);
      
      return { successful, failed, results };
    } catch (error) {
      logger.error('Error in bulk update users:', error);
      throw error;
    }
  }
}

module.exports = UserService;
