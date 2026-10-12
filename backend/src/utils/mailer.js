const nodemailer = require('nodemailer');

let transporter = null;

/**
 * Initialize or get the Nodemailer transporter.
 */
function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT, 10) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });
  } else {
    // In dev/test when credentials are not supplied, use stream/json mock transport
    console.warn('[Mailer] SMTP_USER or SMTP_PASS not set. Using test fallback transport.');
    transporter = nodemailer.createTransport({
      jsonTransport: true,
    });
  }

  return transporter;
}

/**
 * Reusable utility to send an email.
 * Never throws or crashes the calling process.
 * Supports both sendEmail(to, subject, html, text) and sendEmail({ to, subject, html, text }).
 *
 * @param {string|Object} toOrOptions
 * @param {string} [subject]
 * @param {string} [html]
 * @param {string} [text]
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendEmail(toOrOptions, subject, html, text) {
  let to, subj, bodyHtml, bodyText;

  if (typeof toOrOptions === 'object' && toOrOptions !== null) {
    to = toOrOptions.to;
    subj = toOrOptions.subject;
    bodyHtml = toOrOptions.html;
    bodyText = toOrOptions.text;
  } else {
    to = toOrOptions;
    subj = subject;
    bodyHtml = html;
    bodyText = text;
  }

  const from = process.env.EMAIL_FROM || '"BrightBuy" <no-reply@brightbuy.local>';

  try {
    const activeTransporter = getTransporter();
    const mailOptions = {
      from,
      to,
      subject: subj,
      html: bodyHtml,
      text: bodyText || (bodyHtml ? bodyHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : ''),
    };

    const info = await activeTransporter.sendMail(mailOptions);
    console.log(`[Mailer] Email sent successfully to ${to} (Subject: "${subj}") [ID: ${info.messageId || 'mock'}]`);
    return {
      success: true,
      messageId: info.messageId || 'mock-id',
      response: info.response,
    };
  } catch (error) {
    console.error(`[Mailer] Failed to send email to ${to} (Subject: "${subj}"):`, error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = {
  sendEmail,
  getTransporter,
};
