'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import EmailDeliveryHub from '@/components/EmailDeliveryHub';
import { useCare } from '@/context/CareContext';
import {
  Settings,
  Eye,
  Volume2,
  Bell,
  ShieldCheck,
  User,
  Heart,
  Save,
  Check,
} from 'lucide-react';

export default function SettingsPage() {
  const { careProfile, seniorMode, setSeniorMode } = useCare();
  const [speechRate, setSpeechRate] = useState<number>(0.88);
  const [highContrast, setHighContrast] = useState<boolean>(true);
  const [savedMsg, setSavedMsg] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  };

  return (
    <div className="flex-1 flex bg-[#FBFBF9]">
      <Sidebar />
      <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-nest-800 bg-nest-100 px-2.5 py-0.5 rounded-full">
                System Preferences
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-navy-950 mt-1">
              Accessibility & Profile Settings
            </h1>
          </div>
        </div>

        {savedMsg && (
          <div className="p-4 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold flex items-center gap-2 animate-in fade-in">
            <Check className="w-5 h-5 text-emerald-700" />
            <span>Preferences saved successfully!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Accessibility & Senior Mode */}
          <div className="rounded-3xl bg-white border border-slate-200/90 p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-navy-950">Senior Accessibility Settings</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Optimized for elderly readability, motor ease, and auditory support
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div>
                  <div className="text-sm font-bold text-navy-950">Senior Care Mode</div>
                  <div className="text-xs text-slate-500">
                    Enlarges text, expands buttons to minimum 64px tap height, and highlights primary actions.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSeniorMode(!seniorMode)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                    seniorMode
                      ? 'bg-amber-400 text-amber-950 shadow-xs'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  {seniorMode ? 'Active (ON)' : 'Disabled (OFF)'}
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-navy-950">
                      SpeechSynthesis Read-Aloud Voice Rate
                    </div>
                    <div className="text-xs text-slate-500">
                      Slower rate ({speechRate}x) improves comprehension for elderly listeners.
                    </div>
                  </div>
                  <span className="font-bold text-sm text-nest-700">{speechRate}x</span>
                </div>
                <input
                  type="range"
                  min="0.7"
                  max="1.2"
                  step="0.05"
                  value={speechRate}
                  onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                  className="w-full accent-nest-600 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Patient Care Profile Card */}
          <div className="rounded-3xl bg-white border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-nest-50 text-nest-700 flex items-center justify-center border border-nest-200">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-navy-950">Patient Medical Profile</h3>
                <p className="text-xs text-slate-500 font-medium">Core healthcare records</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium text-slate-700 pt-2">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block font-bold">Full Legal Name:</span>
                <strong className="text-navy-950 text-sm">{careProfile.fullName}</strong>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block font-bold">Preferred Name:</span>
                <strong className="text-navy-950 text-sm">{careProfile.preferredName}</strong>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block font-bold">Age & Blood Group:</span>
                <strong className="text-navy-950 text-sm">
                  {careProfile.age} years &bull; {careProfile.bloodGroup}
                </strong>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block font-bold">Emergency Contacts:</span>
                <strong className="text-navy-950 text-sm">
                  {careProfile.emergencyContacts.length} Registered Contacts
                </strong>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-3 rounded-2xl bg-nest-600 hover:bg-nest-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Save System Settings</span>
            </button>
          </div>
        </form>

        {/* Live Email Delivery & Automation Hub */}
        <div className="pt-6 border-t border-slate-200/80">
          <EmailDeliveryHub />
        </div>
      </div>
    </div>
  );
}
