const axios = require('axios');
const nodemailer = require('nodemailer');

/**
 * Centralized Email Sending Utility
 * Supports Brevo HTTP API with automatic fallback to Nodemailer SMTP.
 * Never exposes credentials or secrets in logs.
 *
 * @param {Object} options
 * @param {string} options.email - Recipient email address
 * @param {string} options.subject - Email subject line
 * @param {string} options.html - HTML body content
 * @param {string} [options.text] - Plain text body fallback
 * @param {Array<{name: string, content: string|Buffer}>} [options.attachments] - Optional attachments
 * @returns {Promise<{success: boolean, messageId: string, provider: string}>}
 */
const sendEmail = async (options) => {
  if (!options.email) {
    throw new Error('Recipient email address is required.');
  }

  const senderName = (process.env.SMTP_FROM_NAME || 'Amar Raho Multi-Speciality Hospital').replace(/['"]+/g, '').trim();
  const senderEmail = (process.env.EMAIL_FROM || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'no-reply@amarrahohospital.com').replace(/['"]+/g, '').trim();

  let brevoError = null;

  // 1. Try Brevo HTTP API if API key exists
  let brevoApiKey = process.env.BREVO_API_KEY;
  if (brevoApiKey) {
    brevoApiKey = brevoApiKey.replace(/['"]+/g, '').trim();
  }

  if (brevoApiKey) {
    try {
      const data = {
        sender: {
          name: senderName,
          email: senderEmail
        },
        to: [{ email: options.email }],
        subject: options.subject,
        htmlContent: options.html
      };

      if (options.text) {
        data.textContent = options.text;
      }

      if (options.attachments && options.attachments.length > 0) {
        data.attachment = options.attachments.map(att => ({
          name: att.name,
          content: Buffer.isBuffer(att.content) 
            ? att.content.toString('base64') 
            : Buffer.from(att.content).toString('base64')
        }));
      }

      const response = await axios.post('https://api.brevo.com/v3/smtp/email', data, {
        headers: {
          'accept': 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json'
        },
        timeout: 10000
      });

      console.log('📨 [Email] Sent successfully via Brevo HTTP API! Message ID:', response.data?.messageId);
      return {
        success: true,
        messageId: response.data?.messageId || 'brevo-sent',
        provider: 'brevo'
      };
    } catch (err) {
      brevoError = err.response?.data?.message || err.message;
      console.warn('⚠️ [Email] Brevo API attempt failed:', brevoError, '- Trying SMTP fallback...');
    }
  }

  // 2. Fallback to Nodemailer SMTP
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const smtpPort = parseInt(process.env.SMTP_PORT, 10) || 587;
      const isSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: isSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass
        },
        family: 4, // Force IPv4 to prevent Windows/Node dual-stack DNS timeouts
        connectionTimeout: 10000,
        greetingTimeout: 10000
      });

      const mailOptions = {
        from: `"${senderName}" <${senderEmail}>`,
        to: options.email,
        subject: options.subject,
        html: options.html,
        text: options.text || undefined
      };

      if (options.attachments && options.attachments.length > 0) {
        mailOptions.attachments = options.attachments.map(att => ({
          filename: att.name,
          content: att.content
        }));
      }

      const info = await transporter.sendMail(mailOptions);
      console.log('📨 [Email] Sent successfully via SMTP! Message ID:', info.messageId);
      return {
        success: true,
        messageId: info.messageId,
        provider: 'smtp'
      };
    } catch (smtpErr) {
      console.error('❌ [Email] SMTP delivery failed:', smtpErr.message);
      throw new Error(`Email sending failed across both providers. Brevo: ${brevoError || 'N/A'}; SMTP: ${smtpErr.message}`);
    }
  }

  throw new Error(`Email sending failed: No valid email provider available. (Brevo error: ${brevoError || 'None configured'}; SMTP: Missing credentials)`);
};

module.exports = sendEmail;