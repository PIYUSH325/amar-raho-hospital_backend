/**
 * Amar Raho Hospital AI Engine - Main Façade
 * Unified entry point providing clean, modular access to LLM, Agents, Tools, RAG, Schemas, and Embeddings.
 */
const { getGenerativeModel, MODELS } = require('./llm/modelRegistry');
const { runHospitalAgent } = require('./agents/hospitalAgent');
const { HospitalIntentSchema } = require('./schemas/intentSchemas');
const { HOSPITAL_SYSTEM_INSTRUCTION } = require('./prompts/systemPrompts');
const { generateEmbedding, generateBatchEmbeddings } = require('./embeddings/embeddingService');
const { retrieveRelevantContext } = require('./rag/retriever');
const { HOSPITAL_TOOLS, executeTool } = require('./tools/toolRegistry');

/**
 * Public Hospital Agent Chat
 * Uses autonomous ReAct tool calling to fetch live database schedules, department facilities, and emergency data.
 */
async function agentChat(message, history = [], userContext = null) {
  return await runHospitalAgent({ message, history, userContext });
}

/**
 * Deterministic Intent Classification & Parameter Extraction
 * Returns structured JSON conforming to HospitalIntentSchema.
 */
async function classifyIntent(message, history = []) {
  const model = getGenerativeModel({
    modelName: MODELS.DEFAULT,
    systemInstruction: HOSPITAL_SYSTEM_INSTRUCTION,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: HospitalIntentSchema,
      temperature: 0.1,
    }
  });

  const prompt = `Classify this patient query and extract relevant parameters into the required JSON schema:\n"${message}"`;
  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  return JSON.parse(responseText);
}

module.exports = {
  // Primary Façade Methods
  agentChat,
  classifyIntent,
  retrieveRelevantContext,
  generateEmbedding,
  generateBatchEmbeddings,
  executeTool,

  // Direct Module Access
  HOSPITAL_TOOLS,
  HOSPITAL_SYSTEM_INSTRUCTION,
};
