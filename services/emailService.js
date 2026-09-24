const sendEmail = require('../utils/sendEmail');

// Helper to parse date ("2026-09-22") and time ("10:00 AM" or "10:00") into a JS Date object
const parseDateTime = (dateStr, timeStr) => {
  try {
    let cleanTime = (timeStr || '10:00 AM').trim();
    let hours = 10;
    let minutes = 0;

    if (cleanTime.includes(':')) {
      const parts = cleanTime.split(' ');
      const timeParts = parts[0].split(':').map(Number);
      hours = timeParts[0] || 10;
      minutes = timeParts[1] || 0;

      if (parts[1]) {
        const modifier = parts[1].toUpperCase();
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
      }
    }

    return new Date(`${dateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00+05:30`);
  } catch (err) {
    return new Date();
  }
};

// Helper to format Date objects into standard iCalendar YYYYMMDDTHHmmssZ format
const formatIcsDate = (date) => {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

// Generates an iCalendar (.ics) invite structure for appointment confirmation
const generateIcsString = ({ appointmentId, patientName, doctorName, date, time, problem }) => {
  const start = parseDateTime(date, time);
  const end = new Date(start.getTime() + 30 * 60000); // 30 minutes consultation

  const stamp = formatIcsDate(new Date());
  const dtstart = formatIcsDate(start);
  const dtend = formatIcsDate(end);

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Amar Raho Multi-Speciality Hospital//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:appointment_${appointmentId || Date.now()}@amarrahohospital.com`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:Medical Consultation: Dr. ${doctorName}`,
    `DESCRIPTION:Confirmed consultation for ${patientName}. ID: ${appointmentId}. Reason: ${problem || 'General Checkup'}. Location: Amar Raho Multi-Speciality Hospital.`,
    'LOCATION:Amar Raho Multi-Speciality Hospital, Plot 404 Yamaraj Bypass Road, Near Swarg Lok U-Turn, Narak-Pur',
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    `DESCRIPTION:Reminder: Consultation with Dr. ${doctorName} starts in 15 minutes.`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
};

/**
 * Sends a formal appointment confirmation email to the patient.
 *
 * @param {Object} details
 * @param {string} details.patientName - Patient full name
 * @param {string} details.patientEmail - Registered patient email address
 * @param {string} details.doctorName - Doctor's full name
 * @param {string} [details.specialization] - Doctor's specialization or department
 * @param {string} details.appointmentDate - Appointment date (YYYY-MM-DD or formatted)
 * @param {string} details.appointmentTime - Appointment time (e.g. 10:00 AM)
 * @param {string} details.appointmentId - Generated human-readable appointment ID (e.g. ARH-10245)
 * @param {string} [details.reason] - Chief complaint or consultation reason
 * @param {string} [details.notes] - Additional notes or clinical instructions
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
const sendAppointmentConfirmation = async ({
  patientName,
  patientEmail,
  doctorName,
  specialization = 'General Physician',
  appointmentDate,
  appointmentTime,
  appointmentId,
  reason = 'General Consultation',
  notes = ''
}) => {
  if (!patientEmail) {
    throw new Error('Patient email is missing; cannot send appointment confirmation.');
  }

  const hospitalName = 'Amar Raho Multi-Speciality Hospital';
  const hospitalAddress = 'Plot 404, Yamaraj Bypass Road, Near Swarg Lok U-Turn, Narak-Pur';
  const hospitalPhone = '+91 98765-AMAR-1';
  const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard`;

  const cleanDocName = doctorName.startsWith('Dr.') ? doctorName : `Dr. ${doctorName}`;

  // Build calendar invite
  const icsContent = generateIcsString({
    appointmentId,
    patientName,
    doctorName: cleanDocName,
    date: appointmentDate,
    time: appointmentTime,
    problem: reason
  });

  const emailSubject = 'Appointment Confirmation - Amar Raho Multi-Speciality Hospital';

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #2d3748; max-width: 620px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; border-bottom: 2px solid #0d6efd; padding-bottom: 16px; margin-bottom: 20px;">
        <h2 style="color: #0d6efd; margin: 0; font-size: 24px;">${hospitalName}</h2>
        <p style="color: #718096; margin: 4px 0 0 0; font-size: 13px;">Excellence in Compassionate Healthcare</p>
      </div>

      <p style="font-size: 16px;">Dear <strong>${patientName}</strong>,</p>
      
      <p style="font-size: 15px; color: #198754; font-weight: bold;">
        ✅ Your appointment has been successfully booked.
      </p>

      <div style="background-color: #f8fafc; border-left: 4px solid #0d6efd; border-radius: 6px; padding: 18px 20px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; line-height: 1.8;">
          <tr>
            <td style="width: 38%; color: #64748b; font-weight: 600;">Doctor:</td>
            <td style="color: #0f172a; font-weight: bold;">${cleanDocName}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600;">Specialization:</td>
            <td style="color: #0f172a;">${specialization}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600;">Appointment Date:</td>
            <td style="color: #0f172a; font-weight: 600;">${appointmentDate}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600;">Appointment Time:</td>
            <td style="color: #0f172a; font-weight: 600;">${appointmentTime}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600;">Appointment ID:</td>
            <td style="color: #0d6efd; font-family: monospace; font-size: 15px; font-weight: bold;">${appointmentId}</td>
          </tr>
          ${reason ? `
          <tr>
            <td style="color: #64748b; font-weight: 600;">Reason:</td>
            <td style="color: #0f172a;">${reason}</td>
          </tr>` : ''}
          ${notes ? `
          <tr>
            <td style="color: #64748b; font-weight: 600;">Notes:</td>
            <td style="color: #0f172a;">${notes}</td>
          </tr>` : ''}
        </table>
      </div>

      <div style="margin: 22px 0;">
        <h4 style="color: #1e293b; margin: 0 0 8px 0; font-size: 14px;">🏥 Hospital Location & Contact</h4>
        <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5;">
          <strong>${hospitalName}</strong><br/>
          ${hospitalAddress}<br/>
          Phone: <strong>${hospitalPhone}</strong>
        </p>
      </div>

      <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; padding: 14px; margin: 20px 0;">
        <h4 style="color: #b45309; margin: 0 0 6px 0; font-size: 13px;">📋 Important Patient Instructions:</h4>
        <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #78350f; line-height: 1.6;">
          <li>Please arrive at the clinic <strong>15 minutes prior</strong> to your scheduled appointment.</li>
          <li>Bring any previous lab reports, medical records, or ongoing prescriptions.</li>
          <li>For online video consultations, enter your consultation room via your patient dashboard at appointment time.</li>
        </ul>
      </div>

      <div style="text-align: center; margin: 25px 0;">
        <a href="${dashboardUrl}" style="background-color: #0d6efd; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">
          View Appointment in Dashboard
        </a>
      </div>

      <p style="font-size: 14px; color: #334155; margin-top: 24px;">
        Thank you for choosing ${hospitalName}.
      </p>

      <p style="font-size: 14px; color: #64748b; margin: 0;">
        Regards,<br/>
        <strong>${hospitalName} Team</strong>
      </p>
    </div>
  `;

  const text = `
Dear ${patientName},

Your appointment has been successfully booked.

Doctor: ${cleanDocName}
Specialization: ${specialization}
Date: ${appointmentDate}
Time: ${appointmentTime}
Appointment ID: ${appointmentId}

Hospital:
${hospitalName}
Address: ${hospitalAddress}
Phone: ${hospitalPhone}

Instructions:
- Please arrive 15 minutes before your scheduled appointment time.
- Please carry your past medical records and lab reports.
- You can manage or view your appointment online at: ${dashboardUrl}

Thank you for choosing ${hospitalName}.

Regards,
${hospitalName}
  `.trim();

  return await sendEmail({
    email: patientEmail,
    subject: emailSubject,
    html,
    text,
    attachments: [
      {
        name: `appointment_${appointmentId}.ics`,
        content: icsContent
      }
    ]
  });
};

module.exports = {
  sendAppointmentConfirmation,
  generateIcsString
};
