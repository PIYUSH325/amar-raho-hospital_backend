/**
 * RAG Document Loader & Semantic Chunking Layer
 * Splits text into ingestible semantic chunks for vector embedding.
 */

/**
 * Splits text into overlapping chunks for vector embedding.
 * @param {string} text 
 * @param {number} chunkSize 
 * @param {number} chunkOverlap 
 * @returns {string[]}
 */
function splitTextIntoChunks(text, chunkSize = 400, chunkOverlap = 50) {
  if (!text) return [];
  const words = text.split(/\s+/);
  const chunks = [];
  let i = 0;

  while (i < words.length) {
    const chunkWords = words.slice(i, i + chunkSize);
    chunks.push(chunkWords.join(' '));
    i += (chunkSize - chunkOverlap);
  }

  return chunks;
}

module.exports = {
  splitTextIntoChunks,
};
