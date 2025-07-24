const DatabaseService = require('./DatabaseService');
const WhatsAppService = require('./WhatsAppService');
const { collections } = require('../config/firebase');
const Notification = require('../models/Notification');
const { logger } = require('../utils/logger');

class NotificationService extends DatabaseService {
  constructor() {
    super();
    this.collection = collections.NOTIFICATIONS;
    this.whatsapp = new WhatsAppService();
  }

  // Create a new notification
  async createNotification(notificationData) {
    try {
      const notification = new Notification(notificationData);
      const errors = notification.validate();
      
      if (errors.length > 0) {
        throw new Error(`Validation failed: ${errors.join(', ')}`);
      }

      const result = await this.create(this.collection, notification.toFirestore(), notification.id);
      logger.info(`Notification created: ${notification.id}`);
      
      // If it's immediate, try to send it
      if (!notification.scheduledFor || notification.isDue()) {
        await this.sendNotification(notification.id);
      }
      
      return result;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  // Get notification by ID
  async getNotification(id) {
    try {
      const data = await this.getById(this.collection, id);
      return data ? Notification.fromFirestore({ id: data.id, data: () => data }) : null;
    } catch (error) {
      logger.error(`Error getting notification ${id}:`, error);
      throw error;
    }
  }

  // Send a notification
  async sendNotification(notificationId) {
    try {
      const notification = await this.getNotification(notificationId);
      if (!notification) {
        throw new Error('Notification not found');
      }

      if (notification.status !== 'pending') {
        logger.warn(`Notification ${notificationId} is not pending, current status: ${notification.status}`);
        return;
      }

      if (!notification.isDue()) {
        logger.warn(`Notification ${notificationId} is not due yet, scheduled for: ${notification.scheduledFor}`);
        return;
      }

      // Get user's WhatsApp ID
      const UserService = require('./UserService');
      const userService = new UserService();
      const user = await userService.getUser(notification.userId);
      
      if (!user) {
        await this.markNotificationFailed(notificationId, 'User not found');
        return;
      }

      if (!user.optedIn) {
        await this.markNotificationFailed(notificationId, 'User has opted out');
        return;
      }

      // Send based on channel
      let result;
      switch (notification.channel) {
        case 'whatsapp':
          result = await this.sendWhatsAppNotification(notification, user);
          break;
        case 'email':
          result = await this.sendEmailNotification(notification, user);
          break;
        case 'sms':
          result = await this.sendSMSNotification(notification, user);
          break;
        default:
          throw new Error(`Unsupported notification channel: ${notification.channel}`);
      }

      if (result.success) {
        await this.markNotificationSent(notificationId, result.messageId);
      } else {
        await this.markNotificationFailed(notificationId, result.error);
      }

    } catch (error) {
      logger.error(`Error sending notification ${notificationId}:`, error);
      await this.markNotificationFailed(notificationId, error.message);
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
