/**
 * RAG Semantic Retriever Layer (Hybrid PostgreSQL + MongoDB)
 * Takes a patient inquiry, embeds it, queries live database policy vectors, and formats context chunks.
 * 100% Database-driven: Pulls exclusively from PostgreSQL and MongoDB.
 */
const { generateEmbedding } = require('../embeddings/embeddingService');
const { cosineSimilarity } = require('../vector-store/pgVectorClient');

let prisma = null;
try {
  prisma = require('../../config/prisma');
} catch (err) {
  console.warn('Prisma not available in retriever.');
}

let HospitalPolicy = null;
try {
  HospitalPolicy = require('../../models/HospitalPolicy');
} catch (err) {
  console.warn('Mongoose HospitalPolicy not available in retriever.');
}

/**
 * Retrieves top-K contextually relevant policy chunks from PostgreSQL (primary) or MongoDB (fallback).
 * @param {string} query - The patient message or query.
 * @param {number} topK - Maximum chunks to return.
 * @returns {Promise<Array<{ title: string, category: string, content: string, similarity: number, source: string }>>}
 */
async function retrieveRelevantContext(query, topK = 5) {
  if (!query || typeof query !== 'string' || !query.trim()) return [];

  try {
    const queryVector = await generateEmbedding(query.trim());
    let candidateChunks = [];

    // 1. PRIMARY: Fetch from PostgreSQL via Prisma
    if (prisma) {
      try {
        const pgChunks = await prisma.policyChunk.findMany({
          include: { policy: true }
        });
        if (pgChunks && pgChunks.length > 0) {
          candidateChunks = pgChunks.map(c => ({
            title: c.policy?.title || 'Hospital Policy',
            category: c.policy?.category || 'General',
            content: c.text,
            embedding: Array.isArray(c.embedding) ? c.embedding : (typeof c.embedding === 'string' ? JSON.parse(c.embedding) : c.embedding),
            source: 'PostgreSQL Live Database'
          }));
        }
      } catch (pgErr) {
        console.warn('Prisma policy retrieval warning:', pgErr.message);
      }
    }

    // 2. FALLBACK: Fetch from MongoDB if PostgreSQL has no chunks
    if (candidateChunks.length === 0 && HospitalPolicy) {
      try {
        const mongoPolicies = await HospitalPolicy.find().lean();
        if (mongoPolicies && mongoPolicies.length > 0) {
          for (const pol of mongoPolicies) {
            if (pol.chunks && pol.chunks.length > 0) {
              for (const c of pol.chunks) {
                candidateChunks.push({
                  title: pol.title || 'Hospital Policy',
                  category: pol.category || 'General',
                  content: c.text,
                  embedding: c.embedding || [],
                  source: 'MongoDB Live Database'
                });
              }
            }
          }
        }
      } catch (mErr) {
        console.warn('MongoDB policy retrieval warning:', mErr.message);
      }
    }

    // If both databases have no chunks, return empty array (no hardcoded fallback)
    if (candidateChunks.length === 0) return [];

    // 3. Calculate cosine similarity against query vector with hybrid keyword/clause boost
    const queryLower = query.toLowerCase();
    const clauseMatch = queryLower.match(/\b([1-4]\.\d{1,2})\b/);
    
    const scored = candidateChunks.map(chunk => {
      let sim = (chunk.embedding && chunk.embedding.length > 0)
        ? cosineSimilarity(queryVector, chunk.embedding)
        : 0;

      const contentLower = (chunk.content || '').toLowerCase();
      const titleLower = (chunk.title || '').toLowerCase();

      // Exact clause number boost (e.g. "2.1", "2.2")
      if (clauseMatch && contentLower.includes(clauseMatch[1])) {
        sim += 0.15;
      }

      // Title/Category keyword match boost
      const queryWords = queryLower.split(/\s+/).filter(w => w.length > 3);
      for (const w of queryWords) {
        if (titleLower.includes(w)) {
          sim += 0.15;
          break;
        }
      }

      return {
        title: chunk.title,
        category: chunk.category,
        content: chunk.content,
        similarity: sim,
        source: chunk.source
      };
    });

    // 4. Sort by highest similarity and return top-K above threshold (0.35)
    scored.sort((a, b) => b.similarity - a.similarity);
    const matches = scored.filter(c => c.similarity >= 0.35).slice(0, topK);

    return matches;
  } catch (err) {
    console.warn('RAG retrieval warning in retrieveRelevantContext:', err.message);
    return [];
  }
}

module.exports = {
  retrieveRelevantContext,
};
