/**
 * Vector Embeddings Layer
 * Generates high-dimensional semantic vector representations using Google's text-embedding-004 model.
 */
const { getGeminiClient } = require('../llm/geminiClient');
const { MODELS } = require('../llm/modelRegistry');

/**
 * Generates a 768-dimensional float embedding vector for a given text snippet.
 * @param {string} text - The input string to embed.
 * @returns {Promise<number[]>} Array of 768 float numbers.
 */
async function generateEmbedding(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Text is required to generate an embedding.');
  }

  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: MODELS.EMBEDDING });
  const result = await model.embedContent(text.trim());

  return result.embedding.values;
}

/**
 * Batch-generates embeddings for an array of text chunks.
 * @param {string[]} textChunks 
 * @returns {Promise<Array<{ text: string, embedding: number[] }>>}
 */
async function generateBatchEmbeddings(textChunks = []) {
  const results = [];
  for (const chunk of textChunks) {
    if (chunk && chunk.trim()) {
      const embedding = await generateEmbedding(chunk);
      results.push({ text: chunk, embedding });
    }
  }
  return results;
}

module.exports = {
  generateEmbedding,
  generateBatchEmbeddings,
};
