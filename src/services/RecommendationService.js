const { logger } = require('../utils/logger');
const PropertySearchService = require('./PropertySearchService');
const UserService = require('./UserService');

class RecommendationService {
  constructor() {
    this.propertySearchService = new PropertySearchService();
    this.userService = new UserService();
  }

  // Generate personalized property recommendations
  async generateRecommendations(user, limit = 10) {
    try {
      logger.info(`Generating recommendations for user ${user.id}`);

      // Get user behavior data
      const userProfile = await this.buildUserProfile(user);
      
      // Get candidate properties
      const candidateProperties = await this.getCandidateProperties(userProfile);
      
      if (candidateProperties.length === 0) {
        return await this.getFallbackRecommendations(limit);
      }

      // Score and rank properties
      const scoredProperties = this.scoreProperties(candidateProperties, userProfile);
      
      // Apply diversity and freshness filters
      const diverseProperties = this.applyDiversityFilter(scoredProperties, userProfile);
      
      // Return top recommendations
      const recommendations = diverseProperties.slice(0, limit);
      
      logger.info(`Generated ${recommendations.length} recommendations for user ${user.id}`);
      return recommendations;

    } catch (error) {
      logger.error('Error generating recommendations:', error);
      return await this.getFallbackRecommendations(limit);
    }
  }

  // Build comprehensive user profile from interactions
  async buildUserProfile(user) {
    const profile = {
      userId: user.id,
      preferences: user.preferences || {},
      interactions: user.interactions || [],
      savedProperties: user.savedProperties || [],
      viewedProperties: user.viewedProperties || [],
      searchHistory: user.searchHistory || [],
      bookingHistory: user.bookingHistory || []
    };

    // Analyze interaction patterns
    profile.behaviorPatterns = this.analyzeBehaviorPatterns(profile.interactions);
    
    // Extract implicit preferences from behavior
    profile.implicitPreferences = await this.extractImplicitPreferences(profile);
    
    // Calculate preference weights
    profile.preferenceWeights = this.calculatePreferenceWeights(profile);
    
    return profile;
  }

