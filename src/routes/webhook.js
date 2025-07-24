const express = require('express');
const { logger } = require('../utils/logger');
const { handleWhatsAppWebhook, verifyWhatsAppWebhook } = require('../controllers/webhookController');

const router = express.Router();

// WhatsApp webhook verification (GET request)
router.get('/whatsapp', verifyWhatsAppWebhook);

// WhatsApp webhook handler (POST request)
router.post('/whatsapp', handleWhatsAppWebhook);

module.exports = router;
