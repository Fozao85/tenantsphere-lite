const { logger } = require('../utils/logger');
const WhatsAppService = require('./WhatsAppService');

class PropertyDisplayService {
  constructor() {
    this.whatsapp = new WhatsAppService();
  }

  // Send detailed property card with full information
  async sendDetailedPropertyCard(property, from, index = null) {
    try {
      // Create comprehensive property message
      const title = index ? `${index}. ${property.title || `${property.type} in ${property.location}`}` 
                          : property.title || `${property.type} in ${property.location}`;
      
      let message = `🏠 *${title}*\n\n`;
      
      // Location and basic info
      message += `📍 *Location:* ${property.location}\n`;
      message += `💰 *Price:* ${this.formatPrice(property.price)} FCFA/month\n`;
      
      if (property.bedrooms !== undefined) {
        message += `🛏️ *Bedrooms:* ${property.bedrooms === 0 ? 'Studio' : property.bedrooms}\n`;
      }
      
      if (property.bathrooms) {
        message += `🚿 *Bathrooms:* ${property.bathrooms}\n`;
      }
      
      if (property.size) {
        message += `📐 *Size:* ${property.size} sqm\n`;
      }
      
      // Property features
      if (property.furnished !== undefined) {
        message += `🪑 *Furnished:* ${property.furnished ? 'Yes' : 'No'}\n`;
      }
      
      if (property.parking !== undefined) {
        message += `🚗 *Parking:* ${property.parking ? 'Available' : 'Not available'}\n`;
      }
      
      // Amenities
      if (property.amenities && property.amenities.length > 0) {
        message += `\n✨ *Amenities:*\n`;
        property.amenities.forEach(amenity => {
          message += `• ${this.formatAmenity(amenity)}\n`;
        });
      }
      
      // Description
      if (property.description) {
        message += `\n📝 *Description:*\n${property.description}\n`;
      }
      
      // Agent info
      if (property.agent) {
        message += `\n👨‍💼 *Agent:* ${property.agent.name}\n`;
        if (property.agent.phone) {
          message += `📞 *Contact:* ${property.agent.phone}\n`;
        }
      }
      
      // Property status and verification
      if (property.verified) {
        message += `\n✅ *Verified Property*\n`;
      }
      
      if (property.availableFrom) {
        const availableDate = new Date(property.availableFrom).toLocaleDateString();
        message += `📅 *Available from:* ${availableDate}\n`;
      }
      
      // Rating if available
      if (property.rating) {
        const stars = '⭐'.repeat(Math.floor(property.rating));
        message += `\n${stars} *Rating:* ${property.rating}/5\n`;
      }

      // Send main property image if available
      if (property.images && property.images.length > 0) {
        await this.whatsapp.sendImageMessage(from, property.images[0], message);
        
        // If multiple images, offer gallery view
        if (property.images.length > 1) {
          const galleryMessage = `📸 This property has ${property.images.length} photos. Would you like to see them all?`;
          const galleryButtons = [
            { id: `gallery_${property.id}`, title: '📸 View Gallery' },
            { id: `details_${property.id}`, title: '📋 More Details' },
            { id: `book_${property.id}`, title: '📅 Book Tour' }
          ];
          
          await this.whatsapp.sendButtonMessage(from, galleryMessage, galleryButtons);
        } else {
          // Single image - show action buttons
          await this.sendPropertyActionButtons(property, from);
        }
      } else {
        // No images - send text with action buttons
        await this.whatsapp.sendButtonMessage(from, message, this.getPropertyActionButtons(property));
      }

    } catch (error) {
      logger.error('Error sending detailed property card:', error);
      throw error;
    }
  }

