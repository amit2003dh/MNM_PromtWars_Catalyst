'use client';

import React from 'react';
import { useCare } from '@/context/CareContext';
import { CheckCircle2, XCircle, TrendingUp, ShieldAlert, Award } from 'lucide-react';

interface DayAdherence {
  day: string;
  date: string;
  total: number;
  taken: number;
  percentage: number;
}

const PAST_DAYS: DayAdherence[] = [
  { day: 'Mon', date: 'Nov 10', total: 4, taken: 4, percentage: 100 },
  { day: 'Tue', date: 'Nov 11', total: 4, taken: 4, percentage: 100 },
  { day: 'Wed', date: 'Nov 12', total: 4, taken: 3, percentage: 75 }, // 1 delayed
  { day: 'Thu', date: 'Nov 13', total: 4, taken: 4, percentage: 100 },
  { day: 'Fri', date: 'Nov 14', total: 4, taken: 4, percentage: 100 },
  { day: 'Sat', date: 'Nov 15', total: 4, taken: 4, percentage: 100 },
  { day: 'Sun', date: 'Today', total: 5, taken: 2, percentage: 100 }, // in progress
];

export default function AdherenceChart() {
  const { todayDoses } = useCare();

  const totalToday = todayDoses.length;
  const takenToday = todayDoses.filter((d) => d.status === 'taken').length;

  const totalWeeklyDoses = PAST_DAYS.reduce((acc, d) => acc + d.total, 0);
  const totalWeeklyTaken = PAST_DAYS.reduce((acc, d) => acc + d.taken, 0);
  const overallRate = Math.round((totalWeeklyTaken / totalWeeklyDoses) * 100);

  return (
    <div className="rounded-3xl bg-white border border-slate-200/90 p-5 md:p-6 shadow-xs space-y-6">
      {/* Header with Adherence rate badge */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <Award className="w-5 h-5" />
            </span>
            <h3 className="text-lg md:text-xl font-black text-navy-950">
              7-Day Medication Adherence
            </h3>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Care Circle verified dose administration rate
          </p>
        </div>

        <div className="flex items-center gap-3 bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-200">
          <div className="text-right">
            <div className="text-2xl font-black text-emerald-800 leading-none">{overallRate}%</div>
            <div className="text-[10px] font-bold text-emerald-600 uppercase">Weekly Score</div>
          </div>
          <TrendingUp className="w-6 h-6 text-emerald-600" />
        </div>
      </div>

      {/* Visual Bar Chart */}
      <div className="pt-2">
        <div className="grid grid-cols-7 gap-2 sm:gap-3 items-end h-40 pb-2 border-b border-slate-100">
          {PAST_DAYS.map((item, idx) => {
            const heightPercent = Math.max(15, item.percentage);
            const isToday = idx === PAST_DAYS.length - 1;

            return (
              <div key={item.day} className="flex flex-col items-center h-full justify-end group">
                <span className="text-[10px] font-bold text-slate-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.taken}/{item.total}
                </span>

                <div className="w-full bg-slate-100 rounded-xl overflow-hidden flex flex-col justify-end h-28 relative">
                  <div
                    className={`w-full rounded-xl transition-all duration-500 ${
                      item.percentage === 100
                        ? 'bg-emerald-500 group-hover:bg-emerald-600'
                        : 'bg-amber-400 group-hover:bg-amber-500'
                    } ${isToday ? 'ring-2 ring-nest-600 ring-offset-1' : ''}`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>

                <span
                  className={`mt-2 text-xs font-bold ${
                    isToday ? 'text-nest-700 font-black' : 'text-slate-600'
                  }`}
                >
                  {item.day}
                </span>
                <span className="text-[10px] text-slate-400 -mt-0.5">{item.date}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Metric Breakdown Row */}
      <div className="grid grid-cols-3 gap-2 text-center pt-1">
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
          <div className="text-xs text-slate-500 font-semibold">Today&apos;s Completed</div>
          <div className="text-lg font-black text-navy-950 mt-0.5">
            {takenToday} / {totalToday}
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100">
          <div className="text-xs text-emerald-800 font-semibold">Verified Safe Doses</div>
          <div className="text-lg font-black text-emerald-700 mt-0.5">{totalWeeklyTaken}</div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
          <div className="text-xs text-slate-500 font-semibold">Double-Dose Incidents</div>
          <div className="text-lg font-black text-nest-700 mt-0.5">0 (Blocked)</div>
        </div>
      </div>
    </div>
  );
}
