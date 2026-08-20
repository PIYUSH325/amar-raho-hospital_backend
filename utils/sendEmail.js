const nodemailer = require('nodemailer');
const dns = require('dns').promises;

const sendEmail = async (options) => {
  let smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  
  if (smtpHost === 'smtp.gmail.com') {
    try {
      const lookupResult = await dns.lookup(smtpHost, { family: 4 });
      smtpHost = lookupResult.address;
      console.log(`Resolved smtp.gmail.com to IPv4: ${smtpHost}`);
    } catch (dnsErr) {
      console.warn("DNS lookup failed, falling back to hostname:", dnsErr.message);
    }
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true' || (parseInt(process.env.SMTP_PORT, 10) || 587) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    family: 4, // Force IPv4
    tls: {
      rejectUnauthorized: false // Bypass SSL certificate name mismatch when using direct IPv4 IPs
    }
  });

  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME || 'Amar Raho Hospital'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
