/**
 * Response Templates Layer
 * Provides standardized synthesis prompts for grounding tool data into natural, patient-friendly replies.
 */

function buildGroundedSynthesisPrompt({ userPrompt, toolName, toolResult }) {
  return `User Question: "${userPrompt}"

Verified Live Hospital Tool Data (${toolName}):
${JSON.stringify(toolResult, null, 2)}

Instructions for AI:
- Answer the patient's question clearly, warmly, and concisely using the verified data above.
- Mention specific doctor names, departments, room locations, timings, and fees when available.
- If slots are available, invite the patient to book online via the "Appointment" navigation tab.
- Do NOT make up any unverified dates, doctors, or phone numbers.
`;
}

module.exports = {
  buildGroundedSynthesisPrompt,
};