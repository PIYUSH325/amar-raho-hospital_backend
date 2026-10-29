/**
 * Model Registry Layer
 * Configures model instances, generation parameters, and fallback models.
 */
const { getGeminiClient } = require('./geminiClient');

const MODELS = {
  DEFAULT: 'gemini-1.5-flash',
  FAST: 'gemini-1.5-flash',
  PRO: 'gemini-1.5-pro',
  FALLBACK: 'gemini-1.5-flash',
  EMBEDDING: 'text-embedding-004',
};

const DEFAULT_CONFIG = {
  temperature: 0.3,
  topP: 0.95,
  maxOutputTokens: 500,
};

/**
 * Returns an initialized GenerativeModel instance with optional tools, schemas, and instructions.
 */
function getGenerativeModel(options = {}) {
  const genAI = getGeminiClient();
  const modelName = options.modelName || process.env.GEMINI_MODEL || MODELS.DEFAULT;

  const modelParams = {
    model: modelName,
  };

  if (options.systemInstruction) {
    modelParams.systemInstruction = options.systemInstruction;
  }

  if (options.tools) {
    modelParams.tools = options.tools;
  }

  if (options.generationConfig) {
    modelParams.generationConfig = {
      ...DEFAULT_CONFIG,
      ...options.generationConfig,
    };
  } else {
    modelParams.generationConfig = DEFAULT_CONFIG;
  }

  return genAI.getGenerativeModel(modelParams);
}

module.exports = {
  MODELS,
  DEFAULT_CONFIG,
  getGenerativeModel,
};
