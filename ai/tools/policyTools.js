/**
 * Hospital Policy Tool Layer
 * Connects the AI ReAct agent directly to the hybrid PostgreSQL & MongoDB vector knowledge base.
 */
const { retrieveRelevantContext } = require('../rag/retriever');

/**
 * Searches official hospital policies stored in live database (PostgreSQL / MongoDB).
 * @param {Object} args
 * @param {string} args.topic - Topic or keywords to search (e.g. visiting hours, insurance, refund)
 * @returns {Promise<Object>}
 */
async function getHospitalPolicy({ topic = '' } = {}) {
  const query = topic.trim();
  if (!query) {
    return {
      success: false,
      message: 'Please provide a policy topic to search (e.g. insurance, visiting hours, admission, billing).'
    };
  }

  const chunks = await retrieveRelevantContext(query, 3);

  if (!chunks || chunks.length === 0) {
    return {
      success: false,
      message: `No specific hospital policy found matching "${query}". Patients are advised to consult hospital reception or call +91 98765-AMAR-1 for clarification.`,
      matchedPolicies: []
    };
  }

  return {
    success: true,
    count: chunks.length,
    matchedPolicies: chunks.map(c => ({
      title: c.title,
      category: c.category,
      content: c.content,
      source: c.source,
      relevanceScore: Math.round(c.similarity * 100) + '%'
    }))
  };
}

module.exports = {
  getHospitalPolicy
};
