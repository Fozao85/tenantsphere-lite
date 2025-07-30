const express = require('express');
const ImageService = require('../services/ImageService');
const {
  uploadPropertyImages,
  getPropertyImages,
  deletePropertyImage,
  getImageStatistics,
  cleanupOrphanedImages
} = require('../controllers/imageController');

const router = express.Router();

// Initialize image service for multer configuration
const imageService = new ImageService();
const upload = imageService.getMulterConfig();

// Upload images for a property
router.post('/properties/:propertyId/upload', 
  upload.array('images', 10), // Allow up to 10 images
  uploadPropertyImages
);

// Get all images for a property
router.get('/properties/:propertyId', getPropertyImages);

// Delete a specific image
router.delete('/properties/:propertyId/:imageId', deletePropertyImage);

// Get image statistics
router.get('/statistics', getImageStatistics);

// Clean up orphaned images (admin only)
router.post('/cleanup', cleanupOrphanedImages);

module.exports = router;
