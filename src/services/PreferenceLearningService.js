const logger = require('../utils/logger');
const UserService = require('./UserService');
const PropertyService = require('./PropertyService');

class PreferenceLearningService {
  constructor() {
    this.userService = new UserService();
    this.propertyService = new PropertyService();
    
    // Learning weights for different types of interactions
    this.interactionWeights = {
      'view': 1,
      'save': 3,
      'book': 5,
      'contact': 4,
      'share': 2,
      'search': 1,
      'skip': -1,
      'unsave': -2
    };

    // Decay factor for older interactions (weekly decay)
    this.decayFactor = 0.95;
  }

  // Learn from user interaction and update preferences
  async learnFromInteraction(userId, interaction) {
    try {
      logger.info(`Learning from interaction: ${interaction.action} by user ${userId}`);

      const user = await this.userService.getUserById(userId);
      if (!user) {
        logger.warn(`User ${userId} not found for preference learning`);
        return;
      }

      // Get property details if interaction involves a property
      let property = null;
      if (interaction.propertyId) {
        property = await this.propertyService.getPropertyById(interaction.propertyId);
      }

      // Update different types of preferences based on interaction
      await this.updateLocationPreferences(user, interaction, property);
      await this.updatePricePreferences(user, interaction, property);
      await this.updatePropertyTypePreferences(user, interaction, property);
      await this.updateAmenityPreferences(user, interaction, property);
      await this.updateSearchPatternPreferences(user, interaction);

      // Apply temporal decay to existing preferences
      await this.applyTemporalDecay(user);

      // Save updated preferences
      await this.userService.updateUser(userId, { 
        preferences: user.preferences,
        lastPreferenceUpdate: new Date()
      });

      logger.info(`Updated preferences for user ${userId}`);

    } catch (error) {
      logger.error('Error learning from interaction:', error);
    }
  }

  // Update location preferences based on user interactions
  async updateLocationPreferences(user, interaction, property) {
    if (!property || !property.location) return;

    const weight = this.interactionWeights[interaction.action] || 0;
    const location = property.location.toLowerCase();

    // Initialize location preferences if not exists
    if (!user.preferences.locationPreferences) {
      user.preferences.locationPreferences = {};
    }

    // Update location score
    const currentScore = user.preferences.locationPreferences[location] || 0;
    user.preferences.locationPreferences[location] = Math.max(0, currentScore + weight);

    // Normalize scores to prevent unlimited growth
    this.normalizePreferences(user.preferences.locationPreferences, 100);

    logger.debug(`Updated location preference for ${location}: ${user.preferences.locationPreferences[location]}`);
  }

  // Update price range preferences
  async updatePricePreferences(user, interaction, property) {
    if (!property || !property.price) return;

    const weight = this.interactionWeights[interaction.action] || 0;
    
    // Initialize price preferences if not exists
    if (!user.preferences.pricePreferences) {
      user.preferences.pricePreferences = {
        ranges: {},
        averagePreferred: 0,
        totalInteractions: 0
      };
    }

    // Determine price range bucket
    const priceRange = this.getPriceRangeBucket(property.price);
    
    // Update price range score
    const currentScore = user.preferences.pricePreferences.ranges[priceRange] || 0;
    user.preferences.pricePreferences.ranges[priceRange] = Math.max(0, currentScore + weight);

    // Update average preferred price (weighted moving average)
    if (weight > 0) {
      const totalInteractions = user.preferences.pricePreferences.totalInteractions;
      const currentAverage = user.preferences.pricePreferences.averagePreferred;
      
      user.preferences.pricePreferences.averagePreferred = 
        (currentAverage * totalInteractions + property.price * weight) / (totalInteractions + weight);
      user.preferences.pricePreferences.totalInteractions = totalInteractions + weight;
    }

    // Normalize price range scores
    this.normalizePreferences(user.preferences.pricePreferences.ranges, 100);

    logger.debug(`Updated price preference for range ${priceRange}: ${user.preferences.pricePreferences.ranges[priceRange]}`);
  }

