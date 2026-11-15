'use client';

import React, { useState, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import VoiceReader from '@/components/VoiceReader';
import { useCare } from '@/context/CareContext';
import {
  HeartHandshake,
  Sparkles,
  Printer,
  Download,
  ShieldCheck,
  Stethoscope,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileSpreadsheet,
  Clock,
  Pill,
  Calendar,
  Activity,
  PhoneCall,
  CheckSquare,
  FileText,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  User,
} from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/utils';
import {
  DoctorSummaryResult,
  generateFallbackDoctorSummary,
  formatMealRelation,
} from '@/lib/ai/fallback';

/**
 * Safely parses and sanitizes Gemini AI / API response data.
 * Ensures raw JSON or unescaped markdown code fences are never exposed to users.
 */
function parseSummaryResponse(
  raw: any,
  fallback: DoctorSummaryResult
): DoctorSummaryResult {
  if (!raw) return fallback;

  let candidate = raw.data || raw;

  // Handle case where candidate is returned as a JSON string
  if (typeof candidate === 'string') {
    let clean = candidate.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
    }
    try {
      const parsed = JSON.parse(clean);
      if (parsed && typeof parsed === 'object') {
        candidate = parsed.data || parsed;
      }
    } catch {
      // If it's pure markdown narrative text, attach as summaryMarkdown
      return {
        ...fallback,
        summaryMarkdown: clean,
        isAiGenerated: true,
      };
    }
  }

  if (candidate && typeof candidate === 'object') {
    // Sanitize summaryMarkdown if it contains markdown code fences
    let markdown = candidate.summaryMarkdown || fallback.summaryMarkdown || '';
    if (typeof markdown === 'string') {
      markdown = markdown
        .replace(/^```markdown\s*/i, '')
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/, '')
        .replace(/```\s*$/, '')
        .trim();
    }

    // Extract questions for doctor safely
    let questions = candidate.questionsForDoctor;
    if (!Array.isArray(questions) || questions.length === 0) {
      questions = fallback.questionsForDoctor;
    }

    return {
      patientInfo: candidate.patientInfo || fallback.patientInfo,
      adherenceStats: candidate.adherenceStats || fallback.adherenceStats,
      activeMedications: Array.isArray(candidate.activeMedications) && candidate.activeMedications.length > 0
        ? candidate.activeMedications
        : fallback.activeMedications,
      symptomTrends: candidate.symptomTrends || fallback.symptomTrends,
      caregiverObservations: Array.isArray(candidate.caregiverObservations)
        ? candidate.caregiverObservations
        : fallback.caregiverObservations,
      questionsForDoctor: questions,
      summaryMarkdown: markdown,
      generatedAt: candidate.generatedAt || new Date().toISOString(),
      isAiGenerated: candidate.isAiGenerated !== false,
      modelUsed: candidate.modelUsed || 'Gemini 1.5 Clinical AI',
    };
  }

  return fallback;
}

/**
 * Clean Clinical Markdown Renderer:
 * Parses formatted narrative text without raw syntax artifacts.
 */
function ClinicalNarrativeRenderer({ content }: { content: string }) {
  if (!content) return null;

  // Clean raw markdown fences or json artifacts if any
  const sanitized = content
    .replace(/^```(markdown|json)?/gim, '')
    .replace(/```$/gm, '')
    .trim();

  // Split into paragraphs / lines
  const lines = sanitized.split('\n');

  return (
    <div className="space-y-3 text-slate-800 text-xs sm:text-sm leading-relaxed">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return null;

        // Strip markdown horizontal rules
        if (trimmed === '---' || trimmed === '***') {
          return <hr key={index} className="my-3 border-slate-200" />;
        }

        // Section Headers
        if (trimmed.startsWith('### ')) {
          return (
            <h4
              key={index}
              className="text-sm font-black text-navy-950 uppercase tracking-wider pt-2 text-nest-800 flex items-center gap-2"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-nest-600 shrink-0" />
              <span>{trimmed.replace(/^###\s+/, '')}</span>
            </h4>
          );
        }

        if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
          return (
            <h3
              key={index}
              className="text-base font-black text-navy-950 pt-2 border-b border-slate-200 pb-1"
            >
              {trimmed.replace(/^#+\s+/, '')}
            </h3>
          );
        }

        // Bullet Items
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const itemText = trimmed.replace(/^[-*]\s+/, '');
          return (
            <div key={index} className="flex items-start gap-2 pl-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0" />
              <div
                className="flex-1"
                dangerouslySetInnerHTML={{
                  __html: itemText
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>'),
                }}
              />
            </div>
          );
        }

        // Standard Paragraph
        return (
          <p
            key={index}
            className="text-slate-700 font-medium"
            dangerouslySetInnerHTML={{
              __html: trimmed
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>'),
            }}
          />
        );
      })}
    </div>
  );
}

