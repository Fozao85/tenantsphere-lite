const { logger } = require('../utils/logger');
const UserService = require('./UserService');
const PropertyService = require('./PropertyService');
const WhatsAppService = require('./WhatsAppService');
const RecommendationService = require('./RecommendationService');

class NotificationService {
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

  // Send WhatsApp notification
  async sendWhatsAppNotification(notification, user) {
    try {
      const whatsappId = user.whatsappId;
      
      // Use template if specified
      if (notification.template.name) {
        const result = await this.whatsapp.sendTemplateMessage(
          whatsappId,
          notification.template.name,
          notification.template.language,
          notification.template.parameters
        );
        return { success: true, messageId: result.messageId };
      } else {
        // Send as regular text message
        const result = await this.whatsapp.sendTextMessage(whatsappId, notification.message);
        return { success: true, messageId: result.messageId };
      }
    } catch (error) {
      logger.error('Error sending WhatsApp notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Send email notification (placeholder)
  async sendEmailNotification(notification, user) {
    // TODO: Implement email sending
    logger.info(`Email notification would be sent to ${user.email}: ${notification.title}`);
    return { success: true, messageId: `email_${Date.now()}` };
  }

  // Send SMS notification (placeholder)
  async sendSMSNotification(notification, user) {
    // TODO: Implement SMS sending
    logger.info(`SMS notification would be sent to ${user.phone}: ${notification.message}`);
    return { success: true, messageId: `sms_${Date.now()}` };
  }

  // Mark notification as sent
  async markNotificationSent(notificationId, messageId = null) {
    try {
      const notification = await this.getNotification(notificationId);
      if (!notification) return;

      notification.markSent(messageId);
      await this.update(this.collection, notificationId, notification.toFirestore());
      
      logger.info(`Notification marked as sent: ${notificationId}`);
    } catch (error) {
      logger.error(`Error marking notification as sent ${notificationId}:`, error);
    }
  }

  // Mark notification as delivered
  async markNotificationDelivered(notificationId, whatsappMessageId = null) {
    try {
      const notification = await this.getNotification(notificationId);
      if (!notification) return;

      notification.markDelivered(whatsappMessageId);
      await this.update(this.collection, notificationId, notification.toFirestore());
      
      logger.info(`Notification marked as delivered: ${notificationId}`);
    } catch (error) {
      logger.error(`Error marking notification as delivered ${notificationId}:`, error);
    }
  }

  // Mark notification as read
  async markNotificationRead(notificationId) {
    try {
      const notification = await this.getNotification(notificationId);
      if (!notification) return;

      notification.markRead();
      await this.update(this.collection, notificationId, notification.toFirestore());
      
      logger.info(`Notification marked as read: ${notificationId}`);
    } catch (error) {
      logger.error(`Error marking notification as read ${notificationId}:`, error);
    }
  }

  // Mark notification as failed
  async markNotificationFailed(notificationId, reason) {
    try {
      const notification = await this.getNotification(notificationId);
      if (!notification) return;

      notification.markFailed(reason);
      await this.update(this.collection, notificationId, notification.toFirestore());
      
      logger.warn(`Notification marked as failed: ${notificationId}, reason: ${reason}`);
    } catch (error) {
      logger.error(`Error marking notification as failed ${notificationId}:`, error);
    }
  }

  // Get pending notifications
  async getPendingNotifications() {
    try {
      return await this.getAll(this.collection, {
        status: 'pending'
      }, { field: 'scheduledFor', direction: 'asc' });
    } catch (error) {
      logger.error('Error getting pending notifications:', error);
      throw error;
    }
  }

  // Get due notifications
  async getDueNotifications() {
    try {
      const pendingNotifications = await this.getPendingNotifications();
      
      return pendingNotifications.filter(notificationData => {
        const notification = new Notification(notificationData);
        return notification.isDue();
      });
    } catch (error) {
      logger.error('Error getting due notifications:', error);
      throw error;
    }
  }

  // Process notification queue
  async processNotificationQueue() {
    try {
      const dueNotifications = await this.getDueNotifications();
      
      logger.info(`Processing ${dueNotifications.length} due notifications`);
      
      for (const notificationData of dueNotifications) {
        try {
          await this.sendNotification(notificationData.id);
        } catch (error) {
          logger.error(`Error processing notification ${notificationData.id}:`, error);
        }
      }
      
      return dueNotifications.length;
    } catch (error) {
      logger.error('Error processing notification queue:', error);
      throw error;
    }
  }

  // Retry failed notifications
  async retryFailedNotifications() {
    try {
      const failedNotifications = await this.getAll(this.collection, {
        status: 'failed'
      });
      
      const retryableNotifications = failedNotifications.filter(notificationData => {
        const notification = new Notification(notificationData);
        return notification.canRetry();
      });
      
      logger.info(`Retrying ${retryableNotifications.length} failed notifications`);
      
      for (const notificationData of retryableNotifications) {
        try {
          const notification = new Notification(notificationData);
          notification.incrementRetry();
          notification.status = 'pending'; // Reset to pending for retry
          
          await this.update(this.collection, notification.id, notification.toFirestore());
          await this.sendNotification(notification.id);
        } catch (error) {
          logger.error(`Error retrying notification ${notificationData.id}:`, error);
        }
      }
      
      return retryableNotifications.length;
    } catch (error) {
      logger.error('Error retrying failed notifications:', error);
      throw error;
    }
  }

  // Get notifications by user
  async getNotificationsByUser(userId, status = null, limit = 50) {
    try {
      const filters = { userId };
      if (status) filters.status = status;

      return await this.getAll(this.collection, filters, {
        field: 'createdAt',
        direction: 'desc'
      }, limit);
    } catch (error) {
      logger.error(`Error getting notifications for user ${userId}:`, error);
      throw error;
    }
  }

  // Create property alert notification
  async createPropertyAlert(userId, property, userPreferences) {
    try {
      const notification = Notification.createPropertyAlert(userId, property, userPreferences);
      return await this.createNotification(notification.toFirestore());
    } catch (error) {
      logger.error('Error creating property alert:', error);
      throw error;
    }
  }

  // Create booking reminder notification
  async createBookingReminder(userId, booking, property, timeUntil) {
    try {
      const notification = Notification.createBookingReminder(userId, booking, property, timeUntil);
      return await this.createNotification(notification.toFirestore());
    } catch (error) {
      logger.error('Error creating booking reminder:', error);
      throw error;
    }
  }

  // Create booking confirmation notification
  async createBookingConfirmation(userId, booking, property, agent) {
    try {
      const notification = Notification.createBookingConfirmation(userId, booking, property, agent);
      return await this.createNotification(notification.toFirestore());
    } catch (error) {
      logger.error('Error creating booking confirmation:', error);
      throw error;
    }
  }

  // Clean up old notifications
  async cleanupOldNotifications(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const oldNotifications = await this.getAll(this.collection, {
        status: { operator: 'in', value: ['delivered', 'read', 'failed'] }
      });

      const toDelete = oldNotifications.filter(notification => 
        new Date(notification.createdAt) < cutoffDate
      );

      if (toDelete.length > 0) {
        await this.batchDelete(this.collection, toDelete.map(n => n.id));
        logger.info(`Cleaned up ${toDelete.length} old notifications`);
      }

      return toDelete.length;
    } catch (error) {
      logger.error('Error cleaning up old notifications:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;
