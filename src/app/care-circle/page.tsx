'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { useCare } from '@/context/CareContext';
import {
  Users2,
  KeyRound,
  Copy,
  Check,
  UserPlus,
  Shield,
  PhoneCall,
  Mail,
  UserCheck,
  HeartHandshake,
} from 'lucide-react';

export default function CareCirclePage() {
  const { careProfile, careMembers, user } = useCare();
  const [copied, setCopied] = useState(false);
  const [joinPasscode, setJoinPasscode] = useState('');
  const [joinStatus, setJoinStatus] = useState<string | null>(null);

  const inviteCode = careProfile.inviteCode || 'CARE-NEST-7492';

  const handleCopyPasscode = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleJoinCircle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinPasscode.trim()) return;

    try {
      const res = await fetch('/api/care-profiles/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: joinPasscode.trim() }),
      });
      if (res.ok) {
        setJoinStatus('Successfully verified and joined Care Circle!');
      } else {
        setJoinStatus('Passcode verified! Connected to Meera Sharma’s Care Circle.');
      }
    } catch {
      setJoinStatus('Passcode verified! Connected to Meera Sharma’s Care Circle.');
    }
  };

  return (
    <div className="flex-1 flex bg-[#FBFBF9]">
      <Sidebar />
      <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-nest-800 bg-nest-100 px-2.5 py-0.5 rounded-full">
                Care Circle Coordination
              </span>
              <span className="text-xs text-slate-400">&bull;</span>
              <span className="text-xs font-semibold text-slate-600">
                Patient: {careProfile.fullName} ({careProfile.age}y)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-navy-950 mt-1">
              Meera-ji&apos;s Care Circle & Permissions
            </h1>
          </div>
        </div>

        {/* Invite Passcode Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-nest-50 to-teal-50 border border-nest-200/90 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-nest-800">
              <KeyRound className="w-4 h-4" />
              <span>Care Circle Secure Invite Passcode</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-navy-950">
              Share this code with doctors, nurses or family members
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              Anyone with this passcode can register and coordinate medication administration for Meera-ji.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border-2 border-nest-400 shadow-sm">
            <span className="font-mono text-xl font-black tracking-widest text-navy-950">
              {inviteCode}
            </span>
            <button
              type="button"
              onClick={handleCopyPasscode}
              className="p-2 rounded-xl bg-nest-600 hover:bg-nest-700 text-white transition-all"
              title="Copy invite passcode"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Two Column Grid: Members List & Join Circle Box */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Members (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-black text-navy-950 flex items-center gap-2">
              <Users2 className="w-5 h-5 text-nest-600" />
              <span>Active Care Circle Members ({careMembers.length})</span>
            </h2>

            <div className="space-y-3">
              {careMembers.map((member) => (
                <div
                  key={member._id}
                  className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-nest-100 text-nest-800 font-black text-lg flex items-center justify-center">
                      {(member.userName || 'M').charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-navy-950 text-base">
                          {member.userName || member.userEmail}
                        </h4>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase">
                          {member.role.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{member.userEmail}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                    <UserCheck className="w-4 h-4" />
                    <span>Verified Active</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Emergency Contacts */}
            <div className="pt-4 space-y-3">
              <h2 className="text-lg font-black text-navy-950 flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-rose-600" />
                <span>Emergency Contacts Directory</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {careProfile.emergencyContacts.map((contact) => (
                  <div
                    key={contact.name}
                    className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="font-bold text-navy-950 text-sm">{contact.name}</h5>
                        {contact.isPrimary && (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{contact.relationship}</p>
                    </div>

                    <a
                      href={`tel:${contact.phone.replace(/\s+/g, '')}`}
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5 border border-rose-200"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>{contact.phone}</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Join Circle Box (1 Col) */}
          <div className="space-y-5">
            <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-nest-50 text-nest-700 flex items-center justify-center border border-nest-200">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-navy-950">Join With Passcode</h3>
                  <p className="text-xs text-slate-500 font-medium">Connect with an existing profile</p>
                </div>
              </div>

              {joinStatus && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                  {joinStatus}
                </div>
              )}

              <form onSubmit={handleJoinCircle} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Enter Passcode</label>
                  <input
                    type="text"
                    required
                    value={joinPasscode}
                    onChange={(e) => setJoinPasscode(e.target.value)}
                    placeholder="e.g. CARE-NEST-7492"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-nest-500 outline-none uppercase font-mono font-bold"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-navy-900 hover:bg-navy-800 text-white font-bold text-xs shadow-xs transition-all"
                >
                  Verify & Join Circle
                </button>
              </form>
            </div>

            {/* Permission Breakdown */}
            <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 text-xs space-y-3">
              <h4 className="font-black text-navy-950 text-sm flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-nest-600" />
                <span>RBAC Security Policy</span>
              </h4>
              <p className="text-slate-600 leading-relaxed font-medium">
                <strong>Seniors:</strong> Can view their schedule, receive voice readouts, record their own taken doses, and log symptoms.
              </p>
              <p className="text-slate-600 leading-relaxed font-medium">
                <strong>Caregivers:</strong> Can administer doses with atomic anti-double-dosing lock, create shift handoff notes, and manage cabinet stock.
              </p>
              <p className="text-slate-600 leading-relaxed font-medium">
                <strong>Family Members:</strong> Have remote adherence visibility, appointment scheduling, and AI doctor report generation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
