const express = require('express');
const {
  getAllAgents,
  getAgentById,
  createAgent,
  updateAgent,
  getAgentProperties,
  getAgentBookings
} = require('../controllers/agentController');

const router = express.Router();

// GET /api/agents - Get all agents
router.get('/', getAllAgents);

// GET /api/agents/:id - Get agent by ID
router.get('/:id', getAgentById);

// POST /api/agents - Create new agent
router.post('/', createAgent);

// PUT /api/agents/:id - Update agent
router.put('/:id', updateAgent);

// GET /api/agents/:id/properties - Get properties managed by agent
router.get('/:id/properties', getAgentProperties);

// GET /api/agents/:id/bookings - Get bookings for agent's properties
router.get('/:id/bookings', getAgentBookings);

module.exports = router;
