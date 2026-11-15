'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HeartHandshake,
  ShieldAlert,
  UserCheck,
  Eye,
  Bell,
  Menu,
  X,
  PhoneCall,
  Sparkles,
} from 'lucide-react';
import { useCare } from '@/context/CareContext';
import { UserRole } from '@/types';

export default function Navbar() {
  const pathname = usePathname();
  const {
    user,
    careProfile,
    seniorMode,
    setSeniorMode,
    switchUserRole,
    triggerEmergency,
    emergencyAlertActive,
    clearEmergencyAlert,
  } = useCare();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const roles: { role: UserRole; label: string; desc: string; badge: string }[] = [
    { role: 'senior', label: 'Meera Sharma', desc: 'Senior Patient (74y)', badge: 'Senior Mode' },
    { role: 'caregiver', label: 'Sunita Verma', desc: 'Primary Caregiver', badge: 'Care Portal' },
    { role: 'family', label: 'Rahul Sharma', desc: 'Family Member (Son)', badge: 'Family Hub' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      {/* Emergency Global Banner if activated */}
      {emergencyAlertActive && (
        <div className="bg-rose-600 text-white px-4 py-2.5 flex items-center justify-between text-sm md:text-base font-bold animate-pulse">
          <div className="flex items-center gap-2 max-w-4xl mx-auto">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>
              EMERGENCY ASSISTANCE REQUESTED FOR {careProfile.fullName.toUpperCase()}! Care circle notified.
            </span>
          </div>
          <button
            type="button"
            onClick={clearEmergencyAlert}
            className="text-xs bg-white text-rose-700 px-3 py-1 rounded-full font-bold hover:bg-rose-50 ml-4 shrink-0"
          >
            Acknowledge & Dismiss
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-nest-500 rounded-xl p-1"
            >
              <div className="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-gradient-to-tr from-nest-600 to-nest-400 flex items-center justify-center text-white shadow-md shadow-nest-600/20 group-hover:scale-105 transition-transform">
                <HeartHandshake className="w-6 h-6 md:w-7 md:h-7" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl md:text-2xl font-black tracking-tight text-navy-950 flex items-center gap-1">
                  CareNest<span className="text-nest-600 font-extrabold text-sm md:text-base ml-0.5">AI</span>
                </span>
                <span className="text-[10px] md:text-xs font-semibold text-slate-500 tracking-wider uppercase -mt-1 hidden sm:block">
                  Elderly Care & Medication Safety
                </span>
              </div>
            </Link>

            {/* Current Care Profile Pill */}
            <div className="hidden xl:flex items-center gap-2 px-3 py-1 bg-nest-50/80 border border-nest-200/80 rounded-full text-xs text-nest-900 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Caring for: <strong>{careProfile.fullName} ({careProfile.age}y)</strong></span>
            </div>
          </div>

          {/* Right Controls: Senior Mode Toggle, Role Switcher, Emergency Button */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Senior Care Mode Toggle */}
            <button
              type="button"
              onClick={() => setSeniorMode(!seniorMode)}
              className={`flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-2xl font-bold text-xs md:text-sm transition-all border ${
                seniorMode
                  ? 'bg-amber-100 text-amber-950 border-amber-300 ring-2 ring-amber-400/50 shadow-sm'
                  : 'bg-slate-100/80 hover:bg-slate-200/70 text-slate-700 border-slate-200'
              }`}
              title="Toggle Extra-Large Senior Mode"
            >
              <Eye className={`w-4 h-4 md:w-5 md:h-5 ${seniorMode ? 'text-amber-800' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">Senior Mode</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold uppercase ${
                  seniorMode ? 'bg-amber-300 text-amber-950' : 'bg-slate-300/80 text-slate-700'
                }`}
              >
                {seniorMode ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* Role Switcher Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 md:px-3.5 md:py-2 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 text-slate-800 text-xs md:text-sm font-semibold shadow-xs"
              >
                <UserCheck className="w-4 h-4 text-nest-600" />
                <span className="hidden sm:inline font-bold">{user.name}</span>
                <span className="sm:hidden font-bold">{user.role}</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-nest-100 text-nest-800 rounded-md uppercase font-bold">
                  {user.role}
                </span>
              </button>

              {roleDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-slate-200 shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                  onClick={() => setRoleDropdownOpen(false)}
                >
                  <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Switch Active Demo Persona
                  </div>
                  {roles.map((r) => (
                    <button
                      key={r.role}
                      type="button"
                      onClick={() => switchUserRole(r.role)}
                      className={`w-full text-left p-2.5 rounded-xl text-xs md:text-sm transition-all flex items-center justify-between ${
                        user.role === r.role
                          ? 'bg-nest-50 text-nest-950 font-bold border border-nest-200'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-bold">{r.label}</div>
                        <div className="text-[11px] text-slate-500">{r.desc}</div>
                      </div>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                        {r.badge}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Emergency Button */}
            <button
              type="button"
              onClick={triggerEmergency}
              className="flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs md:text-sm shadow-md shadow-rose-600/20 transition-all"
              title="One-touch Emergency Call"
            >
              <PhoneCall className="w-4 h-4" />
              <span className="hidden sm:inline">SOS Help</span>
            </button>

            {/* Mobile Nav Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-2">
          <Link
            href="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3 py-2.5 rounded-xl font-bold text-sm ${
              pathname === '/dashboard' ? 'bg-nest-100 text-nest-900' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/schedule"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3 py-2.5 rounded-xl font-bold text-sm ${
              pathname === '/schedule' ? 'bg-nest-100 text-nest-900' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            Today's Schedule & Doses
          </Link>
          <Link
            href="/medications"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3 py-2.5 rounded-xl font-bold text-sm ${
              pathname === '/medications' ? 'bg-nest-100 text-nest-900' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            Medication Cabinet
          </Link>
          <Link
            href="/care-circle"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3 py-2.5 rounded-xl font-bold text-sm ${
              pathname === '/care-circle' ? 'bg-nest-100 text-nest-900' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            Care Circle & Passcode
          </Link>
          <Link
            href="/appointments"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3 py-2.5 rounded-xl font-bold text-sm ${
              pathname === '/appointments' ? 'bg-nest-100 text-nest-900' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            Doctor Appointments
          </Link>
          <Link
            href="/health-journal"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3 py-2.5 rounded-xl font-bold text-sm ${
              pathname === '/health-journal' ? 'bg-nest-100 text-nest-900' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            Health Journal & Symptoms
          </Link>
          <Link
            href="/reports"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3 py-2.5 rounded-xl font-bold text-sm ${
              pathname === '/reports' ? 'bg-nest-100 text-nest-900' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            AI Doctor Summary
          </Link>
          <Link
            href="/settings"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3 py-2.5 rounded-xl font-bold text-sm ${
              pathname === '/settings' ? 'bg-nest-100 text-nest-900' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            Settings & Accessibility
          </Link>
        </div>
      )}
    </header>
  );
}
