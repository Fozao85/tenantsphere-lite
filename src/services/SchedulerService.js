const NotificationService = require('./NotificationService');
const ConversationService = require('./ConversationService');
const { logger } = require('../utils/logger');

class SchedulerService {
  constructor() {
    this.notificationService = null;
    this.conversationService = null;
    this.intervals = new Map();
    this.isRunning = false;
  }

  // Initialize services when needed
  initializeServices() {
    if (!this.notificationService) {
      this.notificationService = new NotificationService();
    }
    if (!this.conversationService) {
      this.conversationService = new ConversationService();
    }
  }

  // Start the scheduler
  start() {
    if (this.isRunning) {
      logger.warn('Scheduler is already running');
      return;
    }

    // Initialize services
    this.initializeServices();

    this.isRunning = true;
    logger.info('🕐 Starting scheduler service');

    // Process notification queue every minute
    this.intervals.set('notifications', setInterval(async () => {
      try {
        await this.processNotifications();
      } catch (error) {
        logger.error('Error in notification processing:', error);
      }
    }, 60 * 1000)); // 1 minute

    // Retry failed notifications every 5 minutes
    this.intervals.set('retryNotifications', setInterval(async () => {
      try {
        await this.retryFailedNotifications();
      } catch (error) {
        logger.error('Error in retry notifications:', error);
      }
    }, 5 * 60 * 1000)); // 5 minutes

    // Clean up stale conversations every hour
    this.intervals.set('cleanupConversations', setInterval(async () => {
      try {
        await this.cleanupStaleConversations();
      } catch (error) {
        logger.error('Error in conversation cleanup:', error);
      }
    }, 60 * 60 * 1000)); // 1 hour

    // Clean up old data every day at 2 AM
    this.intervals.set('dailyCleanup', setInterval(async () => {
      const now = new Date();
      if (now.getHours() === 2 && now.getMinutes() === 0) {
        try {
          await this.performDailyCleanup();
        } catch (error) {
          logger.error('Error in daily cleanup:', error);
        }
      }
    }, 60 * 1000)); // Check every minute, but only run at 2 AM

    logger.info('✅ Scheduler service started successfully');
  }

  // Stop the scheduler
  stop() {
    if (!this.isRunning) {
      logger.warn('Scheduler is not running');
      return;
    }

    this.isRunning = false;
    logger.info('🛑 Stopping scheduler service');

    // Clear all intervals
    for (const [name, interval] of this.intervals) {
      clearInterval(interval);
      logger.info(`Cleared interval: ${name}`);
    }

    this.intervals.clear();
    logger.info('✅ Scheduler service stopped successfully');
  }

  // Process pending notifications
  async processNotifications() {
    try {
      this.initializeServices();
      const processed = await this.notificationService.processNotificationQueue();
      
      if (processed > 0) {
        logger.info(`📤 Processed ${processed} notifications`);
      }
      
      return processed;
    } catch (error) {
      logger.error('Error processing notifications:', error);
      throw error;
    }
  }

  // Retry failed notifications
  async retryFailedNotifications() {
    try {
      this.initializeServices();
      const retried = await this.notificationService.retryFailedNotifications();
      
      if (retried > 0) {
        logger.info(`🔄 Retried ${retried} failed notifications`);
      }
      
      return retried;
    } catch (error) {
      logger.error('Error retrying failed notifications:', error);
      throw error;
    }
  }

  // Clean up stale conversations
  async cleanupStaleConversations() {
    try {
      this.initializeServices();
      const staleConversations = await this.conversationService.getStaleConversations(24);
      
      for (const conversation of staleConversations) {
        await this.conversationService.pauseConversation(conversation.id);
      }
      
      if (staleConversations.length > 0) {
        logger.info(`🧹 Paused ${staleConversations.length} stale conversations`);
      }
      
      return staleConversations.length;
    } catch (error) {
      logger.error('Error cleaning up stale conversations:', error);
      throw error;
    }
  }

  // Perform daily cleanup tasks
  async performDailyCleanup() {
    try {
      logger.info('🧹 Starting daily cleanup tasks');

      this.initializeServices();

      // Clean up old notifications (30 days)
      const cleanedNotifications = await this.notificationService.cleanupOldNotifications(30);
      logger.info(`Cleaned up ${cleanedNotifications} old notifications`);

      // Clean up old conversations (90 days)
      const cleanedConversations = await this.conversationService.cleanupOldConversations(90);
      logger.info(`Cleaned up ${cleanedConversations} old conversations`);

      logger.info('✅ Daily cleanup completed successfully');
      
      return {
        notifications: cleanedNotifications,
        conversations: cleanedConversations
      };
    } catch (error) {
      logger.error('Error in daily cleanup:', error);
      throw error;
    }
  }

