const axios = require('axios');

const sendEmail = async (options) => {
  let apiKey = process.env.BREVO_API_KEY;

  if (apiKey) {
    // Strip any accidental double/single quotes or spaces added by Railway
    apiKey = apiKey.replace(/['"]+/g, '').trim();
  }

  console.log(`[EMAIL DEBUG] API Key length: ${apiKey ? apiKey.length : 0}, startsWith: ${apiKey ? apiKey.substring(0, 15) : 'N/A'}, endsWith: ${apiKey ? apiKey.substring(apiKey.length - 5) : 'N/A'}`);

  if (!apiKey) {
    console.error("❌ BREVO_API_KEY is not defined in environment variables!");
    throw new Error("Email sending failed: API key missing");
  }

  // Define sender information
  const senderName = (process.env.SMTP_FROM_NAME || 'Amar Raho Hospital').replace(/['"]+/g, '').trim();
  let senderEmail = process.env.SMTP_FROM_EMAIL || 'piyushth090@gmail.com'; // Your verified Brevo sender email
  if (senderEmail) {
    senderEmail = senderEmail.replace(/['"]+/g, '').trim();
  }

  const data = {
    sender: {
      name: senderName,
      email: senderEmail
    },
    to: [
      {
        email: options.email
      }
    ],
    subject: options.subject,
    htmlContent: options.html
  };

  // If attachments are passed, map them to Brevo format (base64 encoded)
  if (options.attachments && options.attachments.length > 0) {
    data.attachment = options.attachments.map(att => ({
      name: att.name,
      content: Buffer.from(att.content).toString('base64')
    }));
  }

  try {
    const response = await axios.post('https://api.brevo.com/v3/smtp/email', data, {
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      }
    });

    console.log("📨 Email sent successfully via Brevo HTTP API! Message ID:", response.data.messageId);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error("❌ Failed to send email via Brevo HTTP API:", error.response.data);
      throw new Error(error.response.data.message || "Email API Request Failed");
    } else {
      console.error("❌ Failed to send email via Brevo HTTP API:", error.message);
      throw new Error(error.message);
    }
  }
};

module.exports = sendEmail;


// const nodemailer = require('nodemailer');

// const sendEmail = async (options) => {
//   const transporter = nodemailer.createTransport({
//     host: process.env.SMTP_HOST,
//     port: process.env.SMTP_PORT,
//     secure: false,
//     auth: {
//       user: process.env.SMTP_USER,
//       pass: process.env.SMTP_PASS
//     }
//   });

//   const mailOptions = {
//     from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
//     to: options.email,
//     subject: options.subject,
//     html: options.html
//   };

//   await transporter.sendMail(mailOptions);
// };

// module.exports = sendEmail;



// const nodemailer = require('nodemailer');
// const dns = require('dns');

// const sendEmail = async (options) => {
//   const hostname = process.env.SMTP_HOST || 'smtp.gmail.com';
  
//   let smtpHost = hostname;
//   try {
//     const addresses = await dns.promises.resolve4(hostname);
//     if (addresses && addresses.length > 0) {
//       smtpHost = addresses[0];
//       console.log(`Resolved ${hostname} to IPv4: ${smtpHost}`);
//     }
//   } catch (dnsErr) {
//     console.warn(`DNS lookup failed for ${hostname}, falling back to original hostname:`, dnsErr.message);
//   }

//   const transporter = nodemailer.createTransport({
//     host: smtpHost,
//     port: parseInt(process.env.SMTP_PORT, 10) || 587,
//     secure: process.env.SMTP_SECURE === 'true' || (parseInt(process.env.SMTP_PORT, 10) || 587) === 465,
//     auth: {
//       user: process.env.SMTP_USER,
//       pass: process.env.SMTP_PASS
//     },
//     family: 4 // Force IPv4
//   });

//   const mailOptions = {
//     from: `${process.env.SMTP_FROM_NAME || 'Amar Raho Hospital'} <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
//     to: options.email,
//     subject: options.subject,
//     html: options.html
//   };

//   const info = await transporter.sendMail(mailOptions);
//   console.log('Message sent: %s', info.messageId);
//   return info;
// };

// module.exports = sendEmail;