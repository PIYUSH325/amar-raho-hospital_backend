const sendEmail = require('../utils/sendEmail');

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
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #ddd; border-radius: 8px;">
        <h3 style="color: #0d6efd; margin-top: 0;">Appointment Request Received 📅</h3>
        <p>Dear <b>${appointment.name}</b>,</p>
        <p>We have received your appointment request for <b>Dr. ${appointment.doctor}</b>.</p>
        <p><b>Date:</b> ${appointment.date}<br><b>Time:</b> ${appointment.time}</p>
        <p>Your booking is currently pending review. We will notify you once the status is updated.</p>
      </div>
    `;
    await sendEmail({
      email: appointment.email,
      subject: 'Appointment Booking Request Received 📅',
      html
    });
  } catch (err) {
    console.error('Failed to send appointment request email:', err.message);
  }
};

// 4. Appointment Status Update Email
exports.sendAppointmentStatusEmail = async (appointment, status) => {
  try {
    const isConfirmed = status === 'Confirmed';
    const statusColor = isConfirmed ? '#198754' : '#dc3545';
    
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #ddd; border-radius: 8px;">
        <h3 style="color: ${statusColor}; margin-top: 0;">Appointment Status Update</h3>
        <p>Dear <b>${appointment.name}</b>,</p>
        <p>Your appointment with <b>Dr. ${appointment.doctor}</b> has been updated to:</p>
        <h2 style="color: ${statusColor}; margin: 20px 0;">${status}</h2>
        <p><b>Date:</b> ${appointment.date}<br><b>Time:</b> ${appointment.time}</p>
        <p>Log in to your hospital dashboard to view details.</p>
      </div>
    `;
    await sendEmail({
      email: appointment.email,
      subject: `Appointment Status Updated: ${status} 📅`,
      html
    });
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
