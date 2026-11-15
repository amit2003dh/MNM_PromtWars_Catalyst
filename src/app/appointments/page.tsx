'use client';

import React from 'react';
import Sidebar from '@/components/Sidebar';
import AppointmentList from '@/components/AppointmentList';
import { useCare } from '@/context/CareContext';
import { Calendar, Stethoscope, CheckSquare, Clock, MapPin } from 'lucide-react';

export default function AppointmentsPage() {
  const { appointments, careProfile } = useCare();

  return (
    <div className="flex-1 flex bg-[#FBFBF9]">
      <Sidebar />
      <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-nest-800 bg-nest-100 px-2.5 py-0.5 rounded-full">
                Clinical Coordination
              </span>
              <span className="text-xs text-slate-400">&bull;</span>
              <span className="text-xs font-semibold text-slate-600">
                Patient: {careProfile.fullName} ({careProfile.age}y)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-navy-950 mt-1">
              Doctor Appointments & Clinical Visits
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Appointments list (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <AppointmentList />
          </div>

          {/* Right Column: Visit Preparation Checklist & Hospital details */}
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-navy-950">Visit Prep Checklist</h3>
                  <p className="text-xs text-slate-500 font-medium">Standard care protocol for visits</p>
                </div>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-700 font-medium">
                <li className="flex items-start gap-2">
                  <input type="checkbox" defaultChecked className="mt-0.5 rounded text-nest-600" />
                  <span>Bring generated AI Doctor Summary report</span>
                </li>
                <li className="flex items-start gap-2">
                  <input type="checkbox" defaultChecked className="mt-0.5 rounded text-nest-600" />
                  <span>Physical medication pouch (Allopathic & Ayurvedic)</span>
                </li>
                <li className="flex items-start gap-2">
                  <input type="checkbox" className="mt-0.5 rounded text-nest-600" />
                  <span>Latest fasting blood sugar log</span>
                </li>
                <li className="flex items-start gap-2">
                  <input type="checkbox" className="mt-0.5 rounded text-nest-600" />
                  <span>Recent blood pressure measurement sheet</span>
                </li>
              </ul>
            </div>

            {/* Doctor Contact Quick Sheet */}
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 space-y-3">
              <h4 className="font-black text-navy-950 text-sm">Preferred Hospital & Clinic</h4>
              <p className="text-xs text-slate-600 font-medium">
                <strong>Max Healthcare City Clinic</strong>
                <br />
                Emergency Hotline: 011-2651-5050
                <br />
                Ambulance: 102 / 108
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
