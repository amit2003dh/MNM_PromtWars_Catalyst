'use client';

import React, { useState } from 'react';
import { useCare } from '@/context/CareContext';
import { ClipboardList, Plus, User, Calendar, MessageSquare, CheckCircle } from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/utils';

export default function HandoffNotes() {
  const { caregiverNotes, addCaregiverNote, user } = useCare();
  const [isAdding, setIsAdding] = useState(false);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || submitting) return;

    setSubmitting(true);
    try {
      await addCaregiverNote(content.trim());
      setContent('');
      setIsAdding(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-3xl bg-white border border-slate-200/90 p-5 md:p-6 shadow-xs space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-navy-950">Shift Handoff Notes</h3>
            <p className="text-xs text-slate-500 font-medium">Caregiver continuity & daily care logs</p>
          </div>
        </div>

        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-nest-600 hover:bg-nest-700 text-white font-bold text-xs shadow-xs transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Shift Note</span>
          </button>
        )}
      </div>

      {/* Add Note Form */}
      {isAdding && (
        <form onSubmit={handleSubmit} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>Author: {user.name} ({user.role})</span>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-slate-400 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>

          <textarea
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Document shift vitals, breakfast/lunch intake, mood, medication tolerance, and items for next caregiver..."
            className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-nest-500 text-sm text-slate-800 bg-white"
            required
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold bg-nest-600 hover:bg-nest-700 text-white rounded-xl shadow-xs"
            >
              {submitting ? 'Saving...' : 'Post Shift Note'}
            </button>
          </div>
        </form>
      )}

      {/* Notes List */}
      <div className="space-y-3">
        {caregiverNotes.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-sm">
            No shift handoff notes yet. Log your observations for the next caregiver.
          </div>
        ) : (
          caregiverNotes.map((note) => (
            <div
              key={note._id}
              className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:bg-white hover:border-nest-200 transition-all space-y-2"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-navy-900 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-nest-600" />
                    {note.authorName}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-semibold">
                    {note.authorRole}
                  </span>
                </div>
                <span className="flex items-center gap-1 text-[11px]">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  {formatDateTime(note.createdAt)}
                </span>
              </div>

              <p className="text-sm text-slate-700 font-medium whitespace-pre-line leading-relaxed">
                {note.noteContent}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
