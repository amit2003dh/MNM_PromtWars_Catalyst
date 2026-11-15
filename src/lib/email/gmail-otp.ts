import nodemailer, { type Transporter } from 'nodemailer';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getOtpVerificationsCollection } from '@/lib/db';

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_ATTEMPTS = 5;

let gmailTransporter: Transporter | null = null;

export function isGmailConfigured(): boolean {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  return Boolean(user && pass && user.trim() !== '' && pass.trim() !== '' && !user.includes('your-gmail'));
}

export function getGmailTransporter(): Transporter | null {
  if (!isGmailConfigured()) return null;

  if (!gmailTransporter) {
    gmailTransporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  return gmailTransporter;
}

export function generateSecureOTP(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Sends a 6-digit OTP to the user's Gmail address.
 * Enforces 60s cooldown and hashes OTP before MongoDB persistence.
 */
export async function sendGmailOTP(email: string, ipAddress?: string): Promise<{
  success: boolean;
  message: string;
  cooldownRemaining?: number;
}> {
  const normalizedEmail = email.toLowerCase().trim();
  const otpsCol = await getOtpVerificationsCollection();

  // 1. Check cooldown from last sent OTP
  const lastOtp = await otpsCol.findOne(
    { email: normalizedEmail },
    { sort: { createdAt: -1 } }
  );

  if (lastOtp && lastOtp.lastSentAt) {
    const elapsed = Date.now() - new Date(lastOtp.lastSentAt).getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      return {
        success: false,
        message: `Please wait ${waitSeconds} seconds before requesting a new verification code.`,
        cooldownRemaining: waitSeconds,
      };
    }
  }

  // 2. Generate 6-digit OTP & Hash
  const rawOtp = generateSecureOTP();
  const otpHash = await bcrypt.hash(rawOtp, 10);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MS);

  // 3. Persist hashed OTP record in MongoDB
  await otpsCol.insertOne({
    _id: `otp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    email: normalizedEmail,
    otpHash,
    expiresAt: expiresAt.toISOString(),
    attempts: 0,
    lastSentAt: now.toISOString(),
    createdAt: now.toISOString(),
  });

  // 4. Send via Nodemailer + Gmail SMTP
  const transporter = getGmailTransporter();
  if (transporter) {
    try {
      const mailOptions = {
        from: `"CareNest AI" <${process.env.GMAIL_USER}>`,
        to: normalizedEmail,
        subject: `Your CareNest AI Verification Code: ${rawOtp}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #FAF9F6; border-radius: 16px; border: 1px solid #E2E8F0;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #0F172A; font-size: 24px; font-weight: 700; margin: 0;">CareNest AI</h1>
              <p style="color: #0D9488; font-size: 14px; font-weight: 600; margin-top: 4px;">Intelligent Elderly Care & Medication Management</p>
            </div>
            <div style="background: #FFFFFF; padding: 24px; border-radius: 12px; border: 1px solid #E2E8F0; text-align: center;">
              <p style="color: #334155; font-size: 15px; margin: 0 0 16px 0;">Use the following 6-digit one-time password (OTP) to securely sign in to your family care ecosystem:</p>
              <div style="display: inline-block; padding: 14px 28px; background: #F0FDF4; border: 2px dashed #0D9488; border-radius: 8px; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0F766E;">
                ${rawOtp}
              </div>
              <p style="color: #64748B; font-size: 13px; margin: 16px 0 0 0;">This code is valid for <strong>5 minutes</strong>. Do not share this code with anyone.</p>
            </div>
            <div style="text-align: center; margin-top: 24px;">
              <p style="color: #94A3B8; font-size: 12px; margin: 0;">If you did not request this login code, you can safely ignore this email.</p>
            </div>
          </div>
        `,
        text: `Your CareNest AI verification code is: ${rawOtp}\n\nThis code is valid for 5 minutes. Do not share it with anyone.`,
      };

      await transporter.sendMail(mailOptions);
      console.log(`[CareNest Gmail OTP] Dispatched verification code to ${normalizedEmail} via Gmail SMTP.`);
      return { success: true, message: 'Verification code sent to your Gmail inbox.' };
    } catch (err: any) {
      console.error('[CareNest Gmail OTP] Gmail SMTP error:', err.message);
      // Fallback logging in development or network degradation
      console.log(`[CareNest Gmail OTP Fallback] Verification code for ${normalizedEmail}: ${rawOtp}`);
      return {
        success: true,
        message: 'Verification code generated. (Check Gmail or server logs if SMTP is offline)',
      };
    }
  } else {
    // Graceful offline simulation when GMAIL_USER/GMAIL_APP_PASSWORD are not configured
    console.warn(`[CareNest Gmail OTP Notice] GMAIL_USER or GMAIL_APP_PASSWORD not set in environment.`);
    console.log(`[CareNest Gmail OTP Simulation] 🔑 Generated OTP for ${normalizedEmail}: >>> ${rawOtp} <<< (Expires in 5 minutes)`);
    return {
      success: true,
      message: 'Verification code sent. (Development simulation active - check server console or use 6-digit code)',
    };
  }
}

/**
 * Verifies the 6-digit OTP for a given email address.
 * Validates expiration, attempt threshold (max 5), and single-use invalidation.
 */
export async function verifyGmailOTP(email: string, otp: string): Promise<{
  valid: boolean;
  message: string;
  attemptsRemaining?: number;
  locked?: boolean;
}> {
  const normalizedEmail = email.toLowerCase().trim();
  const cleanOtp = otp.trim();

  if (!/^\d{6}$/.test(cleanOtp)) {
    return { valid: false, message: 'Invalid code format. Please enter a 6-digit code.' };
  }

  const otpsCol = await getOtpVerificationsCollection();

  // Find latest unverified OTP for this email
  const latestOtp = await otpsCol.findOne(
    { 
      email: normalizedEmail,
      verifiedAt: { $exists: false },
    },
    { sort: { createdAt: -1 } }
  );

  if (!latestOtp) {
    return { valid: false, message: 'No pending verification code found. Please request a new code.' };
  }

  // Check expiration (5 minutes)
  const isExpired = new Date(latestOtp.expiresAt).getTime() < Date.now();
  if (isExpired) {
    return { valid: false, message: 'Verification code has expired. Please request a new code.' };
  }

  // Check attempt limit (max 5)
  if (latestOtp.attempts >= MAX_ATTEMPTS) {
    return { 
      valid: false, 
      message: 'Too many incorrect attempts. This code has been locked. Please request a new code.',
      attemptsRemaining: 0,
      locked: true,
    };
  }

  // Verify bcrypt hash
  const matches = await bcrypt.compare(cleanOtp, latestOtp.otpHash);

  if (!matches) {
    const updatedAttempts = (latestOtp.attempts || 0) + 1;
    await otpsCol.updateOne(
      { _id: latestOtp._id },
      { $set: { attempts: updatedAttempts } }
    );
    const remaining = Math.max(0, MAX_ATTEMPTS - updatedAttempts);
    return {
      valid: false,
      message: remaining > 0 
        ? `Incorrect code. ${remaining} attempt(s) remaining.` 
        : 'Too many incorrect attempts. This code has been locked.',
      attemptsRemaining: remaining,
      locked: remaining === 0,
    };
  }

  // Mark as verified immediately to prevent OTP reuse
  await otpsCol.updateOne(
    { _id: latestOtp._id },
    { $set: { verifiedAt: new Date().toISOString() } }
  );

  return { valid: true, message: 'Code verified successfully.' };
}
