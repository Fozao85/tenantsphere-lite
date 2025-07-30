const { logger } = require('../utils/logger');
const UserService = require('./UserService');
const PropertyService = require('./PropertyService');
const WhatsAppService = require('./WhatsAppService');
const RecommendationService = require('./RecommendationService');

class EnhancedNotificationService {
  constructor() {
    this.userService = new UserService();
    this.propertyService = new PropertyService();
    this.whatsapp = new WhatsAppService();
    this.recommendationService = new RecommendationService();
    
    // Notification types
    this.notificationTypes = {
      NEW_PROPERTY: 'new_property',
      PRICE_DROP: 'price_drop',
      RECOMMENDATION: 'recommendation',
      BOOKING_CONFIRMATION: 'booking_confirmation',
      BOOKING_REMINDER: 'booking_reminder',
      PROPERTY_UPDATE: 'property_update',
      MARKETING: 'marketing',
      SYSTEM: 'system'
    };

    // Rate limiting settings
    this.rateLimits = {
      NEW_PROPERTY: { maxPerDay: 5, cooldownHours: 2 },
      PRICE_DROP: { maxPerDay: 3, cooldownHours: 4 },
      RECOMMENDATION: { maxPerDay: 2, cooldownHours: 12 },
      MARKETING: { maxPerDay: 1, cooldownHours: 24 }
    };
  }

  // Send notification to a single user
  async sendNotification(userId, notificationType, data) {
    try {
      logger.info(`Sending ${notificationType} notification to user ${userId}`);

      const user = await this.userService.getUserById(userId);
      if (!user || !user.optedIn || user.status !== 'active') {
        logger.info(`User ${userId} not eligible for notifications`);
        return { sent: false, reason: 'User not opted in or inactive' };
      }

      // Check if user has this notification type enabled
      if (!this.isNotificationTypeEnabled(user, notificationType)) {
        logger.info(`Notification type ${notificationType} disabled for user ${userId}`);
        return { sent: false, reason: 'Notification type disabled' };
      }

      // Check rate limits
      if (!await this.checkRateLimit(userId, notificationType)) {
        logger.info(`Rate limit exceeded for ${notificationType} to user ${userId}`);
        return { sent: false, reason: 'Rate limit exceeded' };
      }

      // Generate notification content
      const notification = await this.generateNotificationContent(notificationType, data, user);
      
      // Send notification
      await this.deliverNotification(user.phone, notification);

      // Track notification
      await this.trackNotification(userId, notificationType, data);

      logger.info(`${notificationType} notification sent successfully to user ${userId}`);
      return { sent: true, notificationId: notification.id };

    } catch (error) {
      logger.error('Error sending notification:', error);
      return { sent: false, reason: error.message };
    }
  }

