'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import StatCards from '@/components/StatCards';
import SafetyIndicators from '@/components/SafetyIndicators';
import DoseItem from '@/components/DoseItem';
import SymptomLogger from '@/components/SymptomLogger';
import HandoffNotes from '@/components/HandoffNotes';
import AppointmentList from '@/components/AppointmentList';
import AdherenceChart from '@/components/AdherenceChart';
import VoiceReader from '@/components/VoiceReader';
import PillBadge from '@/components/PillBadge';
import { useCare } from '@/context/CareContext';
import {
  CheckCircle2,
  PhoneCall,
  HeartPulse,
  Clock,
  ShieldCheck,
  CalendarCheck,
  AlertTriangle,
  Users,
  Activity,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Stethoscope,
  Pill,
  Plus,
} from 'lucide-react';
import { formatTime, formatDateTime } from '@/lib/utils';

export default function DashboardPage() {
  const {
    user,
    careProfile,
    seniorMode,
    todayDoses,
    medications,
    caregiverNotes,
    healthLogs,
    appointments,
    administerDose,
    triggerEmergency,
  } = useCare();

  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed'>('all');
  const [showSymptomModal, setShowSymptomModal] = useState(false);
  const [seniorHelpModal, setSeniorHelpModal] = useState(false);

  // Next scheduled dose for Meera-ji
  const pendingDoses = todayDoses.filter((d) => d.status === 'scheduled');
  const nextDose = pendingDoses[0] || null;

  // Recent Care Timeline combining taken doses, health logs, and notes
  const careTimelineEvents = [
    ...todayDoses
      .filter((d) => d.status === 'taken' && d.recordedAt)
      .map((d) => ({
        id: d.doseKey,
        type: 'dose_administered' as const,
        actor: d.administeredByName || 'Caregiver',
        title: `Administered ${d.medicineName} (${d.dosage})`,
        time: d.recordedAt!,
        badge: 'Medication',
        badgeColor: 'bg-emerald-100 text-emerald-800',
      })),
    ...healthLogs.map((h) => ({
      id: h._id,
      type: 'symptom_logged' as const,
      actor: h.reportedByName || 'Meera Sharma',
      title: `Reported Symptom: ${h.symptom.replace('_', ' ')} (${h.severity})`,
      time: h.reportedAt,
      badge: 'Health Check-in',
      badgeColor: 'bg-amber-100 text-amber-800',
    })),
    ...caregiverNotes.map((c) => ({
      id: c._id,
      type: 'handoff_note' as const,
      actor: c.authorName,
      title: `Shift Handoff Note Posted`,
      time: c.createdAt,
      badge: 'Shift Note',
      badgeColor: 'bg-sky-100 text-sky-800',
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  // -------------------------------------------------------------
  // SENIOR CARE MODE DASHBOARD (Meera Sharma view)
  // -------------------------------------------------------------
  if (user.role === 'senior' || seniorMode) {
    return (
      <div className="flex-1 flex bg-[#FBFBF9]">
        <Sidebar />
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
          {/* Senior Greeting & Emergency Call Bar */}
          <div className="rounded-3xl bg-gradient-to-r from-nest-500 to-nest-700 p-6 md:p-8 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-1">
              <span className="text-xs md:text-sm font-black uppercase tracking-wider text-nest-100 bg-white/20 px-3 py-1 rounded-full">
                Senior Care Safe Mode
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mt-2">
                Namaste, {careProfile.preferredName || careProfile.fullName}!
              </h1>
              <p className="text-base sm:text-lg text-nest-100 font-medium">
                Today is {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.
              </p>
            </div>

            <button
              type="button"
              onClick={triggerEmergency}
              className="w-full sm:w-auto px-8 py-5 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xl shadow-2xl flex items-center justify-center gap-3 shrink-0 min-h-[64px]"
            >
              <PhoneCall className="w-7 h-7" />
              <span>EMERGENCY SOS</span>
            </button>
          </div>

          {/* 3 PRIMARY ACTION BUTTONS (Giant Touch Targets) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Action 1: Taken medicine */}
            <button
              type="button"
              onClick={async () => {
                if (nextDose) {
                  await administerDose(nextDose.doseKey);
                } else if (todayDoses.length > 0) {
                  await administerDose(todayDoses[0].doseKey);
                }
              }}
              className="p-6 md:p-8 rounded-3xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xl shadow-lg border-4 border-emerald-400 flex flex-col items-center justify-center text-center gap-3 min-h-[140px] transition-all"
            >
              <CheckCircle2 className="w-12 h-12 text-emerald-100" />
              <span className="leading-tight">1. I HAVE TAKEN MY MEDICINE</span>
              <span className="text-xs font-bold text-emerald-100 opacity-90">
                {nextDose ? `Next: ${nextDose.medicineName} (${formatTime(nextDose.scheduledTime)})` : 'All scheduled doses taken'}
              </span>
            </button>

            {/* Action 2: Need help */}
            <button
              type="button"
              onClick={() => setSeniorHelpModal(true)}
              className="p-6 md:p-8 rounded-3xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black text-xl shadow-lg border-4 border-amber-300 flex flex-col items-center justify-center text-center gap-3 min-h-[140px] transition-all"
            >
              <PhoneCall className="w-12 h-12 text-amber-100" />
              <span className="leading-tight">2. I NEED HELP</span>
              <span className="text-xs font-bold text-amber-100 opacity-90">
                Call Sunita or Rahul immediately
              </span>
            </button>

            {/* Action 3: How am I feeling? */}
            <button
              type="button"
              onClick={() => setShowSymptomModal(true)}
              className="p-6 md:p-8 rounded-3xl bg-nest-600 hover:bg-nest-700 active:scale-95 text-white font-black text-xl shadow-lg border-4 border-nest-400 flex flex-col items-center justify-center text-center gap-3 min-h-[140px] transition-all"
            >
              <HeartPulse className="w-12 h-12 text-nest-100" />
              <span className="leading-tight">3. HOW AM I FEELING?</span>
              <span className="text-xs font-bold text-nest-100 opacity-90">
                Report dizziness, weakness or feel fine
              </span>
            </button>
          </div>

          {/* NEXT DUE DOSE SPOTLIGHT */}
          {nextDose ? (
            <div className="rounded-3xl bg-white border-4 border-amber-300 p-6 md:p-8 shadow-md space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs md:text-sm font-black uppercase tracking-wider text-amber-900 bg-amber-100 px-3 py-1 rounded-full">
                  Upcoming Dose for You
                </span>
                <span className="text-lg md:text-xl font-black text-navy-900 flex items-center gap-1.5">
                  <Clock className="w-6 h-6 text-amber-600" />
                  Scheduled for {formatTime(nextDose.scheduledTime)}
                </span>
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-2">
                <div className="flex items-start gap-5">
                  <PillBadge
                    color={nextDose.pillColor}
                    shape={nextDose.pillShape}
                    size="lg"
                    className="shrink-0 w-14 h-14"
                  />
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black text-navy-950">
                      {nextDose.medicineName}
                    </h2>
                    <p className="text-lg font-bold text-nest-700 mt-0.5">{nextDose.dosage}</p>
                    <p className="text-base text-slate-700 mt-2 font-medium">
                      {nextDose.instructions}
                    </p>
                    <p className="text-sm font-bold text-slate-500 mt-1">
                      Pill appearance: {nextDose.pillColor} ({nextDose.pillShape})
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                  <VoiceReader
                    text={`Namaste Meera-ji. Your medicine is ${nextDose.medicineName}. Dose is ${
                      nextDose.dosage
                    }. ${nextDose.instructions}. Pill color is ${nextDose.pillColor}.`}
                    label="Listen to Instructions"
                    size="lg"
                  />
                  <button
                    type="button"
                    onClick={() => administerDose(nextDose.doseKey)}
                    className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg rounded-2xl shadow-lg flex items-center justify-center gap-2 min-h-[64px]"
                  >
                    <CheckCircle2 className="w-7 h-7" />
                    <span>I Took This Dose</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl bg-emerald-50 border-2 border-emerald-300 p-8 text-center space-y-2">
              <CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto" />
              <h2 className="text-2xl font-black text-emerald-950">All Doses Completed For Now!</h2>
              <p className="text-base text-emerald-800 font-medium">
                Well done, Meera-ji. Next scheduled medication will be this evening.
              </p>
            </div>
          )}

          {/* ALL TODAY'S DOSES LIST */}
          <div className="space-y-4">
            <h2 className="text-2xl font-black text-navy-950 flex items-center gap-2">
              <CalendarCheck className="w-7 h-7 text-nest-600" />
              <span>Full Medication Schedule for Today</span>
            </h2>
            <div className="space-y-3">
              {todayDoses.length === 0 ? (
                <div className="p-8 text-center rounded-3xl bg-white border border-dashed border-slate-200 space-y-2">
                  <Pill className="w-10 h-10 text-slate-300 mx-auto" />
                  <h3 className="text-xl font-bold text-navy-950">No medicines scheduled for today</h3>
                  <p className="text-slate-500 text-sm max-w-sm mx-auto">
                    Your caregiver or family member will schedule your daily medication doses here.
                  </p>
                </div>
              ) : (
                todayDoses.map((dose) => (
                  <DoseItem key={dose.doseKey} item={dose} highlightSenior={true} />
                ))
              )}
            </div>
          </div>

          {/* Symptom check-in modal */}
          {showSymptomModal && (
            <div
              role="dialog"
              aria-modal="true"
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-xs animate-in fade-in"
            >
              <div className="relative w-full max-w-2xl bg-white rounded-3xl p-6 md:p-8 shadow-2xl border-4 border-nest-500">
                <button
                  type="button"
                  onClick={() => setShowSymptomModal(false)}
                  className="absolute right-5 top-5 p-3 rounded-full bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 text-sm"
                >
                  ✕ Close
                </button>
                <SymptomLogger onSuccess={() => setShowSymptomModal(false)} />
              </div>
            </div>
          )}

          {/* Senior Need Help Modal */}
          {seniorHelpModal && (
            <div
              role="dialog"
              aria-modal="true"
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-xs animate-in fade-in"
            >
              <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 md:p-8 shadow-2xl border-4 border-amber-400 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                    <PhoneCall className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-navy-950">Who do you want to reach?</h3>
                    <p className="text-sm text-slate-600 font-medium">Care Circle Fast Dial</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {careProfile.emergencyContacts.map((contact) => (
                    <a
                      key={contact.name}
                      href={`tel:${contact.phone.replace(/[^0-9+]/g, '')}`}
                      className="p-4 rounded-2xl border-2 border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all min-w-0"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-lg font-black text-navy-950 truncate">{contact.name}</div>
                        <div className="text-xs text-slate-500 font-semibold">{contact.relationship}</div>
                      </div>
                      <div className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm shrink-0">
                        <PhoneCall className="w-4 h-4 shrink-0" />
                        <span className="font-mono">{contact.phone}</span>
                      </div>
                    </a>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setSeniorHelpModal(false)}
                  className="w-full py-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-navy-900 font-bold text-base"
                >
                  Close Window
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // CAREGIVER & FAMILY DASHBOARD
  // -------------------------------------------------------------
  return (
    <div className="flex-1 flex bg-[#FBFBF9]">
      <Sidebar />
      <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Welcome Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-nest-800 bg-nest-100 px-2.5 py-0.5 rounded-full">
                {user.role === 'caregiver' ? 'Caregiver Portal' : 'Family Member Hub'}
              </span>
              <span className="text-xs text-slate-400">&bull;</span>
              <span className="text-xs font-semibold text-slate-600">
                Patient: <strong className="text-navy-900">{careProfile.fullName} ({careProfile.age}y)</strong>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-navy-950 mt-1">
              Welcome back, {user.name}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Link
              href="/reports"
              className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-white border border-slate-200 hover:border-nest-300 text-navy-900 text-xs font-bold shadow-xs flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-nest-600 shrink-0" />
              <span className="truncate">AI Doctor Summary</span>
            </Link>

            <Link
              href="/schedule"
              className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-nest-600 hover:bg-nest-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2"
            >
              <CalendarCheck className="w-4 h-4 shrink-0" />
              <span className="truncate">Full Schedule</span>
            </Link>
          </div>
        </div>

        {/* Onboarding Welcome Card for Brand-New Households with 0 Medications */}
        {medications.length === 0 && (
          <div className="rounded-3xl bg-gradient-to-br from-nest-50 via-white to-sky-50 border-2 border-dashed border-nest-200 p-6 sm:p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-nest-600 text-white flex items-center justify-center mx-auto shadow-md shadow-nest-600/20">
              <Pill className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-xl sm:text-2xl font-black text-navy-950">Welcome to CareNest AI!</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Your private care household is set up. Add your first medication to generate daily schedules, enable automated safety alerts, and receive AI-powered drug interaction insights.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/medications"
                className="px-5 py-3 rounded-2xl bg-nest-600 hover:bg-nest-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-nest-600/20 inline-flex items-center gap-2 transition-transform active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Medication</span>
              </Link>
              <Link
                href="/care-circle"
                className="px-5 py-3 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 text-slate-800 font-bold text-xs sm:text-sm shadow-xs inline-flex items-center gap-2 transition-colors"
              >
                <Users className="w-4 h-4 text-nest-600" />
                <span>Invite Care Circle Member</span>
              </Link>
            </div>
          </div>
        )}

        {/* 1. StatCards */}
        <StatCards />

        {/* 2. SafetyIndicators: Concurrency Lock, Refill alerts, Side effects */}
        <SafetyIndicators />

        {/* 3. Main Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 Cols): Today's Doses Administration & Adherence Chart */}
          <div className="lg:col-span-2 space-y-6">
            {/* Today's Dose Administration Board */}
            <div className="rounded-3xl bg-white border border-slate-200/90 p-5 md:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-nest-50 text-nest-700 flex items-center justify-center border border-nest-200">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-navy-950">
                      Today&apos;s Medication Administration
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Protected by atomic Anti-Double-Dosing concurrency lock
                    </p>
                  </div>
                </div>

                {/* Status Tabs */}
                <div className="grid grid-cols-3 sm:flex rounded-xl bg-slate-100 p-1 text-xs font-bold text-slate-600 w-full sm:w-auto text-center">
                  <button
                    type="button"
                    onClick={() => setActiveTab('all')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all truncate ${
                      activeTab === 'all' ? 'bg-white text-navy-950 shadow-xs' : 'hover:text-navy-950'
                    }`}
                  >
                    All ({todayDoses.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('pending')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all truncate ${
                      activeTab === 'pending' ? 'bg-white text-navy-950 shadow-xs' : 'hover:text-navy-950'
                    }`}
                  >
                    Pending ({todayDoses.filter((d) => d.status === 'scheduled').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('completed')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all truncate ${
                      activeTab === 'completed' ? 'bg-white text-navy-950 shadow-xs' : 'hover:text-navy-950'
                    }`}
                  >
                    Done ({todayDoses.filter((d) => d.status === 'taken').length})
                  </button>
                </div>
              </div>

              {/* Doses List */}
              <div className="space-y-3 pt-2">
                {todayDoses.length === 0 ? (
                  <div className="text-center py-10 px-4 rounded-2xl bg-slate-50/70 border border-dashed border-slate-200">
                    <Pill className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <h4 className="font-bold text-navy-950 text-sm">No doses scheduled for today</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-3">
                      Once medications are added to your cabinet, today&apos;s dosage slots will appear here automatically.
                    </p>
                    <Link
                      href="/medications"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-nest-600 hover:bg-nest-700 text-white rounded-xl text-xs font-bold shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Medication</span>
                    </Link>
                  </div>
                ) : (
                  todayDoses
                    .filter((d) => {
                      if (activeTab === 'pending') return d.status === 'scheduled';
                      if (activeTab === 'completed') return d.status === 'taken';
                      return true;
                    })
                    .map((dose) => (
                      <DoseItem key={dose.doseKey} item={dose} />
                    ))
                )}
              </div>
            </div>

            {/* Adherence Chart */}
            <AdherenceChart />

            {/* Shift Handoff Notes */}
            <HandoffNotes />
          </div>

          {/* Right Column (1 Col): Symptom Check-in, Appointments, Shared Timeline */}
          <div className="space-y-6">
            {/* Quick Symptom Logger Widget */}
            <SymptomLogger inline={true} />

            {/* Upcoming Appointments */}
            <AppointmentList />

            {/* Shared Care Timeline */}
            <div className="rounded-3xl bg-white border border-slate-200/90 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-navy-950">Shared Care Timeline</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Actor & timestamp audit</p>
                  </div>
                </div>
              </div>

              {careTimelineEvents.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs font-medium bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-4">
                  No recent care events recorded. Administered doses, symptom check-ins, and shift notes will appear here in real-time.
                </div>
              ) : (
                <div className="relative pl-4 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {careTimelineEvents.slice(0, 5).map((ev) => (
                    <div key={ev.id} className="relative group">
                      <div className="absolute -left-[1.35rem] top-1.5 w-3 h-3 rounded-full bg-nest-500 border-2 border-white ring-2 ring-slate-200" />
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="font-bold text-navy-900">{ev.actor}</span>
                          <span>{formatDateTime(ev.time)}</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-700 leading-snug">
                          {ev.title}
                        </p>
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md ${ev.badgeColor}`}>
                          {ev.badge}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
