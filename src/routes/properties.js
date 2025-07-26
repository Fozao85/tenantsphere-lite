const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const {
  getAllProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  searchProperties
} = require('../controllers/propertyController');

const router = express.Router();

// Simple multer configuration for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = 'public/uploads/properties';
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}_${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 10
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'), false);
    }
  }
});

// GET /api/properties - Get all properties with optional filters
router.get('/', getAllProperties);

// GET /api/properties/search - Search properties
router.get('/search', searchProperties);

// GET /api/properties/:id - Get property by ID
router.get('/:id', getPropertyById);

// POST /api/properties - Create new property
router.post('/', createProperty);

// PUT /api/properties/:id - Update property
router.put('/:id', updateProperty);

// DELETE /api/properties/:id - Delete property
router.delete('/:id', deleteProperty);

// POST /api/properties/:id/upload-images - Upload images for a property
router.post('/:id/upload-images', upload.array('images', 10), async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No images uploaded'
      });
    }

    // Get the property first
    const PropertyService = require('../services/PropertyService');
    const propertyService = new PropertyService();
    const property = await propertyService.getProperty(id);

    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found'
      });
    }

    // Process uploaded files
    const uploadedImages = req.files.map(file => ({
      id: uuidv4(),
      originalName: file.originalname,
      url: `/uploads/properties/${file.filename}`,
      filename: file.filename,
      uploadedAt: new Date(),
      mimeType: file.mimetype,
      size: file.size
    }));

    // Update property with new images
    const currentImages = property.images || [];
    const updatedImages = [...currentImages, ...uploadedImages];

    await propertyService.updateProperty(id, {
      images: updatedImages,
      updatedAt: new Date()
    });

    console.log(`✅ Uploaded ${uploadedImages.length} images for property ${id}`);

    res.json({
      success: true,
      data: {
        propertyId: id,
        uploadedImages: uploadedImages,
        totalImages: updatedImages.length
      },
      message: `Successfully uploaded ${uploadedImages.length} image(s)`
    });

  } catch (error) {
    console.error('❌ Error uploading images:', error);

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
});

module.exports = router;