  // Send property image gallery
  async sendPropertyGallery(property, from) {
    try {
      if (!property.images || property.images.length === 0) {
        await this.whatsapp.sendTextMessage(from, "📸 No images available for this property.");
        return;
      }

      await this.whatsapp.sendTextMessage(from, 
        `📸 *${property.title || property.type} - Photo Gallery*\n\nShowing ${property.images.length} photos:`
      );

      // Send each image with caption
      for (let i = 0; i < property.images.length; i++) {
        const caption = `📸 Photo ${i + 1} of ${property.images.length}`;
        await this.whatsapp.sendImageMessage(from, property.images[i], caption);
        
        // Small delay between images to avoid rate limiting
        if (i < property.images.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Send action buttons after gallery
      await this.sendPropertyActionButtons(property, from);

    } catch (error) {
      logger.error('Error sending property gallery:', error);
      await this.whatsapp.sendTextMessage(from, "Sorry, I couldn't load the photo gallery. Please try again.");
    }
  }

  // Send property action buttons
  async sendPropertyActionButtons(property, from) {
    const message = `What would you like to do with this property?`;
    const buttons = this.getPropertyActionButtons(property);
    await this.whatsapp.sendButtonMessage(from, message, buttons);
  }

  // Get property action buttons
  getPropertyActionButtons(property) {
    const buttons = [
      { id: `book_${property.id}`, title: '📅 Book Tour' },
      { id: `contact_${property.id}`, title: '📞 Contact Agent' },
      { id: `save_${property.id}`, title: '💾 Save Property' }
    ];

    // Add gallery button if multiple images
    if (property.images && property.images.length > 1) {
      buttons.unshift({ id: `gallery_${property.id}`, title: '📸 View Gallery' });
    }

    return buttons;
  }

  // Send property comparison view
  async sendPropertyComparison(properties, from) {
    try {
      if (properties.length < 2) {
        await this.whatsapp.sendTextMessage(from, "Need at least 2 properties to compare.");
        return;
      }

      let message = `🔍 *Property Comparison*\n\n`;
      
      properties.forEach((property, index) => {
        message += `*${index + 1}. ${property.title || property.type}*\n`;
        message += `📍 ${property.location}\n`;
        message += `💰 ${this.formatPrice(property.price)} FCFA\n`;
        message += `🛏️ ${property.bedrooms === 0 ? 'Studio' : property.bedrooms + ' bed'}\n`;
        
        if (property.amenities && property.amenities.length > 0) {
          message += `✨ ${property.amenities.slice(0, 2).join(', ')}`;
          if (property.amenities.length > 2) message += ` +${property.amenities.length - 2} more`;
          message += `\n`;
        }
        
        message += `\n`;
      });

      message += `Which property interests you most?`;

      // Create buttons for each property
      const buttons = properties.slice(0, 3).map((property, index) => ({
        id: `select_${property.id}`,
        title: `${index + 1}. ${property.location}`
      }));

      await this.whatsapp.sendButtonMessage(from, message, buttons);

    } catch (error) {
      logger.error('Error sending property comparison:', error);
      throw error;
    }
  }

  // Send property carousel navigation
  async sendPropertyCarousel(properties, currentIndex, from) {
    try {
      const property = properties[currentIndex];
      const totalProperties = properties.length;

      // Send current property
      await this.sendDetailedPropertyCard(property, from, currentIndex + 1);

      // Navigation message
      const navMessage = `📋 Property ${currentIndex + 1} of ${totalProperties}`;
      const navButtons = [];

      // Previous button
      if (currentIndex > 0) {
        navButtons.push({ id: `prev_${currentIndex}`, title: '⬅️ Previous' });
      }

      // Next button
      if (currentIndex < totalProperties - 1) {
        navButtons.push({ id: `next_${currentIndex}`, title: '➡️ Next' });
      }

      // Always add these options
      navButtons.push({ id: `compare_properties`, title: '🔍 Compare' });

      if (navButtons.length > 0) {
        await this.whatsapp.sendButtonMessage(from, navMessage, navButtons);
      }

    } catch (error) {
      logger.error('Error sending property carousel:', error);
      throw error;
    }
  }

  // Send property quick view (compact format)
  async sendPropertyQuickView(property, from, index = null) {
    try {
      const title = index ? `${index}. ` : '';
      
      let message = `🏠 *${title}${property.title || property.type}*\n`;
      message += `📍 ${property.location} • 💰 ${this.formatPrice(property.price)}\n`;
      
      if (property.bedrooms !== undefined) {
        message += `🛏️ ${property.bedrooms === 0 ? 'Studio' : property.bedrooms + ' bed'}`;
      }
      
      if (property.bathrooms) {
        message += ` • 🚿 ${property.bathrooms} bath`;
      }
      
      message += `\n`;
      
      if (property.amenities && property.amenities.length > 0) {
        message += `✨ ${property.amenities.slice(0, 3).join(', ')}`;
        if (property.amenities.length > 3) {
          message += ` +${property.amenities.length - 3} more`;
        }
        message += `\n`;
      }

      const buttons = [
        { id: `view_${property.id}`, title: '👁️ View Details' },
        { id: `book_${property.id}`, title: '📅 Book Tour' }
      ];

      // Send with first image if available
      if (property.images && property.images.length > 0) {
        await this.whatsapp.sendImageMessage(from, property.images[0], message);
        await this.whatsapp.sendButtonMessage(from, "Quick actions:", buttons);
      } else {
        await this.whatsapp.sendButtonMessage(from, message, buttons);
      }

    } catch (error) {
      logger.error('Error sending property quick view:', error);
      throw error;
    }
  }

  // Format price with proper comma separation
  formatPrice(price) {
    if (!price) return 'Price on request';
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  // Format amenity names for display
  formatAmenity(amenity) {
    const amenityMap = {
      'parking': '🚗 Parking',
      'wifi': '📶 WiFi',
      'generator': '⚡ Generator',
      'water': '💧 Water Supply',
      'security': '🔒 Security',
      'furnished': '🪑 Furnished',
      'kitchen': '🍳 Kitchen',
      'bathroom': '🚿 Private Bathroom',
      'balcony': '🌅 Balcony',
      'garden': '🌳 Garden',
      'pool': '🏊 Swimming Pool',
      'gym': '💪 Gym',
      'laundry': '👕 Laundry',
      'ac': '❄️ Air Conditioning'
    };

    return amenityMap[amenity.toLowerCase()] || `✨ ${amenity}`;
  }
}

module.exports = PropertyDisplayService;
