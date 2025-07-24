const { v4: uuidv4 } = require('uuid');

class User {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.phone = data.phone;
    this.name = data.name;
    this.whatsappId = data.whatsappId; // WhatsApp ID (wa_id)
    this.optedIn = data.optedIn || false;
    this.preferences = data.preferences || {
      maxPrice: null,
      minPrice: null,
      preferredLocations: [],
      propertyTypes: [],
      minBedrooms: null,
      maxBedrooms: null,
      amenities: []
    };
    this.bookings = data.bookings || [];
    this.viewedProperties = data.viewedProperties || [];
    this.lastInteraction = data.lastInteraction;
    this.conversationState = data.conversationState || 'idle';
    this.language = data.language || 'en';
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.isActive = data.isActive !== undefined ? data.isActive : true;
  }

  // Convert to Firestore document
  toFirestore() {
    return {
      id: this.id,
      phone: this.phone,
      name: this.name,
      whatsappId: this.whatsappId,
      optedIn: this.optedIn,
      preferences: this.preferences,
      bookings: this.bookings,
      viewedProperties: this.viewedProperties,
      lastInteraction: this.lastInteraction,
      conversationState: this.conversationState,
      language: this.language,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      isActive: this.isActive
    };
  }

  // Create from Firestore document
  static fromFirestore(doc) {
    const data = doc.data();
    return new User({
      id: doc.id,
      ...data
    });
  }

  // Validation
  validate() {
    const errors = [];

    if (!this.phone || this.phone.trim().length === 0) {
      errors.push('Phone number is required');
    }

    if (!this.whatsappId || this.whatsappId.trim().length === 0) {
      errors.push('WhatsApp ID is required');
    }

    // Validate phone number format (basic validation for Cameroon numbers)
    const phoneRegex = /^\+237[0-9]{8,9}$/;
    if (this.phone && !phoneRegex.test(this.phone)) {
      errors.push('Invalid phone number format. Expected format: +237XXXXXXXX');
    }

    return errors;
  }

  // Opt in user for notifications
  optIn() {
    this.optedIn = true;
    this.updatedAt = new Date();
  }

  // Opt out user from notifications
  optOut() {
    this.optedIn = false;
    this.updatedAt = new Date();
  }

  // Update user preferences
  updatePreferences(newPreferences) {
    this.preferences = { ...this.preferences, ...newPreferences };
    this.updatedAt = new Date();
  }

  // Add viewed property
  addViewedProperty(propertyId) {
    if (!this.viewedProperties.includes(propertyId)) {
      this.viewedProperties.push(propertyId);
      this.updatedAt = new Date();
    }
  }

  // Add booking
  addBooking(bookingId) {
    if (!this.bookings.includes(bookingId)) {
      this.bookings.push(bookingId);
      this.updatedAt = new Date();
    }
  }

  // Update conversation state
  updateConversationState(state) {
    this.conversationState = state;
    this.lastInteraction = new Date();
    this.updatedAt = new Date();
  }

  // Check if property matches user preferences
  matchesPreferences(property) {
    const prefs = this.preferences;

    // Check price range
    if (prefs.maxPrice && property.price > prefs.maxPrice) return false;
    if (prefs.minPrice && property.price < prefs.minPrice) return false;

    // Check location
    if (prefs.preferredLocations.length > 0) {
      const locationMatch = prefs.preferredLocations.some(loc => 
        property.location.toLowerCase().includes(loc.toLowerCase())
      );
      if (!locationMatch) return false;
    }

    // Check property type
    if (prefs.propertyTypes.length > 0) {
      if (!prefs.propertyTypes.includes(property.propertyType)) return false;
    }

    // Check bedrooms
    if (prefs.minBedrooms && property.bedrooms < prefs.minBedrooms) return false;
    if (prefs.maxBedrooms && property.bedrooms > prefs.maxBedrooms) return false;

    // Check amenities
    if (prefs.amenities.length > 0) {
      const hasRequiredAmenities = prefs.amenities.every(amenity =>
        property.amenities.includes(amenity)
      );
      if (!hasRequiredAmenities) return false;
    }

    return true;
  }

  // Get user's greeting based on time and language
  getGreeting() {
    const hour = new Date().getHours();
    let greeting;

    if (this.language === 'fr') {
      if (hour < 12) greeting = 'Bonjour';
      else if (hour < 18) greeting = 'Bon après-midi';
      else greeting = 'Bonsoir';
    } else {
      if (hour < 12) greeting = 'Good morning';
      else if (hour < 18) greeting = 'Good afternoon';
      else greeting = 'Good evening';
    }

    return this.name ? `${greeting}, ${this.name}!` : `${greeting}!`;
  }
}

module.exports = User;
