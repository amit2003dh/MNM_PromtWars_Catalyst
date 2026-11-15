'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCare } from '@/context/CareContext';
import { HeartHandshake, Mail, ArrowRight, Loader2, Sparkles, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { switchUserRole } = useCare();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentSuccess, setSentSuccess] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid Gmail / email address.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to send verification code. Please try again.');
        setLoading(false);
        return;
      }

      setSentSuccess(true);
      // Navigate to /verify-otp with email query param
      router.push(`/verify-otp?email=${encodeURIComponent(cleanEmail)}`);
    } catch (err: any) {
      setError('Network error: Could not reach the authentication server.');
      setLoading(false);
    }
  };

  const handleDemoSignIn = async (role: 'caregiver' | 'senior' | 'family') => {
    setLoading(true);
    try {
      await switchUserRole(role);
      router.push('/dashboard');
    } catch {
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 bg-[#FAF9F6]">
      <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-nest-600 text-white items-center justify-center shadow-lg shadow-nest-600/20">
            <HeartHandshake className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-navy-950 tracking-tight">CareNest AI</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Passwordless Gmail OTP Sign-In & Multi-User Healthcare SaaS
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2">
            <span className="text-sm">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Success notification */}
        {sentSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Verification code sent! Redirecting to verification...</span>
          </div>
        )}

        {/* Gmail OTP Input Form */}
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Gmail / Email Address
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.name@gmail.com"
                className="w-full pl-11 pr-4 py-3 text-sm font-medium border border-slate-300 rounded-xl focus:ring-2 focus:ring-nest-500 focus:border-nest-500 outline-none transition-all placeholder:text-slate-400 min-h-[44px]"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-nest-600" />
              <span>We will send a 6-digit secure code to your Gmail. No password needed.</span>
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || sentSuccess}
            className="w-full py-3.5 px-4 bg-nest-600 hover:bg-nest-700 active:bg-nest-800 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-nest-600/25 flex items-center justify-center gap-2 min-h-[48px] disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending Code via Gmail...</span>
              </>
            ) : (
              <>
                <span>Send Verification Code</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-slate-400 font-bold tracking-wider">or fast demo access</span>
          </div>
        </div>

        {/* Demo Personas for Judges / Quick Evaluators */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Hackathon Pre-Seeded Demo</span>
            </span>
            <span className="text-[10px] bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-full font-bold">1-Click</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleDemoSignIn('caregiver')}
              className="py-2.5 px-3 rounded-xl bg-white border border-slate-200 hover:border-nest-400 hover:bg-nest-50/50 text-left transition-all min-h-[44px]"
            >
              <div className="text-xs font-black text-navy-900">Sunita Verma</div>
              <div className="text-[10px] text-nest-700 font-bold">Caregiver</div>
            </button>
            <button
              type="button"
              onClick={() => handleDemoSignIn('senior')}
              className="py-2.5 px-3 rounded-xl bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 text-left transition-all min-h-[44px]"
            >
              <div className="text-xs font-black text-navy-900">Meera Sharma</div>
              <div className="text-[10px] text-amber-700 font-bold">Senior (72)</div>
            </button>
            <button
              type="button"
              onClick={() => handleDemoSignIn('family')}
              className="py-2.5 px-3 rounded-xl bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-left transition-all min-h-[44px]"
            >
              <div className="text-xs font-black text-navy-900">Rahul Sharma</div>
              <div className="text-[10px] text-blue-700 font-bold">Family</div>
            </button>
          </div>
        </div>

        {/* Security badges */}
        <div className="text-center pt-2">
          <p className="text-[11px] text-slate-400 font-medium">
            🔒 Protected by MongoDB Session Tokens & Strict Multi-Tenant Household Isolation.
          </p>
        </div>

      </div>
    </div>
  );
}
