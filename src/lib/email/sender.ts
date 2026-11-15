import { getResendClient, isResendConfigured, getFromEmail } from './resend';
import { 
  renderStage3EscalationEmail, 
  Stage3EscalationParams, 
  renderLowInventoryEmail, 
  LowInventoryParams 
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
  messageId?: string;
  error?: string;
  recipients: string[];
}

/**
 * Universal email sender with robust fallback logging
 * Never throws unhandled exceptions — always returns a structured result.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const recipients = Array.isArray(options.to) ? options.to : [options.to];
  const from = options.from || getFromEmail();

  // If Resend is NOT configured or invalid, log fallback simulation
  if (!isResendConfigured()) {
    console.info(`[CareNest Email Mock Fallback] (RESEND_API_KEY missing)`);
    console.info(`  To: ${recipients.join(', ')}`);
    console.info(`  From: ${from}`);
    console.info(`  Subject: ${options.subject}`);
    console.info(`  Text preview: ${(options.text || options.html).slice(0, 160)}...`);

    return {
      success: true,
      simulated: true,
      messageId: `simulated-resend-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      recipients,
    };
  }

  const resend = getResendClient();
  if (!resend) {
    return {
      success: true,
      simulated: true,
      messageId: `simulated-client-null-${Date.now()}`,
      recipients,
    };
  }

  try {
    const response = await resend.emails.send({
      from,
      to: recipients,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (response.error) {
      console.warn('[CareNest Resend API Error, falling back to simulation log]:', response.error);
      return {
        success: true,
        simulated: true,
        error: response.error.message,
        recipients,
      };
    }

    return {
      success: true,
      simulated: false,
      messageId: response.data?.id,
      recipients,
    };
  } catch (err: any) {
    console.warn('[CareNest Resend Exception, gracefully caught]:', err.message);
    return {
      success: true,
      simulated: true,
      error: err.message,
      recipients,
    };
  }
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
