const express = require('express');
const {
  getAllProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  searchProperties
} = require('../controllers/propertyController');

const router = express.Router();

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

module.exports = router;