  // Update property type preferences
  async updatePropertyTypePreferences(user, interaction, property) {
    if (!property || !property.type) return;

    const weight = this.interactionWeights[interaction.action] || 0;
    const propertyType = property.type.toLowerCase();

    // Initialize property type preferences if not exists
    if (!user.preferences.propertyTypePreferences) {
      user.preferences.propertyTypePreferences = {};
    }

    // Update property type score
    const currentScore = user.preferences.propertyTypePreferences[propertyType] || 0;
    user.preferences.propertyTypePreferences[propertyType] = Math.max(0, currentScore + weight);

    // Normalize scores
    this.normalizePreferences(user.preferences.propertyTypePreferences, 100);

    logger.debug(`Updated property type preference for ${propertyType}: ${user.preferences.propertyTypePreferences[propertyType]}`);
  }

  // Update amenity preferences
  async updateAmenityPreferences(user, interaction, property) {
    if (!property || !property.amenities || property.amenities.length === 0) return;

    const weight = this.interactionWeights[interaction.action] || 0;

    // Initialize amenity preferences if not exists
    if (!user.preferences.amenityPreferences) {
      user.preferences.amenityPreferences = {};
    }

    // Update each amenity score
    property.amenities.forEach(amenity => {
      const amenityKey = amenity.toLowerCase();
      const currentScore = user.preferences.amenityPreferences[amenityKey] || 0;
      user.preferences.amenityPreferences[amenityKey] = Math.max(0, currentScore + weight);
    });

    // Normalize amenity scores
    this.normalizePreferences(user.preferences.amenityPreferences, 100);

    logger.debug(`Updated amenity preferences for ${property.amenities.length} amenities`);
  }

  // Update search pattern preferences
  async updateSearchPatternPreferences(user, interaction) {
    if (interaction.action !== 'search') return;

    // Initialize search pattern preferences if not exists
    if (!user.preferences.searchPatterns) {
      user.preferences.searchPatterns = {
        preferredSearchMethods: {},
        commonSearchTerms: {},
        searchTimePatterns: {},
        totalSearches: 0
      };
    }

    // Update search method preference
    const searchMethod = interaction.searchMethod || 'text';
    const currentMethodScore = user.preferences.searchPatterns.preferredSearchMethods[searchMethod] || 0;
    user.preferences.searchPatterns.preferredSearchMethods[searchMethod] = currentMethodScore + 1;

    // Update search terms (if available)
    if (interaction.searchTerms) {
      interaction.searchTerms.forEach(term => {
        const termKey = term.toLowerCase();
        const currentTermScore = user.preferences.searchPatterns.commonSearchTerms[termKey] || 0;
        user.preferences.searchPatterns.commonSearchTerms[termKey] = currentTermScore + 1;
      });
    }

    // Update search time patterns
    const hour = new Date(interaction.timestamp).getHours();
    const timeSlot = this.getTimeSlot(hour);
    const currentTimeScore = user.preferences.searchPatterns.searchTimePatterns[timeSlot] || 0;
    user.preferences.searchPatterns.searchTimePatterns[timeSlot] = currentTimeScore + 1;

    // Update total searches
    user.preferences.searchPatterns.totalSearches += 1;

    logger.debug(`Updated search pattern preferences for user`);
  }

  // Apply temporal decay to preferences to reduce impact of old interactions
  async applyTemporalDecay(user) {
    const lastUpdate = user.lastPreferenceUpdate || user.createdAt;
    const daysSinceUpdate = (Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60 * 24);
    
    // Apply decay if more than a week since last update
    if (daysSinceUpdate > 7) {
      const decayMultiplier = Math.pow(this.decayFactor, Math.floor(daysSinceUpdate / 7));
      
      // Apply decay to all preference categories
      this.applyDecayToPreferences(user.preferences.locationPreferences, decayMultiplier);
      this.applyDecayToPreferences(user.preferences.propertyTypePreferences, decayMultiplier);
      this.applyDecayToPreferences(user.preferences.amenityPreferences, decayMultiplier);
      
      if (user.preferences.pricePreferences && user.preferences.pricePreferences.ranges) {
        this.applyDecayToPreferences(user.preferences.pricePreferences.ranges, decayMultiplier);
      }

      logger.debug(`Applied temporal decay (${decayMultiplier.toFixed(3)}) to user preferences`);
    }
  }

  // Apply decay multiplier to preference object
  applyDecayToPreferences(preferences, decayMultiplier) {
    if (!preferences) return;
    
    Object.keys(preferences).forEach(key => {
      if (typeof preferences[key] === 'number') {
        preferences[key] = Math.max(0, preferences[key] * decayMultiplier);
      }
    });
  }

