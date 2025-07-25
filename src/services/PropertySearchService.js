const logger = require('../utils/logger');
const DatabaseService = require('./DatabaseService');

class PropertySearchService extends DatabaseService {
  constructor() {
    super();
    this.collection = 'properties';
  }

  // Main search method with intelligent filtering
  async searchProperties(searchCriteria, userPreferences = {}) {
    try {
      logger.info('Searching properties with criteria:', searchCriteria);

      // Build query based on criteria
      let query = this.db.collection(this.collection);

      // Apply filters
      query = this.applyLocationFilter(query, searchCriteria.location);
      query = this.applyPriceFilter(query, searchCriteria.priceRange);
      query = this.applyPropertyTypeFilter(query, searchCriteria.propertyType);
      query = this.applyBedroomFilter(query, searchCriteria.bedrooms);
      query = this.applyAmenitiesFilter(query, searchCriteria.amenities);
      query = this.applyAvailabilityFilter(query, searchCriteria.availability);

      // Execute query
      const snapshot = await query.limit(20).get();
      
      if (snapshot.empty) {
        logger.info('No properties found matching criteria');
        return [];
      }

      const properties = [];
      snapshot.forEach(doc => {
        properties.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Apply intelligent ranking
      const rankedProperties = this.rankProperties(properties, searchCriteria, userPreferences);

      logger.info(`Found ${properties.length} properties, returning top ${rankedProperties.length}`);
      return rankedProperties;

    } catch (error) {
      logger.error('Error searching properties:', error);
      throw error;
    }
  }

  // Apply location-based filtering
  applyLocationFilter(query, location) {
    if (!location) return query;

    const locationTerms = location.toLowerCase().split(' ');
    
    // Search in multiple location fields
    return query.where('searchableLocation', 'array-contains-any', locationTerms);
  }

  // Apply price range filtering
  applyPriceFilter(query, priceRange) {
    if (!priceRange) return query;

    if (priceRange.min !== undefined) {
      query = query.where('price', '>=', priceRange.min);
    }
    
    if (priceRange.max !== undefined) {
      query = query.where('price', '<=', priceRange.max);
    }

    return query;
  }

  // Apply property type filtering
  applyPropertyTypeFilter(query, propertyType) {
    if (!propertyType || propertyType.length === 0) return query;

    if (Array.isArray(propertyType)) {
      return query.where('type', 'in', propertyType);
    } else {
      return query.where('type', '==', propertyType);
    }
  }

  // Apply bedroom count filtering
  applyBedroomFilter(query, bedrooms) {
    if (!bedrooms) return query;

    if (bedrooms.min !== undefined) {
      query = query.where('bedrooms', '>=', bedrooms.min);
    }
    
    if (bedrooms.max !== undefined) {
      query = query.where('bedrooms', '<=', bedrooms.max);
    }

    return query;
  }

  // Apply amenities filtering
  applyAmenitiesFilter(query, amenities) {
    if (!amenities || amenities.length === 0) return query;

    // For now, find properties that have at least one of the requested amenities
    return query.where('amenities', 'array-contains-any', amenities);
  }

  // Apply availability filtering
  applyAvailabilityFilter(query, availability = true) {
    return query.where('isAvailable', '==', availability);
  }

  // Intelligent property ranking based on user preferences and criteria
  rankProperties(properties, searchCriteria, userPreferences) {
    return properties.map(property => {
      let score = 0;

      // Base score for all properties
      score += 10;

      // Location preference scoring
      if (searchCriteria.location && property.location) {
        const locationMatch = this.calculateLocationMatch(searchCriteria.location, property.location);
        score += locationMatch * 20;
      }

      // Price preference scoring
      if (searchCriteria.priceRange) {
        const priceScore = this.calculatePriceScore(property.price, searchCriteria.priceRange);
        score += priceScore * 15;
      }

      // Property type preference
      if (userPreferences.preferredPropertyTypes && userPreferences.preferredPropertyTypes.includes(property.type)) {
        score += 25;
      }

      // Amenities matching
      if (searchCriteria.amenities && property.amenities) {
        const amenityScore = this.calculateAmenityScore(searchCriteria.amenities, property.amenities);
        score += amenityScore * 10;
      }

      // Property quality indicators
      if (property.rating) {
        score += property.rating * 5;
      }

      if (property.images && property.images.length > 0) {
        score += 5;
      }

      if (property.verified) {
        score += 10;
      }

      // Recency bonus
      const daysSincePosted = this.getDaysSincePosted(property.createdAt);
      if (daysSincePosted < 7) {
        score += 5;
      }

      return { ...property, searchScore: score };
    })
    .sort((a, b) => b.searchScore - a.searchScore)
    .slice(0, 10); // Return top 10 results
  }

  // Calculate location match score (0-1)
  calculateLocationMatch(searchLocation, propertyLocation) {
    const searchTerms = searchLocation.toLowerCase().split(' ');
    const propertyTerms = propertyLocation.toLowerCase().split(' ');
    
    let matches = 0;
    searchTerms.forEach(term => {
      if (propertyTerms.some(propTerm => propTerm.includes(term) || term.includes(propTerm))) {
        matches++;
      }
    });

    return matches / searchTerms.length;
  }

  // Calculate price preference score (0-1)
  calculatePriceScore(propertyPrice, priceRange) {
    if (!priceRange.min && !priceRange.max) return 0.5;

    const min = priceRange.min || 0;
    const max = priceRange.max || propertyPrice * 2;
    const range = max - min;

    if (propertyPrice < min || propertyPrice > max) return 0;

    // Higher score for prices closer to the middle of the range
    const middle = (min + max) / 2;
    const distance = Math.abs(propertyPrice - middle);
    return Math.max(0, 1 - (distance / (range / 2)));
  }

  // Calculate amenity match score (0-1)
  calculateAmenityScore(requestedAmenities, propertyAmenities) {
    if (!requestedAmenities.length) return 0;

    let matches = 0;
    requestedAmenities.forEach(amenity => {
      if (propertyAmenities.includes(amenity)) {
        matches++;
      }
    });

    return matches / requestedAmenities.length;
  }

  // Get days since property was posted
  getDaysSincePosted(createdAt) {
    const now = new Date();
    const posted = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    const diffTime = Math.abs(now - posted);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Quick search for simple text queries
  async quickSearch(searchText, limit = 5) {
    try {
      const searchTerms = searchText.toLowerCase().split(' ');
      
      const query = this.db.collection(this.collection)
        .where('searchableText', 'array-contains-any', searchTerms)
        .where('isAvailable', '==', true)
        .limit(limit);

      const snapshot = await query.get();
      
      const properties = [];
      snapshot.forEach(doc => {
        properties.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return properties;
    } catch (error) {
      logger.error('Error in quick search:', error);
      throw error;
    }
  }

  // Get properties by specific criteria
  async getPropertiesByType(propertyType, limit = 10) {
    try {
      const query = this.db.collection(this.collection)
        .where('type', '==', propertyType)
        .where('isAvailable', '==', true)
        .orderBy('createdAt', 'desc')
        .limit(limit);

      const snapshot = await query.get();
      
      const properties = [];
      snapshot.forEach(doc => {
        properties.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return properties;
    } catch (error) {
      logger.error('Error getting properties by type:', error);
      throw error;
    }
  }

  // Get featured/recommended properties
  async getFeaturedProperties(limit = 5) {
    try {
      const query = this.db.collection(this.collection)
        .where('isFeatured', '==', true)
        .where('isAvailable', '==', true)
        .orderBy('rating', 'desc')
        .limit(limit);

      const snapshot = await query.get();
      
      const properties = [];
      snapshot.forEach(doc => {
        properties.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return properties;
    } catch (error) {
      logger.error('Error getting featured properties:', error);
      throw error;
    }
  }
}

module.exports = PropertySearchService;
