/**
 * Core Gemini SDK Client Layer
 * Handles initialization, API key management, and SDK client access.
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

let genAIInstance = null;

function getGeminiClient() {
  if (genAIInstance) {
    return genAIInstance;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the environment variables.');
  }

  genAIInstance = new GoogleGenerativeAI(apiKey);
  return genAIInstance;
}

module.exports = {
  getGeminiClient,
};
