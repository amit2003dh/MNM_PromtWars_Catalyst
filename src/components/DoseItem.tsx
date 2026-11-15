'use client';

import React, { useState } from 'react';
import { ScheduleItem } from '@/types';
import PillBadge from './PillBadge';
import VoiceReader from './VoiceReader';
import { CheckCircle2, Clock, Utensils, ShieldCheck, UserCheck, AlertTriangle } from 'lucide-react';
import { formatTime, formatDateTime } from '@/lib/utils';
import { useCare } from '@/context/CareContext';

interface DoseItemProps {
  item: ScheduleItem;
  highlightSenior?: boolean;
}

const MEAL_LABELS: Record<string, string> = {
  before_meal: 'Before food',
  after_meal: 'After food',
  with_meal: 'With food',
  empty_stomach: 'Empty stomach',
  anytime: 'Anytime',
};

export default function DoseItem({ item, highlightSenior = false }: DoseItemProps) {
  const { user, seniorMode, administerDose } = useCare();
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const isTaken = item.status === 'taken';

  const audioText = `Dose at ${formatTime(item.scheduledTime)}. Take ${item.dosage} of ${
    item.medicineName
  }. ${item.instructions}. ${MEAL_LABELS[item.mealRelation] || ''}.`;

  const handleAdminister = async () => {
    if (loading || isTaken) return;
    setLoading(true);
    setFeedback(null);
    try {
      const result = await administerDose(item.doseKey);
      if (!result.success && result.conflict) {
        setFeedback('Anti-Double-Dose conflict detected!');
      } else if (result.success) {
        setFeedback('Safely recorded!');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`rounded-3xl border transition-all duration-200 overflow-hidden ${
        isTaken
          ? 'bg-emerald-50/40 border-emerald-200 shadow-xs'
          : 'bg-white border-slate-200/90 shadow-xs hover:border-nest-300 hover:shadow-md'
      } ${highlightSenior ? 'p-6 md:p-8' : 'p-4 md:p-6'}`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left side: Time, Pill representation, Name, Instructions */}
        <div className="flex items-start gap-4">
          {/* Time Badge */}
          <div
            className={`flex flex-col items-center justify-center rounded-2xl p-3 shrink-0 ${
              isTaken ? 'bg-emerald-100 text-emerald-900' : 'bg-nest-50 text-nest-900 border border-nest-200'
            } ${highlightSenior ? 'w-24 h-24' : 'w-18 h-18'}`}
          >
            <Clock className={highlightSenior ? 'w-6 h-6 mb-1 text-nest-600' : 'w-4 h-4 mb-1 text-nest-600'} />
            <span className={`font-black tracking-tight ${highlightSenior ? 'text-lg' : 'text-sm'}`}>
              {formatTime(item.scheduledTime)}
            </span>
          </div>

          {/* Details */}
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <PillBadge color={item.pillColor} shape={item.pillShape} size={highlightSenior ? 'lg' : 'md'} />
              <h3 className={`font-black text-navy-950 leading-tight ${highlightSenior ? 'text-2xl' : 'text-lg'}`}>
                {item.medicineName}
              </h3>
              <span className="font-extrabold text-nest-700 bg-nest-50 px-2.5 py-0.5 rounded-full text-xs">
                {item.dosage}
              </span>
            </div>

            <p className={`text-slate-600 font-medium ${highlightSenior ? 'text-base' : 'text-sm'}`}>
              {item.instructions}
            </p>

            <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 flex-wrap pt-1">
              <span className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg">
                <Utensils className="w-3.5 h-3.5 text-slate-400" />
                {MEAL_LABELS[item.mealRelation] || item.mealRelation}
              </span>
              <span className="text-slate-400">
                Pill: {item.pillColor} ({item.pillShape})
              </span>
            </div>

            {/* If Taken: show who and timestamp */}
            {isTaken && (
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-100/80 border border-emerald-300 text-emerald-950 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  Administered by <strong>{item.administeredByName || 'Caregiver'}</strong>
                  {item.recordedAt && ` at ${formatDateTime(item.recordedAt)}`}
                </span>
              </div>
            )}

            {feedback && !isTaken && (
              <div className="text-xs font-bold text-rose-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {feedback}
              </div>
            )}
          </div>
        </div>

        {/* Right side: Audio VoiceReader + Action Button */}
        <div className="flex items-center gap-3 self-end lg:self-center shrink-0 w-full sm:w-auto justify-end">
          <VoiceReader text={audioText} label="Listen" size={highlightSenior ? 'lg' : 'md'} />

          {isTaken ? (
            <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-100 text-emerald-800 font-extrabold text-sm border border-emerald-300 shadow-xs">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
              <span>Dose Verified</span>
            </div>
          ) : user.role === 'family' ? (
            <div className="px-4 py-2.5 rounded-2xl bg-slate-100 text-slate-600 font-bold text-xs border border-slate-200">
              Scheduled (Caregiver will log)
            </div>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={handleAdminister}
              className={`font-black rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 ${
                seniorMode || highlightSenior
                  ? 'w-full sm:w-auto px-6 py-4 text-lg bg-emerald-600 hover:bg-emerald-700 text-white min-h-[64px]'
                  : 'px-5 py-3 text-sm bg-nest-600 hover:bg-nest-700 text-white'
              }`}
            >
              <CheckCircle2 className={highlightSenior ? 'w-6 h-6' : 'w-4 h-4'} />
              <span>
                {loading
                  ? 'Verifying Lock...'
                  : user.role === 'senior'
                  ? 'I HAVE TAKEN MY MEDICINE'
                  : 'Administer Dose'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