  // Schedule a one-time notification
  async scheduleNotification(notificationData, delayMinutes = 0) {
    try {
      this.initializeServices();

      const scheduledFor = new Date();
      scheduledFor.setMinutes(scheduledFor.getMinutes() + delayMinutes);

      const notification = {
        ...notificationData,
        scheduledFor
      };

      const result = await this.notificationService.createNotification(notification);
      
      logger.info(`📅 Scheduled notification for ${scheduledFor.toISOString()}`, {
        notificationId: result.id,
        delayMinutes
      });

      return result;
    } catch (error) {
      logger.error('Error scheduling notification:', error);
      throw error;
    }
  }

  // Schedule booking reminders
  async scheduleBookingReminders(booking, property, agent) {
    try {
      const bookingDateTime = new Date(`${booking.scheduledDate}T${booking.scheduledTime}`);
      const now = new Date();

      // Schedule 24-hour reminder
      const reminder24h = new Date(bookingDateTime);
      reminder24h.setHours(reminder24h.getHours() - 24);
      
      if (reminder24h > now) {
        await this.scheduleNotification({
          userId: booking.userId,
          type: 'booking_reminder',
          title: 'Property Tour Tomorrow',
          message: `⏰ Reminder: Your property tour is tomorrow!\n\n${booking.getWhatsAppSummary()}\n\nSee you there! Reply "CANCEL" if you need to reschedule.`,
          data: {
            bookingId: booking.id,
            propertyId: booking.propertyId,
            reminderType: '24h'
          },
          priority: 'high',
          scheduledFor: reminder24h
        });
      }

      // Schedule 1-hour reminder
      const reminder1h = new Date(bookingDateTime);
      reminder1h.setHours(reminder1h.getHours() - 1);
      
      if (reminder1h > now) {
        await this.scheduleNotification({
          userId: booking.userId,
          type: 'booking_reminder',
          title: 'Property Tour in 1 Hour',
          message: `⏰ Reminder: Your property tour is in 1 hour!\n\n${booking.getWhatsAppSummary()}\n\nAgent ${agent.name} will meet you there. Contact: ${agent.phone}`,
          data: {
            bookingId: booking.id,
            propertyId: booking.propertyId,
            reminderType: '1h'
          },
          priority: 'urgent',
          scheduledFor: reminder1h
        });
      }

      logger.info(`📅 Scheduled booking reminders for booking ${booking.id}`);
      
      return { reminder24h, reminder1h };
    } catch (error) {
      logger.error('Error scheduling booking reminders:', error);
      throw error;
    }
  }

  // Get scheduler status
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeIntervals: Array.from(this.intervals.keys()),
      uptime: this.isRunning ? Date.now() - this.startTime : 0
    };
  }

  // Get scheduler statistics
  async getStatistics() {
    try {
      const pendingNotifications = await this.notificationService.getPendingNotifications();
      const dueNotifications = await this.notificationService.getDueNotifications();
      const staleConversations = await this.conversationService.getStaleConversations();

      return {
        notifications: {
          pending: pendingNotifications.length,
          due: dueNotifications.length,
          overdue: dueNotifications.filter(n => {
            const notification = new (require('../models/Notification'))(n);
            return notification.isOverdue();
          }).length
        },
        conversations: {
          stale: staleConversations.length
        },
        scheduler: this.getStatus()
      };
    } catch (error) {
      logger.error('Error getting scheduler statistics:', error);
      throw error;
    }
  }

  // Manual trigger for testing
  async runTask(taskName) {
    try {
      logger.info(`🔧 Manually running task: ${taskName}`);

      switch (taskName) {
        case 'notifications':
          return await this.processNotifications();
        case 'retryNotifications':
          return await this.retryFailedNotifications();
        case 'cleanupConversations':
          return await this.cleanupStaleConversations();
        case 'dailyCleanup':
          return await this.performDailyCleanup();
        default:
          throw new Error(`Unknown task: ${taskName}`);
      }
    } catch (error) {
      logger.error(`Error running task ${taskName}:`, error);
      throw error;
    }
  }
}

// Create singleton instance
const schedulerService = new SchedulerService();

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, stopping scheduler');
  schedulerService.stop();
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, stopping scheduler');
  schedulerService.stop();
});

module.exports = schedulerService;
