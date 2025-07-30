const { logger } = require('../utils/logger');

class NLPService {
  constructor() {
    // Property type keywords
    this.propertyTypes = {
      'apartment': ['apartment', 'flat', 'unit'],
      'house': ['house', 'home', 'villa', 'bungalow'],
      'studio': ['studio', 'bedsitter', 'single room'],
      'duplex': ['duplex', 'maisonette'],
      'room': ['room', 'single room', 'shared room']
    };

    // Location keywords for Buea
    this.locations = {
      'molyko': ['molyko', 'moliko'],
      'great_soppo': ['great soppo', 'soppo', 'great-soppo'],
      'bokwango': ['bokwango', 'bokwongo'],
      'bonduma': ['bonduma'],
      'buea_town': ['buea town', 'town', 'buea-town'],
      'mile_16': ['mile 16', 'mile16', 'mile-16'],
      'checkpoint': ['checkpoint', 'check point'],
      'federal_quarters': ['federal quarters', 'federal-quarters', 'fed quarters']
    };

    // Amenity keywords
    this.amenities = {
      'parking': ['parking', 'garage', 'car park'],
      'wifi': ['wifi', 'internet', 'wi-fi'],
      'generator': ['generator', 'backup power', 'power backup'],
      'water': ['water', 'borehole', 'pipe borne'],
      'security': ['security', 'gate', 'gated', 'watchman'],
      'furnished': ['furnished', 'furniture', 'equipped'],
      'kitchen': ['kitchen', 'cooking'],
      'bathroom': ['bathroom', 'toilet', 'bath'],
      'balcony': ['balcony', 'veranda'],
      'garden': ['garden', 'compound', 'yard']
    };

    // Price keywords
    this.priceKeywords = {
      'cheap': { max: 50000 },
      'affordable': { max: 100000 },
      'budget': { max: 80000 },
      'expensive': { min: 200000 },
      'luxury': { min: 300000 },
      'premium': { min: 250000 }
    };

    // Bedroom keywords
    this.bedroomKeywords = {
      'studio': 0,
      'single': 1,
      'one bedroom': 1,
      'two bedroom': 2,
      'three bedroom': 3,
      'four bedroom': 4,
      'self contain': 1,
      'self-contain': 1
    };
  }

  // Analyze user intent from message text
  async analyzeIntent(messageText) {
    try {
      if (!messageText || typeof messageText !== 'string') {
        return { intent: 'unknown', confidence: 0 };
      }

      const text = messageText.toLowerCase().trim();

      // Greeting intents
      if (this.isGreeting(text)) {
        return { intent: 'greeting', confidence: 0.9 };
      }

      // Search intents
      if (this.isPropertySearch(text)) {
        return { intent: 'property_search', confidence: 0.8 };
      }

      // Help intents
      if (this.isHelpRequest(text)) {
        return { intent: 'help', confidence: 0.8 };
      }

      // Contact intents
      if (this.isContactRequest(text)) {
        return { intent: 'contact', confidence: 0.8 };
      }

      // Default to property search for most messages
      return { intent: 'property_search', confidence: 0.5 };

    } catch (error) {
      logger.error('Error analyzing intent:', error);
      return { intent: 'property_search', confidence: 0.3 };
    }
  }

