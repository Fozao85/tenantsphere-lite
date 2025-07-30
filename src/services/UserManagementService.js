const { logger } = require('../utils/logger');
const UserService = require('./UserService');
const WhatsAppService = require('./WhatsAppService');

class UserManagementService {
  constructor() {
    this.userService = new UserService();
    this.whatsapp = new WhatsAppService();
  }

  // Handle user opt-in to the service
  async handleOptIn(phoneNumber, messageData) {
    try {
      logger.info(`Processing opt-in for ${phoneNumber}`);

      // Get or create user
      const user = await this.userService.getOrCreateUser(phoneNumber, {
        name: messageData.contact?.profile?.name || 'User',
        phone: phoneNumber,
        optedIn: true,
        optInDate: new Date(),
        status: 'active',
        role: 'user',
        preferences: {
          notifications: true,
          marketing: true,
          propertyAlerts: true
        }
      });

      // Send welcome message with opt-in confirmation
      await this.sendOptInWelcomeMessage(phoneNumber, user);

      logger.info(`User ${phoneNumber} opted in successfully`);
      return user;

    } catch (error) {
      logger.error('Error handling opt-in:', error);
      throw error;
    }
  }

  // Handle user opt-out from the service
  async handleOptOut(phoneNumber, reason = null) {
    try {
      logger.info(`Processing opt-out for ${phoneNumber}`);

      const user = await this.userService.getUserByPhone(phoneNumber);
      if (!user) {
        throw new Error('User not found');
      }

      // Update user opt-out status
      await this.userService.updateUser(user.id, {
        optedIn: false,
        optOutDate: new Date(),
        optOutReason: reason,
        status: 'opted_out',
        preferences: {
          ...user.preferences,
          notifications: false,
          marketing: false,
          propertyAlerts: false
        }
      });

      // Send opt-out confirmation
      await this.sendOptOutConfirmation(phoneNumber, reason);

      logger.info(`User ${phoneNumber} opted out successfully`);
      return { success: true, message: 'Opted out successfully' };

    } catch (error) {
      logger.error('Error handling opt-out:', error);
      throw error;
    }
  }

  // Check if user is opted in
  async isUserOptedIn(phoneNumber) {
    try {
      const user = await this.userService.getUserByPhone(phoneNumber);
      return user && user.optedIn === true && user.status === 'active';
    } catch (error) {
      logger.error('Error checking opt-in status:', error);
      return false;
    }
  }

  // Update user preferences
  async updateUserPreferences(userId, preferences) {
    try {
      logger.info(`Updating preferences for user ${userId}`);

      const user = await this.userService.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const updatedPreferences = {
        ...user.preferences,
        ...preferences,
        updatedAt: new Date()
      };

      await this.userService.updateUser(userId, {
        preferences: updatedPreferences
      });

      logger.info(`Preferences updated for user ${userId}`);
      return updatedPreferences;

    } catch (error) {
      logger.error('Error updating user preferences:', error);
      throw error;
    }
  }

  // Get user profile and preferences
  async getUserProfile(phoneNumber) {
    try {
      const user = await this.userService.getUserByPhone(phoneNumber);
      if (!user) {
        throw new Error('User not found');
      }

      return {
        id: user.id,
        name: user.name,
        phone: user.phone,
        optedIn: user.optedIn,
        status: user.status,
        role: user.role,
        joinDate: user.createdAt,
        preferences: user.preferences,
        savedProperties: user.savedProperties || [],
        searchHistory: user.searchHistory || [],
        totalInteractions: (user.interactions || []).length
      };

    } catch (error) {
      logger.error('Error getting user profile:', error);
      throw error;
    }
  }

  // Update user profile information
  async updateUserProfile(phoneNumber, profileData) {
    try {
      logger.info(`Updating profile for ${phoneNumber}`);

      const user = await this.userService.getUserByPhone(phoneNumber);
      if (!user) {
        throw new Error('User not found');
      }

      // Validate and sanitize profile data
      const allowedFields = ['name', 'email', 'location', 'occupation'];
      const updateData = {};
      
      allowedFields.forEach(field => {
        if (profileData[field] !== undefined) {
          updateData[field] = profileData[field];
        }
      });

      updateData.updatedAt = new Date();

      await this.userService.updateUser(user.id, updateData);

      logger.info(`Profile updated for user ${phoneNumber}`);
      return await this.getUserProfile(phoneNumber);

    } catch (error) {
      logger.error('Error updating user profile:', error);
      throw error;
    }
  }

