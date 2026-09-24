/**
 * Structured Output & Intent Schemas Layer
 * Defines Gemini JSON schemas for structured extraction and deterministic intent classification.
 */
const { SchemaType } = require('@google/generative-ai');

const HospitalIntentSchema = {
  type: SchemaType.OBJECT,
  properties: {
    intent: {
      type: SchemaType.STRING,
      description: "The primary intention of the patient",
      enum: [
        "BOOK_APPOINTMENT",
        "CANCEL_APPOINTMENT",
        "DOCTOR_QUERY",
        "DEPARTMENT_INFO",
        "EMERGENCY",
        "LAB_REPORT",
        "GENERAL_INFO"
      ]
    },
    department: {
      type: SchemaType.STRING,
      description: "Hospital clinical department if mentioned in the query, else 'None'"
    },
    doctor_name: {
      type: SchemaType.STRING,
      description: "Doctor name if mentioned or relevant, else empty string"
    },
    preferred_date: {
      type: SchemaType.STRING,
      description: "Requested date or relative timing (e.g. tomorrow, 2026-09-08), or empty string"
    },
    symptoms: {
      type: SchemaType.ARRAY,
      description: "List of symptoms mentioned by the user",
      items: {
        type: SchemaType.STRING
      }
    },
    urgency: {
      type: SchemaType.STRING,
      description: "Triage urgency level of the request",
      enum: ["low", "medium", "high", "emergency"]
    },
    patient_reply: {
      type: SchemaType.STRING,
      description: "Clear, empathetic message explaining next steps or immediate guidance"
    }
  },
  required: ["intent", "urgency", "patient_reply"]
};

module.exports = {
  HospitalIntentSchema
};
