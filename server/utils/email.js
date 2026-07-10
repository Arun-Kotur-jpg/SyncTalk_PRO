import nodemailer from 'nodemailer';

const createTransporter = () => {
  // If SMTP is not configured, we can still run but emails won't be sent properly
  // Alternatively, we could use Ethereal for testing, but let's assume they might use Gmail App Passwords
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 465,
    secure: process.env.SMTP_SECURE === 'true' || true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

export const sendEmail = async (to, subject, text, html) => {
  // Use Google Apps Script Webhook if configured (Bypasses Render's SMTP block)
  if (process.env.EMAIL_WEBHOOK_URL) {
    try {
      const response = await fetch(process.env.EMAIL_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, html: html || text })
      });
      if (response.ok) return true;
      throw new Error('Webhook failed');
    } catch (error) {
      console.error('Error sending email via webhook:', error);
      throw new Error('Failed to send email via webhook');
    }
  }

  // Fallback to standard SMTP if no webhook is provided
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('\n[WARNING] SMTP credentials missing in .env. Skipping email sending.');
    console.warn(`[MOCK EMAIL to ${to}]\nSubject: ${subject}\nText: ${text}\n`);
    return true; // Pretend it worked for dev
  }

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"SyncTalk" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    });
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
};

export const sendVerificationEmail = async (email, otp) => {
  const subject = 'Verify your SyncTalk Account';
  const text = `Your verification code is: ${otp}. It will expire in 10 minutes.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
      <h2 style="color: #4F46E5;">Welcome to SyncTalk!</h2>
      <p>Thank you for registering. Please use the following OTP to verify your account:</p>
      <div style="background-color: #F3F4F6; padding: 20px; border-radius: 10px; margin: 20px 0;">
        <h1 style="font-size: 32px; letter-spacing: 5px; margin: 0; color: #1F2937;">${otp}</h1>
      </div>
      <p style="color: #6B7280; font-size: 14px;">This code will expire in 10 minutes.</p>
      <p style="color: #6B7280; font-size: 14px;">If you did not request this, please ignore this email.</p>
    </div>
  `;
  return sendEmail(email, subject, text, html);
};

export const sendPasswordResetEmail = async (email, otp) => {
  const subject = 'Reset your SyncTalk Password';
  const text = `Your password reset code is: ${otp}. It will expire in 10 minutes.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
      <h2 style="color: #4F46E5;">Password Reset Request</h2>
      <p>We received a request to reset your password. Use the following OTP to proceed:</p>
      <div style="background-color: #F3F4F6; padding: 20px; border-radius: 10px; margin: 20px 0;">
        <h1 style="font-size: 32px; letter-spacing: 5px; margin: 0; color: #1F2937;">${otp}</h1>
      </div>
      <p style="color: #6B7280; font-size: 14px;">This code will expire in 10 minutes.</p>
      <p style="color: #6B7280; font-size: 14px;">If you did not request this, you can safely ignore this email.</p>
    </div>
  `;
  return sendEmail(email, subject, text, html);
};
