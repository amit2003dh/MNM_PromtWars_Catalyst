'use client';

import React from 'react';
import { AlertTriangle, ShieldCheck, Clock, User, X } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

interface DoubleDoseWarningModalProps {
  isOpen: boolean;
  doseName: string;
  administeredByName: string;
  recordedAt: string;
  onClose: () => void;
}

export default function DoubleDoseWarningModal({
  isOpen,
  doseName,
  administeredByName,
  recordedAt,
  onClose,
}: DoubleDoseWarningModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="double-dose-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 md:p-8 shadow-2xl border-4 border-amber-400">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          aria-label="Close warning modal"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-4 mb-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 ring-8 ring-amber-50">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
              Safety Concurrency Lock Engaged
            </span>
            <h2 id="double-dose-modal-title" className="text-xl md:text-2xl font-black text-navy-900 mt-1">
              Dose Already Administered!
            </h2>
          </div>
        </div>

        <div className="space-y-4 my-5 text-slate-700">
          <p className="text-base leading-relaxed">
            CareNest AI prevented a potential <strong className="text-rose-600">double-dose overdose</strong>. This medication dose has already been verified and recorded:
          </p>

          <div className="rounded-2xl bg-amber-50/80 p-4 border border-amber-200 space-y-2">
            <div className="flex items-center justify-between font-bold text-navy-900 border-b border-amber-200/60 pb-2">
              <span>Medication</span>
              <span className="text-nest-700">{doseName}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-slate-600">
                <User className="w-4 h-4 text-slate-500" />
                Administered By:
              </span>
              <span className="font-semibold text-navy-900">{administeredByName || 'Caregiver'}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-slate-600">
                <Clock className="w-4 h-4 text-slate-500" />
                Timestamp:
              </span>
              <span className="font-medium text-slate-800">{formatDateTime(recordedAt)}</span>
            </div>
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 leading-normal">
            <strong>Clinical Safety Protocol:</strong> Please do not give an extra pill. If the patient claims they have not received it or feels unwell, check the physical medication dispenser or contact primary caregiver Sunita Verma.
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 px-5 rounded-2xl bg-navy-900 hover:bg-navy-800 text-white font-bold text-base shadow-md transition-all text-center"
          >
            I Understand, Keep Me Safe
          </button>
        </div>
      </div>
    </div>
  );
}