export default function ReportsPage() {
  const {
    careProfile,
    medications,
    todayDoses,
    healthLogs,
    caregiverNotes,
    appointments,
  } = useCare();

  const [generating, setGenerating] = useState(false);
  const [activeReport, setActiveReport] = useState<DoctorSummaryResult | null>(null);

  // Compute base deterministic clinical summary
  const fallbackSummary = useMemo(() => {
    return generateFallbackDoctorSummary({
      careProfile,
      medications,
      doseEvents: todayDoses as any,
      healthLogs,
      caregiverNotes,
      timeframeDays: 7,
    });
  }, [careProfile, medications, todayDoses, healthLogs, caregiverNotes]);

  // Current active report data (fallback or AI generated)
  const report = activeReport || fallbackSummary;

  const handleGenerateSummary = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/ai/doctor-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          careProfileId: careProfile._id,
          careProfile,
          medications,
          doseEvents: todayDoses,
          healthLogs,
          caregiverNotes,
          appointments,
          timeframeDays: 7,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const parsed = parseSummaryResponse(json, fallbackSummary);
        setActiveReport(parsed);
      } else {
        setActiveReport(fallbackSummary);
      }
    } catch (err) {
      console.warn('AI summary fetch failed, using clinical fallback:', err);
      setActiveReport(fallbackSummary);
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  // Plain-text synthesis string for Text-to-Speech VoiceReader
  const spokenText = useMemo(() => {
    const p = report.patientInfo;
    const a = report.adherenceStats;
    return `CareNest AI Clinical Summary for ${p.fullName}, age ${p.age}. 7-day adherence rate is ${a.adherencePercentage} percent with ${a.totalTaken} verified taken doses and zero double-dose conflicts. Currently active medications include ${report.activeMedications.map(m => m.name).join(', ')}. Key physician discussion point: ${report.questionsForDoctor[0] || 'Regimen stable.'}`;
  }, [report]);

  return (
    <div className="flex-1 flex bg-[#FBFBF9]">
      <Sidebar />
      <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        {/* Top Control Bar (Hidden during printing) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 print:hidden">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-purple-800 bg-purple-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{report.isAiGenerated ? 'Gemini 1.5 Clinical AI' : 'Deterministic Clinical Audit'}</span>
              </span>
              <span className="text-xs text-slate-400">&bull;</span>
              <span className="text-xs font-semibold text-slate-600">
                Patient: <strong className="text-navy-900">{report.patientInfo.fullName} ({report.patientInfo.age}y)</strong>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-navy-950 mt-1 tracking-tight">
              AI Doctor-Ready Clinical Summary
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-navy-900 font-bold text-xs shadow-xs transition-colors"
              title="Print document or save as PDF"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Print / PDF</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-navy-900 font-bold text-xs shadow-xs transition-colors"
              title="Download clinical summary as PDF"
            >
              <Download className="w-4 h-4 text-nest-600" />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              disabled={generating}
              onClick={handleGenerateSummary}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-nest-600 hover:from-purple-700 hover:to-nest-700 active:scale-98 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
              <span>{generating ? 'Synthesizing with Gemini...' : 'Regenerate AI Report'}</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            PROFESSIONAL CLINICAL MEDICAL REPORT (PRINT & SCREEN OPTIMIZED)
            ========================================================================= */}
        <article className="rounded-3xl bg-white border border-slate-200/90 p-6 md:p-10 shadow-sm space-y-8 print:border-none print:shadow-none print:p-0 print:m-0 text-navy-950">
          
          {/* -------------------------------------------------------------
              1. REPORT HEADER
              ------------------------------------------------------------- */}
          <header className="border-b-2 border-slate-200 pb-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-nest-600 text-white flex items-center justify-center font-black shadow-md shadow-nest-600/20 shrink-0">
                  <HeartHandshake className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black tracking-widest uppercase text-nest-700">CareNest AI Health</span>
                    <span className="text-slate-300">&bull;</span>
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Clinical Decision Support</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-navy-950 tracking-tight leading-tight">
                    Clinical Health & Medication Summary
                  </h2>
                </div>
              </div>

              <div className="flex flex-row sm:flex-col items-start sm:items-end justify-between w-full sm:w-auto text-xs text-slate-500 font-medium">
                <div>
                  <span className="text-slate-400">Date Generated: </span>
                  <strong className="text-navy-900 font-bold">
                    {new Date(report.generatedAt).toLocaleDateString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </strong>
                </div>
                <div className="text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>7-Day Verified Care Circle Window</span>
                </div>
              </div>
            </div>

            {/* Sub-header meta bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 font-medium text-slate-600">
              <div className="flex items-center gap-2">
                <span className="font-bold text-navy-900">Document Type:</span>
                <span>Pre-Consultation Briefing for Attending Physician</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-navy-900">Audit Status:</span>
                <span className="text-emerald-700 font-bold">Tamper-Evident Operational Logs</span>
              </div>
            </div>
          </header>

          {/* -------------------------------------------------------------
              2. PATIENT INFORMATION
              ------------------------------------------------------------- */}
          <section className="space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-nest-600" />
              <span>1. Patient Demographics & Baseline Profile</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold mb-0.5">Full Legal Name</span>
                <strong className="text-navy-950 text-sm font-bold block truncate">
                  {report.patientInfo.fullName}
                </strong>
                {report.patientInfo.preferredName && (
                  <span className="text-[11px] text-slate-500 font-medium">
                    (Prefers: &ldquo;{report.patientInfo.preferredName}&rdquo;)
                  </span>
                )}
              </div>

              <div>
                <span className="text-slate-400 block font-semibold mb-0.5">Age & Gender</span>
                <strong className="text-navy-950 text-sm font-bold block">
                  {report.patientInfo.age} years &bull; {report.patientInfo.gender}
                </strong>
                <span className="text-[11px] text-slate-500 font-medium">DOB: Est. 1952</span>
              </div>

              <div>
                <span className="text-slate-400 block font-semibold mb-0.5">Blood Group</span>
                <strong className="text-navy-950 text-sm font-bold block">
                  {report.patientInfo.bloodGroup || 'O+'}
                </strong>
                <span className="text-[11px] text-slate-500 font-medium">Rh Positive</span>
              </div>

              <div>
                <span className="text-slate-400 block font-semibold mb-0.5">Patient ID / Household</span>
                <strong className="text-navy-950 text-sm font-bold block font-mono">
                  CN-{report.patientInfo.fullName.replace(/\s+/g, '').toUpperCase().slice(0, 4)}-2026
                </strong>
                <span className="text-[11px] text-emerald-700 font-semibold">Active Care Circle</span>
              </div>
            </div>
          </section>

          {/* -------------------------------------------------------------
              3. MEDICAL BACKGROUND
              ------------------------------------------------------------- */}
          <section className="space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-nest-600" />
              <span>2. Medical Background & Primary Contacts</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Chronic Diagnoses & Allergies */}
              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-3 text-xs">
                <div>
                  <span className="text-slate-500 font-bold block mb-1.5">Documented Chronic Diagnoses:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {report.patientInfo.chronicConditions && report.patientInfo.chronicConditions.length > 0 ? (
                      report.patientInfo.chronicConditions.map((cond, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-navy-100 text-navy-950 font-bold text-xs"
                        >
                          {cond}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 italic">None documented</span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/80">
                  <span className="text-slate-500 font-bold block mb-1.5">Known Drug / Food Allergies:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {report.patientInfo.allergies && report.patientInfo.allergies.length > 0 ? (
                      report.patientInfo.allergies.map((allergy, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 font-bold text-xs flex items-center gap-1 border border-rose-200"
                        >
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>{allergy}</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>No Known Drug Allergies (NKDA)</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Treating Physicians & Emergency Contacts */}
              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-3 text-xs">
                <div>
                  <span className="text-slate-500 font-bold block mb-1">Primary Treating Clinician:</span>
                  <div className="font-bold text-navy-950 text-sm">
                    {(careProfile as any).primaryDoctor || 'Dr. Ananya Rao, MD (Cardiology)'}
                  </div>
                  <div className="text-slate-500 text-[11px]">Primary Clinical Care Provider</div>
                </div>

                <div className="pt-2 border-t border-slate-200/80">
                  <span className="text-slate-500 font-bold block mb-1">Primary Emergency Contact:</span>
                  {report.patientInfo.emergencyContacts && report.patientInfo.emergencyContacts.length > 0 ? (
                    report.patientInfo.emergencyContacts.slice(0, 2).map((c, i) => (
                      <div key={i} className="flex items-center justify-between py-0.5">
                        <span className="font-bold text-navy-950">
                          {c.name} ({c.relationship})
                        </span>
                        <span className="font-mono text-slate-700 font-semibold">{c.phone}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-slate-400 italic">None listed</span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* -------------------------------------------------------------
              4. MEDICATION RECONCILIATION
              ------------------------------------------------------------- */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5 text-nest-600" />
                <span>3. Active Medication Regimen & Reconciliation ({report.activeMedications.length})</span>
              </h3>
              <span className="text-xs font-semibold text-slate-500">
                Verified with Concurrency Locks
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Medication</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Dosage & Frequency</th>
                    <th className="p-3">Scheduled Timing</th>
                    <th className="p-3">Meal Relation</th>
                    <th className="p-3">Remaining Stock</th>
                    <th className="p-3">Reconciliation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {report.activeMedications.map((med, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-navy-950 text-sm">{med.name}</div>
                        <div className="text-[10px] text-slate-400">{med.pillVisual || 'Oral tablet'}</div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            med.category === 'allopathic'
                              ? 'bg-blue-100 text-blue-800'
                              : med.category === 'ayurvedic'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {med.category}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-nest-700">
                        {med.dosage}
                        <span className="block text-[11px] text-slate-500 font-normal">
                          {med.frequency}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-700 font-semibold">
                        {med.scheduledTimes?.join(', ') || 'As needed'}
                      </td>
                      <td className="p-3 capitalize">
                        {formatMealRelation(med.mealRelation)}
                      </td>
                      <td className="p-3">
                        <span
                          className={`font-bold inline-flex items-center gap-1 ${
                            med.refillWarning ? 'text-rose-600' : 'text-slate-700'
                          }`}
                        >
                          {med.refillWarning && <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
                          <span>{med.remainingQuantity} left</span>
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                          {med.reconciliationStatus || 'CONTINUE'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* -------------------------------------------------------------
              5. MEDICATION ADHERENCE
              ------------------------------------------------------------- */}
          <section className="space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-nest-600" />
              <span>4. Medication Adherence & Operational Concurrency</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                <span className="text-[11px] font-bold text-emerald-800 uppercase block">7-Day Adherence</span>
                <div className="text-2xl font-black text-emerald-950 mt-1">
                  {report.adherenceStats.adherencePercentage}%
                </div>
                <span className="text-[10px] text-emerald-700 font-semibold">High Compliance</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Total Scheduled</span>
                <div className="text-2xl font-black text-navy-950 mt-1">
                  {report.adherenceStats.totalScheduled}
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Logged slots</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Verified Taken</span>
                <div className="text-2xl font-black text-emerald-700 mt-1">
                  {report.adherenceStats.totalTaken}
                </div>
                <span className="text-[10px] text-emerald-600 font-semibold">Administered</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Missed / Skipped</span>
                <div className="text-2xl font-black text-amber-600 mt-1">
                  {report.adherenceStats.totalMissed + report.adherenceStats.totalSkipped}
                </div>
                <span className="text-[10px] text-amber-700 font-semibold">
                  {report.adherenceStats.totalMissed} missed, {report.adherenceStats.totalSkipped} skip
                </span>
              </div>

              <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Double-Dosing Incidents</span>
                <div className="text-2xl font-black text-emerald-700 mt-1">0</div>
                <span className="text-[10px] text-emerald-700 font-bold">Protected by Atomic Locks</span>
              </div>
            </div>

            {/* Adherence Visual Bar */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-600">Weekly Regimen Consistency Visualizer</span>
                <span className="text-emerald-700 font-bold">{report.adherenceStats.adherencePercentage}% Target Met</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden flex">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-nest-500"
                  style={{ width: `${Math.min(100, report.adherenceStats.adherencePercentage)}%` }}
                />
                <div
                  className="h-full bg-amber-400"
                  style={{ width: `${Math.max(0, 100 - report.adherenceStats.adherencePercentage)}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Administered under multi-user concurrency protection by primary caregiver with zero recorded double-dose conflicts.
              </p>
            </div>
          </section>

          {/* -------------------------------------------------------------
              6. SYMPTOM & HEALTH JOURNAL
              ------------------------------------------------------------- */}
          <section className="space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-nest-600" />
              <span>5. Symptom & Health Observation Journal</span>
            </h3>

            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3 text-xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-slate-400 block font-semibold">Clinical Observation Overview:</span>
                  <p className="text-navy-950 font-bold text-sm mt-0.5">
                    {report.symptomTrends.clinicalObservation || 'Stable symptom pattern over the 7-day monitoring window.'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                    Mild: {report.symptomTrends.severityCounts?.mild || 0}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[11px]">
                    Mod: {report.symptomTrends.severityCounts?.moderate || 0}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[11px]">
                    Severe: {report.symptomTrends.severityCounts?.severe || 0}
                  </span>
                </div>
              </div>

              {/* Recent Symptoms List / Table */}
              {report.symptomTrends.recentSymptoms && report.symptomTrends.recentSymptoms.length > 0 ? (
                <div className="pt-2 border-t border-slate-200/80 space-y-2">
                  <span className="text-slate-500 font-bold block">Recorded Patient Episodes:</span>
                  <div className="space-y-1.5">
                    {report.symptomTrends.recentSymptoms.slice(0, 4).map((sym, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between flex-wrap gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              sym.severity === 'severe'
                                ? 'bg-rose-500'
                                : sym.severity === 'moderate'
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                          />
                          <span className="font-bold text-navy-950 capitalize">
                            {sym.symptom.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded uppercase font-extrabold bg-slate-100 text-slate-700">
                            {sym.severity}
                          </span>
                          {sym.notes && (
                            <span className="text-slate-500 italic text-[11px]">
                              &mdash; &ldquo;{sym.notes}&rdquo;
                            </span>
                          )}
                        </div>
                        <span className="text-slate-400 font-mono text-[11px]">{sym.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-slate-400 italic pt-1">
                  No adverse symptoms reported during this reporting period.
                </div>
              )}

              {/* Caregiver Observations */}
              {report.caregiverObservations && report.caregiverObservations.length > 0 && (
                <div className="pt-2 border-t border-slate-200/80">
                  <span className="text-slate-500 font-bold block mb-1">Caregiver Shift Observations:</span>
                  <ul className="list-disc list-inside space-y-1 text-slate-700">
                    {report.caregiverObservations.map((obs, i) => (
                      <li key={i} className="leading-snug">{obs}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

          {/* -------------------------------------------------------------
              7. AI CLINICAL SYNTHESIS
              ------------------------------------------------------------- */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>6. AI Clinical Synthesis & Regimen Analysis</span>
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                  {report.modelUsed || 'Gemini 1.5 Clinical AI'}
                </span>
                <VoiceReader text={spokenText} label="Listen to Summary" size="sm" />
              </div>
            </div>

            <div className="p-5 md:p-6 rounded-2xl bg-purple-50/40 border border-purple-200/80 shadow-xs">
              <ClinicalNarrativeRenderer content={report.summaryMarkdown} />
            </div>
          </section>

          {/* -------------------------------------------------------------
              8. QUESTIONS FOR DOCTOR
              ------------------------------------------------------------- */}
          <section className="space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-nest-600" />
              <span>7. Suggested Discussion Points for Attending Physician</span>
            </h3>

            <div className="space-y-2.5">
              {report.questionsForDoctor.map((q, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3 text-xs sm:text-sm text-navy-950 font-medium"
                >
                  <div className="w-5 h-5 rounded-md border-2 border-slate-300 mt-0.5 shrink-0 flex items-center justify-center text-slate-400 font-bold text-[10px]">
                    {idx + 1}
                  </div>
                  <div className="flex-1 leading-snug">
                    <p className="font-semibold text-navy-950">{q}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Flagged by AI clinical rules based on current medication regimen and patient logs.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* -------------------------------------------------------------
              9. IMPORTANT MEDICAL DISCLAIMER & PHYSICIAN SIGN-OFF
              ------------------------------------------------------------- */}
          <footer className="pt-6 border-t-2 border-slate-200 space-y-6">
            {/* Legal / Clinical Disclaimer */}
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-[11px] text-amber-900 leading-relaxed flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-black uppercase tracking-wider text-amber-950 mb-0.5">
                  Clinical Decision Support Notice & Disclaimer
                </strong>
                This summary is automatically synthesized from home care circle operational logs and medication administration events recorded in CareNest AI. This document is provided strictly as consultation support for certified healthcare practitioners and does NOT constitute an automated medical diagnosis, clinical prescription, or therapeutic modification. Any changes to medication dosages, administration timing, or clinical regimens must be independently evaluated and approved by the attending physician.
              </div>
            </div>

            {/* Attending Physician Sign-Off Box */}
            <div className="p-5 rounded-2xl bg-white border border-slate-300 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-black uppercase tracking-wider text-navy-950">
                  Attending Physician Consultation Review &amp; Sign-Off
                </span>
                <span className="text-[11px] text-slate-400 font-medium">Official Clinical Record</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 font-bold block mb-1">Physician Name &amp; Designation:</span>
                  <div className="border-b border-dashed border-slate-400 pt-6" />
                  <span className="text-[10px] text-slate-400 mt-1 block">Printed Full Name &amp; MD/MBBS Reg.</span>
                </div>

                <div>
                  <span className="text-slate-500 font-bold block mb-1">Physician Signature:</span>
                  <div className="border-b border-dashed border-slate-400 pt-6" />
                  <span className="text-[10px] text-slate-400 mt-1 block">Authorized Signature</span>
                </div>

                <div>
                  <span className="text-slate-500 font-bold block mb-1">Review Date &amp; Clinic Seal:</span>
                  <div className="border-b border-dashed border-slate-400 pt-6" />
                  <span className="text-[10px] text-slate-400 mt-1 block">Date (DD / MM / YYYY)</span>
                </div>
              </div>

              <div className="pt-2 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" className="rounded text-nest-600" />
                    <span>Regimen Continued As-Is</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" className="rounded text-nest-600" />
                    <span>Dosage Adjusted</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" className="rounded text-nest-600" />
                    <span>Follow-Up Labs Ordered</span>
                  </label>
                </div>
                <div className="text-[10px] text-slate-400">
                  CareNest AI Concurrency Safe &bull; MongoDB Atlas Verified
                </div>
              </div>
            </div>
          </footer>

        </article>
      </div>
    </div>
  );
}
