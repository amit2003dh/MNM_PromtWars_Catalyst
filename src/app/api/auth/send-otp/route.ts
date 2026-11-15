import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sendGmailOTP } from '@/lib/email/gmail-otp';

const SendOtpSchema = z.object({
  email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
});

// Simple in-memory IP rate limiter: max 10 requests per 10 minutes per IP
const ipRateLimits = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const now = Date.now();
    const rateLimit = ipRateLimits.get(ip);

    if (rateLimit && rateLimit.resetAt > now) {
      if (rateLimit.count >= 10) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please wait a few minutes before trying again.' },
          { status: 429 }
        );
      }
      rateLimit.count += 1;
    } else {
      ipRateLimits.set(ip, { count: 1, resetAt: now + 10 * 60 * 1000 });
    }

    const body = await request.json();
    const result = SendOtpSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || 'Invalid email address' },
        { status: 400 }
      );
    }

    const { email } = result.data;
    const sendResult = await sendGmailOTP(email, ip);

    if (!sendResult.success) {
      return NextResponse.json(
        { 
          error: sendResult.message, 
          cooldownRemaining: sendResult.cooldownRemaining 
        },
        { status: 429 }
      );
    }

    return NextResponse.json({
      success: true,
      message: sendResult.message,
    });
  } catch (err: any) {
    console.error('[API send-otp] Error:', err);
    return NextResponse.json(
      { error: 'Failed to send verification code. Please try again.' },
      { status: 500 }
    );
  }
}
