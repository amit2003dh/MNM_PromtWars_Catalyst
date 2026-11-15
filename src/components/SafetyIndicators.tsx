'use client';

import React from 'react';
import Link from 'next/link';
import { useCare } from '@/context/CareContext';
import {
  ShieldCheck,
  AlertTriangle,
  Activity,
  BellRing,
  ArrowRight,
  Package,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

export default function SafetyIndicators() {
  const { medications, healthLogs, todayDoses } = useCare();

  const lowStockMeds = medications.filter((m) => m.remainingQuantity <= m.refillThreshold);
  const recentSymptoms = healthLogs.slice(0, 2);
  const pendingDoses = todayDoses.filter((d) => d.status === 'scheduled');

  return (
    <div className="space-y-4">
      {/* 1. Concurrency Anti-Double-Dose Lock Status Card */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50 to-white border border-emerald-200/90 p-4 md:p-5 shadow-xs">
        <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-black text-navy-950 text-sm md:text-base">
                  Atomic Anti-Double-Dosing Concurrency Lock
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-950 font-black text-[10px] uppercase">
                  ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                Guarantees patient safety: Every dose has an atomic unique constraint. If two caregivers or family members attempt to record the same medication simultaneously, the duplicate is blocked instantly.
              </p>
            </div>
          </div>

          <Link
            href="/schedule"
            className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 shrink-0 self-center"
          >
            <span>Audit Schedule</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 2. Low-Stock Refill Alert (if any) */}
      {lowStockMeds.length > 0 && (
        <div className="rounded-3xl bg-rose-50/90 border border-rose-200 p-4 md:p-5 shadow-xs">
          <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-rose-950 text-sm md:text-base">
                    Medication Inventory Refill Needed ({lowStockMeds.length})
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 font-bold text-[10px] uppercase">
                    Low Stock
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-2">
                  {lowStockMeds.map((med) => (
                    <span
                      key={med._id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-rose-200 text-xs font-bold text-rose-800"
                    >
                      <span>{med.medicineName}:</span>
                      <strong className="text-rose-600">
                        {med.remainingQuantity} left (Threshold: {med.refillThreshold})
                      </strong>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <Link
              href="/medications"
              className="text-xs font-bold text-rose-800 hover:text-rose-950 flex items-center gap-1 shrink-0 self-center"
            >
              <span>Manage Cabinet</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* 3. Recent Symptom / Health Note banner */}
      {recentSymptoms.length > 0 && (
        <div className="rounded-3xl bg-slate-50 border border-slate-200 p-4 md:p-5 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-navy-950 text-sm md:text-base">
                  Latest Symptom Log: {recentSymptoms[0].symptom.replace('_', ' ').toUpperCase()} ({recentSymptoms[0].severity})
                </h4>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  &ldquo;{recentSymptoms[0].notes || 'No extra notes'}&rdquo; &bull; Logged by {recentSymptoms[0].reportedByName} ({formatDateTime(recentSymptoms[0].reportedAt)})
                </p>
              </div>
            </div>

            <Link
              href="/health-journal"
              className="text-xs font-bold text-navy-900 hover:text-nest-700 flex items-center gap-1 shrink-0 self-center"
            >
              <span>View Logs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
