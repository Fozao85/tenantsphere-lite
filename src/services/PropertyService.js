const DatabaseService = require('./DatabaseService');
const { collections } = require('../config/firebase');
const Property = require('../models/Property');
const { logger } = require('../utils/logger');

class PropertyService extends DatabaseService {
  constructor() {
    super();
    this.collection = collections.PROPERTIES;
  }

  // Create a new property
  async createProperty(propertyData) {
    try {
      const property = new Property(propertyData);
      const errors = property.validate();
      
      if (errors.length > 0) {
        throw new Error(`Validation failed: ${errors.join(', ')}`);
      }

      // Add search keywords for better searchability
      const firestoreData = {
        ...property.toFirestore(),
        title_keywords: this.generateKeywords(property.title),
        location_keywords: this.generateKeywords(property.location),
        description_keywords: this.generateKeywords(property.description)
      };

      const result = await this.create(this.collection, firestoreData, property.id);
      logger.info(`Property created: ${property.id}`);
      return result;
    } catch (error) {
      logger.error('Error creating property:', error);
      throw error;
    }
  }

  // Get property by ID
  async getProperty(id) {
    try {
      const data = await this.getById(this.collection, id);
      return data ? Property.fromFirestore({ id: data.id, data: () => data }) : null;
    } catch (error) {
      logger.error(`Error getting property ${id}:`, error);
      throw error;
    }
  }

  // Update property
  async updateProperty(id, updateData) {
    try {
      const existingProperty = await this.getProperty(id);
      if (!existingProperty) {
        throw new Error('Property not found');
      }

      const updatedProperty = new Property({ ...existingProperty, ...updateData });
      const errors = updatedProperty.validate();
      
      if (errors.length > 0) {
        throw new Error(`Validation failed: ${errors.join(', ')}`);
      }

      // Update search keywords if title, location, or description changed
      const firestoreData = updatedProperty.toFirestore();
      if (updateData.title || updateData.location || updateData.description) {
        firestoreData.title_keywords = this.generateKeywords(updatedProperty.title);
        firestoreData.location_keywords = this.generateKeywords(updatedProperty.location);
        firestoreData.description_keywords = this.generateKeywords(updatedProperty.description);
      }

      const result = await this.update(this.collection, id, firestoreData);
      logger.info(`Property updated: ${id}`);
      return result;
    } catch (error) {
      logger.error(`Error updating property ${id}:`, error);
      throw error;
    }
  }

  // Delete property
  async deleteProperty(id) {
    try {
      const result = await this.delete(this.collection, id);
      logger.info(`Property deleted: ${id}`);
      return result;
    } catch (error) {
      logger.error(`Error deleting property ${id}:`, error);
      throw error;
    }
  }

  // Get all properties with filters
  async getProperties(filters = {}, options = {}) {
    try {
      const {
        status,
        agentId,
        propertyType,
        minPrice,
        maxPrice,
        minBedrooms,
        maxBedrooms,
        location,
        amenities
      } = filters;

      const {
        orderBy = { field: 'createdAt', direction: 'desc' },
        limit = 50,
        offset = 0
      } = options;

      let queryFilters = {};

      // Basic filters
      if (status) queryFilters.status = status;
      if (agentId) queryFilters.agentId = agentId;
      if (propertyType) queryFilters.propertyType = propertyType;

      // Price range filters (need to be handled separately due to Firestore limitations)
      if (minPrice) queryFilters.price = { operator: '>=', value: minPrice };
      if (maxPrice && !minPrice) queryFilters.price = { operator: '<=', value: maxPrice };

      const properties = await this.getAll(this.collection, queryFilters, orderBy, limit);

      // Apply additional filters in memory (due to Firestore query limitations)
      let filteredProperties = properties;

      if (minPrice && maxPrice) {
        filteredProperties = filteredProperties.filter(p => p.price >= minPrice && p.price <= maxPrice);
      }

      if (minBedrooms) {
        filteredProperties = filteredProperties.filter(p => p.bedrooms >= minBedrooms);
      }

      if (maxBedrooms) {
        filteredProperties = filteredProperties.filter(p => p.bedrooms <= maxBedrooms);
      }

      if (location) {
        const locationLower = location.toLowerCase();
        filteredProperties = filteredProperties.filter(p => 
          p.location.toLowerCase().includes(locationLower)
        );
      }

      if (amenities && amenities.length > 0) {
        filteredProperties = filteredProperties.filter(p => 
          amenities.every(amenity => p.amenities.includes(amenity))
        );
      }

      return filteredProperties.slice(offset, offset + limit);
    } catch (error) {
      logger.error('Error getting properties:', error);
      throw error;
    }
  }

