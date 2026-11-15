'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCare } from '@/context/CareContext';
import { ShieldCheck, ArrowLeft, ArrowRight, Loader2, RotateCw, CheckCircle2, AlertCircle } from 'lucide-react';

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') || '';

  const { refreshData } = useCare();
  const [email, setEmail] = useState(emailParam);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(60);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Update email if query param changes
  useEffect(() => {
    if (emailParam) setEmail(emailParam);
  }, [emailParam]);

  // 60-second countdown for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];
    // Handle paste of full 6 digits
    if (value.length > 1) {
      const pasted = value.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || '';
      }
      setOtpDigits(newDigits);
      const nextIdx = Math.min(5, pasted.length);
      inputRefs.current[nextIdx]?.focus();
      return;
    }

    newDigits[index] = value;
    setOtpDigits(newDigits);

    // Auto advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const fullOtp = otpDigits.join('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (fullOtp.length !== 6) {
      setError('Please enter all 6 digits of your verification code.');
      return;
    }

    if (!email) {
      setError('Email address is missing. Please return to login.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: fullOtp }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Verification failed. Please check the code.');
        setLoading(false);
        return;
      }

      setSuccessMsg('Verification successful! Loading your family care dashboard...');
      await refreshData();
      
      setTimeout(() => {
        router.push('/dashboard');
      }, 700);
    } catch (err: any) {
      setError('Network error: Could not verify OTP with server.');
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to resend code.');
      } else {
        setSuccessMsg('A new verification code has been dispatched to your Gmail.');
        setResendCooldown(60);
        setOtpDigits(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError('Network error while resending verification code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
      
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-emerald-600 text-white items-center justify-center shadow-lg shadow-emerald-600/20">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-navy-950 tracking-tight">Verify Your Code</h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium">
          Enter the 6-digit verification code sent to:
        </p>
        <div className="inline-block px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold text-navy-900 break-all">
          {email || 'your email'}
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 6-Digit OTP Form */}
      <form onSubmit={handleVerify} className="space-y-6">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 text-center mb-3">
            6-Digit One-Time Password (OTP)
          </label>
          <div className="flex justify-between gap-1.5 sm:gap-2.5">
            {otpDigits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => { inputRefs.current[idx] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-11 h-14 sm:w-12 sm:h-16 text-center text-xl sm:text-2xl font-black text-navy-950 bg-slate-50 border-2 border-slate-200 focus:border-nest-600 focus:bg-white rounded-xl outline-none transition-all"
                autoComplete="one-time-code"
              />
            ))}
          </div>
          <p className="text-[11px] text-slate-400 text-center mt-2.5">
            Code expires in 5 minutes • Max 5 attempts
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || fullOtp.length !== 6}
          className="w-full py-3.5 px-4 bg-nest-600 hover:bg-nest-700 active:bg-nest-800 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-nest-600/25 flex items-center justify-center gap-2 min-h-[48px] disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying & Signing In...</span>
            </>
          ) : (
            <>
              <span>Verify & Continue</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Resend Cooldown Section */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 pt-2 gap-2 border-t border-slate-100">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 font-bold text-slate-600 hover:text-navy-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Change Gmail</span>
        </Link>

        <button
          type="button"
          onClick={handleResend}
          disabled={resendCooldown > 0 || resending}
          className="inline-flex items-center gap-1.5 font-bold text-nest-600 hover:text-nest-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
        >
          {resending ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Sending...</span>
            </>
          ) : resendCooldown > 0 ? (
            <span>Resend in {resendCooldown}s</span>
          ) : (
            <>
              <RotateCw className="w-3.5 h-3.5" />
              <span>Resend Code</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 bg-[#FAF9F6]">
      <Suspense fallback={
        <div className="p-8 text-center text-slate-500 font-bold flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-nest-600" />
          <span>Loading verification portal...</span>
        </div>
      }>
        <VerifyOtpContent />
      </Suspense>
    </div>
  );
}
