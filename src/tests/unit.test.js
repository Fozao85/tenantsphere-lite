const NLPService = require('../services/NLPService');
const PropertySearchService = require('../services/PropertySearchService');
const RecommendationService = require('../services/RecommendationService');
const PreferenceLearningService = require('../services/PreferenceLearningService');
const ConversationFlowService = require('../services/ConversationFlowService');
const { logger } = require('../utils/logger');

describe('TenantSphere Unit Tests', () => {

  describe('NLPService', () => {
    let nlpService;

    beforeEach(() => {
      nlpService = new NLPService();
    });

    test('should extract search criteria from natural language', async () => {
      const text = "2 bedroom apartment in Molyko under 80000";
      const criteria = await nlpService.extractSearchCriteria(text);

      expect(criteria).toHaveProperty('bedrooms', 2);
      expect(criteria).toHaveProperty('location');
      expect(criteria.location).toContain('molyko');
      expect(criteria).toHaveProperty('maxPrice', 80000);
      expect(criteria).toHaveProperty('propertyType', 'apartment');
    });

    test('should analyze user intent correctly', async () => {
      const greetingIntent = await nlpService.analyzeIntent("Hello");
      expect(greetingIntent.intent).toBe('greeting');

      const searchIntent = await nlpService.analyzeIntent("I need a house");
      expect(searchIntent.intent).toBe('search_property');

      const bookingIntent = await nlpService.analyzeIntent("I want to book a tour");
      expect(bookingIntent.intent).toBe('book_tour');
    });

    test('should extract locations correctly', async () => {
      const locations = await nlpService.extractLocations("I want something in Molyko or Great Soppo");
      expect(locations).toContain('molyko');
      expect(locations).toContain('great soppo');
    });

    test('should extract price ranges', async () => {
      const priceRange1 = await nlpService.extractPriceRange("under 80000");
      expect(priceRange1).toHaveProperty('max', 80000);

      const priceRange2 = await nlpService.extractPriceRange("50000 to 100000");
      expect(priceRange2).toHaveProperty('min', 50000);
      expect(priceRange2).toHaveProperty('max', 100000);

      const priceRange3 = await nlpService.extractPriceRange("around 75000");
      expect(priceRange3).toHaveProperty('min');
      expect(priceRange3).toHaveProperty('max');
    });

    test('should extract amenities', async () => {
      const amenities = await nlpService.extractAmenities("with parking, generator and wifi");
      expect(amenities).toContain('parking');
      expect(amenities).toContain('generator');
      expect(amenities).toContain('wifi');
    });
  });

  describe('PropertySearchService', () => {
    let searchService;

    beforeEach(() => {
      searchService = new PropertySearchService();
    });

    test('should search properties with basic criteria', async () => {
      const criteria = {
        location: 'molyko',
        bedrooms: 2,
        maxPrice: 80000
      };

      const results = await searchService.searchProperties(criteria);
      expect(Array.isArray(results)).toBe(true);
    });

    test('should rank properties correctly', () => {
      const properties = [
        { id: '1', location: 'molyko', price: 70000, bedrooms: 2, amenities: ['parking'] },
        { id: '2', location: 'great soppo', price: 60000, bedrooms: 2, amenities: ['generator'] },
        { id: '3', location: 'molyko', price: 75000, bedrooms: 2, amenities: ['parking', 'generator'] }
      ];

      const userPreferences = {
        preferredLocations: ['molyko'],
        preferredAmenities: ['parking', 'generator']
      };

      const ranked = searchService.rankProperties(properties, userPreferences);
      
      expect(ranked[0].id).toBe('3'); // Should rank highest (molyko + both amenities)
      expect(ranked[1].id).toBe('1'); // Second (molyko + parking)
      expect(ranked[2].id).toBe('2'); // Third (different location)
    });

    test('should calculate location match score', () => {
      const score1 = searchService.calculateLocationScore('molyko', ['molyko']);
      expect(score1).toBe(100);

      const score2 = searchService.calculateLocationScore('great soppo', ['molyko']);
      expect(score2).toBe(0);

      const score3 = searchService.calculateLocationScore('molyko central', ['molyko']);
      expect(score3).toBeGreaterThan(0);
    });

    test('should calculate price preference score', () => {
      const priceRange = { min: 50000, max: 80000, average: 65000 };
      
      const score1 = searchService.calculatePriceScore(65000, priceRange);
      expect(score1).toBe(100); // Exact match with average

      const score2 = searchService.calculatePriceScore(90000, priceRange);
      expect(score2).toBe(0); // Outside range

      const score3 = searchService.calculatePriceScore(70000, priceRange);
      expect(score3).toBeGreaterThan(80); // Close to average
    });
  });

  describe('RecommendationService', () => {
    let recommendationService;

    beforeEach(() => {
      recommendationService = new RecommendationService();
    });

    test('should analyze behavior patterns', () => {
      const interactions = [
        { timestamp: new Date('2024-01-01T10:00:00Z'), action: 'search', propertyType: 'apartment' },
        { timestamp: new Date('2024-01-01T14:00:00Z'), action: 'view', propertyType: 'apartment' },
        { timestamp: new Date('2024-01-02T10:30:00Z'), action: 'search', propertyType: 'house' }
      ];

      const patterns = recommendationService.analyzeBehaviorPatterns(interactions);
      
      expect(patterns).toHaveProperty('mostActiveTimeOfDay');
      expect(patterns).toHaveProperty('mostViewedPropertyTypes');
      expect(patterns.mostViewedPropertyTypes).toContain('apartment');
    });

    test('should calculate preference weights', () => {
      const profile = {
        behaviorPatterns: { interactionFrequency: 3 },
        savedProperties: ['1', '2', '3', '4', '5', '6'] // More than 5
      };

      const weights = recommendationService.calculatePreferenceWeights(profile);
      
      expect(weights).toHaveProperty('location');
      expect(weights).toHaveProperty('price');
      expect(weights).toHaveProperty('amenities');
      expect(weights.amenities).toBeGreaterThan(0.1); // Should be increased for users who save properties
    });

    test('should score properties correctly', () => {
      const properties = [
        { id: '1', location: 'molyko', price: 70000, type: 'apartment', amenities: ['parking'] },
        { id: '2', location: 'great soppo', price: 60000, type: 'house', amenities: ['generator'] }
      ];

      const userProfile = {
        implicitPreferences: {
          preferredLocations: ['molyko'],
          preferredPriceRange: { min: 60000, max: 80000, average: 70000 },
          preferredPropertyTypes: ['apartment'],
          preferredAmenities: ['parking']
        },
        preferenceWeights: {
          location: 0.3,
          price: 0.25,
          propertyType: 0.2,
          amenities: 0.15,
          freshness: 0.05,
          diversity: 0.05
        }
      };

      const scored = recommendationService.scoreProperties(properties, userProfile);
      
      expect(scored[0].recommendationScore).toBeGreaterThan(scored[1].recommendationScore);
      expect(scored[0].id).toBe('1'); // Should score higher
    });
  });

  describe('PreferenceLearningService', () => {
    let learningService;

    beforeEach(() => {
      learningService = new PreferenceLearningService();
    });

    test('should get correct price range bucket', () => {
      expect(learningService.getPriceRangeBucket(25000)).toBe('very_low');
      expect(learningService.getPriceRangeBucket(45000)).toBe('low');
      expect(learningService.getPriceRangeBucket(65000)).toBe('medium_low');
      expect(learningService.getPriceRangeBucket(95000)).toBe('medium');
      expect(learningService.getPriceRangeBucket(150000)).toBe('medium_high');
      expect(learningService.getPriceRangeBucket(250000)).toBe('high');
      expect(learningService.getPriceRangeBucket(350000)).toBe('very_high');
    });

    test('should get correct time slot', () => {
      expect(learningService.getTimeSlot(8)).toBe('morning');
      expect(learningService.getTimeSlot(14)).toBe('afternoon');
      expect(learningService.getTimeSlot(19)).toBe('evening');
      expect(learningService.getTimeSlot(23)).toBe('night');
    });

    test('should normalize preferences correctly', () => {
      const preferences = {
        location1: 150,
        location2: 200,
        location3: 50
      };

      learningService.normalizePreferences(preferences, 100);
      
      expect(preferences.location1).toBe(75); // 150 * (100/200)
      expect(preferences.location2).toBe(100); // 200 * (100/200)
      expect(preferences.location3).toBe(25); // 50 * (100/200)
    });

    test('should apply decay to preferences', () => {
      const preferences = {
        item1: 100,
        item2: 50,
        item3: 75
      };

      const decayMultiplier = 0.9;
      learningService.applyDecayToPreferences(preferences, decayMultiplier);
      
      expect(preferences.item1).toBe(90);
      expect(preferences.item2).toBe(45);
      expect(preferences.item3).toBe(67.5);
    });
  });

  describe('ConversationFlowService', () => {
    let flowService;

    beforeEach(() => {
      flowService = new ConversationFlowService();
    });

    test('should detect new user correctly', () => {
      const newUser = {
        createdAt: new Date(),
        interactions: [],
        preferences: {}
      };

      const oldUser = {
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        interactions: [1, 2, 3, 4, 5, 6], // More than 5 interactions
        preferences: { location: 'molyko' }
      };

      expect(flowService.isNewUser(newUser)).toBe(true);
      expect(flowService.isNewUser(oldUser)).toBe(false);
    });

    test('should detect explicit flow requests', () => {
      const bookingRequest = flowService.detectExplicitFlowRequest("I want to book a tour", { intent: 'book_tour' });
      expect(bookingRequest).toEqual({ flow: 'booking', state: 'initial' });

      const helpRequest = flowService.detectExplicitFlowRequest("I need help", { intent: 'help' });
      expect(helpRequest).toEqual({ flow: 'support', state: 'initial' });

      const preferencesRequest = flowService.detectExplicitFlowRequest("update my preferences", { intent: 'general' });
      expect(preferencesRequest).toEqual({ flow: 'preference_setup', state: 'initial' });
    });

    test('should check if flow is active', () => {
      const activeConversation = {
        currentFlow: 'property_search',
        lastActivity: new Date()
      };

      const inactiveConversation = {
        currentFlow: 'property_search',
        lastActivity: new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago
      };

      expect(flowService.isFlowActive(activeConversation)).toBe(true);
      expect(flowService.isFlowActive(inactiveConversation)).toBe(false);
    });

    test('should map intent to flow correctly', () => {
      const searchFlow = flowService.mapIntentToFlow({ intent: 'search_property' });
      expect(searchFlow).toEqual({ flow: 'property_search', state: 'initial' });

      const bookingFlow = flowService.mapIntentToFlow({ intent: 'book_tour' });
      expect(bookingFlow).toEqual({ flow: 'booking', state: 'initial' });

      const helpFlow = flowService.mapIntentToFlow({ intent: 'help' });
      expect(helpFlow).toEqual({ flow: 'support', state: 'initial' });
    });

    test('should evaluate context conditions', () => {
      const conversationWithResults = {
        lastSearchResults: ['prop1', 'prop2', 'prop3']
      };

      const conversationWithProperty = {
        currentPropertyId: 'prop123'
      };

      const emptyConversation = {};

      expect(flowService.evaluateContextCondition('has_search_results', conversationWithResults)).toBe(true);
      expect(flowService.evaluateContextCondition('has_search_results', emptyConversation)).toBe(false);

      expect(flowService.evaluateContextCondition('has_selected_property', conversationWithProperty)).toBe(true);
      expect(flowService.evaluateContextCondition('has_selected_property', emptyConversation)).toBe(false);
    });
  });

  describe('Utility Functions', () => {
    test('should format prices correctly', () => {
      const formatPrice = (price) => {
        if (!price) return 'Price on request';
        return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      };

      expect(formatPrice(50000)).toBe('50,000');
      expect(formatPrice(1000000)).toBe('1,000,000');
      expect(formatPrice(null)).toBe('Price on request');
      expect(formatPrice(0)).toBe('Price on request');
    });

    test('should validate phone numbers', () => {
      const isValidPhone = (phone) => {
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        return phoneRegex.test(phone);
      };

      expect(isValidPhone('+237671125065')).toBe(true);
      expect(isValidPhone('237671125065')).toBe(true);
      expect(isValidPhone('invalid')).toBe(false);
      expect(isValidPhone('')).toBe(false);
    });

    test('should validate dates', () => {
      const isValidDate = (dateString) => {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
      };

      expect(isValidDate('2024-01-01')).toBe(true);
      expect(isValidDate('invalid-date')).toBe(false);
      expect(isValidDate('')).toBe(false);
    });

    test('should sanitize user input', () => {
      const sanitizeInput = (input) => {
        if (typeof input !== 'string') return '';
        return input.trim().replace(/[<>]/g, '');
      };

      expect(sanitizeInput('  hello world  ')).toBe('hello world');
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
      expect(sanitizeInput(123)).toBe('');
    });
  });

  describe('Error Handling', () => {
    test('should handle service initialization errors', () => {
      // Test that services can handle initialization without external dependencies
      expect(() => new NLPService()).not.toThrow();
      expect(() => new PropertySearchService()).not.toThrow();
      expect(() => new RecommendationService()).not.toThrow();
      expect(() => new PreferenceLearningService()).not.toThrow();
      expect(() => new ConversationFlowService()).not.toThrow();
    });

    test('should handle invalid input gracefully', async () => {
      const nlpService = new NLPService();
      
      // Should not throw errors for invalid input
      const result1 = await nlpService.extractSearchCriteria('');
      expect(result1).toBeDefined();

      const result2 = await nlpService.extractSearchCriteria(null);
      expect(result2).toBeDefined();

      const result3 = await nlpService.analyzeIntent('');
      expect(result3).toBeDefined();
    });
  });
});

// Mock data for testing
const mockProperties = [
  {
    id: 'prop1',
    title: 'Modern 2BR Apartment',
    location: 'Molyko',
    type: 'apartment',
    price: 70000,
    bedrooms: 2,
    bathrooms: 1,
    amenities: ['parking', 'wifi'],
    images: ['image1.jpg'],
    createdAt: new Date(),
    verified: true
  },
  {
    id: 'prop2',
    title: 'Spacious House',
    location: 'Great Soppo',
    type: 'house',
    price: 120000,
    bedrooms: 3,
    bathrooms: 2,
    amenities: ['generator', 'garden'],
    images: ['image2.jpg'],
    createdAt: new Date(),
    verified: true
  }
];

const mockUser = {
  id: 'user1',
  name: 'Test User',
  phone: '+237671125065',
  optedIn: true,
  status: 'active',
  preferences: {
    preferredLocations: ['molyko'],
    budgetRange: { min: 50000, max: 100000 },
    preferredPropertyTypes: ['apartment'],
    preferredAmenities: ['parking', 'wifi']
  },
  createdAt: new Date(),
  interactions: []
};

module.exports = { mockProperties, mockUser };
