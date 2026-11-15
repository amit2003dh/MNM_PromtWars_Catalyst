'use client';

import React, { useState } from 'react';
import { SymptomType } from '@/types';
import { useCare } from '@/context/CareContext';
import {
  Smile,
  AlertTriangle,
  HeartPulse,
  Brain,
  Coffee,
  HelpCircle,
  Check,
  Send,
  Sparkles,
} from 'lucide-react';

interface SymptomLoggerProps {
  onSuccess?: () => void;
  inline?: boolean;
}

const SYMPTOMS: { id: SymptomType; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { id: 'feeling_fine', label: 'Feeling Great / Fine', icon: Smile, color: 'hover:border-emerald-400 hover:bg-emerald-50 text-emerald-700' },
  { id: 'dizziness', label: 'Dizziness / Vertigo', icon: AlertTriangle, color: 'hover:border-amber-400 hover:bg-amber-50 text-amber-700' },
  { id: 'weakness', label: 'Weakness / Fatigue', icon: HeartPulse, color: 'hover:border-orange-400 hover:bg-orange-50 text-orange-700' },
  { id: 'confusion', label: 'Confusion / Foggy', icon: Brain, color: 'hover:border-rose-400 hover:bg-rose-50 text-rose-700' },
  { id: 'drowsiness', label: 'Sleepy / Drowsy', icon: Coffee, color: 'hover:border-purple-400 hover:bg-purple-50 text-purple-700' },
  { id: 'stomach_discomfort', label: 'Stomach Ache / Nausea', icon: AlertTriangle, color: 'hover:border-yellow-400 hover:bg-yellow-50 text-yellow-700' },
  { id: 'other', label: 'Other Sensation', icon: HelpCircle, color: 'hover:border-slate-400 hover:bg-slate-50 text-slate-700' },
];

export default function SymptomLogger({ onSuccess, inline = false }: SymptomLoggerProps) {
  const { logSymptom, user, seniorMode } = useCare();
  const [selectedSymptom, setSelectedSymptom] = useState<SymptomType | null>(null);
  const [severity, setSeverity] = useState<'mild' | 'moderate' | 'severe'>('mild');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSymptom || submitting) return;

    setSubmitting(true);
    try {
      await logSymptom(selectedSymptom, severity, notes.trim());
      setSuccessMsg(true);
      setNotes('');
      setSelectedSymptom(null);
      setSeverity('mild');
      setTimeout(() => {
        setSuccessMsg(false);
        if (onSuccess) onSuccess();
      }, 2000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`rounded-3xl bg-white border border-slate-200/90 shadow-sm ${
        inline ? 'p-4' : 'p-6 md:p-8'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-navy-950 flex items-center gap-2">
            <HeartPulse className="w-6 h-6 text-nest-600" />
            <span>How Are You Feeling Right Now?</span>
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            1-tap check-in for {user.role === 'senior' ? 'your daily wellbeing' : 'patient symptoms'}
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="mb-4 p-4 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold flex items-center gap-2 animate-in fade-in">
          <Check className="w-5 h-5 text-emerald-700" />
          <span>Thank you! Your health check-in has been recorded and shared with your care team.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Step 1: Select Symptom Grid */}
        <div>
          <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
            1. Tap your feeling / symptom
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {SYMPTOMS.map((item) => {
              const Icon = item.icon;
              const isSelected = selectedSymptom === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedSymptom(item.id)}
                  className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border text-center transition-all ${
                    seniorMode ? 'min-h-[76px]' : 'min-h-[64px]'
                  } ${
                    isSelected
                      ? 'bg-nest-600 text-white border-nest-600 font-black shadow-md scale-102 ring-2 ring-nest-400'
                      : `bg-slate-50 border-slate-200 text-slate-700 font-bold ${item.color}`
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-1.5 ${isSelected ? 'text-white' : ''}`} />
                  <span className="text-xs sm:text-sm leading-tight">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Severity (if not feeling fine) */}
        {selectedSymptom && selectedSymptom !== 'feeling_fine' && (
          <div className="space-y-3 pt-2">
            <label className="block text-xs font-black uppercase text-slate-400 tracking-wider">
              2. How intense is it?
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['mild', 'moderate', 'severe'] as const).map((sev) => {
                const isSelected = severity === sev;
                const colors = {
                  mild: 'hover:border-emerald-300 hover:bg-emerald-50 text-emerald-800',
                  moderate: 'hover:border-amber-300 hover:bg-amber-50 text-amber-800',
                  severe: 'hover:border-rose-400 hover:bg-rose-50 text-rose-800',
                }[sev];

                const activeColors = {
                  mild: 'bg-emerald-600 text-white ring-emerald-300',
                  moderate: 'bg-amber-500 text-white ring-amber-300',
                  severe: 'bg-rose-600 text-white ring-rose-300',
                }[sev];

                return (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setSeverity(sev)}
                    className={`py-3 px-3 rounded-2xl border font-bold capitalize text-sm transition-all ${
                      isSelected
                        ? `${activeColors} shadow-md ring-2`
                        : `bg-slate-50 border-slate-200 ${colors}`
                    }`}
                  >
                    {sev}
                  </button>
                );
              })}
            </div>

            {severity === 'severe' && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>
                  <strong>High Severity Warning:</strong> If Meera-ji is experiencing chest pain, severe breathlessness, or sudden weakness, please use the <strong>SOS Help</strong> button immediately.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Optional Notes */}
        {selectedSymptom && (
          <div className="space-y-1.5 pt-1">
            <label className="block text-xs font-black uppercase text-slate-400 tracking-wider">
              3. Extra details (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Started 10 minutes after breakfast..."
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-nest-500 text-sm font-medium text-slate-800"
            />
          </div>
        )}

        {/* Submit Button */}
        {selectedSymptom && (
          <button
            type="submit"
            disabled={submitting}
            className={`w-full py-4 rounded-2xl bg-nest-600 hover:bg-nest-700 active:scale-98 text-white font-black text-base shadow-lg shadow-nest-600/20 transition-all flex items-center justify-center gap-2 ${
              seniorMode ? 'min-h-[64px] text-lg' : ''
            }`}
          >
            <Send className="w-5 h-5" />
            <span>{submitting ? 'Recording Check-in...' : 'Submit Health Check-in'}</span>
          </button>
        )}
      </form>
    </div>
  );
}
