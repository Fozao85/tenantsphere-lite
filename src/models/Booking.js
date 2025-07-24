const { v4: uuidv4 } = require('uuid');

class Booking {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.propertyId = data.propertyId;
    this.userId = data.userId;
    this.agentId = data.agentId;
    this.type = data.type || 'tour'; // tour, viewing, inspection
    this.status = data.status || 'pending'; // pending, confirmed, completed, cancelled, no_show
    this.scheduledDate = data.scheduledDate;
    this.scheduledTime = data.scheduledTime;
    this.duration = data.duration || 30; // Duration in minutes
    this.notes = data.notes; // User's notes or special requests
    this.agentNotes = data.agentNotes; // Agent's internal notes
    this.meetingPoint = data.meetingPoint; // Where to meet (property address, nearby landmark, etc.)
    this.contactMethod = data.contactMethod || 'whatsapp'; // whatsapp, phone, email
    this.reminderSent = data.reminderSent || false;
    this.feedback = data.feedback; // Post-booking feedback
    this.rating = data.rating; // User rating of the experience
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.confirmedAt = data.confirmedAt;
    this.completedAt = data.completedAt;
    this.cancelledAt = data.cancelledAt;
    this.cancellationReason = data.cancellationReason;
    
    // Attendees information
    this.attendees = data.attendees || {
      count: 1,
      names: [],
      relationships: [] // e.g., ['spouse', 'friend']
    };
    
    // Follow-up information
    this.followUp = data.followUp || {
      required: false,
      completed: false,
      scheduledDate: null,
      notes: ''
    };
  }

  // Convert to Firestore document
  toFirestore() {
    return {
      id: this.id,
      propertyId: this.propertyId,
      userId: this.userId,
      agentId: this.agentId,
      type: this.type,
      status: this.status,
      scheduledDate: this.scheduledDate,
      scheduledTime: this.scheduledTime,
      duration: this.duration,
      notes: this.notes,
      agentNotes: this.agentNotes,
      meetingPoint: this.meetingPoint,
      contactMethod: this.contactMethod,
      reminderSent: this.reminderSent,
      feedback: this.feedback,
      rating: this.rating,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      confirmedAt: this.confirmedAt,
      completedAt: this.completedAt,
      cancelledAt: this.cancelledAt,
      cancellationReason: this.cancellationReason,
      attendees: this.attendees,
      followUp: this.followUp
    };
  }

  // Create from Firestore document
  static fromFirestore(doc) {
    const data = doc.data();
    return new Booking({
      id: doc.id,
      ...data
    });
  }

  // Validation
  validate() {
    const errors = [];

    if (!this.propertyId || this.propertyId.trim().length === 0) {
      errors.push('Property ID is required');
    }

    if (!this.userId || this.userId.trim().length === 0) {
      errors.push('User ID is required');
    }

    if (!this.agentId || this.agentId.trim().length === 0) {
      errors.push('Agent ID is required');
    }

    if (!this.scheduledDate) {
      errors.push('Scheduled date is required');
    }

    if (!this.scheduledTime) {
      errors.push('Scheduled time is required');
    }

    // Validate booking is not in the past
    if (this.scheduledDate && this.scheduledTime) {
      const bookingDateTime = new Date(`${this.scheduledDate}T${this.scheduledTime}`);
      if (bookingDateTime < new Date()) {
        errors.push('Booking cannot be scheduled in the past');
      }
    }

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'];
    if (!validStatuses.includes(this.status)) {
      errors.push('Invalid booking status');
    }

    // Validate type
    const validTypes = ['tour', 'viewing', 'inspection'];
    if (!validTypes.includes(this.type)) {
      errors.push('Invalid booking type');
    }

    return errors;
  }

  // Confirm booking
  confirm() {
    this.status = 'confirmed';
    this.confirmedAt = new Date();
    this.updatedAt = new Date();
  }

  // Complete booking
  complete(feedback = null, rating = null) {
    this.status = 'completed';
    this.completedAt = new Date();
    this.updatedAt = new Date();
    
    if (feedback) this.feedback = feedback;
    if (rating) this.rating = rating;
  }

  // Cancel booking
  cancel(reason = null) {
    this.status = 'cancelled';
    this.cancelledAt = new Date();
    this.cancellationReason = reason;
    this.updatedAt = new Date();
  }

  // Mark as no-show
  markNoShow() {
    this.status = 'no_show';
    this.updatedAt = new Date();
  }

  // Check if booking is upcoming
  isUpcoming() {
    if (!this.scheduledDate || !this.scheduledTime) return false;
    const bookingDateTime = new Date(`${this.scheduledDate}T${this.scheduledTime}`);
    return bookingDateTime > new Date() && ['pending', 'confirmed'].includes(this.status);
  }

  // Check if booking is today
  isToday() {
    if (!this.scheduledDate) return false;
    const today = new Date().toISOString().split('T')[0];
    return this.scheduledDate === today;
  }

  // Get formatted booking time
  getFormattedDateTime() {
    if (!this.scheduledDate || !this.scheduledTime) return 'Not scheduled';
    
    const date = new Date(`${this.scheduledDate}T${this.scheduledTime}`);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Get booking summary for WhatsApp
  getWhatsAppSummary() {
    const summary = [
      `📅 *Booking Confirmation*`,
      `🏠 Property Tour`,
      `📍 ${this.meetingPoint || 'Property location'}`,
      `🕐 ${this.getFormattedDateTime()}`
    ];

    if (this.duration) {
      summary.push(`⏱️ Duration: ${this.duration} minutes`);
    }

    if (this.attendees.count > 1) {
      summary.push(`👥 Attendees: ${this.attendees.count} people`);
    }

    if (this.notes) {
      summary.push(`📝 Notes: ${this.notes}`);
    }

    summary.push(`📞 Contact: ${this.contactMethod}`);
    summary.push(`🆔 Booking ID: ${this.id.slice(-8)}`);

    return summary.join('\n');
  }
}

module.exports = Booking;
