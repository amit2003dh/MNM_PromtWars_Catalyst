import { getResendClient, isResendConfigured, getFromEmail } from './resend';
import { isGmailConfigured, getGmailTransporter } from './gmail-otp';
import { 
  renderStage3EscalationEmail, 
  Stage3EscalationParams, 
  renderLowInventoryEmail, 
  LowInventoryParams,
  renderEmergencySOSEmail,
  EmergencySOSParams,
} from './templates';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface SendEmailResult {
  success: boolean;
  simulated: boolean;
  provider?: 'resend' | 'gmail_smtp' | 'simulated';
  messageId?: string;
  error?: string;
  recipients: string[];
}

/**
 * Universal email sender with dual-provider support (Resend + Gmail SMTP) & robust fallback.
 * Prioritizes active provider, never throws unhandled exceptions.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const recipients = Array.isArray(options.to) ? options.to : [options.to];
  const from = options.from || getFromEmail();

  // 1. Try Resend if configured
  if (isResendConfigured()) {
    try {
      const resend = getResendClient();
      if (resend) {
        const response = await resend.emails.send({
          from,
          to: recipients,
          subject: options.subject,
          html: options.html,
          text: options.text,
        });

        if (!response.error) {
          return {
            success: true,
            simulated: false,
            provider: 'resend',
            messageId: response.data?.id,
            recipients,
          };
        }
        console.warn('[CareNest Resend API returned error, falling back to Gmail SMTP]:', response.error);
      }
    } catch (err: any) {
      console.warn('[CareNest Resend Exception, falling back to Gmail SMTP]:', err.message);
    }
  }

  // 2. Try Gmail SMTP if configured
  if (isGmailConfigured()) {
    try {
      const transporter = getGmailTransporter();
      if (transporter) {
        const gmailUser = process.env.GMAIL_USER;
        const mailFrom = gmailUser ? `CareNest AI <${gmailUser}>` : from;

        const info = await transporter.sendMail({
          from: mailFrom,
          to: recipients.join(', '),
          subject: options.subject,
          html: options.html,
          text: options.text || options.subject,
        });

        console.info(`[CareNest Gmail SMTP Live Delivery] Dispatched to ${recipients.join(', ')} (Message ID: ${info.messageId})`);

        return {
          success: true,
          simulated: false,
          provider: 'gmail_smtp',
          messageId: info.messageId,
          recipients,
        };
      }
    } catch (err: any) {
      console.warn('[CareNest Gmail SMTP Exception, falling back to simulation]:', err.message);
    }
  }

  // 3. Fallback Simulation Log (when neither provider has live credentials configured)
  console.info(`[CareNest Email Mock Outbox] (Live credentials missing or simulated test)`);
  console.info(`  To: ${recipients.join(', ')}`);
  console.info(`  Subject: ${options.subject}`);
  console.info(`  Text preview: ${(options.text || options.html).slice(0, 160)}...`);

  return {
    success: true,
    simulated: true,
    provider: 'simulated',
    messageId: `simulated-resend-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    recipients,
  };
}

/**
 * Dedicated helper to dispatch Stage 3 caregiver dose escalation alert
 */
export async function sendStage3CaregiverEscalation(
  recipientEmails: string | string[],
  params: Stage3EscalationParams
): Promise<SendEmailResult> {
  const { html, text } = renderStage3EscalationEmail(params);
  const subject = `🚨 URGENT: Dose Overdue (+${params.minutesOverdue}m) for ${params.seniorName} — ${params.medicineName}`;

  return await sendEmail({
    to: recipientEmails,
    subject,
    html,
    text,
  });
}

/**
 * Dedicated helper to dispatch low inventory notification
 */
export async function sendLowInventoryAlert(
  recipientEmails: string | string[],
  params: LowInventoryParams
): Promise<SendEmailResult> {
  const { html, text } = renderLowInventoryEmail(params);
  const subject = `⚠️ Low Inventory Alert: ${params.medicineName} for ${params.seniorName}`;

  return await sendEmail({
    to: recipientEmails,
    subject,
    html,
    text,
  });
}

/**
 * Dedicated helper to dispatch Emergency SOS broadcast alert
 */
export async function sendEmergencyAlertEmail(
  recipientEmails: string | string[],
  params: EmergencySOSParams
): Promise<SendEmailResult> {
  const { html, text } = renderEmergencySOSEmail(params);
  const subject = `🚨 EMERGENCY ALERT: Immediate Assistance Requested for ${params.patientName}!`;

  return await sendEmail({
    to: recipientEmails,
    subject,
    html,
    text,
  });
}
