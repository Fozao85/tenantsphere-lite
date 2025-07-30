const { logger } = require('../utils/logger');
const PropertyService = require('../services/PropertyService');
const PropertySearchService = require('../services/PropertySearchService');

// Initialize services lazily to avoid Firebase initialization issues
let propertyService = null;
let searchService = null;

function getServices() {
  if (!propertyService) {
    propertyService = new PropertyService();
  }
  if (!searchService) {
    searchService = new PropertySearchService();
  }
  return { propertyService, searchService };
}

// Get all properties with optional filters
const getAllProperties = async (req, res) => {
  try {
    const { searchService } = getServices();

    const {
      page = 1,
      limit = 20,
      location,
      minPrice,
      maxPrice,
      propertyType,
      bedrooms,
      amenities,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build search criteria from query parameters
    const searchCriteria = {};

    if (location) {
      searchCriteria.location = location;
    }

    if (minPrice || maxPrice) {
      searchCriteria.priceRange = {
        min: minPrice ? parseInt(minPrice) : 0,
        max: maxPrice ? parseInt(maxPrice) : Infinity
      };
    }

    if (propertyType) {
      searchCriteria.propertyType = propertyType;
    }

    if (bedrooms) {
      searchCriteria.bedrooms = parseInt(bedrooms);
    }

    if (amenities) {
      searchCriteria.amenities = Array.isArray(amenities) ? amenities : [amenities];
    }

    // Get properties (use PropertyService for now since SearchService might have issues)
    const { propertyService } = getServices();
    const properties = await propertyService.getProperties(searchCriteria);

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedProperties = properties.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedProperties,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: properties.length,
        pages: Math.ceil(properties.length / limit)
      },
      filters: searchCriteria
    });

  } catch (error) {
    logger.error('Error getting properties:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve properties',
      message: error.message
    });
  }
};

// Get property by ID
const getPropertyById = async (req, res) => {
  try {
    const { propertyService } = getServices();
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Property ID is required'
      });
    }

    const property = await propertyService.getProperty(id);

    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found'
      });
    }

    res.json({
      success: true,
      data: property
    });

  } catch (error) {
    logger.error('Error getting property by ID:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve property',
      message: error.message
    });
  }
};

// Create new property
const createProperty = async (req, res) => {
  try {
    const { propertyService } = getServices();
    const propertyData = req.body;

    // Validate required fields
    const requiredFields = ['title', 'location', 'price', 'propertyType'];
    const missingFields = requiredFields.filter(field => !propertyData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        missingFields
      });
    }

    // Add metadata
    propertyData.createdAt = new Date();
    propertyData.updatedAt = new Date();
    propertyData.status = propertyData.status || 'available';
    propertyData.verified = false; // Properties need verification

    // Create property
    const property = await propertyService.createProperty(propertyData);

    logger.info(`New property created: ${property.id} by agent ${propertyData.agentId || 'unknown'}`);

    res.status(201).json({
      success: true,
      data: property,
      message: 'Property created successfully'
    });

  } catch (error) {
    logger.error('Error creating property:', error);

    if (error.message.includes('Validation failed')) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create property',
      message: error.message
    });
  }
};

// Update property
const updateProperty = async (req, res) => {
  try {
    const { propertyService } = getServices();
    const { id } = req.params;
    const updateData = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Property ID is required'
      });
    }

    // Add update timestamp
    updateData.updatedAt = new Date();

    const updatedProperty = await propertyService.updateProperty(id, updateData);

    logger.info(`Property updated: ${id}`);

    res.json({
      success: true,
      data: updatedProperty,
      message: 'Property updated successfully'
    });

  } catch (error) {
    logger.error('Error updating property:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Property not found'
      });
    }

    if (error.message.includes('Validation failed')) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update property',
      message: error.message
    });
  }
};

// Delete property (soft delete)
const deleteProperty = async (req, res) => {
  try {
    const { propertyService } = getServices();
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Property ID is required'
      });
    }

    // Soft delete by updating status
    const updateData = {
      status: 'deleted',
      deletedAt: new Date(),
      updatedAt: new Date()
    };

    await propertyService.updateProperty(id, updateData);

    logger.info(`Property deleted: ${id}`);

    res.json({
      success: true,
      message: 'Property deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting property:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Property not found'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to delete property',
      message: error.message
    });
  }
};

// Advanced property search
const searchProperties = async (req, res) => {
  try {
    const { searchService } = getServices();

    const {
      q, // General search query
      location,
      minPrice,
      maxPrice,
      propertyType,
      bedrooms,
      bathrooms,
      amenities,
      sortBy = 'relevance',
      page = 1,
      limit = 20
    } = req.query;

    // Build search criteria
    const searchCriteria = {};

    if (q) {
      searchCriteria.query = q;
    }

    if (location) {
      searchCriteria.location = location;
    }

    if (minPrice || maxPrice) {
      searchCriteria.priceRange = {
        min: minPrice ? parseInt(minPrice) : 0,
        max: maxPrice ? parseInt(maxPrice) : Infinity
      };
    }

    if (propertyType) {
      searchCriteria.propertyType = propertyType;
    }

    if (bedrooms) {
      searchCriteria.bedrooms = parseInt(bedrooms);
    }

    if (bathrooms) {
      searchCriteria.bathrooms = parseInt(bathrooms);
    }

    if (amenities) {
      searchCriteria.amenities = Array.isArray(amenities) ? amenities : [amenities];
    }

    // Perform search (use PropertyService for now)
    const { propertyService } = getServices();
    const properties = await propertyService.getProperties(searchCriteria);

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedProperties = properties.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedProperties,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: properties.length,
        pages: Math.ceil(properties.length / limit)
      },
      searchCriteria,
      message: `Found ${properties.length} properties`
    });

  } catch (error) {
    logger.error('Error searching properties:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
      message: error.message
    });
  }
};

module.exports = {
  getAllProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  searchProperties
};