  // Analyze user behavior patterns
  analyzeBehaviorPatterns(interactions) {
    const patterns = {
      mostActiveTimeOfDay: null,
      preferredSearchMethod: null,
      averageSessionLength: 0,
      mostViewedPropertyTypes: [],
      mostSearchedLocations: [],
      priceRangePattern: null,
      interactionFrequency: 0
    };

    if (interactions.length === 0) return patterns;

    // Analyze time patterns
    const hourCounts = {};
    interactions.forEach(interaction => {
      const hour = new Date(interaction.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    patterns.mostActiveTimeOfDay = Object.keys(hourCounts).reduce((a, b) => 
      hourCounts[a] > hourCounts[b] ? a : b
    );

    // Analyze search methods
    const searchMethods = {};
    interactions.filter(i => i.action === 'search').forEach(interaction => {
      const method = interaction.searchMethod || 'text';
      searchMethods[method] = (searchMethods[method] || 0) + 1;
    });
    patterns.preferredSearchMethod = Object.keys(searchMethods).reduce((a, b) => 
      searchMethods[a] > searchMethods[b] ? a : b, 'text'
    );

    // Analyze property type preferences
    const propertyTypes = {};
    interactions.filter(i => i.propertyType).forEach(interaction => {
      const type = interaction.propertyType;
      propertyTypes[type] = (propertyTypes[type] || 0) + 1;
    });
    patterns.mostViewedPropertyTypes = Object.entries(propertyTypes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([type]) => type);

    // Calculate interaction frequency (interactions per day)
    const daysSinceFirstInteraction = Math.max(1, 
      (Date.now() - new Date(interactions[0].timestamp).getTime()) / (1000 * 60 * 60 * 24)
    );
    patterns.interactionFrequency = interactions.length / daysSinceFirstInteraction;

    return patterns;
  }

  // Extract implicit preferences from user behavior
  async extractImplicitPreferences(profile) {
    const implicit = {
      preferredLocations: [],
      preferredPriceRange: null,
      preferredPropertyTypes: [],
      preferredAmenities: [],
      avoidedFeatures: []
    };

    // Analyze viewed and saved properties
    const allViewedProperties = [...profile.viewedProperties, ...profile.savedProperties];
    
    if (allViewedProperties.length > 0) {
      // Get property details for analysis
      const propertyDetails = [];
      for (const propertyId of allViewedProperties.slice(-20)) { // Last 20 properties
        try {
          const property = await this.propertySearchService.getPropertyById(propertyId);
          if (property) propertyDetails.push(property);
        } catch (error) {
          logger.warn(`Could not load property ${propertyId} for preference analysis`);
        }
      }

      // Extract location preferences
      const locationCounts = {};
      propertyDetails.forEach(property => {
        if (property.location) {
          locationCounts[property.location] = (locationCounts[property.location] || 0) + 1;
        }
      });
      implicit.preferredLocations = Object.entries(locationCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([location]) => location);

      // Extract price range preferences
      const prices = propertyDetails.map(p => p.price).filter(p => p);
      if (prices.length > 0) {
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        implicit.preferredPriceRange = {
          min: Math.max(0, avgPrice * 0.7),
          max: avgPrice * 1.3,
          average: avgPrice
        };
      }

      // Extract property type preferences
      const typeCounts = {};
      propertyDetails.forEach(property => {
        if (property.type) {
          typeCounts[property.type] = (typeCounts[property.type] || 0) + 1;
        }
      });
      implicit.preferredPropertyTypes = Object.entries(typeCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 2)
        .map(([type]) => type);

      // Extract amenity preferences
      const amenityCounts = {};
      propertyDetails.forEach(property => {
        if (property.amenities) {
          property.amenities.forEach(amenity => {
            amenityCounts[amenity] = (amenityCounts[amenity] || 0) + 1;
          });
        }
      });
      implicit.preferredAmenities = Object.entries(amenityCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([amenity]) => amenity);
    }

    return implicit;
  }

  // Calculate preference weights based on explicit and implicit data
  calculatePreferenceWeights(profile) {
    const weights = {
      location: 0.3,
      price: 0.25,
      propertyType: 0.2,
      amenities: 0.15,
      freshness: 0.05,
      diversity: 0.05
    };

    // Adjust weights based on user behavior
    if (profile.behaviorPatterns.interactionFrequency > 2) {
      // Active users - increase personalization
      weights.location += 0.1;
      weights.amenities += 0.05;
      weights.freshness -= 0.05;
    }

    if (profile.savedProperties.length > 5) {
      // Users who save properties - they care about specific features
      weights.amenities += 0.1;
      weights.propertyType += 0.05;
      weights.diversity -= 0.05;
    }

    return weights;
  }

  // Get candidate properties for recommendation
  async getCandidateProperties(userProfile) {
    try {
      // Build search criteria from user profile
      const searchCriteria = {
        availability: true
      };

      // Add location preferences
      if (userProfile.implicitPreferences.preferredLocations.length > 0) {
        searchCriteria.locations = userProfile.implicitPreferences.preferredLocations;
      }

      // Add price range preferences
      if (userProfile.implicitPreferences.preferredPriceRange) {
        searchCriteria.priceRange = userProfile.implicitPreferences.preferredPriceRange;
      }

      // Add property type preferences
      if (userProfile.implicitPreferences.preferredPropertyTypes.length > 0) {
        searchCriteria.propertyType = userProfile.implicitPreferences.preferredPropertyTypes;
      }

      // Get properties using search service
      const properties = await this.propertySearchService.searchProperties(
        searchCriteria, 
        userProfile.preferences
      );

      // Filter out already viewed properties for diversity
      const viewedPropertyIds = new Set([
        ...userProfile.viewedProperties,
        ...userProfile.savedProperties
      ]);

      return properties.filter(property => !viewedPropertyIds.has(property.id));

    } catch (error) {
      logger.error('Error getting candidate properties:', error);
      return [];
    }
  }

  // Score properties based on user profile
  scoreProperties(properties, userProfile) {
    return properties.map(property => {
      let score = 0;
      const weights = userProfile.preferenceWeights;

      // Location scoring
      if (userProfile.implicitPreferences.preferredLocations.includes(property.location)) {
        score += weights.location * 100;
      }

      // Price scoring
      if (userProfile.implicitPreferences.preferredPriceRange && property.price) {
        const priceRange = userProfile.implicitPreferences.preferredPriceRange;
        if (property.price >= priceRange.min && property.price <= priceRange.max) {
          const distanceFromAverage = Math.abs(property.price - priceRange.average);
          const maxDistance = Math.max(
            priceRange.average - priceRange.min,
            priceRange.max - priceRange.average
          );
          score += weights.price * 100 * (1 - distanceFromAverage / maxDistance);
        }
      }

      // Property type scoring
      if (userProfile.implicitPreferences.preferredPropertyTypes.includes(property.type)) {
        score += weights.propertyType * 100;
      }

      // Amenities scoring
      if (property.amenities && userProfile.implicitPreferences.preferredAmenities.length > 0) {
        const matchingAmenities = property.amenities.filter(amenity =>
          userProfile.implicitPreferences.preferredAmenities.includes(amenity)
        );
        const amenityScore = (matchingAmenities.length / userProfile.implicitPreferences.preferredAmenities.length) * 100;
        score += weights.amenities * amenityScore;
      }

      // Freshness scoring (newer properties get bonus)
      const daysSincePosted = this.getDaysSincePosted(property.createdAt);
      if (daysSincePosted < 7) {
        score += weights.freshness * 100;
      }

      // Quality indicators
      if (property.verified) score += 10;
      if (property.images && property.images.length > 0) score += 5;
      if (property.rating) score += property.rating * 2;

      return { ...property, recommendationScore: score };
    }).sort((a, b) => b.recommendationScore - a.recommendationScore);
  }

  // Apply diversity filter to avoid too similar recommendations
  applyDiversityFilter(scoredProperties, userProfile) {
    const diverse = [];
    const locationCounts = {};
    const typeCounts = {};
    const maxPerLocation = 3;
    const maxPerType = 4;

    for (const property of scoredProperties) {
      const locationCount = locationCounts[property.location] || 0;
      const typeCount = typeCounts[property.type] || 0;

      if (locationCount < maxPerLocation && typeCount < maxPerType) {
        diverse.push(property);
        locationCounts[property.location] = locationCount + 1;
        typeCounts[property.type] = typeCount + 1;
      }

      if (diverse.length >= 20) break; // Limit total candidates
    }

    return diverse;
  }

  // Get fallback recommendations when personalization fails
  async getFallbackRecommendations(limit) {
    try {
      // Return featured and recent properties
      const featured = await this.propertySearchService.getFeaturedProperties(limit / 2);
      const recent = await this.propertySearchService.searchProperties({
        availability: true,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      return [...featured, ...recent.slice(0, limit - featured.length)];
    } catch (error) {
      logger.error('Error getting fallback recommendations:', error);
      return [];
    }
  }

  // Get days since property was posted
  getDaysSincePosted(createdAt) {
    const now = new Date();
    const posted = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    const diffTime = Math.abs(now - posted);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Update user interaction for learning
  async updateUserInteraction(userId, interaction) {
    try {
      await this.userService.addPropertyInteraction(userId, {
        ...interaction,
        timestamp: new Date()
      });
      logger.info(`Updated interaction for user ${userId}: ${interaction.action}`);
    } catch (error) {
      logger.error('Error updating user interaction:', error);
    }
  }

  // Get similar properties based on a reference property
  async getSimilarProperties(referenceProperty, limit = 5) {
    try {
      const searchCriteria = {
        availability: true,
        propertyType: referenceProperty.type,
        priceRange: {
          min: referenceProperty.price * 0.8,
          max: referenceProperty.price * 1.2
        }
      };

      if (referenceProperty.bedrooms) {
        searchCriteria.bedrooms = {
          min: Math.max(0, referenceProperty.bedrooms - 1),
          max: referenceProperty.bedrooms + 1
        };
      }

      const similarProperties = await this.propertySearchService.searchProperties(searchCriteria);
      
      // Filter out the reference property itself
      return similarProperties
        .filter(property => property.id !== referenceProperty.id)
        .slice(0, limit);

    } catch (error) {
      logger.error('Error getting similar properties:', error);
      return [];
    }
  }
}

module.exports = RecommendationService;