  // Normalize preference scores to prevent unlimited growth
  normalizePreferences(preferences, maxScore = 100) {
    if (!preferences) return;

    const values = Object.values(preferences).filter(v => typeof v === 'number');
    if (values.length === 0) return;

    const maxValue = Math.max(...values);
    if (maxValue > maxScore) {
      const scaleFactor = maxScore / maxValue;
      Object.keys(preferences).forEach(key => {
        if (typeof preferences[key] === 'number') {
          preferences[key] = preferences[key] * scaleFactor;
        }
      });
    }
  }

  // Get price range bucket for categorization
  getPriceRangeBucket(price) {
    if (price < 30000) return 'very_low';
    if (price < 50000) return 'low';
    if (price < 80000) return 'medium_low';
    if (price < 120000) return 'medium';
    if (price < 200000) return 'medium_high';
    if (price < 300000) return 'high';
    return 'very_high';
  }

  // Get time slot for search pattern analysis
  getTimeSlot(hour) {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  // Get user's top preferences for recommendations
  async getTopPreferences(userId, category, limit = 5) {
    try {
      const user = await this.userService.getUserById(userId);
      if (!user || !user.preferences) return [];

      const preferences = user.preferences[category + 'Preferences'];
      if (!preferences) return [];

      return Object.entries(preferences)
        .sort(([,a], [,b]) => b - a)
        .slice(0, limit)
        .map(([key, score]) => ({ key, score }));

    } catch (error) {
      logger.error('Error getting top preferences:', error);
      return [];
    }
  }

  // Generate preference summary for user
  async generatePreferenceSummary(userId) {
    try {
      const user = await this.userService.getUserById(userId);
      if (!user || !user.preferences) {
        return { message: "No preferences learned yet. Keep using the app to get personalized recommendations!" };
      }

      const summary = {
        topLocations: await this.getTopPreferences(userId, 'location', 3),
        topPropertyTypes: await this.getTopPreferences(userId, 'propertyType', 3),
        topAmenities: await this.getTopPreferences(userId, 'amenity', 5),
        priceRange: this.getPreferredPriceRange(user.preferences),
        searchPatterns: this.getSearchPatternSummary(user.preferences)
      };

      return summary;

    } catch (error) {
      logger.error('Error generating preference summary:', error);
      return { message: "Unable to generate preference summary at this time." };
    }
  }

  // Get preferred price range from user preferences
  getPreferredPriceRange(preferences) {
    if (!preferences.pricePreferences) return null;

    const averagePreferred = preferences.pricePreferences.averagePreferred;
    if (!averagePreferred) return null;

    return {
      min: Math.round(averagePreferred * 0.8),
      max: Math.round(averagePreferred * 1.2),
      average: Math.round(averagePreferred)
    };
  }

  // Get search pattern summary
  getSearchPatternSummary(preferences) {
    if (!preferences.searchPatterns) return null;

    const patterns = preferences.searchPatterns;
    const topSearchMethod = Object.entries(patterns.preferredSearchMethods || {})
      .sort(([,a], [,b]) => b - a)[0];
    
    const topTimeSlot = Object.entries(patterns.searchTimePatterns || {})
      .sort(([,a], [,b]) => b - a)[0];

    return {
      preferredSearchMethod: topSearchMethod ? topSearchMethod[0] : null,
      mostActiveTime: topTimeSlot ? topTimeSlot[0] : null,
      totalSearches: patterns.totalSearches || 0
    };
  }

  // Reset user preferences (for privacy or fresh start)
  async resetUserPreferences(userId) {
    try {
      await this.userService.updateUser(userId, {
        preferences: {
          locationPreferences: {},
          pricePreferences: { ranges: {}, averagePreferred: 0, totalInteractions: 0 },
          propertyTypePreferences: {},
          amenityPreferences: {},
          searchPatterns: {
            preferredSearchMethods: {},
            commonSearchTerms: {},
            searchTimePatterns: {},
            totalSearches: 0
          }
        },
        lastPreferenceUpdate: new Date()
      });

      logger.info(`Reset preferences for user ${userId}`);
      return true;

    } catch (error) {
      logger.error('Error resetting user preferences:', error);
      return false;
    }
  }
}

module.exports = PreferenceLearningService;
