import { Resend } from 'resend';

let resendClient: Resend | null = null;

export function isResendConfigured(): boolean {
  const key = process.env.RESEND_API_KEY;
  return Boolean(
    key && 
    key.trim() !== '' && 
    key !== 'your-resend-api-key' && 
    !key.includes('placeholder')
  );
}

export function getResendClient(): Resend | null {
  if (!isResendConfigured()) {
    return null;
  }
  if (!resendClient) {
    const key = process.env.RESEND_API_KEY!;
    resendClient = new Resend(key);
  }
  return resendClient;
}

export function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL || 'CareNest AI <onboarding@resend.dev>';
}
