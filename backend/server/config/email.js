const nodemailer = require('nodemailer');

const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpService = process.env.SMTP_SERVICE;
const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpSecure = String(process.env.SMTP_SECURE || 'false') === 'true';

if (!smtpUser || !smtpPass) {
  module.exports = null;
} else if (smtpHost) {
  module.exports = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
} else {
  module.exports = nodemailer.createTransport({
    service: smtpService || 'gmail',
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}
