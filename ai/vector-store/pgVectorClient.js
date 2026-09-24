/**
 * Vector Store Layer (PostgreSQL pgvector & In-Memory Fallback)
 * Handles vector similarity search, indexing, and nearest neighbor queries.
 */
let prisma = null;
try {
  prisma = require('../../config/prisma');
} catch (err) {
  console.warn('Prisma not available for pgvector store.');
}

/**
 * Calculates cosine similarity between two float vectors.
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

/**
 * Query top-K most similar documents given a query embedding vector.
 * @param {Object} params
 * @param {number[]} params.queryVector - 768-dim query embedding
 * @param {number} [params.topK=3] - Number of top documents to return
 * @param {Array} [params.fallbackDocs] - In-memory documents if pgvector table is not yet migrated
 */
async function searchSimilarDocuments({ queryVector, topK = 3, fallbackDocs = [] }) {
  // If Prisma raw SQL is available with pgvector:
  if (prisma && typeof prisma.$queryRawUnsafe === 'function') {
    try {
      const vectorString = `[${queryVector.join(',')}]`;
      // Attempt pgvector cosine distance query if table exists
      const results = await prisma.$queryRawUnsafe(`
        SELECT id, content, metadata, 1 - (embedding <=> $1::vector) AS similarity
        FROM "HospitalKnowledgeVector"
        ORDER BY embedding <=> $1::vector
        LIMIT $2;
      `, vectorString, topK);
      return results;
    } catch (pgErr) {
      // Table doesn't exist yet, fallback to in-memory cosine ranking
    }
  }

  // In-memory fallback
  if (fallbackDocs && fallbackDocs.length > 0) {
    const scored = fallbackDocs.map((doc) => {
      const sim = doc.embedding ? cosineSimilarity(queryVector, doc.embedding) : 0;
      return { ...doc, similarity: sim };
    });

    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, topK);
  }

  return [];
}

module.exports = {
  cosineSimilarity,
  searchSimilarDocuments,
};
