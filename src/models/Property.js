const { v4: uuidv4 } = require('uuid');

class Property {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.title = data.title;
    this.description = data.description;
    this.location = data.location;
    this.price = data.price;
    this.currency = data.currency || 'XAF';
    this.bedrooms = data.bedrooms;
    this.bathrooms = data.bathrooms;
    this.size = data.size; // in square meters
    this.propertyType = data.propertyType; // apartment, house, studio, etc.
    this.status = data.status || 'available'; // available, booked, taken
    this.images = data.images || [];
    this.amenities = data.amenities || [];
    this.agentId = data.agentId;
    this.contactInfo = data.contactInfo;
    this.coordinates = data.coordinates; // { lat, lng }
    this.nearbyLandmarks = data.nearbyLandmarks || [];
    this.availableFrom = data.availableFrom;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.viewCount = data.viewCount || 0;
    this.bookingCount = data.bookingCount || 0;
  }

  // Convert to Firestore document
  toFirestore() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      location: this.location,
      price: this.price,
      currency: this.currency,
      bedrooms: this.bedrooms,
      bathrooms: this.bathrooms,
      size: this.size,
      propertyType: this.propertyType,
      status: this.status,
      images: this.images,
      amenities: this.amenities,
      agentId: this.agentId,
      contactInfo: this.contactInfo,
      coordinates: this.coordinates,
      nearbyLandmarks: this.nearbyLandmarks,
      availableFrom: this.availableFrom,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      viewCount: this.viewCount,
      bookingCount: this.bookingCount
    };
  }

  // Create from Firestore document
  static fromFirestore(doc) {
    const data = doc.data();
    return new Property({
      id: doc.id,
      ...data
    });
  }

  // Validation
  validate() {
    const errors = [];

    if (!this.title || this.title.trim().length === 0) {
      errors.push('Title is required');
    }

    if (!this.location || this.location.trim().length === 0) {
      errors.push('Location is required');
    }

    if (!this.price || this.price <= 0) {
      errors.push('Price must be greater than 0');
    }

    if (!this.agentId || this.agentId.trim().length === 0) {
      errors.push('Agent ID is required');
    }

    if (!this.propertyType || this.propertyType.trim().length === 0) {
      errors.push('Property type is required');
    }

    if (this.bedrooms !== undefined && this.bedrooms < 0) {
      errors.push('Bedrooms cannot be negative');
    }

    if (this.bathrooms !== undefined && this.bathrooms < 0) {
      errors.push('Bathrooms cannot be negative');
    }

    return errors;
  }

  // Get formatted price
  getFormattedPrice() {
    return `${this.price.toLocaleString()} ${this.currency}`;
  }

  // Get property summary for WhatsApp
  getWhatsAppSummary() {
    const summary = [
      `🏠 *${this.title}*`,
      `📍 ${this.location}`,
      `💰 ${this.getFormattedPrice()}/month`
    ];

    if (this.bedrooms) {
      summary.push(`🛏️ ${this.bedrooms} bedroom${this.bedrooms > 1 ? 's' : ''}`);
    }

    if (this.bathrooms) {
      summary.push(`🚿 ${this.bathrooms} bathroom${this.bathrooms > 1 ? 's' : ''}`);
    }

    if (this.size) {
      summary.push(`📐 ${this.size}m²`);
    }

    return summary.join('\n');
  }
}

module.exports = Property;
