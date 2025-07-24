const { v4: uuidv4 } = require('uuid');

class Agent {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.name = data.name;
    this.email = data.email;
    this.phone = data.phone;
    this.whatsappId = data.whatsappId; // WhatsApp ID for agent communication
    this.company = data.company;
    this.licenseNumber = data.licenseNumber;
    this.profileImage = data.profileImage;
    this.bio = data.bio;
    this.specializations = data.specializations || []; // e.g., ['residential', 'commercial']
    this.serviceAreas = data.serviceAreas || []; // Areas they serve in Buea
    this.languages = data.languages || ['en']; // Languages they speak
    this.rating = data.rating || 0; // Average rating from clients
    this.totalReviews = data.totalReviews || 0;
    this.totalProperties = data.totalProperties || 0;
    this.totalBookings = data.totalBookings || 0;
    this.isVerified = data.isVerified || false;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.joinedAt = data.joinedAt || new Date();
    this.lastActive = data.lastActive;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    
    // Contact preferences
    this.contactPreferences = data.contactPreferences || {
      whatsapp: true,
      email: true,
      phone: true,
      preferredTime: 'business_hours' // business_hours, anytime, evening
    };
    
    // Business hours
    this.businessHours = data.businessHours || {
      monday: { open: '08:00', close: '18:00', isOpen: true },
      tuesday: { open: '08:00', close: '18:00', isOpen: true },
      wednesday: { open: '08:00', close: '18:00', isOpen: true },
      thursday: { open: '08:00', close: '18:00', isOpen: true },
      friday: { open: '08:00', close: '18:00', isOpen: true },
      saturday: { open: '09:00', close: '16:00', isOpen: true },
      sunday: { open: '10:00', close: '14:00', isOpen: false }
    };
  }

  // Convert to Firestore document
  toFirestore() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      phone: this.phone,
      whatsappId: this.whatsappId,
      company: this.company,
      licenseNumber: this.licenseNumber,
      profileImage: this.profileImage,
      bio: this.bio,
      specializations: this.specializations,
      serviceAreas: this.serviceAreas,
      languages: this.languages,
      rating: this.rating,
      totalReviews: this.totalReviews,
      totalProperties: this.totalProperties,
      totalBookings: this.totalBookings,
      isVerified: this.isVerified,
      isActive: this.isActive,
      joinedAt: this.joinedAt,
      lastActive: this.lastActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      contactPreferences: this.contactPreferences,
      businessHours: this.businessHours
    };
  }

  // Create from Firestore document
  static fromFirestore(doc) {
    const data = doc.data();
    return new Agent({
      id: doc.id,
      ...data
    });
  }

  // Validation
  validate() {
    const errors = [];

    if (!this.name || this.name.trim().length === 0) {
      errors.push('Name is required');
    }

    if (!this.email || this.email.trim().length === 0) {
      errors.push('Email is required');
    }

    if (!this.phone || this.phone.trim().length === 0) {
      errors.push('Phone number is required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (this.email && !emailRegex.test(this.email)) {
      errors.push('Invalid email format');
    }

    // Validate phone number format (Cameroon numbers)
    const phoneRegex = /^\+237[0-9]{8,9}$/;
    if (this.phone && !phoneRegex.test(this.phone)) {
      errors.push('Invalid phone number format. Expected format: +237XXXXXXXX');
    }

    return errors;
  }

  // Update agent statistics
  updateStats(stats) {
    if (stats.totalProperties !== undefined) this.totalProperties = stats.totalProperties;
    if (stats.totalBookings !== undefined) this.totalBookings = stats.totalBookings;
    if (stats.rating !== undefined) this.rating = stats.rating;
    if (stats.totalReviews !== undefined) this.totalReviews = stats.totalReviews;
    this.updatedAt = new Date();
  }

  // Check if agent is available at given time
  isAvailableAt(dateTime) {
    const day = dateTime.toLocaleLowerCase();
    const time = dateTime.toTimeString().slice(0, 5); // HH:MM format
    const daySchedule = this.businessHours[day];
    
    if (!daySchedule || !daySchedule.isOpen) return false;
    
    return time >= daySchedule.open && time <= daySchedule.close;
  }

  // Get agent's display info for WhatsApp
  getWhatsAppProfile() {
    const profile = [
      `👨‍💼 *${this.name}*`,
      `🏢 ${this.company || 'Independent Agent'}`
    ];

    if (this.rating > 0) {
      profile.push(`⭐ ${this.rating.toFixed(1)} (${this.totalReviews} reviews)`);
    }

    if (this.totalProperties > 0) {
      profile.push(`🏠 ${this.totalProperties} properties managed`);
    }

    if (this.specializations.length > 0) {
      profile.push(`🎯 Specializes in: ${this.specializations.join(', ')}`);
    }

    return profile.join('\n');
  }
}

module.exports = Agent;
