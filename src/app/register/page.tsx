'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCare } from '@/context/CareContext';
import { HeartHandshake, UserPlus, ArrowRight, Loader2, Mail, ShieldCheck, AlertCircle } from 'lucide-react';
import { UserRole } from '@/types';

export default function RegisterPage() {
  const router = useRouter();
  const { refreshData } = useCare();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('caregiver');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (!cleanName) {
      setError('Please provide your full name.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          password,
          role,
          phone: phone.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed. Please try again.');
        setLoading(false);
        return;
      }

      // Clear any prior demo flags
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('carenest_is_demo');
          localStorage.setItem('carenest_is_authenticated', 'true');
        } catch {}
      }

      // Refresh care context with newly created session
      await refreshData();
      router.push('/dashboard');
    } catch {
      setError('Network error: Could not reach the registration server.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-[#FAF9F6] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(13,148,136,0.12),rgba(255,255,255,0))]">
      <div className="w-full max-w-md bg-white/95 backdrop-blur-xs border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-900/5 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-nest-600 to-nest-500 text-white items-center justify-center shadow-lg shadow-nest-600/25 ring-4 ring-nest-50">
            <HeartHandshake className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-navy-950 tracking-tight">Create an Account</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Join or coordinate your private family Care Circle
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Your Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dr. Rajesh Sharma"
              className="w-full px-4 py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-nest-500/25 focus:border-nest-500 outline-none font-medium bg-slate-50/50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="doctor@example.com"
              className="w-full px-4 py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-nest-500/25 focus:border-nest-500 outline-none font-medium bg-slate-50/50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full px-4 py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-nest-500/25 focus:border-nest-500 outline-none font-medium bg-slate-50/50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Phone Number <span className="text-slate-400 font-normal">(Optional for emergency SMS)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full px-4 py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-nest-500/25 focus:border-nest-500 outline-none font-medium bg-slate-50/50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Primary Role in Care Circle</label>
            <div className="grid grid-cols-3 gap-2">
              {(['senior', 'caregiver', 'family'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`py-2.5 px-2 text-xs font-bold rounded-xl border capitalize transition-all ${
                    role === r
                      ? 'bg-nest-600 text-white border-nest-600 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-nest-600 to-nest-700 hover:from-nest-700 hover:to-nest-800 active:scale-98 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-nest-600/25 flex items-center justify-center gap-2 min-h-[48px] disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 shrink-0" />
                <span>Complete Registration</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </>
            )}
          </button>
        </form>

        {/* Passwordless Alternative */}
        <div className="p-3 rounded-2xl bg-nest-50/80 border border-nest-200 text-center space-y-1">
          <p className="text-xs text-nest-950 font-bold flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-nest-600" />
            <span>Prefer Passwordless Login?</span>
          </p>
          <p className="text-[11px] text-slate-600">
            Sign in with a 6-digit Gmail code — no password required.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-xs font-black text-nest-700 hover:text-nest-800 underline mt-1"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Sign In with Gmail OTP</span>
          </Link>
        </div>

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>Already have an account? </span>
          <Link href="/login" className="font-bold text-nest-700 hover:underline">
            Sign in
          </Link>
        </div>

      </div>
    </div>
  );
}
