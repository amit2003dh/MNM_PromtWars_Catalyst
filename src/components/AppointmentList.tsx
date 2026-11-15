'use client';

import React, { useState } from 'react';
import { useCare } from '@/context/CareContext';
import { Appointment } from '@/types';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Plus,
  Stethoscope,
  X,
  CheckCircle,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

export default function AppointmentList() {
  const { appointments, addAppointment, user } = useCare();
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    doctorName: '',
    specialty: 'General Physician',
    dateTime: '',
    location: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.doctorName || !formData.dateTime || submitting) return;

    setSubmitting(true);
    try {
      await addAppointment({
        doctorName: formData.doctorName,
        specialty: formData.specialty,
        dateTime: new Date(formData.dateTime).toISOString(),
        location: formData.location || 'Clinic Consultation',
        notes: formData.notes,
        status: 'scheduled',
      });
      setModalOpen(false);
      setFormData({
        doctorName: '',
        specialty: 'General Physician',
        dateTime: '',
        location: '',
        notes: '',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getDaysDiff = (targetDate: string) => {
    const diffMs = new Date(targetDate).getTime() - Date.now();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 0) return `${Math.abs(diffDays)}d ago`;
    return `In ${diffDays} days`;
  };

  return (
    <div className="rounded-3xl bg-white border border-slate-200/90 p-5 md:p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-200">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-navy-950">Doctor Appointments</h3>
            <p className="text-xs text-slate-500 font-medium">Scheduled visits & clinical follow-ups</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-nest-600 hover:bg-nest-700 text-white font-bold text-xs shadow-xs transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Book Visit</span>
        </button>
      </div>

      {/* Appointment Cards */}
      <div className="space-y-3">
        {appointments.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No upcoming appointments scheduled.
          </div>
        ) : (
          appointments.map((app) => (
            <div
              key={app._id}
              className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/90 hover:bg-white hover:border-nest-200 hover:shadow-xs transition-all space-y-2.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-nest-700 shrink-0">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-navy-950 text-base leading-tight">
                      {app.doctorName}
                    </h4>
                    <span className="inline-block mt-0.5 text-xs font-semibold px-2 py-0.5 rounded-md bg-sky-100 text-sky-800">
                      {app.specialty}
                    </span>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-xl bg-nest-50 text-nest-800 border border-nest-200 font-bold text-xs shrink-0">
                  {getDaysDiff(app.dateTime)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-medium text-slate-600 pt-1">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formatDateTime(app.dateTime)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{app.location}</span>
                </div>
              </div>

              {app.notes && (
                <div className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100">
                  <strong className="text-slate-800">Clinical Focus: </strong>
                  {app.notes}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Booking Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-xs animate-in fade-in"
        >
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-black text-navy-950 mb-1">Schedule Doctor Visit</h3>
            <p className="text-xs text-slate-500 mb-4">Add appointment to Meera-ji's calendar</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Doctor Name *</label>
                <input
                  type="text"
                  required
                  value={formData.doctorName}
                  onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
                  placeholder="e.g. Dr. Ananya Roy"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-nest-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Specialty</label>
                <input
                  type="text"
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  placeholder="e.g. Cardiologist, Diabetologist"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-nest-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.dateTime}
                  onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-nest-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Location / Clinic</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Max Hospital, Room 302"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-nest-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Preparation / Focus Notes</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Fasting 8 hrs for blood test, bring BP report"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-nest-500 outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-nest-600 hover:bg-nest-700 text-white text-xs font-bold shadow-xs"
                >
                  {submitting ? 'Booking...' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
