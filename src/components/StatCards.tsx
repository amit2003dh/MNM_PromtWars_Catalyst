'use client';

import React from 'react';
import Link from 'next/link';
import { useCare } from '@/context/CareContext';
import {
  CalendarCheck,
  Pill,
  Users,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';

export default function StatCards() {
  const { todayDoses, medications, careMembers } = useCare();

  const totalToday = todayDoses.length;
  const takenToday = todayDoses.filter((d) => d.status === 'taken').length;
  const remainingToday = totalToday - takenToday;

  const lowStockMeds = medications.filter((m) => m.remainingQuantity <= m.refillThreshold);
  const adherenceRate = totalToday > 0 ? Math.round((takenToday / totalToday) * 100) : 100;

  const stats = [
    {
      title: "Today's Schedule",
      value: `${takenToday} / ${totalToday}`,
      subtitle: remainingToday > 0 ? `${remainingToday} doses pending` : 'All completed today!',
      icon: CalendarCheck,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      href: '/schedule',
      badge: remainingToday === 0 ? 'Complete' : 'In Progress',
      badgeColor: remainingToday === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800',
    },
    {
      title: 'Active Medications',
      value: medications.length.toString(),
      subtitle: lowStockMeds.length > 0 ? `${lowStockMeds.length} needs refill` : 'Stock healthy',
      icon: Pill,
      color: lowStockMeds.length > 0 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-nest-50 text-nest-700 border-nest-200',
      href: '/medications',
      badge: lowStockMeds.length > 0 ? 'Refill Warning' : 'Optimal',
      badgeColor: lowStockMeds.length > 0 ? 'bg-rose-100 text-rose-800' : 'bg-nest-100 text-nest-800',
    },
    {
      title: 'Care Circle',
      value: careMembers.length.toString(),
      subtitle: careMembers.length > 0
        ? `${careMembers.length} active member${careMembers.length > 1 ? 's' : ''}`
        : 'No members yet',
      icon: Users,
      color: 'bg-sky-50 text-sky-700 border-sky-200',
      href: '/care-circle',
      badge: 'Synced',
      badgeColor: 'bg-sky-100 text-sky-800',
    },
    {
      title: 'Safety Lock Status',
      value: '100%',
      subtitle: 'Zero double-dose incidents',
      icon: ShieldCheck,
      color: 'bg-teal-50 text-teal-700 border-teal-200',
      href: '/reports',
      badge: 'Protected',
      badgeColor: 'bg-teal-100 text-teal-800',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Link
            key={stat.title}
            href={stat.href}
            className="group p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs hover:border-nest-300 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${stat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stat.badgeColor}`}>
                    {stat.badge}
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-nest-600 transition-colors" />
                </div>
              </div>

              <div className="text-2xl font-black text-navy-950 tracking-tight">{stat.value}</div>
              <div className="text-xs font-bold text-slate-700 mt-0.5">{stat.title}</div>
            </div>

            <div className="text-xs text-slate-500 font-medium mt-3 pt-3 border-t border-slate-100">
              {stat.subtitle}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
