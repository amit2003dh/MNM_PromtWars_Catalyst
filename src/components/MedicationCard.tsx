'use client';

import React, { useState } from 'react';
import { Medication } from '@/types';
import PillBadge from './PillBadge';
import VoiceReader from './VoiceReader';
import {
  Clock,
  Utensils,
  AlertCircle,
  Package,
  Edit2,
  Trash2,
  CheckCircle,
  RotateCcw,
} from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { useCare } from '@/context/CareContext';

interface MedicationCardProps {
  medication: Medication;
  onEdit?: (med: Medication) => void;
  onDelete?: (id: string) => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  allopathic: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  ayurvedic: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  herbal: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  otc: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
};

const MEAL_LABELS: Record<string, string> = {
  before_meal: 'Before food',
  after_meal: 'After food',
  with_meal: 'With food',
  empty_stomach: 'Empty stomach',
  anytime: 'Anytime',
};

export default function MedicationCard({ medication, onEdit, onDelete }: MedicationCardProps) {
  const { user, updateMedication } = useCare();
  const [isRefilling, setIsRefilling] = useState(false);

  const isLowStock = medication.remainingQuantity <= medication.refillThreshold;
  const stockPercentage = Math.min(
    100,
    Math.round((medication.remainingQuantity / Math.max(1, medication.totalQuantity)) * 100)
  );

  const catStyle = CATEGORY_COLORS[medication.medicineCategory] || CATEGORY_COLORS.allopathic;

  const audioText = `${medication.medicineName}. Dosage is ${medication.dosage}. ${
    medication.instructions
  }. Timing is ${medication.scheduledTimes.map(formatTime).join(' and ')}. ${
    MEAL_LABELS[medication.mealRelation] || ''
  }. Pill is ${medication.pillColor} and ${medication.pillShape}.`;

  const handleQuickRefill = async () => {
    setIsRefilling(true);
    await updateMedication(medication._id, {
      remainingQuantity: medication.remainingQuantity + 30,
      totalQuantity: Math.max(medication.totalQuantity, medication.remainingQuantity + 30),
    });
    setIsRefilling(false);
  };

  return (
    <div
      className={`rounded-3xl bg-white border transition-all duration-200 p-5 md:p-6 shadow-xs hover:shadow-md ${
        isLowStock ? 'border-amber-300 ring-1 ring-amber-200 bg-amber-50/20' : 'border-slate-200'
      }`}
    >
      {/* Top row: Pill badge, Name, Category, TTS voice reader */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3.5">
          <PillBadge
            color={medication.pillColor}
            shape={medication.pillShape}
            size="lg"
            className="shrink-0 mt-0.5"
          />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg md:text-xl font-black text-navy-950 leading-tight">
                {medication.medicineName}
              </h3>
              <span
                className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
              >
                {medication.medicineCategory}
              </span>
              {medication.reconciliationStatus && medication.reconciliationStatus !== 'CONTINUE' && (
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                  {medication.reconciliationStatus}
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-nest-700 mt-0.5">{medication.dosage}</p>
          </div>
        </div>

        {/* Read aloud VoiceReader button */}
        <VoiceReader text={audioText} label="Listen" size="sm" />
      </div>

      {/* Instructions & Meal notes */}
      <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
        <p className="text-sm text-slate-700 font-medium leading-relaxed">
          {medication.instructions}
        </p>

        <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-slate-200">
            <Utensils className="w-3.5 h-3.5 text-nest-600" />
            {MEAL_LABELS[medication.mealRelation] || medication.mealRelation}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-nest-600" />
            {medication.scheduledTimes.map(formatTime).join(', ')}
          </span>
          <span className="text-slate-400">
            Appearance: {medication.pillColor} ({medication.pillShape})
          </span>
        </div>
      </div>

      {/* Inventory Stock Bar & Refill alert */}
      <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 font-bold text-slate-700">
            <Package className="w-4 h-4 text-slate-400" />
            Inventory Stock:
          </span>
          <span
            className={`font-black ${
              isLowStock ? 'text-rose-600 flex items-center gap-1' : 'text-slate-700'
            }`}
          >
            {isLowStock && <AlertCircle className="w-3.5 h-3.5" />}
            {medication.remainingQuantity} / {medication.totalQuantity} left
          </span>
        </div>

        {/* Visual progress bar */}
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-2.5 rounded-full transition-all duration-300 ${
              isLowStock ? 'bg-rose-500' : 'bg-nest-500'
            }`}
            style={{ width: `${stockPercentage}%` }}
          />
        </div>

        {isLowStock && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
            <span className="font-semibold">
              Refill Alert! Below threshold ({medication.refillThreshold} units).
            </span>
            <button
              type="button"
              disabled={isRefilling}
              onClick={handleQuickRefill}
              className="text-[11px] font-bold text-rose-700 hover:text-rose-900 underline flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              {isRefilling ? 'Adding...' : '+30 Quick Refill'}
            </button>
          </div>
        )}
      </div>

      {/* Actions (Caregiver / Family / Admin) */}
      {(user.role === 'caregiver' || user.role === 'family') && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(medication)}
              className="p-2 rounded-xl text-slate-500 hover:text-navy-900 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5"
              title="Edit medication"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(medication._id)}
              className="p-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1.5"
              title="Discontinue medication"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Discontinue</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
