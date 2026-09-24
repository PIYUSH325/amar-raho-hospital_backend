/**
 * AI Engine API Routes
 * Exposes chat, intent classification, and semantic search endpoints.
 */
const express = require('express');
const router = express.Router();
const {
  agentChat,
  classifyIntent,
  retrieveRelevantContext,
  generateEmbedding
} = require('../ai');

/**
 * POST /api/ai/chat
 * Main public patient conversational assistant with autonomous ReAct tool calling.
 */
router.post('/chat', async (req, res, next) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required.' });
    }

    let userContext = req.user || null;
    if (!userContext && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded && decoded.id) {
          const User = require('../models/User');
          const foundUser = await User.findById(decoded.id).select('-password');
          if (foundUser) {
            userContext = {
              id: foundUser._id.toString(),
              _id: foundUser._id,
              name: foundUser.name,
              email: foundUser.email,
              role: foundUser.role
            };
          }
        }
      } catch (tokErr) {
        // Continue as guest if token is expired or invalid
      }
    }
    const result = await agentChat(message, history, userContext);

    return res.json({
      success: true,
      reply: result.reply,
      toolUsed: result.toolUsed,
      toolData: result.toolData,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/ai/intent
 * Deterministic intent classification and structured parameter extraction.
 */
router.post('/intent', async (req, res, next) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required.' });
    }

    const analysis = await classifyIntent(message, history);
    return res.json({ success: true, analysis });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/ai/rag-search
 * Semantic similarity search over hospital knowledge base.
 */
router.post('/rag-search', async (req, res, next) => {
  try {
    const { query, topK } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, message: 'Query is required.' });
    }

    const context = await retrieveRelevantContext(query, topK ? parseInt(topK, 10) : 3);
    return res.json({ success: true, context });
  } catch (error) {
    next(error);
  }
});

const adminController = require('../controllers/adminController');

/**
 * GET /api/ai/policies
 * Public endpoint to fetch all active hospital policies for web visitors.
 */
router.get('/policies', adminController.getPublicPolicies);

/**
 * GET /api/ai/settings
 * Public endpoint to fetch branding and welcome greeting for web visitors & chat widget.
 */
router.get('/settings', adminController.getPublicAiSettings);

module.exports = router;
