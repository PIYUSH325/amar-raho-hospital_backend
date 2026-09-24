/**
 * Autonomous Hospital ReAct Agent Layer
 * Orchestrates:
 * 1. Medical safety guardrail checks.
 * 2. Multi-turn context management.
 * 3. Autonomous tool selection and live execution.
 * 4. Grounded response synthesis.
 */
const { getGenerativeModel, MODELS } = require('../llm/modelRegistry');
const { buildHospitalSystemInstruction, HOSPITAL_SYSTEM_INSTRUCTION } = require('../prompts/systemPrompts');
const { containsEmergencySymptoms, isObviousNonMedicalQuery, OUT_OF_SCOPE_REFUSAL_MESSAGE } = require('../prompts/guardrails');
const { buildGroundedSynthesisPrompt } = require('../prompts/responseTemplates');
const { HOSPITAL_TOOLS, executeTool } = require('../tools/toolRegistry');
const { retrieveRelevantContext } = require('../rag/retriever');

/**
 * Normalizes frontend / historical conversation turns into Gemini SDK format.
 * @param {Array|string} rawHistory 
 * @returns {Array} Array of { role: 'user'|'model', parts: [{ text: string }] }
 */
function normalizeHistory(rawHistory) {
  if (!rawHistory) return [];
  let historyArray = rawHistory;
  if (typeof rawHistory === 'string') {
    try {
      historyArray = JSON.parse(rawHistory);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(historyArray)) return [];

  // Extract cleaned turns
  const rawTurns = [];
  for (const item of historyArray) {
    let role = '';
    let text = '';
    if (item.sender) {
      role = item.sender === 'user' ? 'user' : 'model';
      text = item.text || item.message || '';
    } else if (item.role && item.parts) {
      role = item.role;
      text = Array.isArray(item.parts) ? item.parts.map(p => p.text || p).join(' ') : String(item.parts);
    }
    if (role && text && text.trim()) {
      rawTurns.push({ role, text: text.trim() });
    }
  }

  // Gemini strictly requires the first turn in history to be from 'user'
  while (rawTurns.length > 0 && rawTurns[0].role !== 'user') {
    rawTurns.shift(); // Remove any initial greeting from the bot
  }

  // Ensure strict alternating sequence: user -> model -> user -> model
  const geminiHistory = [];
  let expectedRole = 'user';
  for (const turn of rawTurns) {
    if (turn.role === expectedRole) {
      geminiHistory.push({ role: turn.role, parts: [{ text: turn.text }] });
      expectedRole = expectedRole === 'user' ? 'model' : 'user';
    }
  }

  // If the last history turn is 'user', remove it because the current query is the next user turn
  if (geminiHistory.length > 0 && geminiHistory[geminiHistory.length - 1].role === 'user') {
    geminiHistory.pop();
  }

  return geminiHistory;
}

let prisma = null;
try {
  prisma = require('../../config/prisma');
} catch (err) {
  console.warn('Prisma client not initialized in hospitalAgent.');
}

let Department = null;
try {
  Department = require('../../models/Department');
} catch (err) {
  console.warn('Mongoose Department model not initialized in hospitalAgent.');
}

let Doctor = null;
try {
  require('../../models/User');
  Doctor = require('../../models/Doctor');
} catch (err) {
  console.warn('Mongoose Doctor model not initialized in hospitalAgent.');
}

let AiSettings = null;
try {
  AiSettings = require('../../models/AiSettings');
} catch (err) {
  console.warn('Mongoose AiSettings model not initialized in hospitalAgent.');
}

let cachedAiSettings = null;
let lastAiSettingsFetch = 0;
const AI_SETTINGS_CACHE_TTL = 30000; // 30-second TTL cache for responsive dynamic updates

async function getAiSettingsContext() {
  const now = Date.now();
  if (cachedAiSettings && (now - lastAiSettingsFetch < AI_SETTINGS_CACHE_TTL)) {
    return cachedAiSettings;
  }
  if (!AiSettings) {
    try {
      AiSettings = require('../../models/AiSettings');
    } catch (e) {}
  }
  if (AiSettings) {
    try {
      const settings = await AiSettings.findOne().lean();
      if (settings) {
        cachedAiSettings = settings;
        lastAiSettingsFetch = now;
        return cachedAiSettings;
      }
    } catch (err) {
      console.warn('AiSettings fetch error in hospitalAgent:', err.message);
    }
  }
  return null;
}

/**
 * Dynamically queries both MongoDB (Master Departments) and PostgreSQL/MongoDB (Active Doctors)
 * to generate a real-time hospital roster and department summary for Gemini's prompt context.
 */
async function getLiveHospitalRosterContext() {
  let masterDepts = [];
  if (Department) {
    try {
      masterDepts = await Department.find().lean();
    } catch (err) {
      console.warn("MongoDB Department query warning in hospitalAgent:", err.message);
    }
  }

  let doctors = [];
  if (!prisma) {
    try {
      prisma = require('../../config/prisma');
    } catch {}
  }
  if (prisma) {
    try {
      doctors = await prisma.user.findMany({
        where: { role: 'doctor' },
        include: { doctorProfile: true }
      });
    } catch (err) {
      console.warn("Prisma doctor query warning in hospitalAgent:", err.message);
    }
  }

  // If prisma returned no doctors, query MongoDB Doctor model directly
  if ((!doctors || doctors.length === 0) && Doctor) {
    try {
      const mongoDocs = await Doctor.find().populate('user').lean();
      doctors = mongoDocs.map(d => ({
        id: d.user?._id || d._id,
        name: d.user?.name || 'Doctor',
        doctorProfile: {
          department: d.department || 'General',
          specialization: d.specialization || 'Physician',
          experience: d.experience || 5,
          fees: d.fees || 500,
          isPresenceActive: d.isPresenceActive !== false
        }
      }));
    } catch (err) {
      console.warn("MongoDB Doctor query warning in hospitalAgent:", err.message);
    }
  }

  if (masterDepts.length > 0 || doctors.length > 0) {
    // Map active doctors by normalized department
    const activeDocMap = {};
    for (const doc of doctors) {
      const p = doc.doctorProfile || {};
      const deptName = (p.department || 'General Medicine').trim();
      const key = deptName.toLowerCase();
      if (!activeDocMap[key]) activeDocMap[key] = [];
      activeDocMap[key].push({
        name: doc.name,
        specialization: p.specialization || 'Physician',
        experience: `${p.experience || 5} yrs`,
        fee: `Rs. ${p.fees || 500}`,
        status: p.isPresenceActive ? 'Available' : 'On Leave'
      });
    }

    const activeDepts = [];
    const inactiveDepts = [];

    // Categorize master departments from MongoDB
    for (const d of masterDepts) {
      const key = d.name.toLowerCase().trim();
      const matched = activeDocMap[key];
      if (matched && matched.length > 0) {
        activeDepts.push({
          name: d.name,
          doctors: matched
        });
      } else {
        inactiveDepts.push({
          name: d.name,
          description: d.description || ''
        });
      }
    }

    // Include any doctor whose department was not explicitly in MongoDB masterDepts
    for (const [key, docList] of Object.entries(activeDocMap)) {
      const alreadyIncluded = activeDepts.some(d => d.name.toLowerCase().trim() === key);
      if (!alreadyIncluded) {
        const title = docList[0]?.specialization || key.toUpperCase();
        activeDepts.push({
          name: title,
          doctors: docList
        });
      }
    }

    const totalCount = activeDepts.length + inactiveDepts.length;

    const activeSummaryLines = activeDepts.map((d, i) => {
      const docDetails = d.doctors.map(doc => `${doc.name} (${doc.specialization}, Exp: ${doc.experience}, Fee: ${doc.fee}, Status: ${doc.status})`).join('; ');
      return `  ${i + 1}. ${d.name} [ACTIVE] - Assigned Doctors: ${docDetails}`;
    });

    const inactiveSummaryLines = inactiveDepts.map((d, i) => {
      return `  ${i + 1}. ${d.name} [INACTIVE / UNSTAFFED - Registered department, but currently no active doctor assigned]`;
    });

    return `\n\nLive Amar Raho Hospital Roster (Hybrid MongoDB Master + PostgreSQL Doctor DB):
TOTAL REGISTERED DEPARTMENTS: ${totalCount}
- ACTIVE DEPARTMENTS (${activeDepts.length}): ${activeDepts.map(d => d.name).join(', ')}
- INACTIVE / UNSTAFFED DEPARTMENTS (${inactiveDepts.length}): ${inactiveDepts.map(d => d.name).join(', ')}

Active Departments Breakdown (Fully operational with assigned doctors taking appointments):
${activeSummaryLines.join('\n')}

Inactive Departments Breakdown (Registered hospital facilities, but currently unstaffed / no doctors available for booking):
${inactiveSummaryLines.join('\n')}

All Registered Physicians in Database:
${doctors.map((doc, idx) => {
  const p = doc.doctorProfile || {};
  return `  ${idx + 1}. ${doc.name} | Dept: ${p.department || 'General'} | Specialization: ${p.specialization || 'Physician'} | Fee: Rs. ${p.fees || 500} | Status: ${p.isPresenceActive ? 'Available' : 'On Leave'}`;
}).join('\n')}
`;
  }
  return '';
}

/**
 * Runs the hospital ReAct agent loop for a user query.
 * 
 * @param {Object} params
 * @param {string} params.message - The patient message.
 * @param {Array|string} [params.history] - Multi-turn conversation history.
 * @param {Object} [params.userContext] - Optional logged-in patient details (name, etc.).
 * @returns {Promise<{ reply: string, toolUsed: string|null, toolData: any }>}
 */
async function runHospitalAgent({ message, history = [], userContext = null }) {
  if (!message || typeof message !== 'string') {
    throw new Error('Valid message text is required.');
  }

  // 1. Fast Emergency Guardrail Check
  const isEmergency = containsEmergencySymptoms(message);

  // 2. Fast Out-of-Scope Domain Restriction Check
  if (isObviousNonMedicalQuery(message)) {
    return {
      reply: OUT_OF_SCOPE_REFUSAL_MESSAGE,
      toolUsed: null,
      toolData: null,
    };
  }

  // 3. Dynamically inject live database AI settings & live roster (never stale!)
  const aiSettings = await getAiSettingsContext();
  const baseInstruction = buildHospitalSystemInstruction(aiSettings);
  const liveRosterText = await getLiveHospitalRosterContext();
  let enhancedInstruction = baseInstruction + liveRosterText;

  // 3a. Inject dynamic Date & Time context
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayIso = `${year}-${month}-${day}`;
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = daysOfWeek[now.getDay()];

  // Calculate tomorrow's date
  const tomorrowObj = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowIso = `${tomorrowObj.getFullYear()}-${String(tomorrowObj.getMonth() + 1).padStart(2, '0')}-${String(tomorrowObj.getDate()).padStart(2, '0')}`;

  enhancedInstruction += `\n\nDYNAMIC DATE & TIME CONTEXT:
- Today's Date: ${todayIso} (${dayName})
- Tomorrow's Date: ${tomorrowIso}
- Relative Date Rule: When the patient says "today", use ${todayIso}. When the patient says "tomorrow", use ${tomorrowIso}. Always pass appointment dates as YYYY-MM-DD.`;

  if (userContext && (userContext.id || userContext._id)) {
    enhancedInstruction += `\n\nAUTHENTICATED PATIENT DETAILS:
- Name: ${userContext.name || 'Valued Patient'}
- Email: ${userContext.email || 'N/A'}
- Patient ID: ${userContext.id || userContext._id}
- Status: Authenticated / Logged In (Authorized for AI appointment booking).`;
  } else {
    enhancedInstruction += `\n\nAUTHENTICATED PATIENT DETAILS:
- Status: Guest / Unauthenticated (Not Logged In).
- Notice: If the user asks to book an appointment, inform them they must log in to their account to finalize the booking.`;
  }

  // 3b. Dynamically inject matching hospital policy chunks from DB (Hybrid PostgreSQL & MongoDB RAG)
  try {
    const policyChunks = await retrieveRelevantContext(message, 5);
    if (policyChunks && policyChunks.length > 0) {
      const formattedPolicy = policyChunks
        .map(c => `[Official Document: "${c.title}" (${c.category}) | Source: ${c.source}]\n${c.content}`)
        .join('\n\n');
      enhancedInstruction += `\n\nOFFICIAL HOSPITAL POLICY KNOWLEDGE (Retrieved dynamically from PostgreSQL & MongoDB):\n${formattedPolicy}\n\nStrict Rule: Answer questions regarding hospital policies, insurance, visiting hours, admission, or billing strictly based on the official policy text above. Do not invent contradictory terms.`;
    }
  } catch (ragErr) {
    console.warn('RAG retrieval warning in hospitalAgent:', ragErr.message);
  }

  const formattedHistory = normalizeHistory(history);

  // Check if patient is responding affirmatively to a previous confirmation prompt
  if (formattedHistory.length > 0) {
    const lastTurn = formattedHistory[formattedHistory.length - 1];
    if (lastTurn.role === 'model') {
      const lastText = (lastTurn.parts && lastTurn.parts[0]?.text) || '';
      if (/shall i confirm|confirm the booking|shall i book/i.test(lastText)) {
        const cleanMsg = message.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '');
        const affirmativeWords = [
          'yes', 'y', 'yeah', 'yep', 'sure', 'ok', 'okay', 'please',
          'confirm', 'yes please', 'do it', 'go ahead', 'proceed', 'pls', 'yup', 'confirm it', 'confirm please'
        ];
        if (affirmativeWords.includes(cleanMsg) || /^yes\b/i.test(cleanMsg) || /\bconfirm\b/i.test(cleanMsg)) {
          enhancedInstruction += `\n\n[MANDATORY SYSTEM DIRECTIVE: The patient has confirmed the appointment booking with their message: "${message}". You MUST immediately call the 'bookDoctorAppointment' tool using the doctor name, appointmentDate, and appointmentTime proposed in the previous turn. DO NOT call getDoctorAvailability and DO NOT ask for confirmation again!]`;
        }
      }
    }
  }

  // 4. Initialize Gemini model with tools and system instruction
  const model = getGenerativeModel({
    modelName: MODELS.DEFAULT,
    systemInstruction: enhancedInstruction,
    tools: HOSPITAL_TOOLS,
    generationConfig: {
      temperature: isEmergency ? 0.1 : 0.3,
      maxOutputTokens: 500,
    },
  });

  const chat = model.startChat({ history: formattedHistory });

  // 3. Send message to model to trigger autonomous reasoning & tool choice
  const chatResult = await chat.sendMessage(message);
  const response = chatResult.response;

  // 4. Check for function call
  let functionCalls = null;
  try {
    functionCalls = response.functionCalls();
  } catch (err) {
    // If no function call, response.functionCalls() might be empty or throw in older versions
    functionCalls = null;
  }

  if (functionCalls && functionCalls.length > 0) {
    const call = functionCalls[0];
    const toolName = call.name;
    const toolArgs = call.args || {};

    // Execute the authorized hospital tool with userContext
    const toolData = await executeTool(toolName, toolArgs, { userContext });

    // 5. Grounded synthesis step: Pass live verified tool data to synthesize friendly reply
    const synthesisModel = getGenerativeModel({
      modelName: MODELS.DEFAULT,
      systemInstruction: enhancedInstruction,
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 500,
      },
    });

    const synthesisPrompt = buildGroundedSynthesisPrompt({
      userPrompt: message,
      toolName,
      toolResult: toolData,
    });

    let finalReply = '';
    try {
      const synthResult = await synthesisModel.generateContent(synthesisPrompt);
      finalReply = synthResult.response.text();
    } catch (synthErr) {
      console.warn('Synthesis generation warning in hospitalAgent:', synthErr.message);
      if (toolName === 'bookDoctorAppointment') {
        if (toolData.bookingSuccess) {
          finalReply = `Your appointment has been successfully booked with ${toolData.doctorName} for ${toolData.appointmentDate} at ${toolData.appointmentTime}. Appointment ID: ${toolData.appointmentId}. ${toolData.emailSent ? "I've also sent the confirmation details to your registered email." : "However, I couldn't send the confirmation email right now. You can still view your appointment from your dashboard."}`;
        } else {
          finalReply = toolData.error || "I couldn't complete the appointment booking right now. Please try again or contact the hospital reception.";
        }
      } else if (toolName === 'getDoctorAvailability') {
        if (toolData.isAvailable && toolData.suggestedConfirmation) {
          finalReply = toolData.suggestedConfirmation;
        } else if (!toolData.isAvailable && toolData.availableAlternatives) {
          finalReply = `${toolData.message || 'The requested doctor is not available at that time.'} Available slots are ${toolData.availableAlternatives.join(' and ')}. Which one would you prefer?`;
        } else {
          finalReply = toolData.error || "Please let me know your preferred date and time to check doctor availability.";
        }
      } else {
        finalReply = typeof toolData === 'string' ? toolData : JSON.stringify(toolData);
      }
    }

    return {
      reply: finalReply.trim(),
      toolUsed: toolName,
      toolData,
    };
  }

  // 6. Direct response when no tool is required
  let directReply = '';
  try {
    directReply = response.text();
  } catch (err) {
    directReply = "Please contact our Amar Raho Hospital helpline directly at +91 98765-AMAR-1.";
  }

  return {
    reply: directReply.trim(),
    toolUsed: null,
    toolData: null,
  };
}

module.exports = {
  runHospitalAgent,
  normalizeHistory,
};
