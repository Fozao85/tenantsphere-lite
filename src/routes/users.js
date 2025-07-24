const express = require('express');
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserPreferences,
  optInUser,
  optOutUser
} = require('../controllers/userController');

const router = express.Router();

// GET /api/users - Get all users
router.get('/', getAllUsers);

// GET /api/users/:id - Get user by ID
router.get('/:id', getUserById);

// POST /api/users - Create new user
router.post('/', createUser);

// PUT /api/users/:id - Update user
router.put('/:id', updateUser);

// PUT /api/users/:id/preferences - Update user preferences
router.put('/:id/preferences', updateUserPreferences);

// POST /api/users/:id/opt-in - Opt user in for notifications
router.post('/:id/opt-in', optInUser);

// POST /api/users/:id/opt-out - Opt user out of notifications
router.post('/:id/opt-out', optOutUser);

module.exports = router;
