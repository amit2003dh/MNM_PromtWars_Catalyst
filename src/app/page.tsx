'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  Volume2,
  Users2,
  CalendarCheck2,
  ArrowRight,
  PhoneCall,
  Activity,
  CheckCircle2,
  Pill,
} from 'lucide-react';
import { useCare } from '@/context/CareContext';
import { UserRole } from '@/types';

export default function LandingPage() {
  const router = useRouter();
  const { switchUserRole } = useCare();

  const handleLaunchRole = async (role: UserRole) => {
    await switchUserRole(role);
    router.push('/dashboard');
  };

  return (
    <div className="flex-1 flex flex-col bg-[#FBFBF9]">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 border-b border-slate-200/60 bg-gradient-to-b from-nest-50/40 via-white to-[#FBFBF9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-nest-100 text-nest-900 border border-nest-200 text-xs sm:text-sm font-black shadow-xs">
            <Sparkles className="w-4 h-4 text-nest-700" />
            <span>AI-Powered Elderly Care & Medication Concurrency Safety</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-navy-950 tracking-tight max-w-4xl mx-auto leading-tight sm:leading-none">
            Dignified, Safe & Connected Care for Our Loved Ones.
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto font-medium leading-relaxed">
            Eliminating accidental double-dosing with concurrency locks, empowering seniors with giant touch controls & voice read-aloud, and keeping families seamlessly in sync.
          </p>

          {/* Quick Launch Role Portals */}
          <div className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto text-left">
            {/* Senior Card */}
            <div className="rounded-3xl bg-white border-2 border-amber-300 p-6 shadow-md hover:shadow-xl transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-black text-xl">
                  👵
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                    Senior Experience
                  </span>
                  <h3 className="text-xl font-black text-navy-950 mt-1">Meera Sharma (74y)</h3>
                  <p className="text-xs text-slate-500 font-medium">Hypertension & Type 2 Diabetes</p>
                </div>
                <ul className="text-xs text-slate-600 space-y-1.5 pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Giant touch buttons & high-contrast</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Text-to-speech audio voice instructions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>1-tap instant symptom check-in</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => handleLaunchRole('senior')}
                className="mt-6 w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Launch Senior Mode</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Caregiver Card */}
            <div className="rounded-3xl bg-white border-2 border-nest-400 p-6 shadow-md hover:shadow-xl transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-nest-100 text-nest-800 flex items-center justify-center font-black text-xl">
                  👩‍⚕️
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-nest-800 bg-nest-100 px-2.5 py-0.5 rounded-full">
                    Caregiver Portal
                  </span>
                  <h3 className="text-xl font-black text-navy-950 mt-1">Sunita Verma</h3>
                  <p className="text-xs text-slate-500 font-medium">Primary In-Home Nurse & Caregiver</p>
                </div>
                <ul className="text-xs text-slate-600 space-y-1.5 pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Concurrency-safe dose administration</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Shift handoff notes & vitals log</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Low-stock refill threshold alerts</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => handleLaunchRole('caregiver')}
                className="mt-6 w-full py-3.5 px-4 rounded-2xl bg-nest-600 hover:bg-nest-700 text-white font-black text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Open Caregiver Portal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Family Member Card */}
            <div className="rounded-3xl bg-white border-2 border-sky-300 p-6 shadow-md hover:shadow-xl transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-800 flex items-center justify-center font-black text-xl">
                  👨‍💼
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-sky-800 bg-sky-100 px-2.5 py-0.5 rounded-full">
                    Family Hub
                  </span>
                  <h3 className="text-xl font-black text-navy-950 mt-1">Rahul Sharma</h3>
                  <p className="text-xs text-slate-500 font-medium">Devoted Son & Family Coordinator</p>
                </div>
                <ul className="text-xs text-slate-600 space-y-1.5 pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Live adherence & caregiver timeline</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Doctor appointment tracking</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>AI Doctor clinical summaries</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => handleLaunchRole('family')}
                className="mt-6 w-full py-3.5 px-4 rounded-2xl bg-navy-900 hover:bg-navy-800 text-white font-black text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Access Family Hub</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Pillars of Safety */}
      <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl font-black text-navy-950">Designed For Real-World Elderly Healthcare</h2>
          <p className="text-sm md:text-base text-slate-600 mt-2">
            Built with clinical safety safeguards, cross-caregiver synchronization, and intelligent AI summaries.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-navy-950">Anti-Double Dose Lock</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Eliminates the dangerous mistake of two caregivers unknowingly administering the same blood pressure or diabetic pill twice.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Volume2 className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-navy-950">Voice Read-Aloud (TTS)</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Seniors with failing eyesight or literacy barriers can tap any medicine to hear clear spoken instructions with meal timing advice.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Sparkles className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-navy-950">Gemini AI Doctor Reports</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Synthesizes adherence trends, missed doses, and reported side effects into a 1-page printable clinical summary for doctor visits.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center">
              <Pill className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-navy-950">Visual Pill Identifier</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Displays color and shape graphics for Allopathic, Ayurvedic, Herbal, and OTC medicines to verify the correct physical pill.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500 font-medium">
        <p>&copy; 2026 CareNest AI &bull; Intelligent Elderly Care & Concurrency Safety Ecosystem &bull; Hackathon Demo</p>
      </footer>
    </div>
  );
}
