'use client';

import React from 'react';
import Sidebar from '@/components/Sidebar';
import SymptomLogger from '@/components/SymptomLogger';
import { useCare } from '@/context/CareContext';
import {
  Activity,
  HeartPulse,
  Calendar,
  User,
  AlertTriangle,
  Smile,
  ShieldAlert,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

export default function HealthJournalPage() {
  const { healthLogs, careProfile } = useCare();

  return (
    <div className="flex-1 flex bg-[#FBFBF9]">
      <Sidebar />
      <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-nest-800 bg-nest-100 px-2.5 py-0.5 rounded-full">
                Symptom & Vitals Journal
              </span>
              <span className="text-xs text-slate-400">&bull;</span>
              <span className="text-xs font-semibold text-slate-600">
                Patient: {careProfile.fullName} ({careProfile.age}y)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-navy-950 mt-1">
              Wellbeing & Symptom Tracking
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column: Check-in Form & History (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <SymptomLogger />

            {/* Historical Log */}
            <div className="rounded-3xl bg-white border border-slate-200/90 p-5 md:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-navy-950">Logged Episodes</h3>
                    <p className="text-xs text-slate-500 font-medium">Historical symptom check-ins</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {healthLogs.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No symptom episodes logged yet.
                  </div>
                ) : (
                  healthLogs.map((log) => {
                    const isSevere = log.severity === 'severe';
                    const isFine = log.symptom === 'feeling_fine';

                    return (
                      <div
                        key={log._id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isSevere
                            ? 'bg-rose-50/70 border-rose-300'
                            : isFine
                            ? 'bg-emerald-50/50 border-emerald-200'
                            : 'bg-slate-50/70 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-navy-950 text-sm capitalize">
                              {log.symptom.replace('_', ' ')}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                isSevere
                                  ? 'bg-rose-200 text-rose-900'
                                  : isFine
                                  ? 'bg-emerald-200 text-emerald-900'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {log.severity}
                            </span>
                          </div>

                          <span className="text-[11px] text-slate-500 font-medium">
                            {formatDateTime(log.reportedAt)}
                          </span>
                        </div>

                        {log.notes && (
                          <p className="text-xs text-slate-700 font-medium mb-2">&ldquo;{log.notes}&rdquo;</p>
                        )}

                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>Reported by: <strong>{log.reportedByName || 'User'}</strong></span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Vitals Snapshot */}
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-4">
              <h3 className="text-base font-black text-navy-950 flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-nest-600" />
                <span>Recent Vitals Snapshot</span>
              </h3>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">Blood Pressure</span>
                  <span className="text-sm font-black text-navy-950">128 / 82 mmHg</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">Fasting Blood Glucose</span>
                  <span className="text-sm font-black text-navy-950">114 mg/dL</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">Resting Pulse</span>
                  <span className="text-sm font-black text-navy-950">74 bpm</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">Oxygen Saturation (SpO2)</span>
                  <span className="text-sm font-black text-emerald-700">98%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