  // Handle privacy settings update
  async updatePrivacySettings(phoneNumber, privacySettings) {
    try {
      logger.info(`Updating privacy settings for ${phoneNumber}`);

      const user = await this.userService.getUserByPhone(phoneNumber);
      if (!user) {
        throw new Error('User not found');
      }

      const updatedPreferences = {
        ...user.preferences,
        privacy: {
          ...user.preferences.privacy,
          ...privacySettings
        },
        updatedAt: new Date()
      };

      await this.userService.updateUser(user.id, {
        preferences: updatedPreferences
      });

      logger.info(`Privacy settings updated for user ${phoneNumber}`);
      return updatedPreferences.privacy;

    } catch (error) {
      logger.error('Error updating privacy settings:', error);
      throw error;
    }
  }

  // Handle notification preferences update
  async updateNotificationPreferences(phoneNumber, notificationSettings) {
    try {
      logger.info(`Updating notification preferences for ${phoneNumber}`);

      const user = await this.userService.getUserByPhone(phoneNumber);
      if (!user) {
        throw new Error('User not found');
      }

      const updatedPreferences = {
        ...user.preferences,
        notifications: notificationSettings.notifications !== undefined ? notificationSettings.notifications : user.preferences.notifications,
        marketing: notificationSettings.marketing !== undefined ? notificationSettings.marketing : user.preferences.marketing,
        propertyAlerts: notificationSettings.propertyAlerts !== undefined ? notificationSettings.propertyAlerts : user.preferences.propertyAlerts,
        updatedAt: new Date()
      };

      await this.userService.updateUser(user.id, {
        preferences: updatedPreferences
      });

      // Send confirmation message
      await this.sendNotificationPreferencesConfirmation(phoneNumber, updatedPreferences);

      logger.info(`Notification preferences updated for user ${phoneNumber}`);
      return updatedPreferences;

    } catch (error) {
      logger.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  // Delete user account (GDPR compliance)
  async deleteUserAccount(phoneNumber, reason = null) {
    try {
      logger.info(`Deleting account for ${phoneNumber}`);

      const user = await this.userService.getUserByPhone(phoneNumber);
      if (!user) {
        throw new Error('User not found');
      }

      // Anonymize user data instead of hard delete for analytics
      await this.userService.updateUser(user.id, {
        name: 'Deleted User',
        phone: `deleted_${Date.now()}`,
        email: null,
        status: 'deleted',
        deletedAt: new Date(),
        deletionReason: reason,
        optedIn: false,
        preferences: {},
        savedProperties: [],
        searchHistory: [],
        interactions: []
      });

      // Send account deletion confirmation
      await this.sendAccountDeletionConfirmation(phoneNumber);

      logger.info(`Account deleted for user ${phoneNumber}`);
      return { success: true, message: 'Account deleted successfully' };

    } catch (error) {
      logger.error('Error deleting user account:', error);
      throw error;
    }
  }

  // Export user data (GDPR compliance)
  async exportUserData(phoneNumber) {
    try {
      logger.info(`Exporting data for ${phoneNumber}`);

      const user = await this.userService.getUserByPhone(phoneNumber);
      if (!user) {
        throw new Error('User not found');
      }

      const exportData = {
        personalInfo: {
          name: user.name,
          phone: user.phone,
          email: user.email,
          location: user.location,
          occupation: user.occupation,
          joinDate: user.createdAt,
          lastActivity: user.lastActivity
        },
        preferences: user.preferences,
        savedProperties: user.savedProperties || [],
        searchHistory: user.searchHistory || [],
        interactions: user.interactions || [],
        optInStatus: {
          optedIn: user.optedIn,
          optInDate: user.optInDate,
          optOutDate: user.optOutDate
        },
        exportDate: new Date()
      };

      logger.info(`Data exported for user ${phoneNumber}`);
      return exportData;

    } catch (error) {
      logger.error('Error exporting user data:', error);
      throw error;
    }
  }

  // Send opt-in welcome message
  async sendOptInWelcomeMessage(phoneNumber, user) {
    try {
      const message = `🎉 *Welcome to TenantSphere!*\n\nThank you for joining our property search platform. You're now opted in to receive:\n\n✅ Property recommendations\n✅ New listing alerts\n✅ Booking confirmations\n✅ Important updates\n\n🔧 You can manage your preferences anytime by typing "settings" or "preferences".\n\n🚫 To opt out, simply type "STOP" or "opt out".\n\nLet's find your perfect property! 🏠`;

      await this.whatsapp.sendTextMessage(phoneNumber, message);

      const buttons = [
        { id: 'start_search', title: '🔍 Start Searching' },
        { id: 'set_preferences', title: '⚙️ Set Preferences' },
        { id: 'help', title: '❓ Help' }
      ];

      await this.whatsapp.sendButtonMessage(phoneNumber, "What would you like to do first?", buttons);

    } catch (error) {
      logger.warn('Could not send opt-in welcome message:', error.message);
    }
  }

  // Send opt-out confirmation
  async sendOptOutConfirmation(phoneNumber, reason) {
    try {
      let message = `😔 *You've been opted out*\n\nWe're sorry to see you go! You will no longer receive messages from TenantSphere.`;
      
      if (reason) {
        message += `\n\n📝 *Reason:* ${reason}`;
      }
      
      message += `\n\n💬 To opt back in anytime, just send us a message.\n\nThank you for using TenantSphere! 🏠`;

      await this.whatsapp.sendTextMessage(phoneNumber, message);

    } catch (error) {
      logger.warn('Could not send opt-out confirmation:', error.message);
    }
  }

  // Send notification preferences confirmation
  async sendNotificationPreferencesConfirmation(phoneNumber, preferences) {
    try {
      const message = `⚙️ *Notification Preferences Updated*\n\n📢 General Notifications: ${preferences.notifications ? '✅ On' : '❌ Off'}\n📧 Marketing Messages: ${preferences.marketing ? '✅ On' : '❌ Off'}\n🏠 Property Alerts: ${preferences.propertyAlerts ? '✅ On' : '❌ Off'}\n\nYour preferences have been saved successfully!`;

      await this.whatsapp.sendTextMessage(phoneNumber, message);

    } catch (error) {
      logger.warn('Could not send notification preferences confirmation:', error.message);
    }
  }

  // Send account deletion confirmation
  async sendAccountDeletionConfirmation(phoneNumber) {
    try {
      const message = `🗑️ *Account Deleted*\n\nYour TenantSphere account has been permanently deleted. All your data has been removed from our system.\n\nIf you change your mind, you can always create a new account by sending us a message.\n\nThank you for using TenantSphere! 🏠`;

      await this.whatsapp.sendTextMessage(phoneNumber, message);

    } catch (error) {
      logger.warn('Could not send account deletion confirmation:', error.message);
    }
  }

  // Get user statistics for admin dashboard
  async getUserStatistics() {
    try {
      const allUsers = await this.userService.getAllUsers();
      
      const stats = {
        totalUsers: allUsers.length,
        activeUsers: allUsers.filter(u => u.status === 'active' && u.optedIn).length,
        optedOutUsers: allUsers.filter(u => u.status === 'opted_out' || !u.optedIn).length,
        deletedUsers: allUsers.filter(u => u.status === 'deleted').length,
        newUsersThisWeek: 0,
        newUsersThisMonth: 0,
        usersByRole: {
          user: allUsers.filter(u => u.role === 'user').length,
          agent: allUsers.filter(u => u.role === 'agent').length,
          admin: allUsers.filter(u => u.role === 'admin').length
        }
      };

      // Calculate new users
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      stats.newUsersThisWeek = allUsers.filter(u => 
        new Date(u.createdAt) >= oneWeekAgo
      ).length;

      stats.newUsersThisMonth = allUsers.filter(u => 
        new Date(u.createdAt) >= oneMonthAgo
      ).length;

      return stats;

    } catch (error) {
      logger.error('Error getting user statistics:', error);
      throw error;
    }
  }
}

module.exports = UserManagementService;
