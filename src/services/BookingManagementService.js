const { logger } = require('../utils/logger');
const UserService = require('./UserService');
const PropertyService = require('./PropertyService');
const WhatsAppService = require('./WhatsAppService');
const EnhancedNotificationService = require('./EnhancedNotificationService');

class BookingManagementService {
  constructor() {
    this.userService = new UserService();
    this.propertyService = new PropertyService();
    this.whatsapp = new WhatsAppService();
    this.notificationService = new EnhancedNotificationService();
    
    // Booking statuses
    this.bookingStatuses = {
      PENDING: 'pending',
      CONFIRMED: 'confirmed',
      CANCELLED: 'cancelled',
      COMPLETED: 'completed',
      NO_SHOW: 'no_show'
    };
  }

  // Create a new booking
  async createBooking(userId, propertyId, bookingData) {
    try {
      logger.info(`Creating booking for user ${userId} and property ${propertyId}`);

      // Validate user and property
      const user = await this.userService.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const property = await this.propertyService.getPropertyById(propertyId);
      if (!property) {
        throw new Error('Property not found');
      }

      // Validate booking data
      this.validateBookingData(bookingData);

      // Create booking object
      const booking = {
        id: `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: userId,
        propertyId: propertyId,
        agentId: property.agentId,
        status: this.bookingStatuses.PENDING,
        
        // Booking details
        preferredDate: bookingData.preferredDate,
        preferredTime: bookingData.preferredTime,
        contactNumber: bookingData.contactNumber || user.phone,
        message: bookingData.message || '',
        
        // Property and user info for easy access
        propertyTitle: property.title || `${property.type} in ${property.location}`,
        propertyLocation: property.location,
        userName: user.name,
        userPhone: user.phone,
        
        // Agent info
        agentName: property.agent?.name || 'Property Agent',
        agentPhone: property.agent?.phone || '',
        
        // Timestamps
        createdAt: new Date(),
        updatedAt: new Date(),
        
        // Confirmation details (to be filled later)
        confirmedDate: null,
        confirmedTime: null,
        confirmationNotes: ''
      };

      // Save booking (in a real app, this would go to database)
      await this.saveBooking(booking);

      // Send confirmation to user
      await this.sendBookingConfirmation(booking);

      // Notify agent about new booking
      await this.notifyAgentNewBooking(booking);

      logger.info(`Booking created successfully: ${booking.id}`);
      
      return {
        bookingId: booking.id,
        status: booking.status,
        message: 'Booking request submitted successfully. You will receive confirmation shortly.'
      };

    } catch (error) {
      logger.error('Error creating booking:', error);
      throw error;
    }
  }

  // Confirm a booking (agent action)
  async confirmBooking(bookingId, agentId, confirmationData) {
    try {
      logger.info(`Confirming booking ${bookingId} by agent ${agentId}`);

      const booking = await this.getBookingById(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Verify agent authorization
      if (booking.agentId !== agentId) {
        throw new Error('Unauthorized: You can only confirm your own property bookings');
      }

      // Update booking with confirmation details
      const updatedBooking = {
        ...booking,
        status: this.bookingStatuses.CONFIRMED,
        confirmedDate: confirmationData.confirmedDate || booking.preferredDate,
        confirmedTime: confirmationData.confirmedTime || booking.preferredTime,
        confirmationNotes: confirmationData.notes || '',
        confirmedAt: new Date(),
        confirmedBy: agentId,
        updatedAt: new Date()
      };

      await this.updateBooking(bookingId, updatedBooking);

      // Send confirmation to user
      await this.sendBookingConfirmedNotification(updatedBooking);

      logger.info(`Booking ${bookingId} confirmed successfully`);
      
      return {
        bookingId: bookingId,
        status: updatedBooking.status,
        confirmedDate: updatedBooking.confirmedDate,
        confirmedTime: updatedBooking.confirmedTime
      };

    } catch (error) {
      logger.error('Error confirming booking:', error);
      throw error;
    }
  }

  // Cancel a booking
  async cancelBooking(bookingId, cancelledBy, reason = '') {
    try {
      logger.info(`Cancelling booking ${bookingId} by ${cancelledBy}`);

      const booking = await this.getBookingById(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Update booking status
      const updatedBooking = {
        ...booking,
        status: this.bookingStatuses.CANCELLED,
        cancellationReason: reason,
        cancelledAt: new Date(),
        cancelledBy: cancelledBy,
        updatedAt: new Date()
      };

      await this.updateBooking(bookingId, updatedBooking);

      // Notify relevant parties
      await this.sendCancellationNotifications(updatedBooking, cancelledBy);

      logger.info(`Booking ${bookingId} cancelled successfully`);
      
      return {
        bookingId: bookingId,
        status: updatedBooking.status,
        reason: reason
      };

    } catch (error) {
      logger.error('Error cancelling booking:', error);
      throw error;
    }
  }

  // Reschedule a booking
  async rescheduleBooking(bookingId, userId, newBookingData) {
    try {
      logger.info(`Rescheduling booking ${bookingId} by user ${userId}`);

      const booking = await this.getBookingById(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Verify user authorization
      if (booking.userId !== userId) {
        throw new Error('Unauthorized: You can only reschedule your own bookings');
      }

      // Validate new booking data
      this.validateBookingData(newBookingData);

      // Update booking with new details
      const updatedBooking = {
        ...booking,
        status: this.bookingStatuses.PENDING, // Reset to pending for agent confirmation
        preferredDate: newBookingData.preferredDate,
        preferredTime: newBookingData.preferredTime,
        message: newBookingData.message || booking.message,
        rescheduledAt: new Date(),
        updatedAt: new Date(),
        
        // Clear previous confirmation details
        confirmedDate: null,
        confirmedTime: null,
        confirmationNotes: '',
        confirmedAt: null,
        confirmedBy: null
      };

      await this.updateBooking(bookingId, updatedBooking);

      // Notify agent about rescheduling
      await this.notifyAgentRescheduling(updatedBooking);

      logger.info(`Booking ${bookingId} rescheduled successfully`);
      
      return {
        bookingId: bookingId,
        status: updatedBooking.status,
        newDate: updatedBooking.preferredDate,
        newTime: updatedBooking.preferredTime
      };

    } catch (error) {
      logger.error('Error rescheduling booking:', error);
      throw error;
    }
  }

  // Get user's bookings
  async getUserBookings(userId, status = null) {
    try {
      // In a real app, this would query the database
      const allBookings = await this.getAllBookings();
      let userBookings = allBookings.filter(booking => booking.userId === userId);
      
      if (status) {
        userBookings = userBookings.filter(booking => booking.status === status);
      }

      // Sort by creation date (newest first)
      userBookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return userBookings;

    } catch (error) {
      logger.error('Error getting user bookings:', error);
      throw error;
    }
  }

  // Get agent's bookings
  async getAgentBookings(agentId, status = null) {
    try {
      const allBookings = await this.getAllBookings();
      let agentBookings = allBookings.filter(booking => booking.agentId === agentId);
      
      if (status) {
        agentBookings = agentBookings.filter(booking => booking.status === status);
      }

      // Sort by creation date (newest first)
      agentBookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return agentBookings;

    } catch (error) {
      logger.error('Error getting agent bookings:', error);
      throw error;
    }
  }

  // Mark booking as completed
  async markBookingCompleted(bookingId, agentId, completionNotes = '') {
    try {
      logger.info(`Marking booking ${bookingId} as completed by agent ${agentId}`);

      const booking = await this.getBookingById(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Verify agent authorization
      if (booking.agentId !== agentId) {
        throw new Error('Unauthorized: You can only complete your own property bookings');
      }

      // Update booking status
      const updatedBooking = {
        ...booking,
        status: this.bookingStatuses.COMPLETED,
        completionNotes: completionNotes,
        completedAt: new Date(),
        completedBy: agentId,
        updatedAt: new Date()
      };

      await this.updateBooking(bookingId, updatedBooking);

      // Send completion notification to user
      await this.sendBookingCompletedNotification(updatedBooking);

      logger.info(`Booking ${bookingId} marked as completed`);
      
      return {
        bookingId: bookingId,
        status: updatedBooking.status,
        completedAt: updatedBooking.completedAt
      };

    } catch (error) {
      logger.error('Error marking booking as completed:', error);
      throw error;
    }
  }

  // Send booking reminders
  async sendBookingReminders() {
    try {
      logger.info('Sending booking reminders');

      const confirmedBookings = await this.getBookingsByStatus(this.bookingStatuses.CONFIRMED);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const tomorrowEnd = new Date(tomorrow);
      tomorrowEnd.setHours(23, 59, 59, 999);

      // Find bookings scheduled for tomorrow
      const tomorrowBookings = confirmedBookings.filter(booking => {
        const bookingDate = new Date(booking.confirmedDate);
        return bookingDate >= tomorrow && bookingDate <= tomorrowEnd;
      });

      let remindersSent = 0;
      for (const booking of tomorrowBookings) {
        try {
          await this.sendBookingReminderNotification(booking);
          remindersSent++;
        } catch (error) {
          logger.warn(`Failed to send reminder for booking ${booking.id}:`, error.message);
        }
      }

      logger.info(`Sent ${remindersSent} booking reminders`);
      return remindersSent;

    } catch (error) {
      logger.error('Error sending booking reminders:', error);
      throw error;
    }
  }

  // Validate booking data
  validateBookingData(bookingData) {
    if (!bookingData.preferredDate) {
      throw new Error('Preferred date is required');
    }

    if (!bookingData.preferredTime) {
      throw new Error('Preferred time is required');
    }

    // Validate date is not in the past
    const preferredDate = new Date(bookingData.preferredDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (preferredDate < today) {
      throw new Error('Booking date cannot be in the past');
    }
  }

  // Send booking confirmation to user
  async sendBookingConfirmation(booking) {
    try {
      const message = `📅 *Booking Request Submitted*\n\n🏠 *Property:* ${booking.propertyTitle}\n📍 *Location:* ${booking.propertyLocation}\n📅 *Preferred Date:* ${this.formatDate(booking.preferredDate)}\n⏰ *Preferred Time:* ${booking.preferredTime}\n👨‍💼 *Agent:* ${booking.agentName}\n\n✅ Your booking request has been submitted. The agent will contact you within 24 hours to confirm the details.\n\n📞 If you need to make changes, please contact us directly.`;

      await this.whatsapp.sendTextMessage(booking.userPhone, message);

    } catch (error) {
      logger.warn('Could not send booking confirmation:', error.message);
    }
  }

  // Send booking confirmed notification
  async sendBookingConfirmedNotification(booking) {
    try {
      await this.notificationService.sendBookingConfirmation(booking.userId, {
        propertyTitle: booking.propertyTitle,
        date: this.formatDate(booking.confirmedDate),
        time: booking.confirmedTime,
        agentName: booking.agentName,
        location: booking.propertyLocation
      });

    } catch (error) {
      logger.warn('Could not send booking confirmed notification:', error.message);
    }
  }

  // Send booking reminder notification
  async sendBookingReminderNotification(booking) {
    try {
      const message = `⏰ *Booking Reminder*\n\n🏠 *Property:* ${booking.propertyTitle}\n📅 *Tomorrow at ${booking.confirmedTime}*\n📍 *Location:* ${booking.propertyLocation}\n👨‍💼 *Agent:* ${booking.agentName}\n\nDon't forget about your property tour tomorrow! If you need to reschedule, please contact the agent.\n\nSee you there! 🏠`;

      await this.whatsapp.sendTextMessage(booking.userPhone, message);

    } catch (error) {
      logger.warn('Could not send booking reminder:', error.message);
    }
  }

  // Send booking completed notification
  async sendBookingCompletedNotification(booking) {
    try {
      const message = `✅ *Tour Completed*\n\n🏠 *Property:* ${booking.propertyTitle}\n📅 *Date:* ${this.formatDate(booking.completedAt)}\n\nThank you for touring the property! We hope you found it suitable.\n\n💬 If you're interested in this property or have any questions, please contact the agent.\n\nHappy house hunting! 🏠`;

      await this.whatsapp.sendTextMessage(booking.userPhone, message);

    } catch (error) {
      logger.warn('Could not send booking completed notification:', error.message);
    }
  }

  // Notify agent about new booking
  async notifyAgentNewBooking(booking) {
    try {
      if (booking.agentPhone) {
        const message = `📅 *New Booking Request*\n\n🏠 *Property:* ${booking.propertyTitle}\n👤 *Client:* ${booking.userName}\n📞 *Phone:* ${booking.userPhone}\n📅 *Preferred Date:* ${this.formatDate(booking.preferredDate)}\n⏰ *Preferred Time:* ${booking.preferredTime}\n💬 *Message:* ${booking.message || 'No additional message'}\n\n🆔 *Booking ID:* ${booking.id}\n\nPlease contact the client to confirm the tour details.`;

        await this.whatsapp.sendTextMessage(booking.agentPhone, message);
      }
    } catch (error) {
      logger.warn('Could not notify agent about new booking:', error.message);
    }
  }

  // Notify agent about rescheduling
  async notifyAgentRescheduling(booking) {
    try {
      if (booking.agentPhone) {
        const message = `📅 *Booking Rescheduled*\n\n🏠 *Property:* ${booking.propertyTitle}\n👤 *Client:* ${booking.userName}\n📅 *New Preferred Date:* ${this.formatDate(booking.preferredDate)}\n⏰ *New Preferred Time:* ${booking.preferredTime}\n\n🆔 *Booking ID:* ${booking.id}\n\nThe client has rescheduled their tour. Please contact them to confirm the new details.`;

        await this.whatsapp.sendTextMessage(booking.agentPhone, message);
      }
    } catch (error) {
      logger.warn('Could not notify agent about rescheduling:', error.message);
    }
  }

  // Send cancellation notifications
  async sendCancellationNotifications(booking, cancelledBy) {
    try {
      // Notify user if cancelled by agent
      if (cancelledBy !== booking.userId) {
        const userMessage = `❌ *Booking Cancelled*\n\n🏠 *Property:* ${booking.propertyTitle}\n📅 *Date:* ${this.formatDate(booking.preferredDate)}\n\n${booking.cancellationReason ? `📝 *Reason:* ${booking.cancellationReason}\n\n` : ''}We apologize for any inconvenience. Please feel free to book another tour or contact us for assistance.`;

        await this.whatsapp.sendTextMessage(booking.userPhone, userMessage);
      }

      // Notify agent if cancelled by user
      if (cancelledBy !== booking.agentId && booking.agentPhone) {
        const agentMessage = `❌ *Booking Cancelled*\n\n🏠 *Property:* ${booking.propertyTitle}\n👤 *Client:* ${booking.userName}\n📅 *Date:* ${this.formatDate(booking.preferredDate)}\n\n${booking.cancellationReason ? `📝 *Reason:* ${booking.cancellationReason}\n\n` : ''}The client has cancelled their tour.`;

        await this.whatsapp.sendTextMessage(booking.agentPhone, agentMessage);
      }

    } catch (error) {
      logger.warn('Could not send cancellation notifications:', error.message);
    }
  }

  // Helper methods for data persistence (in a real app, these would interact with database)
  async saveBooking(booking) {
    // In a real app, save to database
    logger.info(`Saving booking ${booking.id} to database`);
  }

  async updateBooking(bookingId, updatedBooking) {
    // In a real app, update in database
    logger.info(`Updating booking ${bookingId} in database`);
  }

  async getBookingById(bookingId) {
    // In a real app, fetch from database
    // For now, return a mock booking
    return null;
  }

  async getAllBookings() {
    // In a real app, fetch from database
    return [];
  }

  async getBookingsByStatus(status) {
    // In a real app, fetch from database
    return [];
  }

  // Format date for display
  formatDate(date) {
    if (!date) return 'Not specified';
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}

module.exports = BookingManagementService;
