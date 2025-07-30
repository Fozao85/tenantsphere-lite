const ImageService = require('../services/ImageService');
const PropertyService = require('../services/PropertyService');
const { logger } = require('../utils/logger');

// Initialize services lazily
let imageService = null;
let propertyService = null;

function getServices() {
  if (!imageService) {
    imageService = new ImageService();
  }
  if (!propertyService) {
    propertyService = new PropertyService();
  }
  return { imageService, propertyService };
}

// Upload images for a property
const uploadPropertyImages = async (req, res) => {
  try {
    const { imageService, propertyService } = getServices();
    const { propertyId } = req.params;
    
    if (!propertyId) {
      return res.status(400).json({
        success: false,
        error: 'Property ID is required'
      });
    }

    // Check if property exists
    const property = await propertyService.getProperty(propertyId);
    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found'
      });
    }

    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No images uploaded'
      });
    }

    // Process uploaded images
    const processedImages = await imageService.processImages(req.files, propertyId);
    
    if (processedImages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No images could be processed'
      });
    }

    // Update property with new images
    const currentImages = property.images || [];
    const updatedImages = [...currentImages, ...processedImages];
    
    await propertyService.updateProperty(propertyId, {
      images: updatedImages,
      updatedAt: new Date()
    });

    // Generate URLs for response
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const imageUrls = imageService.generateImageUrls(baseUrl, processedImages);

    logger.info(`Uploaded ${processedImages.length} images for property ${propertyId}`);

    res.json({
      success: true,
      data: {
        propertyId,
        uploadedImages: imageUrls,
        totalImages: updatedImages.length
      },
      message: `Successfully uploaded ${processedImages.length} image(s)`
    });

  } catch (error) {
    logger.error('Error uploading property images:', error);
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File size too large. Maximum size is 5MB per image.'
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files. Maximum 10 images per upload.'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to upload images',
      message: error.message
    });
  }
};

// Get property images
const getPropertyImages = async (req, res) => {
  try {
    const { imageService, propertyService } = getServices();
    const { propertyId } = req.params;
    
    if (!propertyId) {
      return res.status(400).json({
        success: false,
        error: 'Property ID is required'
      });
    }

    const property = await propertyService.getProperty(propertyId);
    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found'
      });
    }

    const images = property.images || [];
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const imageUrls = imageService.generateImageUrls(baseUrl, images);

    res.json({
      success: true,
      data: {
        propertyId,
        images: imageUrls,
        totalImages: images.length
      }
    });

  } catch (error) {
    logger.error('Error getting property images:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve images',
      message: error.message
    });
  }
};

// Delete property image
const deletePropertyImage = async (req, res) => {
  try {
    const { imageService, propertyService } = getServices();
    const { propertyId, imageId } = req.params;
    
    if (!propertyId || !imageId) {
      return res.status(400).json({
        success: false,
        error: 'Property ID and Image ID are required'
      });
    }

    const property = await propertyService.getProperty(propertyId);
    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found'
      });
    }

    const images = property.images || [];
    const imageIndex = images.findIndex(img => img.id === imageId);
    
    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Image not found'
      });
    }

    // Delete image files
    const imageToDelete = images[imageIndex];
    await imageService.deletePropertyImages([imageToDelete]);

    // Update property
    const updatedImages = images.filter(img => img.id !== imageId);
    await propertyService.updateProperty(propertyId, {
      images: updatedImages,
      updatedAt: new Date()
    });

    logger.info(`Deleted image ${imageId} from property ${propertyId}`);

    res.json({
      success: true,
      data: {
        propertyId,
        deletedImageId: imageId,
        remainingImages: updatedImages.length
      },
      message: 'Image deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting property image:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete image',
      message: error.message
    });
  }
};

// Get image statistics
const getImageStatistics = async (req, res) => {
  try {
    const { imageService } = getServices();
    const stats = await imageService.getImageStatistics();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Error getting image statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get image statistics',
      message: error.message
    });
  }
};

// Clean up orphaned images
const cleanupOrphanedImages = async (req, res) => {
  try {
    const { imageService, propertyService } = getServices();
    
    // Get all active property IDs
    const properties = await propertyService.getProperties();
    const activePropertyIds = properties.map(p => p.id);
    
    const cleanedCount = await imageService.cleanupOrphanedImages(activePropertyIds);

    res.json({
      success: true,
      data: {
        cleanedImages: cleanedCount,
        activeProperties: activePropertyIds.length
      },
      message: `Cleaned up ${cleanedCount} orphaned image(s)`
    });

  } catch (error) {
    logger.error('Error cleaning up orphaned images:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup orphaned images',
      message: error.message
    });
  }
};

module.exports = {
  uploadPropertyImages,
  getPropertyImages,
  deletePropertyImage,
  getImageStatistics,
  cleanupOrphanedImages
};
