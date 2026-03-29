/**
 * email-service.js
 * Handles sending email notifications for draw completions
 */

const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const store = require("./store");

// Initialize email transporter
let transporter = null;

function initializeTransporter() {
  if (transporter) return transporter;

  const emailProvider = process.env.EMAIL_PROVIDER || "smtp";

  if (emailProvider === "sendgrid") {
    // SendGrid configuration
    const sgMail = require("@sendgrid/mail");
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    transporter = sgMail;
  } else {
    // SMTP configuration (default)
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  return transporter;
}

/**
 * Send winner notification email
 */
async function sendWinnerNotification(email, poolType, prizeAmount) {
  if (!email) {
    console.log(`[email-service] No email provided for winner notification`);
    return { success: false, error: "No email address" };
  }

  try {
    const subject = `Congratulations! You won ${prizeAmount} XLM in the ${poolType} LuckyStake draw!`;
    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; }
            .content { padding: 20px; background: #f9f9f9; border-radius: 8px; margin-top: 20px; }
            .amount { font-size: 32px; font-weight: bold; color: #667eea; text-align: center; margin: 20px 0; }
            .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
            .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 4px; margin: 20px auto; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 You Won!</h1>
            </div>
            <div class="content">
              <p>Dear LuckyStake member,</p>
              <p>Congratulations! You have been selected as the winner of the ${poolType} lottery draw!</p>
              <div class="amount">${prizeAmount} XLM</div>
              <p>Your prize has been credited to your wallet. You can claim your prize through the LuckyStake dashboard.</p>
              <p>Thank you for participating in LuckyStake. Better luck in the next draw!</p>
              <p>
                <a href="${process.env.APP_URL || 'https://luckystake.app'}/app" class="button">View Your Prize</a>
              </p>
            </div>
            <div class="footer">
              <p>LuckyStake - Decentralized Savings with a chance to win</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return await sendEmail(email, subject, html);
  } catch (error) {
    console.error(`[email-service] Error sending winner notification:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send draw completion notification to participants
 */
async function sendDrawCompletionNotification(email, poolType, winner, prizeAmount, participants) {
  if (!email) {
    console.log(`[email-service] No email provided for draw completion notification`);
    return { success: false, error: "No email address" };
  }

  try {
    const subject = `${poolType.charAt(0).toUpperCase() + poolType.slice(1)} LuckyStake Draw Completed`;
    const winnerDisplay = winner ? `${winner.slice(0, 6)}...${winner.slice(-4)}` : "Unknown";
    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; }
            .content { padding: 20px; background: #f9f9f9; border-radius: 8px; margin-top: 20px; }
            .winner-box { background: white; border-left: 4px solid #667eea; padding: 15px; margin: 15px 0; }
            .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 15px 0; }
            .stat-item { text-align: center; padding: 10px; background: white; border-radius: 4px; }
            .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Draw Results</h2>
            </div>
            <div class="content">
              <p>Dear LuckyStake member,</p>
              <p>The ${poolType} lottery draw has been completed!</p>
              
              <div class="winner-box">
                <h3>Draw Information</h3>
                <p><strong>Pool Type:</strong> ${poolType}</p>
                <p><strong>Winner:</strong> ${winnerDisplay}</p>
                <p><strong>Prize Amount:</strong> ${prizeAmount} XLM</p>
              </div>

              <div class="stats">
                <div class="stat-item">
                  <div>Total Participants</div>
                  <div style="font-size: 24px; font-weight: bold; color: #667eea;">${participants}</div>
                </div>
                <div class="stat-item">
                  <div>Your Status</div>
                  <div style="font-size: 24px; font-weight: bold; color: #667eea;">Participant</div>
                </div>
              </div>

              <p>Your principal amount has been secured and is available to claim through the LuckyStake dashboard.</p>
              <p>Better luck in the next draw!</p>
            </div>
            <div class="footer">
              <p>LuckyStake - Decentralized Savings with a chance to win</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return await sendEmail(email, subject, html);
  } catch (error) {
    console.error(`[email-service] Error sending draw completion notification:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Generic email sending function
 */
async function sendEmail(email, subject, html) {
  try {
    if (!process.env.SMTP_USER && !process.env.SENDGRID_API_KEY) {
      console.log(`[email-service] Email service not configured, skipping send to ${email}`);
      return { success: true, skipped: true };
    }

    const transporter = initializeTransporter();
    const from = process.env.SENDER_EMAIL || process.env.SMTP_USER || "noreply@luckystake.app";

    const mailOptions = {
      from,
      to: email,
      subject,
      html,
      replyTo: "support@luckystake.app",
    };

    if (process.env.EMAIL_PROVIDER === "sendgrid") {
      await transporter.send({
        to: email,
        from,
        subject,
        html,
        replyTo: "support@luckystake.app",
      });
    } else {
      await transporter.sendMail(mailOptions);
    }

    console.log(`[email-service] Email sent successfully to ${email}`);
    return { success: true, email };
  } catch (error) {
    console.error(`[email-service] Error sending email:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Log notification in store
 */
function logNotification(userId, poolType, email, subject, type, sentAt, status, error = null) {
  const notificationId = uuidv4();
  const notification = {
    id: notificationId,
    userId,
    poolType,
    email,
    subject,
    type, // "winner" or "participant"
    drawnAt: new Date().toISOString(),
    sentAt,
    status, // "sent" or "failed"
    error: error ? error.substring(0, 200) : null,
  };
  store.notifications.set(notificationId, notification);
  store.persist();
  return notificationId;
}

module.exports = {
  sendWinnerNotification,
  sendDrawCompletionNotification,
  sendEmail,
  logNotification,
};