  // Check if message is a greeting
  isGreeting(text) {
    const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'start', 'begin'];
    return greetings.some(greeting => text.includes(greeting));
  }

  // Check if message is a property search
  isPropertySearch(text) {
    // Check for property types
    const hasPropertyType = Object.values(this.propertyTypes).flat().some(type => text.includes(type));

    // Check for locations
    const hasLocation = Object.values(this.locations).flat().some(location => text.includes(location));

    // Check for price mentions
    const hasPrice = /\d+/.test(text) || Object.keys(this.priceKeywords).some(keyword => text.includes(keyword));

    // Check for search keywords
    const searchKeywords = ['find', 'search', 'looking for', 'want', 'need', 'show me', 'available'];
    const hasSearchKeyword = searchKeywords.some(keyword => text.includes(keyword));

    return hasPropertyType || hasLocation || hasPrice || hasSearchKeyword;
  }

  // Check if message is a help request
  isHelpRequest(text) {
    const helpKeywords = ['help', 'assist', 'support', 'how', 'what can you do', 'commands'];
    return helpKeywords.some(keyword => text.includes(keyword));
  }

  // Check if message is a contact request
  isContactRequest(text) {
    const contactKeywords = ['contact', 'agent', 'call', 'phone', 'speak to', 'talk to', 'human'];
    return contactKeywords.some(keyword => text.includes(keyword));
  }

  // Main method to parse user query into search criteria
  parseUserQuery(query) {
    try {
      const normalizedQuery = query.toLowerCase().trim();
      logger.info('Parsing user query:', normalizedQuery);

      const criteria = {
        location: this.extractLocation(normalizedQuery),
        propertyType: this.extractPropertyType(normalizedQuery),
        priceRange: this.extractPriceRange(normalizedQuery),
        bedrooms: this.extractBedrooms(normalizedQuery),
        amenities: this.extractAmenities(normalizedQuery),
        intent: this.detectIntent(normalizedQuery)
      };

      // Clean up undefined values
      Object.keys(criteria).forEach(key => {
        if (criteria[key] === undefined || criteria[key] === null) {
          delete criteria[key];
        }
      });

      logger.info('Parsed criteria:', criteria);
      return criteria;

    } catch (error) {
      logger.error('Error parsing user query:', error);
      return { intent: 'search' };
    }
  }

  // Extract location from query
  extractLocation(query) {
    for (const [location, keywords] of Object.entries(this.locations)) {
      for (const keyword of keywords) {
        if (query.includes(keyword)) {
          return location.replace('_', ' ');
        }
      }
    }

    // Look for "in [location]" or "at [location]" patterns
    const locationPatterns = [
      /(?:in|at|near|around)\s+([a-zA-Z\s]+?)(?:\s|$|,|\.|!|\?)/,
      /([a-zA-Z\s]+?)\s+(?:area|location|neighborhood)/
    ];

    for (const pattern of locationPatterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        const location = match[1].trim();
        if (location.length > 2 && location.length < 30) {
          return location;
        }
      }
    }

    return null;
  }

  // Extract property type from query
  extractPropertyType(query) {
    for (const [type, keywords] of Object.entries(this.propertyTypes)) {
      for (const keyword of keywords) {
        if (query.includes(keyword)) {
          return type;
        }
      }
    }
    return null;
  }

  // Extract price range from query
  extractPriceRange(query) {
    const priceRange = {};

    // Look for specific price keywords
    for (const [keyword, range] of Object.entries(this.priceKeywords)) {
      if (query.includes(keyword)) {
        return range;
      }
    }

    // Look for numeric prices
    const pricePatterns = [
      /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:fcfa|cfa|francs?)/gi,
      /(?:under|below|less than)\s*(\d+(?:,\d{3})*)/gi,
      /(?:above|over|more than)\s*(\d+(?:,\d{3})*)/gi,
      /(?:between|from)\s*(\d+(?:,\d{3})*)\s*(?:to|and|-)\s*(\d+(?:,\d{3})*)/gi,
      /(\d+(?:,\d{3})*)\s*(?:to|and|-)\s*(\d+(?:,\d{3})*)/gi
    ];

    for (const pattern of pricePatterns) {
      const matches = [...query.matchAll(pattern)];
      if (matches.length > 0) {
        const match = matches[0];
        if (match[2]) {
          // Range pattern
          priceRange.min = parseInt(match[1].replace(/,/g, ''));
          priceRange.max = parseInt(match[2].replace(/,/g, ''));
        } else {
          // Single value pattern
          const value = parseInt(match[1].replace(/,/g, ''));
          if (query.includes('under') || query.includes('below') || query.includes('less')) {
            priceRange.max = value;
          } else if (query.includes('above') || query.includes('over') || query.includes('more')) {
            priceRange.min = value;
          } else {
            // Assume it's a maximum if no qualifier
            priceRange.max = value;
          }
        }
        break;
      }
    }

    return Object.keys(priceRange).length > 0 ? priceRange : null;
  }

  // Extract bedroom count from query
  extractBedrooms(query) {
    // Look for specific bedroom keywords
    for (const [keyword, count] of Object.entries(this.bedroomKeywords)) {
      if (query.includes(keyword)) {
        return { min: count, max: count };
      }
    }

    // Look for numeric bedroom patterns
    const bedroomPatterns = [
      /(\d+)\s*(?:bedroom|bed|br)/gi,
      /(?:bedroom|bed|br)\s*(\d+)/gi
    ];

    for (const pattern of bedroomPatterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        const count = parseInt(match[1]);
        return { min: count, max: count };
      }
    }

    return null;
  }

  // Extract amenities from query
  extractAmenities(query) {
    const foundAmenities = [];

    for (const [amenity, keywords] of Object.entries(this.amenities)) {
      for (const keyword of keywords) {
        if (query.includes(keyword)) {
          foundAmenities.push(amenity);
          break;
        }
      }
    }

    return foundAmenities.length > 0 ? foundAmenities : null;
  }

  // Detect user intent
  detectIntent(query) {
    const intents = {
      'search': ['find', 'search', 'look', 'want', 'need', 'looking for', 'show me'],
      'book': ['book', 'reserve', 'schedule', 'appointment', 'visit', 'tour'],
      'info': ['tell me', 'information', 'details', 'about', 'describe'],
      'help': ['help', 'how', 'what', 'explain', 'guide'],
      'contact': ['contact', 'call', 'phone', 'agent', 'owner'],
      'price': ['price', 'cost', 'how much', 'expensive', 'cheap'],
      'location': ['where', 'location', 'address', 'directions']
    };

    for (const [intent, keywords] of Object.entries(intents)) {
      for (const keyword of keywords) {
        if (query.includes(keyword)) {
          return intent;
        }
      }
    }

    return 'search'; // Default intent
  }

  // Generate search suggestions based on partial query
  generateSuggestions(partialQuery) {
    const suggestions = [];
    const query = partialQuery.toLowerCase();

    // Location suggestions
    for (const [location, keywords] of Object.entries(this.locations)) {
      for (const keyword of keywords) {
        if (keyword.startsWith(query) || keyword.includes(query)) {
          suggestions.push(`Properties in ${location.replace('_', ' ')}`);
          break;
        }
      }
    }

    // Property type suggestions
    for (const [type, keywords] of Object.entries(this.propertyTypes)) {
      for (const keyword of keywords) {
        if (keyword.startsWith(query) || keyword.includes(query)) {
          suggestions.push(`${type.charAt(0).toUpperCase() + type.slice(1)} properties`);
          break;
        }
      }
    }

    // Common search suggestions
    if (query.length < 3) {
      suggestions.push(
        'Cheap apartments in Molyko',
        'Two bedroom house in Buea',
        'Studio apartment with parking',
        'Furnished apartment near UB'
      );
    }

    return suggestions.slice(0, 5); // Return top 5 suggestions
  }

  // Extract key information from property description
  extractPropertyInfo(description) {
    const info = {
      amenities: this.extractAmenities(description),
      bedrooms: this.extractBedrooms(description),
      location: this.extractLocation(description),
      propertyType: this.extractPropertyType(description)
    };

    // Clean up undefined values
    Object.keys(info).forEach(key => {
      if (info[key] === undefined || info[key] === null) {
        delete info[key];
      }
    });

    return info;
  }

  // Generate searchable text for property indexing
  generateSearchableText(property) {
    const searchTerms = [];

    // Add basic property info
    if (property.title) searchTerms.push(...property.title.toLowerCase().split(' '));
    if (property.description) searchTerms.push(...property.description.toLowerCase().split(' '));
    if (property.location) searchTerms.push(...property.location.toLowerCase().split(' '));
    if (property.type) searchTerms.push(property.type.toLowerCase());

    // Add amenities
    if (property.amenities) {
      property.amenities.forEach(amenity => {
        searchTerms.push(amenity.toLowerCase());
      });
    }

    // Add bedroom info
    if (property.bedrooms) {
      searchTerms.push(`${property.bedrooms}bedroom`);
      searchTerms.push(`${property.bedrooms}bed`);
    }

    // Add price range terms
    if (property.price) {
      if (property.price < 50000) searchTerms.push('cheap', 'affordable');
      if (property.price > 200000) searchTerms.push('expensive', 'luxury');
    }

    // Remove duplicates and empty strings
    return [...new Set(searchTerms.filter(term => term && term.length > 1))];
  }

  // Extract search terms from user query for matching
  extractSearchTerms(query) {
    try {
      const normalizedQuery = query.toLowerCase().trim();
      const searchTerms = [];

      // Split query into words and filter out common stop words
      const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'];

      const words = normalizedQuery.split(/\s+/).filter(word =>
        word.length > 1 && !stopWords.includes(word)
      );

      // Add individual words
      searchTerms.push(...words);

      // Add extracted entities
      const location = this.extractLocation(normalizedQuery);
      if (location) searchTerms.push(...location.toLowerCase().split(' '));

      const propertyType = this.extractPropertyType(normalizedQuery);
      if (propertyType) searchTerms.push(propertyType);

      const amenities = this.extractAmenities(normalizedQuery);
      if (amenities) searchTerms.push(...amenities);

      // Add bedroom-related terms
      const bedrooms = this.extractBedrooms(normalizedQuery);
      if (bedrooms) {
        searchTerms.push(`${bedrooms.min}bedroom`, `${bedrooms.min}bed`);
      }

      // Remove duplicates and empty strings
      return [...new Set(searchTerms.filter(term => term && term.length > 1))];

    } catch (error) {
      logger.error('Error extracting search terms:', error);
      return [];
    }
  }
}

module.exports = NLPService;
