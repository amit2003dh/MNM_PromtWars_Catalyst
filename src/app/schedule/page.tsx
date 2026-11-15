'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import DoseItem from '@/components/DoseItem';
import VoiceReader from '@/components/VoiceReader';
import { useCare } from '@/context/CareContext';
import {
  CalendarCheck2,
  Sun,
  Sunset,
  Moon,
  Clock,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { ScheduleItem } from '@/types';

export default function SchedulePage() {
  const { todayDoses, user } = useCare();
  const [filterStatus, setFilterStatus] = useState<'all' | 'scheduled' | 'taken'>('all');

  const morningDoses = todayDoses.filter((d) => {
    const hour = parseInt(d.scheduledTime.split(':')[0], 10);
    return hour >= 5 && hour < 12;
  });

  const afternoonDoses = todayDoses.filter((d) => {
    const hour = parseInt(d.scheduledTime.split(':')[0], 10);
    return hour >= 12 && hour < 17;
  });

  const eveningDoses = todayDoses.filter((d) => {
    const hour = parseInt(d.scheduledTime.split(':')[0], 10);
    return hour >= 17 && hour < 21;
  });

  const nightDoses = todayDoses.filter((d) => {
    const hour = parseInt(d.scheduledTime.split(':')[0], 10);
    return hour >= 21 || hour < 5;
  });

  const filterList = (items: ScheduleItem[]) => {
    if (filterStatus === 'all') return items;
    return items.filter((d) => d.status === filterStatus);
  };

  const todayDateString = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="flex-1 flex bg-[#FBFBF9]">
      <Sidebar />
      <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-nest-800 bg-nest-100 px-2.5 py-0.5 rounded-full">
                Daily Regimen
              </span>
              <span className="text-xs text-slate-400">&bull;</span>
              <span className="text-xs font-semibold text-slate-600">
                {todayDoses.filter((d) => d.status === 'taken').length} of {todayDoses.length} Doses Recorded
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-navy-950 mt-1">
              Today&apos;s Medication Timeline
            </h1>
          </div>

          {/* Date pill & Filter */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-navy-900 shadow-xs">
              <Clock className="w-3.5 h-3.5 text-nest-600" />
              <span>{todayDateString}</span>
            </div>

            <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold text-slate-600">
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  filterStatus === 'all' ? 'bg-white text-navy-950 shadow-xs' : ''
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('scheduled')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  filterStatus === 'scheduled' ? 'bg-white text-navy-950 shadow-xs' : ''
                }`}
              >
                Pending
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('taken')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  filterStatus === 'taken' ? 'bg-white text-navy-950 shadow-xs' : ''
                }`}
              >
                Taken
              </button>
            </div>
          </div>
        </div>

        {/* Morning Block */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <Sun className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-black text-navy-950">Morning (06:00 - 11:59)</h2>
              <span className="text-xs font-bold text-slate-500">
                ({filterList(morningDoses).length} doses)
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {filterList(morningDoses).length === 0 ? (
              <div className="p-4 rounded-2xl bg-white border border-slate-200 text-xs text-slate-400">
                No morning doses scheduled or matching filter.
              </div>
            ) : (
              filterList(morningDoses).map((item) => <DoseItem key={item.doseKey} item={item} />)
            )}
          </div>
        </section>

        {/* Afternoon Block */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center">
                <Sun className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-black text-navy-950">Afternoon (12:00 - 16:59)</h2>
              <span className="text-xs font-bold text-slate-500">
                ({filterList(afternoonDoses).length} doses)
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {filterList(afternoonDoses).length === 0 ? (
              <div className="p-4 rounded-2xl bg-white border border-slate-200 text-xs text-slate-400">
                No afternoon doses scheduled or matching filter.
              </div>
            ) : (
              filterList(afternoonDoses).map((item) => <DoseItem key={item.doseKey} item={item} />)
            )}
          </div>
        </section>

        {/* Evening Block */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-800 flex items-center justify-center">
                <Sunset className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-black text-navy-950">Evening (17:00 - 20:59)</h2>
              <span className="text-xs font-bold text-slate-500">
                ({filterList(eveningDoses).length} doses)
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {filterList(eveningDoses).length === 0 ? (
              <div className="p-4 rounded-2xl bg-white border border-slate-200 text-xs text-slate-400">
                No evening doses scheduled or matching filter.
              </div>
            ) : (
              filterList(eveningDoses).map((item) => <DoseItem key={item.doseKey} item={item} />)
            )}
          </div>
        </section>

        {/* Night Block */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center">
                <Moon className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-black text-navy-950">Night & Bedtime (21:00+)</h2>
              <span className="text-xs font-bold text-slate-500">
                ({filterList(nightDoses).length} doses)
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {filterList(nightDoses).length === 0 ? (
              <div className="p-4 rounded-2xl bg-white border border-slate-200 text-xs text-slate-400">
                No bedtime doses scheduled or matching filter.
              </div>
            ) : (
              filterList(nightDoses).map((item) => <DoseItem key={item.doseKey} item={item} />)
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
