/**
 * Medical Guardrails & Safety Layer
 * Evaluates user messages for acute red-flag medical emergencies and ensures compliance.
 */

const EMERGENCY_RED_FLAGS = [
  /\b(crushing|severe)\s+chest\s+pain\b/i,
  /\bheart\s+attack\b/i,
  /\bcan'?t\s+breathe|difficulty\s+breathing|breathlessness\b/i,
  /\bsudden\s+(paralysis|numbness|facial\s+droop)\b/i,
  /\bprofuse\s+bleeding|bleeding\s+heavily\b/i,
  /\bloss\s+of\s+consciousness|unconscious|passed\s+out\b/i,
  /\bseizure|convulsions?\b/i,
  /\bstroke\b/i,
];

/**
 * Fast-path check: Determines if a prompt contains life-threatening red-flag indicators.
 * Allows the system to immediately prioritize emergency triage.
 */
function containsEmergencySymptoms(text = '') {
  return EMERGENCY_RED_FLAGS.some((pattern) => pattern.test(text));
}

const MEDICAL_DISCLAIMER = `
> [!IMPORTANT]
> *Medical Notice: I am the Amar Raho Hospital AI Assistant, not a licensed medical practitioner. For clinical diagnosis and prescription, please schedule a consultation with our doctors or visit our emergency center.*
`;

const OUT_OF_SCOPE_REFUSAL_MESSAGE = `I am the dedicated AI Assistant for Amar Raho Hospital. I specialize exclusively in healthcare navigation, our hospital clinical departments, doctor appointments, and medical support. I cannot assist with technical or non-medical topics like programming or general trivia. Please let me know how I can assist with your health, doctors, or hospital visits!`;

const OBVIOUS_NON_MEDICAL_PATTERNS = [
  /\b(what is|explain|write|how to code|tutorial for|learn)\s+(html|css|javascript|typescript|python|c\+\+|java|react|angular|vue|sql|nosql|php|git|github|docker|kubernetes|reverse proxy|proxy|server|load balancer|api|backend|frontend|devops|database)\b/i,
  /^(what is|explain)\s+(html|css|javascript|python|java|c\+\+|sql|reverse proxy|proxy|server|load balancer|api)\b/i,
  /\b(reverse proxy|load balancer|proxy server|dns|ip address|http header|ssl certificate)\b/i,
  /\b(write|generate|debug|fix)\s+(code|script|program|function|algorithm|html|css|regex)\b/i,
  /\b(who won the|score of the)\s+(ipl|fifa|world cup|super bowl|match|game)\b/i,
  /\b(capital of|population of|currency of)\s+[a-z\s]+\b/i,
  /\b(crypto|bitcoin|ethereum|stock trading|forex trading)\b/i,
];

/**
 * Fast-path check: Determines if a prompt is an obvious out-of-scope non-medical question.
 */
function isObviousNonMedicalQuery(text = '') {
  return OBVIOUS_NON_MEDICAL_PATTERNS.some((pattern) => pattern.test(text.trim()));
}

module.exports = {
  EMERGENCY_RED_FLAGS,
  containsEmergencySymptoms,
  MEDICAL_DISCLAIMER,
  OUT_OF_SCOPE_REFUSAL_MESSAGE,
  isObviousNonMedicalQuery,
};