  // Broadcast notification to multiple users
  async broadcastNotification(userIds, notificationType, data) {
    try {
      logger.info(`Broadcasting ${notificationType} notification to ${userIds.length} users`);

      const results = [];
      const batchSize = 10; // Process in batches to avoid overwhelming the system

      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        const batchPromises = batch.map(userId => 
          this.sendNotification(userId, notificationType, data)
        );

        const batchResults = await Promise.allSettled(batchPromises);
        results.push(...batchResults.map((result, index) => ({
          userId: batch[index],
          ...result.value
        })));

        // Small delay between batches to respect rate limits
        if (i + batchSize < userIds.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const successCount = results.filter(r => r.sent).length;
      logger.info(`Broadcast complete: ${successCount}/${userIds.length} notifications sent`);

      return {
        totalUsers: userIds.length,
        successCount,
        failureCount: userIds.length - successCount,
        results
      };

    } catch (error) {
      logger.error('Error broadcasting notification:', error);
      throw error;
    }
  }

  // Notify users about new properties matching their preferences
  async notifyNewProperty(propertyId) {
    try {
      logger.info(`Processing new property notifications for property ${propertyId}`);

      const property = await this.propertyService.getPropertyById(propertyId);
      if (!property) {
        throw new Error('Property not found');
      }

      // Get users who might be interested in this property
      const interestedUsers = await this.findInterestedUsers(property);
      
      if (interestedUsers.length === 0) {
        logger.info('No interested users found for new property');
        return { notified: 0 };
      }

      // Send notifications
      const results = await this.broadcastNotification(
        interestedUsers.map(u => u.id),
        this.notificationTypes.NEW_PROPERTY,
        { property }
      );

      logger.info(`New property notifications sent: ${results.successCount} users notified`);
      return { notified: results.successCount };

    } catch (error) {
      logger.error('Error notifying new property:', error);
      throw error;
    }
  }

  // Send personalized recommendations
  async sendRecommendations(userId) {
    try {
      logger.info(`Sending recommendations to user ${userId}`);

      const user = await this.userService.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate recommendations
      const recommendations = await this.recommendationService.generateRecommendations(user, 3);
      
      if (recommendations.length === 0) {
        logger.info('No recommendations available for user');
        return { sent: false, reason: 'No recommendations available' };
      }

      // Send recommendation notification
      const result = await this.sendNotification(
        userId,
        this.notificationTypes.RECOMMENDATION,
        { recommendations }
      );

      return result;

    } catch (error) {
      logger.error('Error sending recommendations:', error);
      throw error;
    }
  }

  // Send booking confirmation
  async sendBookingConfirmation(userId, bookingData) {
    try {
      return await this.sendNotification(
        userId,
        this.notificationTypes.BOOKING_CONFIRMATION,
        { booking: bookingData }
      );
    } catch (error) {
      logger.error('Error sending booking confirmation:', error);
      throw error;
    }
  }

  // Send marketing message
  async sendMarketingMessage(userIds, messageData) {
    try {
      return await this.broadcastNotification(
        userIds,
        this.notificationTypes.MARKETING,
        messageData
      );
    } catch (error) {
      logger.error('Error sending marketing message:', error);
      throw error;
    }
  }

  // Check if notification type is enabled for user
  isNotificationTypeEnabled(user, notificationType) {
    const preferences = user.preferences || {};
    
    switch (notificationType) {
      case this.notificationTypes.NEW_PROPERTY:
      case this.notificationTypes.PRICE_DROP:
      case this.notificationTypes.RECOMMENDATION:
        return preferences.propertyAlerts !== false;
      
      case this.notificationTypes.BOOKING_CONFIRMATION:
      case this.notificationTypes.BOOKING_REMINDER:
        return preferences.notifications !== false;
      
      case this.notificationTypes.MARKETING:
        return preferences.marketing === true;
      
      case this.notificationTypes.SYSTEM:
        return true; // System notifications are always enabled
      
      default:
        return preferences.notifications !== false;
    }
  }

  // Check rate limits for notifications
  async checkRateLimit(userId, notificationType) {
    try {
      const limits = this.rateLimits[notificationType];
      if (!limits) return true; // No limits for this type

      // Get user's notification history for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const user = await this.userService.getUserById(userId);
      const notificationHistory = user.notificationHistory || [];
      
      const todayNotifications = notificationHistory.filter(n => 
        n.type === notificationType && 
        new Date(n.sentAt) >= today
      );

      // Check daily limit
      if (todayNotifications.length >= limits.maxPerDay) {
        return false;
      }

      // Check cooldown period
      if (todayNotifications.length > 0) {
        const lastNotification = todayNotifications[todayNotifications.length - 1];
        const cooldownEnd = new Date(lastNotification.sentAt);
        cooldownEnd.setHours(cooldownEnd.getHours() + limits.cooldownHours);
        
        if (new Date() < cooldownEnd) {
          return false;
        }
      }

      return true;

    } catch (error) {
      logger.error('Error checking rate limit:', error);
      return false;
    }
  }

  // Generate notification content based on type and data
  async generateNotificationContent(notificationType, data, user) {
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    switch (notificationType) {
      case this.notificationTypes.NEW_PROPERTY:
        return {
          id: notificationId,
          type: 'text',
          message: this.generateNewPropertyMessage(data.property),
          buttons: [
            { id: `view_${data.property.id}`, title: '👁️ View Property' },
            { id: `save_${data.property.id}`, title: '💾 Save Property' },
            { id: 'stop_alerts', title: '🔕 Stop Alerts' }
          ]
        };

      case this.notificationTypes.RECOMMENDATION:
        return {
          id: notificationId,
          type: 'text',
          message: this.generateRecommendationMessage(data.recommendations, user),
          buttons: [
            { id: 'view_recommendations', title: '⭐ View All' },
            { id: 'update_preferences', title: '⚙️ Update Preferences' }
          ]
        };

      case this.notificationTypes.BOOKING_CONFIRMATION:
        return {
          id: notificationId,
          type: 'text',
          message: this.generateBookingConfirmationMessage(data.booking)
        };

      case this.notificationTypes.MARKETING:
        return {
          id: notificationId,
          type: 'text',
          message: data.message,
          buttons: data.buttons || []
        };

      default:
        return {
          id: notificationId,
          type: 'text',
          message: data.message || 'You have a new notification from TenantSphere.'
        };
    }
  }

  // Generate new property notification message
  generateNewPropertyMessage(property) {
    return `🏠 *New Property Alert!*\n\n*${property.title || property.type}*\n📍 ${property.location}\n💰 ${this.formatPrice(property.price)} FCFA/month\n\n${property.bedrooms ? `🛏️ ${property.bedrooms} bedroom${property.bedrooms > 1 ? 's' : ''}\n` : ''}${property.amenities && property.amenities.length > 0 ? `✨ ${property.amenities.slice(0, 3).join(', ')}\n` : ''}\nThis property matches your preferences! 🎯`;
  }

  // Generate recommendation notification message
  generateRecommendationMessage(recommendations, user) {
    const count = recommendations.length;
    return `⭐ *Personalized Recommendations*\n\nHi ${user.name || 'there'}! I found ${count} new propert${count > 1 ? 'ies' : 'y'} that match your preferences:\n\n${recommendations.map((p, i) => `${i + 1}. ${p.title || p.type} in ${p.location} - ${this.formatPrice(p.price)} FCFA`).join('\n')}\n\nThese are specially selected based on your search history and preferences! 🎯`;
  }

  // Generate booking confirmation message
  generateBookingConfirmationMessage(booking) {
    return `✅ *Booking Confirmed!*\n\n🏠 Property: ${booking.propertyTitle}\n📅 Date: ${booking.date}\n⏰ Time: ${booking.time}\n📞 Agent: ${booking.agentName}\n\nYour property tour has been scheduled. The agent will contact you to confirm details.\n\nSee you there! 🏠`;
  }

  // Deliver notification via WhatsApp
  async deliverNotification(phoneNumber, notification) {
    try {
      if (notification.type === 'text') {
        await this.whatsapp.sendTextMessage(phoneNumber, notification.message);
        
        if (notification.buttons && notification.buttons.length > 0) {
          await this.whatsapp.sendButtonMessage(phoneNumber, "Quick actions:", notification.buttons);
        }
      }
    } catch (error) {
      logger.error('Error delivering notification:', error);
      throw error;
    }
  }

  // Track notification for analytics and rate limiting
  async trackNotification(userId, notificationType, data) {
    try {
      const user = await this.userService.getUserById(userId);
      const notificationHistory = user.notificationHistory || [];
      
      notificationHistory.push({
        type: notificationType,
        sentAt: new Date(),
        data: data
      });

      // Keep only last 100 notifications to prevent unlimited growth
      if (notificationHistory.length > 100) {
        notificationHistory.splice(0, notificationHistory.length - 100);
      }

      await this.userService.updateUser(userId, {
        notificationHistory,
        lastNotificationAt: new Date()
      });

    } catch (error) {
      logger.warn('Could not track notification:', error.message);
    }
  }

  // Find users interested in a property
  async findInterestedUsers(property) {
    try {
      const allUsers = await this.userService.getAllUsers();
      const interestedUsers = [];

      for (const user of allUsers) {
        if (!user.optedIn || user.status !== 'active') continue;
        if (!this.isNotificationTypeEnabled(user, this.notificationTypes.NEW_PROPERTY)) continue;

        // Check if property matches user preferences
        if (await this.doesPropertyMatchUserPreferences(property, user)) {
          interestedUsers.push(user);
        }
      }

      return interestedUsers;

    } catch (error) {
      logger.error('Error finding interested users:', error);
      return [];
    }
  }

  // Check if property matches user preferences
  async doesPropertyMatchUserPreferences(property, user) {
    const preferences = user.preferences || {};
    
    // Check location preferences
    if (preferences.preferredLocations && preferences.preferredLocations.length > 0) {
      if (!preferences.preferredLocations.some(loc => 
        property.location.toLowerCase().includes(loc.toLowerCase())
      )) {
        return false;
      }
    }

    // Check price range preferences
    if (preferences.budgetRange) {
      if (preferences.budgetRange.max && property.price > preferences.budgetRange.max) {
        return false;
      }
      if (preferences.budgetRange.min && property.price < preferences.budgetRange.min) {
        return false;
      }
    }

    return true;
  }

  // Format price with proper comma separation
  formatPrice(price) {
    if (!price) return 'Price on request';
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
}

module.exports = EnhancedNotificationService;
