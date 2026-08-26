const sendEmail = require('../utils/sendEmail');

// Helper to parse date ("2026-08-25") and time ("10:30 AM") strings into a JS Date object
const parseDateTime = (dateStr, timeStr) => {
  const [time, modifier] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (modifier === 'PM' && hours < 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;
  
  return new Date(`${dateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00+05:30`);
};

// Helper to format Date objects into standard iCalendar YYYYMMDDTHHmmssZ format
const formatIcsDate = (date) => {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

// Generates the raw iCalendar invite structure (.ics file content)
const generateIcsString = (appointment) => {
  const start = parseDateTime(appointment.date, appointment.time);
  const end = new Date(start.getTime() + 30 * 60000); // 30-minute duration

  const stamp = formatIcsDate(new Date());
  const dtstart = formatIcsDate(start);
  const dtend = formatIcsDate(end);

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Amar Raho Hospital//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:appointment_${appointment._id}@amarrahohospital.com`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:Medical Consultation: Dr. ${appointment.doctor}`,
    `DESCRIPTION:Consultation appointment for ${appointment.name}. Reported issue: ${appointment.problem}. Join link is available on your dashboard.`,
    'LOCATION:Amar Raho Hospital (Online Portal)',
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    `DESCRIPTION:Reminder: Your consultation with Dr. ${appointment.doctor} starts in 15 minutes.`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
};


// 1. Welcome Onboarding Email
exports.sendWelcomeEmail = async (user) => {
  try {
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #0d6efd; margin-top: 0;">Welcome to Amar Raho Hospital, ${user.name}! 🎉</h2>
        <p>Your account has been registered successfully as a <b>${user.role}</b>.</p>
        <p>You can now log in to access your dashboard, consult doctors, manage appointments, and view lab records.</p>
        <p style="margin-top: 20px; font-size: 12px; color: #888;">If you did not create this account, please disregard this email.</p>
      </div>
    `;
    await sendEmail({
      email: user.email,
      subject: 'Welcome to Amar Raho Hospital! 🎉',
      html
    });
  } catch (err) {
    console.error('Failed to send welcome email:', err.message);
  }
};

// 2. Forgot Password Reset Email
exports.sendForgotPasswordEmail = async (user, resetUrl) => {
  try {
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #dc3545; margin-top: 0;">Password Reset Request</h2>
        <p>Hello ${user.name},</p>
        <p>You requested a password reset. Please click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #0d6efd; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all; color: #0d6efd;">${resetUrl}</p>
        <p style="font-size: 12px; color: #888; margin-top: 20px;">Note: This link is only valid for 10 minutes. If you did not request this, please ignore this email.</p>
      </div>
    `;
    await sendEmail({
      email: user.email,
      subject: 'Password Reset Request 🔐',
      html
    });
  } catch (err) {
    console.error('Failed to send forgot password email:', err.message);
  }
};

// 3. Appointment Booking Request Email
exports.sendAppointmentRequestEmail = async (appointment) => {
  try {
    const start = parseDateTime(appointment.date, appointment.time);
    const end = new Date(start.getTime() + 30 * 60000);
    const googleStart = formatIcsDate(start);
    const googleEnd = formatIcsDate(end);
    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Pending+Consultation+with+Dr.+${encodeURIComponent(appointment.doctor)}&dates=${googleStart}/${googleEnd}&details=Amar+Raho+Hospital+Consultation+appointment+for+${encodeURIComponent(appointment.name)}.+Reason:+${encodeURIComponent(appointment.problem)}&location=Online+Portal&sf=true&output=xml`;

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #ddd; border-radius: 8px;">
        <h3 style="color: #0d6efd; margin-top: 0;">Appointment Request Received 📅</h3>
        <p>Dear <b>${appointment.name}</b>,</p>
        <p>We have received your appointment request for <b>Dr. ${appointment.doctor}</b>.</p>
        <p><b>Date:</b> ${appointment.date}<br><b>Time:</b> ${appointment.time}</p>
        <p>Your booking is currently pending review. We will notify you once the status is updated.</p>
        
        <div style="margin: 25px 0; text-align: center;">
          <a href="${googleUrl}" target="_blank" style="background-color: #0d6efd; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">📅 Save Pending Event to Google Calendar</a>
        </div>
      </div>
    `;
    await sendEmail({
      email: appointment.email,
      subject: 'Appointment Booking Request Received 📅',
      html,
      attachments: [
        {
          name: 'pending_appointment.ics',
          content: generateIcsString(appointment)
        }
      ]
    });
  } catch (err) {
    console.error('Failed to send appointment request email:', err.message);
  }
};

// 4. Appointment Status Update Email
exports.sendAppointmentStatusEmail = async (appointment, status) => {
  try {
    const isConfirmed = status === 'Approved' || status === 'Scheduled';
    const statusColor = isConfirmed ? '#198754' : '#dc3545';
    
    // Google Calendar template URL configuration
    let googleUrl = '';
    if (isConfirmed) {
      const start = parseDateTime(appointment.date, appointment.time);
      const end = new Date(start.getTime() + 30 * 60000); // 30 minutes
      const googleStart = formatIcsDate(start);
      const googleEnd = formatIcsDate(end);
      googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Consultation+with+Dr.+${encodeURIComponent(appointment.doctor)}&dates=${googleStart}/${googleEnd}&details=Amar+Raho+Hospital+Consultation+appointment+for+${encodeURIComponent(appointment.name)}.+Reason:+${encodeURIComponent(appointment.problem)}&location=Online+Portal&sf=true&output=xml`;
    }
    
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #ddd; border-radius: 8px;">
        <h3 style="color: ${statusColor}; margin-top: 0;">Appointment Status Update</h3>
        <p>Dear <b>${appointment.name}</b>,</p>
        <p>Your appointment with <b>Dr. ${appointment.doctor}</b> has been updated to:</p>
        <h2 style="color: ${statusColor}; margin: 20px 0;">${status}</h2>
        <p><b>Date:</b> ${appointment.date}<br><b>Time:</b> ${appointment.time}</p>
        
        ${isConfirmed ? `
          <div style="margin: 25px 0; text-align: center;">
            <a href="${googleUrl}" target="_blank" style="background-color: #0d6efd; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">📅 Add to Google Calendar</a>
          </div>
          <p style="font-size: 13px; color: #666; text-align: center; margin-top: -10px;">Alternatively, double-click the <b>invite.ics</b> attachment at the bottom to add to Apple Calendar or Outlook.</p>
        ` : ''}
        
        <p>Log in to your hospital dashboard to view details and join the consultation when active.</p>
      </div>
    `;

    const mailOptions = {
      email: appointment.email,
      subject: `Appointment Status Updated: ${status} 📅`,
      html
    };

    if (isConfirmed) {
      mailOptions.attachments = [
        {
          name: 'invite.ics',
          content: generateIcsString(appointment)
        }
      ];
    }

    await sendEmail(mailOptions);
  } catch (err) {
    console.error('Failed to send appointment status update email:', err.message);
  }
};

// 5. AI Lab Report Analysis Email
exports.sendAiReportEmail = async (userEmail, patientName, title, analysis) => {
  try {
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #ddd; border-radius: 8px;">
        <h3 style="color: #0d6efd; margin-top: 0;">Your AI Lab Report Analysis is Ready 🧪</h3>
        <p>Dear ${patientName},</p>
        <p>Your uploaded lab report <b>"${title}"</b> has been successfully processed and analyzed by our clinical AI assistant.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;"/>
        <h4 style="color: #333;">🔍 AI Analysis Findings:</h4>
        <p><b>Likely Condition:</b> ${analysis.condition || 'N/A'}</p>
        <p><b>Abnormal Alerts:</b> ${analysis.alerts || 'N/A'}</p>
        <p><b>Suggested Remedies:</b> ${analysis.remedies || 'N/A'}</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;"/>
        <p>Please log in to your dashboard to consult with your doctor regarding these findings.</p>
      </div>
    `;
    await sendEmail({
      email: userEmail,
      subject: `AI Report Analysis Ready: ${title} 🧪`,
      html
    });
  } catch (err) {
    console.error('Failed to send AI report email:', err.message);
  }
};

// 6. Missed Health Checklist Alerts
exports.sendMissedTaskEmail = async (patientEmail, patientName, task) => {
  try {
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #dc3545; margin-top: 0;">⚠️ Health Alert: Missed Task</h2>
        <p>Dear ${patientName},</p>
        <p>You missed your scheduled recovery task: <b>"${task.task}"</b> which was due by <b>${task.targetTime}</b>.</p>
        <p>Please follow your diet and health checklist to maintain your recovery plan.</p>
      </div>
    `;
    await sendEmail({
      email: patientEmail,
      subject: `⚠️ Alert: Missed Task - ${task.task}`,
      html
    });
  } catch (err) {
    console.error('Failed to send missed task email:', err.message);
  }
};

// 7. Doctor Unavailability Alerts
exports.sendDoctorUnavailabilityAlerts = async (doctorId) => {
  try {
    const Appointment = require('../models/Appointment');
    const User = require('../models/User');

    // 1. Get doctor profile details
    const doctorObj = await User.findById(doctorId);
    const doctorName = doctorObj?.name || 'your doctor';

    // 2. Get today's local date bounds formatted as string: YYYY-MM-DD
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // 3. Find today's approved/scheduled appointments for this doctor
    const appointments = await Appointment.find({
      doctorRef: doctorId,
      status: { $in: ['Scheduled', 'Approved'] },
      date: todayStr
    });

    // 4. Loop and send email to each patient
    for (const appt of appointments) {
      const patientEmail = appt.email;
      const patientName = appt.name || 'Valued Patient';
      
      if (!patientEmail) continue;

      const emailSubject = `🚨 Appointment Update: Dr. ${doctorName} is unavailable today`;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; max-width: 600px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #dc3545; margin-top: 0;">Important Appointment Notice</h2>
          <p>Dear <strong>${patientName}</strong>,</p>
          <p>We are writing to inform you that <strong>Dr. ${doctorName}</strong> is temporarily unavailable for their sessions today.</p>
          <p>Since you have a scheduled appointment today at <strong>${appt.time}</strong>, we request you to contact the hospital reception immediately to reschedule your booking.</p>
          <div style="background-color: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <strong>Hospital Reschedule Support:</strong><br/>
            📧 Email Support: support@amar-raho-hospital.com
          </div>
          <p style="margin-top: 20px; font-size: 12px; color: #6c757d;">We apologize sincerely for any inconvenience this may cause you and appreciate your understanding.</p>
        </div>
      `;

      await sendEmail({
        email: patientEmail,
        subject: emailSubject,
        htmlContent: emailHtml
      });
    }
  } catch (err) {
    console.error('Failed to send doctor unavailability alerts:', err.message);
  }
};
