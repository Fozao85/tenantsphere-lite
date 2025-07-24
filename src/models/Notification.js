const { v4: uuidv4 } = require('uuid');

class Notification {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.userId = data.userId;
    this.type = data.type; // property_alert, booking_reminder, booking_confirmation, etc.
    this.title = data.title;
    this.message = data.message;
    this.data = data.data || {}; // Additional data (propertyId, bookingId, etc.)
    this.channel = data.channel || 'whatsapp'; // whatsapp, email, sms
    this.status = data.status || 'pending'; // pending, sent, delivered, failed, read
    this.priority = data.priority || 'normal'; // low, normal, high, urgent
    this.scheduledFor = data.scheduledFor; // When to send (null for immediate)
    this.sentAt = data.sentAt;
    this.deliveredAt = data.deliveredAt;
    this.readAt = data.readAt;
    this.failureReason = data.failureReason;
    this.retryCount = data.retryCount || 0;
    this.maxRetries = data.maxRetries || 3;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    
    // Template information
    this.template = data.template || {
      name: null,
      language: 'en',
      parameters: []
    };
    
    // Tracking information
    this.tracking = data.tracking || {
      messageId: null,
      whatsappMessageId: null,
      conversationId: null
    };
  }

  // Convert to Firestore document
  toFirestore() {
    return {
      id: this.id,
      userId: this.userId,
      type: this.type,
      title: this.title,
      message: this.message,
      data: this.data,
      channel: this.channel,
      status: this.status,
      priority: this.priority,
      scheduledFor: this.scheduledFor,
      sentAt: this.sentAt,
      deliveredAt: this.deliveredAt,
      readAt: this.readAt,
      failureReason: this.failureReason,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      template: this.template,
      tracking: this.tracking
    };
  }

  // Create from Firestore document
  static fromFirestore(doc) {
    const data = doc.data();
    return new Notification({
      id: doc.id,
      ...data
    });
  }

  // Validation
  validate() {
    const errors = [];

    if (!this.userId || this.userId.trim().length === 0) {
      errors.push('User ID is required');
    }

    if (!this.type || this.type.trim().length === 0) {
      errors.push('Notification type is required');
    }

    if (!this.message || this.message.trim().length === 0) {
      errors.push('Message is required');
    }

    const validChannels = ['whatsapp', 'email', 'sms'];
    if (!validChannels.includes(this.channel)) {
      errors.push('Invalid notification channel');
    }

    const validStatuses = ['pending', 'sent', 'delivered', 'failed', 'read'];
    if (!validStatuses.includes(this.status)) {
      errors.push('Invalid notification status');
    }

    const validPriorities = ['low', 'normal', 'high', 'urgent'];
    if (!validPriorities.includes(this.priority)) {
      errors.push('Invalid notification priority');
    }

    return errors;
  }

  // Mark as sent
  markSent(messageId = null) {
    this.status = 'sent';
    this.sentAt = new Date();
    this.updatedAt = new Date();
    
    if (messageId) {
      this.tracking.messageId = messageId;
    }
  }

  // Mark as delivered
  markDelivered(whatsappMessageId = null) {
    this.status = 'delivered';
    this.deliveredAt = new Date();
    this.updatedAt = new Date();
    
    if (whatsappMessageId) {
      this.tracking.whatsappMessageId = whatsappMessageId;
    }
  }

  // Mark as read
  markRead() {
    this.status = 'read';
    this.readAt = new Date();
    this.updatedAt = new Date();
  }

  // Mark as failed
  markFailed(reason) {
    this.status = 'failed';
    this.failureReason = reason;
    this.updatedAt = new Date();
  }

  // Increment retry count
  incrementRetry() {
    this.retryCount++;
    this.updatedAt = new Date();
  }

  // Check if notification can be retried
  canRetry() {
    return this.status === 'failed' && this.retryCount < this.maxRetries;
  }

  // Check if notification is due to be sent
  isDue() {
    if (this.status !== 'pending') return false;
    if (!this.scheduledFor) return true; // Send immediately
    return new Date() >= this.scheduledFor;
  }

  // Check if notification is overdue
  isOverdue(minutesThreshold = 30) {
    if (this.status !== 'pending') return false;
    if (!this.scheduledFor) {
      // If no scheduled time, check if created more than threshold ago
      const minutesSinceCreated = (new Date() - this.createdAt) / (1000 * 60);
      return minutesSinceCreated > minutesThreshold;
    }
    const minutesOverdue = (new Date() - this.scheduledFor) / (1000 * 60);
    return minutesOverdue > minutesThreshold;
  }

  // Get formatted scheduled time
  getFormattedScheduledTime() {
    if (!this.scheduledFor) return 'Immediate';
    return this.scheduledFor.toLocaleString();
  }

  // Create property alert notification
  static createPropertyAlert(userId, property, userPreferences) {
    const message = `🏠 New property matching your preferences!\n\n${property.getWhatsAppSummary()}\n\nReply "VIEW" to see more details or "BOOK" to schedule a tour.`;
    
    return new Notification({
      userId,
      type: 'property_alert',
      title: 'New Property Available',
      message,
      data: {
        propertyId: property.id,
        propertyTitle: property.title,
        propertyLocation: property.location,
        propertyPrice: property.price,
        matchedPreferences: userPreferences
      },
      priority: 'high',
      template: {
        name: 'property_alert',
        language: 'en',
        parameters: [property.title, property.location, property.getFormattedPrice()]
      }
    });
  }

  // Create booking reminder notification
  static createBookingReminder(userId, booking, property, timeUntil) {
    const message = `⏰ Reminder: Your property tour is ${timeUntil}!\n\n${booking.getWhatsAppSummary()}\n\nSee you there! Reply "CANCEL" if you need to reschedule.`;
    
    return new Notification({
      userId,
      type: 'booking_reminder',
      title: 'Upcoming Property Tour',
      message,
      data: {
        bookingId: booking.id,
        propertyId: booking.propertyId,
        propertyTitle: property.title,
        scheduledTime: booking.getFormattedDateTime()
      },
      priority: 'high',
      scheduledFor: new Date(Date.now() + (timeUntil === 'in 1 hour' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000))
    });
  }

  // Create booking confirmation notification
  static createBookingConfirmation(userId, booking, property, agent) {
    const message = `✅ Booking Confirmed!\n\n${booking.getWhatsAppSummary()}\n\n👨‍💼 Agent: ${agent.name}\n📞 Contact: ${agent.phone}\n\nWe'll send you a reminder before your tour.`;
    
    return new Notification({
      userId,
      type: 'booking_confirmation',
      title: 'Booking Confirmed',
      message,
      data: {
        bookingId: booking.id,
        propertyId: booking.propertyId,
        agentId: booking.agentId,
        agentName: agent.name,
        agentPhone: agent.phone
      },
      priority: 'normal'
    });
  }
}

module.exports = Notification;