  // Search properties
  async searchProperties(searchTerm, filters = {}) {
    try {
      // Search in title, location, and description
      const titleResults = await this.search(this.collection, 'title', searchTerm, filters);
      const locationResults = await this.search(this.collection, 'location', searchTerm, filters);
      const descriptionResults = await this.search(this.collection, 'description', searchTerm, filters);

      // Combine and deduplicate results
      const allResults = [...titleResults, ...locationResults, ...descriptionResults];
      const uniqueResults = allResults.filter((property, index, self) => 
        index === self.findIndex(p => p.id === property.id)
      );

      return uniqueResults;
    } catch (error) {
      logger.error('Error searching properties:', error);
      throw error;
    }
  }

  // Get properties by agent
  async getPropertiesByAgent(agentId, status = null) {
    try {
      const filters = { agentId };
      if (status) filters.status = status;

      return await this.getAll(this.collection, filters, { field: 'createdAt', direction: 'desc' });
    } catch (error) {
      logger.error(`Error getting properties for agent ${agentId}:`, error);
      throw error;
    }
  }

  // Get available properties for user preferences
  async getMatchingProperties(userPreferences, excludePropertyIds = []) {
    try {
      const filters = { status: 'available' };
      const properties = await this.getAll(this.collection, filters);

      // Filter based on user preferences
      const matchingProperties = properties.filter(property => {
        // Skip excluded properties
        if (excludePropertyIds.includes(property.id)) return false;

        const propertyObj = new Property(property);
        const user = { preferences: userPreferences };
        
        // Use the User model's matchesPreferences method logic
        return this.matchesUserPreferences(propertyObj, userPreferences);
      });

      return matchingProperties;
    } catch (error) {
      logger.error('Error getting matching properties:', error);
      throw error;
    }
  }

  // Update property status
  async updatePropertyStatus(id, status) {
    try {
      return await this.updateProperty(id, { status });
    } catch (error) {
      logger.error(`Error updating property status ${id}:`, error);
      throw error;
    }
  }

  // Increment view count
  async incrementViewCount(id) {
    try {
      const property = await this.getProperty(id);
      if (property) {
        return await this.updateProperty(id, { viewCount: property.viewCount + 1 });
      }
    } catch (error) {
      logger.error(`Error incrementing view count for property ${id}:`, error);
      throw error;
    }
  }

  // Increment booking count
  async incrementBookingCount(id) {
    try {
      const property = await this.getProperty(id);
      if (property) {
        return await this.updateProperty(id, { bookingCount: property.bookingCount + 1 });
      }
    } catch (error) {
      logger.error(`Error incrementing booking count for property ${id}:`, error);
      throw error;
    }
  }

  // Helper methods
  generateKeywords(text) {
    if (!text) return [];
    return text.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2)
      .map(word => word.replace(/[^\w]/g, ''));
  }

  matchesUserPreferences(property, preferences) {
    // Check price range
    if (preferences.maxPrice && property.price > preferences.maxPrice) return false;
    if (preferences.minPrice && property.price < preferences.minPrice) return false;

    // Check location
    if (preferences.preferredLocations && preferences.preferredLocations.length > 0) {
      const locationMatch = preferences.preferredLocations.some(loc => 
        property.location.toLowerCase().includes(loc.toLowerCase())
      );
      if (!locationMatch) return false;
    }

    // Check property type
    if (preferences.propertyTypes && preferences.propertyTypes.length > 0) {
      if (!preferences.propertyTypes.includes(property.propertyType)) return false;
    }

    // Check bedrooms
    if (preferences.minBedrooms && property.bedrooms < preferences.minBedrooms) return false;
    if (preferences.maxBedrooms && property.bedrooms > preferences.maxBedrooms) return false;

    // Check amenities
    if (preferences.amenities && preferences.amenities.length > 0) {
      const hasRequiredAmenities = preferences.amenities.every(amenity =>
        property.amenities.includes(amenity)
      );
      if (!hasRequiredAmenities) return false;
    }

    return true;
  }
}

module.exports = PropertyService;
