/**
 * Tool Registry Layer
 * Registers Gemini function declarations and dispatches calls to verified hospital tool handlers.
 */
const { SchemaType } = require('@google/generative-ai');
const { getDoctorAvailability, bookDoctorAppointment, listAllDoctors } = require('./doctorTools');
const { getDepartmentServices, getHospitalDepartments } = require('./departmentTools');
const { getEmergencyProtocol } = require('./emergencyTools');
const { getHospitalPolicy } = require('./policyTools');

const functionDeclarations = [
  {
    name: 'getHospitalDepartments',
    description: 'Retrieves the complete, live list of all registered clinical departments (both active staffed departments and inactive/unstaffed departments) from the hospital database.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: 'listAllDoctors',
    description: 'Retrieves all active doctors, their departments, fees, experience, and consultation hours from the hospital database.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: 'getDoctorAvailability',
    description: 'Fetches real-time clinic schedule, available appointment slots, consultation fee, and slot conflict checks for a doctor, date, or department.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        doctorName: {
          type: SchemaType.STRING,
          description: "Optional doctor name to look up (e.g. 'Dr. Arjun Sharma' or 'Dr. Sharma')",
        },
        department: {
          type: SchemaType.STRING,
          description: "Optional hospital department (e.g. Cardiology, Neurology, Orthopedics, Pediatrics)",
        },
        date: {
          type: SchemaType.STRING,
          description: "Optional requested date in YYYY-MM-DD format (e.g. '2026-09-22')",
        },
        time: {
          type: SchemaType.STRING,
          description: "Optional requested time slot (e.g. '10:00 AM' or '10:00')",
        },
      },
    },
  },
  {
    name: 'bookDoctorAppointment',
    description: 'Creates and confirms an official doctor appointment for the authenticated patient in the hospital database and triggers the email confirmation notification. Use this when the patient confirms booking with a specific doctor, date, and time.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        doctorId: {
          type: SchemaType.STRING,
          description: "Optional database ID of the doctor",
        },
        doctorName: {
          type: SchemaType.STRING,
          description: "The name of the doctor (e.g. 'Dr. Arjun Sharma' or 'Dr. Sharma')",
        },
        department: {
          type: SchemaType.STRING,
          description: "Optional department or clinical specialty",
        },
        appointmentDate: {
          type: SchemaType.STRING,
          description: "The confirmed appointment date in YYYY-MM-DD format (e.g. '2026-09-22')",
        },
        appointmentTime: {
          type: SchemaType.STRING,
          description: "The confirmed appointment time (e.g. '10:00 AM' or '10:00')",
        },
        reason: {
          type: SchemaType.STRING,
          description: "Chief complaint or symptoms described by patient",
        },
        notes: {
          type: SchemaType.STRING,
          description: "Any optional additional notes",
        },
      },
      required: ['appointmentDate', 'appointmentTime'],
    },
  },
  {
    name: 'getDepartmentServices',
    description: 'Retrieves clinical diagnostic facilities, registered physicians, equipment, and walk-in policies for a specific department.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        department: {
          type: SchemaType.STRING,
          description: "The name of the clinical department (e.g. Cardiology, Neurology, Orthopedics, Gynecology & Obstetrics, Ophthalmology)",
        },
      },
      required: ['department'],
    },
  },
  {
    name: 'getEmergencyProtocol',
    description: 'Retrieves emergency department hotline, ambulance dispatch number, and trauma gate instructions.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: 'getHospitalPolicy',
    description: 'Searches official hospital policies, insurance guidelines, ICU visiting hours, and billing rules uploaded by hospital administration in the live database.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        topic: {
          type: SchemaType.STRING,
          description: "Policy topic or keywords to search (e.g. insurance, visiting hours, discharge, refund, cashless, visitor pass)",
        },
      },
      required: ['topic'],
    },
  },
];

const HOSPITAL_TOOLS = [{ functionDeclarations }];

const TOOL_DISPATCHER = {
  getHospitalDepartments,
  listAllDoctors,
  getDoctorAvailability,
  bookDoctorAppointment,
  getDepartmentServices,
  getEmergencyProtocol,
  getHospitalPolicy,
};

async function executeTool(toolName, toolArgs = {}, context = {}) {
  const cleanName = toolName.replace(/^default_api:/, '').replace(/^tools:/, '');
  const handler = TOOL_DISPATCHER[cleanName];

  if (!handler) {
    return {
      error: `Tool '${toolName}' is not an authorized hospital tool.`,
      allowed_tools: Object.keys(TOOL_DISPATCHER),
    };
  }

  try {
    return await handler(toolArgs, context);
  } catch (err) {
    return {
      error: `Execution failure for tool '${cleanName}': ${err.message}`,
    };
  }
}

module.exports = {
  functionDeclarations,
  HOSPITAL_TOOLS,
  TOOL_DISPATCHER,
  executeTool,
};
