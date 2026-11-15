'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HeartHandshake,
  ShieldAlert,
  UserCheck,
  Eye,
  Menu,
  X,
  PhoneCall,
  Sparkles,
  LogOut,
  LogIn,
  Home,
  LayoutDashboard,
  CalendarCheck2,
  Pill,
  Users2,
  Calendar,
  Activity,
  FileSpreadsheet,
  Settings,
  ChevronRight,
} from 'lucide-react';
import { useCare } from '@/context/CareContext';
import { UserRole } from '@/types';

export default function Navbar() {
  const pathname = usePathname();
  const {
    user,
    household,
    isAuthenticated,
    isDemoMode,
    careProfile,
    todayDoses,
    medications,
    seniorMode,
    setSeniorMode,
    switchUserRole,
    triggerEmergency,
    emergencyAlertActive,
    clearEmergencyAlert,
    logout,
  } = useCare();

  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const pendingDosesCount = todayDoses.filter((d) => d.status === 'scheduled').length;
  const lowStockCount = medications.filter((m) => m.remainingQuantity <= m.refillThreshold).length;

  const roles: { role: UserRole; label: string; desc: string; badge: string }[] = [
    { role: 'senior', label: 'Meera Sharma', desc: 'Senior Patient (74y)', badge: 'Senior Mode' },
    { role: 'caregiver', label: 'Sunita Verma', desc: 'Primary Caregiver', badge: 'Care Portal' },
    { role: 'family', label: 'Rahul Sharma', desc: 'Family Member (Son)', badge: 'Family Hub' },
  ];

  const navLinks = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard, badge: null },
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
    { name: 'Care Circle', href: '/care-circle', icon: Users2, badge: null },
    { name: 'Appointments', href: '/appointments', icon: Calendar, badge: null },
    { name: 'Health Journal', href: '/health-journal', icon: Activity, badge: null },
    {
      name: 'AI Doctor Report',
      href: '/reports',
      icon: FileSpreadsheet,
      badge: 'AI',
      badgeColor: 'bg-nest-100 text-nest-800 font-extrabold',
    },
    { name: 'Settings & Care', href: '/settings', icon: Settings, badge: null },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      {/* Emergency Global Banner if activated */}
      {emergencyAlertActive && (
        <div className="bg-rose-600 text-white px-3 py-2 sm:px-4 sm:py-2.5 flex items-center justify-between text-xs sm:text-sm md:text-base font-bold animate-pulse">
          <div className="flex items-center gap-2 max-w-4xl mx-auto min-w-0">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span className="truncate">
              EMERGENCY ASSISTANCE REQUESTED FOR {careProfile.fullName.toUpperCase()}!
            </span>
          </div>
          <button
            type="button"
            onClick={clearEmergencyAlert}
            className="text-[11px] sm:text-xs bg-white text-rose-700 px-2.5 py-1 rounded-full font-bold hover:bg-rose-50 ml-2 shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo & Brand (compact on small mobile, never overflows) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              href="/"
              className="flex items-center gap-2 sm:gap-2.5 group focus:outline-none focus:ring-2 focus:ring-nest-500 rounded-xl p-1"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-2xl bg-gradient-to-tr from-nest-600 to-nest-400 flex items-center justify-center text-white shadow-md shadow-nest-600/20 group-hover:scale-105 transition-transform shrink-0">
                <HeartHandshake className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-navy-950 flex items-center">
                  CareNest<span className="text-nest-600 font-extrabold text-xs sm:text-sm md:text-base ml-0.5">AI</span>
                </span>
                <span className="text-[10px] md:text-xs font-semibold text-slate-500 tracking-wider uppercase -mt-1 hidden sm:block">
                  Elderly Care & Safety
                </span>
              </div>
            </Link>

            {/* Current Care Profile Pill (desktop only) */}
            <div className="hidden xl:flex items-center gap-2 px-3 py-1 bg-nest-50/80 border border-nest-200/80 rounded-full text-xs text-nest-900 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Caring for: <strong>{careProfile.fullName} ({careProfile.age}y)</strong></span>
            </div>
          </div>

          {/* Right Controls: Desktop View */}
          <div className="hidden md:flex items-center gap-2 sm:gap-3">
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
              <span className="hidden lg:inline">Senior Mode</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold uppercase ${
                  seniorMode ? 'bg-amber-300 text-amber-950' : 'bg-slate-300/80 text-slate-700'
                }`}
              >
                {seniorMode ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* User Session / Role Pill */}
            {!mounted ? (
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-2xl bg-nest-600 hover:bg-nest-700 text-white text-xs md:text-sm font-bold shadow-xs transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </Link>
            ) : isAuthenticated && !isDemoMode ? (
              <div className="flex items-center gap-2">
                <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
                  <Home className="w-3.5 h-3.5 text-nest-600" />
                  <span className="truncate max-w-[120px]">{household?.name || 'My Household'}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 md:px-3.5 md:py-2 rounded-2xl bg-white border border-slate-200 text-slate-800 text-xs md:text-sm font-semibold shadow-xs">
                  <div className="w-6 h-6 rounded-full bg-nest-600 text-white flex items-center justify-center font-bold text-xs">
                    {user.name.charAt(0)}
                  </div>
                  <span className="hidden sm:inline font-bold truncate max-w-[130px]">{user.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-md uppercase font-bold">
                    Active
                  </span>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="flex items-center gap-1.5 px-3 py-1.5 md:px-3 md:py-2 rounded-2xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 text-xs font-bold transition-all border border-slate-200"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4 text-slate-500 hover:text-rose-600" />
                  <span className="hidden md:inline">Sign Out</span>
                </button>
              </div>
            ) : isDemoMode ? (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 md:px-3.5 md:py-2 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 text-slate-800 text-xs md:text-sm font-semibold shadow-xs"
                  >
                    <UserCheck className="w-4 h-4 text-nest-600" />
                    <span className="font-bold">{user.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded-md uppercase font-bold">
                      Demo
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
                      <div className="mt-2 pt-2 border-t border-slate-100">
                        <Link
                          href="/login"
                          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-nest-600 text-white font-bold text-xs hover:bg-nest-700 transition-colors"
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          <span>Login with Gmail OTP</span>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                <Link
                  href="/login"
                  className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-nest-50 border border-nest-200 hover:bg-nest-100 text-nest-800 text-xs font-bold transition-all"
                  title="Sign in with your private Gmail account"
                >
                  <LogIn className="w-3.5 h-3.5 text-nest-600" />
                  <span>Sign In</span>
                </Link>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-2xl bg-nest-600 hover:bg-nest-700 text-white text-xs md:text-sm font-bold shadow-xs transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </Link>
            )}

            {/* Desktop Emergency Button */}
            <button
              type="button"
              onClick={triggerEmergency}
              className="flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs md:text-sm shadow-md shadow-rose-600/20 transition-all shrink-0"
              title="One-touch Emergency Call"
            >
              <PhoneCall className="w-4 h-4" />
              <span>SOS Help</span>
            </button>
          </div>

          {/* Right Controls: Mobile View (< md) - Compact & Zero Overflow */}
          <div className="flex md:hidden items-center gap-2">
            {/* Quick Emergency Icon Button */}
            <button
              type="button"
              onClick={triggerEmergency}
              className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md active:scale-95 shrink-0"
              title="One-touch Emergency SOS"
              aria-label="Emergency SOS"
            >
              <PhoneCall className="w-4 h-4 animate-pulse" />
            </button>

            {/* Active User Avatar Pill */}
            <div
              onClick={() => setMobileMenuOpen(true)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 cursor-pointer"
            >
              <div className="w-5 h-5 rounded-full bg-nest-600 text-white flex items-center justify-center text-[10px]">
                {user.name.charAt(0)}
              </div>
              <span className="text-[10px] text-slate-500 font-extrabold uppercase">
                {isDemoMode ? 'DEMO' : 'ACTIVE'}
              </span>
            </div>

            {/* Mobile Hamburger Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-9 h-9 flex items-center justify-center text-slate-700 hover:text-slate-950 rounded-xl bg-white border border-slate-200 shadow-xs"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Full-Screen Navigation Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-16 bottom-0 z-50 bg-navy-950/40 backdrop-blur-xs flex flex-col justify-start">
          <div className="bg-white border-b border-slate-200 shadow-2xl max-h-[calc(100vh-4rem)] overflow-y-auto p-4 space-y-4 animate-in slide-in-from-top-4 duration-200">
            {/* 1. Active Persona & Household Header */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-nest-600 text-white font-black flex items-center justify-center text-base shadow-xs">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-navy-950 text-sm leading-tight">{user.name}</h3>
                    <p className="text-[11px] text-slate-500 font-semibold capitalize">
                      {user.role === 'caregiver' ? 'Primary Caregiver' : user.role === 'senior' ? 'Senior Patient' : 'Family Member'}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                  {isDemoMode ? 'Demo Mode' : 'Signed In'}
                </span>
              </div>

              {/* Household Pill */}
              <div className="text-[11px] text-nest-800 bg-white border border-nest-200 px-2.5 py-1 rounded-xl font-bold flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5 text-nest-600 shrink-0" />
                <span className="truncate">{household?.name || (isDemoMode ? 'Demo: Sharma Family' : 'Care Household')}</span>
              </div>
            </div>

            {/* 2. Switch Demo Persona (1-Tap Buttons) */}
            {isDemoMode && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  Switch Active Persona
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {roles.map((r) => (
                    <button
                      key={r.role}
                      type="button"
                      onClick={() => {
                        switchUserRole(r.role);
                        setMobileMenuOpen(false);
                      }}
                      className={`p-2 rounded-xl text-center text-xs font-bold transition-all border ${
                        user.role === r.role
                          ? 'bg-nest-600 text-white border-nest-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="truncate">{r.label.split(' ')[0]}</div>
                      <div className={`text-[9px] truncate ${user.role === r.role ? 'text-nest-100' : 'text-slate-400'}`}>
                        {r.badge}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Senior Mode Large Switch */}
            <button
              type="button"
              onClick={() => setSeniorMode(!seniorMode)}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl font-bold text-sm transition-all border ${
                seniorMode
                  ? 'bg-amber-100 text-amber-950 border-amber-300 ring-2 ring-amber-400/50 shadow-sm'
                  : 'bg-slate-100/90 hover:bg-slate-200 text-slate-800 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Eye className={`w-5 h-5 ${seniorMode ? 'text-amber-800' : 'text-slate-600'}`} />
                <span>Senior Care Mode</span>
              </div>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-extrabold uppercase ${
                  seniorMode ? 'bg-amber-300 text-amber-950' : 'bg-slate-300 text-slate-700'
                }`}
              >
                {seniorMode ? 'Active ON' : 'Turn ON'}
              </span>
            </button>

            {/* 4. Complete Mobile Navigation Links */}
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                Navigation Menu
              </div>
              <nav className="space-y-1" aria-label="Mobile navigation">
                {navLinks.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        isActive
                          ? 'bg-nest-600 text-white shadow-sm'
                          : 'text-slate-700 hover:text-navy-950 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        <span>{item.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {item.badge && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full ${
                              isActive ? 'bg-white/20 text-white' : item.badgeColor
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                        <ChevronRight className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-300'}`} />
                      </div>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* 5. Emergency SOS Full-Width Button */}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                triggerEmergency();
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-sm shadow-md flex items-center justify-center gap-2"
            >
              <PhoneCall className="w-4 h-4" />
              <span>EMERGENCY SOS ASSISTANCE</span>
            </button>

            {/* 6. Sign In / Sign Out */}
            <div className="pt-2 border-t border-slate-100">
              {isAuthenticated && !isDemoMode ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-bold text-xs transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out of Account</span>
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-nest-50 hover:bg-nest-100 text-nest-800 border border-nest-200 font-bold text-xs transition-colors"
                >
                  <LogIn className="w-4 h-4 text-nest-600" />
                  <span>Sign In with Gmail OTP</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
