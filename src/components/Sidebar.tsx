'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarCheck2,
  Pill,
  Users2,
  Calendar,
  Activity,
  FileSpreadsheet,
  Settings,
  AlertTriangle,
  PhoneCall,
  ShieldCheck,
} from 'lucide-react';
import { useCare } from '@/context/CareContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, todayDoses, medications, triggerEmergency } = useCare();

  const pendingDosesCount = todayDoses.filter((d) => d.status === 'scheduled').length;
  const lowStockCount = medications.filter((m) => m.remainingQuantity <= m.refillThreshold).length;

  const navItems = [
    {
      name: 'Overview',
      href: '/dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      name: 'Daily Schedule',
      href: '/schedule',
      icon: CalendarCheck2,
      badge: pendingDosesCount > 0 ? `${pendingDosesCount} due` : null,
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    {
      name: 'Medications',
      href: '/medications',
      icon: Pill,
      badge: lowStockCount > 0 ? `${lowStockCount} low` : null,
      badgeColor: 'bg-rose-100 text-rose-800 font-bold',
    },
    {
      name: 'Care Circle',
      href: '/care-circle',
      icon: Users2,
      badge: null,
    },
    {
      name: 'Appointments',
      href: '/appointments',
      icon: Calendar,
      badge: null,
    },
    {
      name: 'Health Journal',
      href: '/health-journal',
      icon: Activity,
      badge: null,
    },
    {
      name: 'AI Doctor Report',
      href: '/reports',
      icon: FileSpreadsheet,
      badge: 'AI',
      badgeColor: 'bg-nest-100 text-nest-800 font-extrabold',
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 xl:w-72 bg-white border-r border-slate-200/80 min-h-[calc(100vh-4rem)] p-4 shrink-0 justify-between">
      <div className="space-y-6">
        {/* User Card */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-nest-600 to-nest-500 text-white font-black flex items-center justify-center text-lg shadow-sm">
            {user.name.charAt(0)}
          </div>
          <div className="overflow-hidden">
            <h3 className="font-bold text-navy-950 text-sm truncate">{user.name}</h3>
            <p className="text-xs text-slate-500 font-medium capitalize flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {(user.role as string) === 'primary_caregiver' || user.role === 'caregiver'
                ? 'Caregiver'
                : user.role === 'senior'
                ? 'Senior Patient'
                : 'Family Member'}
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1.5" aria-label="Sidebar navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-nest-600 text-white shadow-md shadow-nest-600/20'
                    : 'text-slate-600 hover:text-navy-950 hover:bg-slate-100/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-nest-600'}`} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : item.badgeColor
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Safety Status & SOS footer */}
      <div className="space-y-3 pt-4 border-t border-slate-200/70">
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-900 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Anti-Double Dose Lock Active</span>
        </div>

        <button
          type="button"
          onClick={triggerEmergency}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-sm transition-all"
        >
          <PhoneCall className="w-4 h-4 text-rose-600" />
          <span>Emergency Assistance</span>
        </button>
      </div>
    </aside>
  );
}
