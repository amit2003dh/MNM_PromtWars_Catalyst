'use client';

import React, { useState } from 'react';
import { useCare } from '@/context/CareContext';
import {
  Mail,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Server,
  Bell,
  PhoneCall,
  Calendar,
  Pill,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

export default function EmailDeliveryHub() {
  const { user, notifications, refreshData } = useCare();

  const [testEmailAddress, setTestEmailAddress] = useState(user.email || '');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    messageId?: string;
    provider?: string;
  } | null>(null);

  const [cronRunning, setCronRunning] = useState(false);
  const [cronResult, setCronResult] = useState<{
    success: boolean;
    summary?: any;
    actions?: any[];
  } | null>(null);

  // Send Test Email
  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailAddress || testSending) return;

    setTestSending(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/notifications/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmailAddress.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: `Live verification email dispatched to ${data.deliveredTo}!`,
          messageId: data.messageId,
          provider: data.provider === 'gmail_smtp' ? 'Gmail SMTP (Live)' : data.provider === 'resend' ? 'Resend' : 'Outbox Preview',
        });
        await refreshData();
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Failed to dispatch test email',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Network error sending test email',
      });
    } finally {
      setTestSending(false);
    }
  };

  // Run Reminder Daemon / Scheduler Now
  const handleRunScheduler = async () => {
    setCronRunning(true);
    setCronResult(null);

    try {
      const res = await fetch('/api/cron/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setCronResult({
          success: true,
          summary: data.summary,
          actions: data.actions || [],
        });
        await refreshData();
      } else {
        setCronResult({
          success: false,
        });
      }
    } catch {
      setCronResult({ success: false });
    } finally {
      setCronRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-nest-600 to-teal-700 p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-nest-100 bg-white/20 px-3 py-1 rounded-full w-fit">
            <Mail className="w-3.5 h-3.5" />
            <span>Email Delivery & Background Automation Hub</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black">
            Automated Alert Controls & Live Delivery Proof
          </h2>
          <p className="text-xs sm:text-sm text-nest-100 font-medium">
            Monitor real-time email dispatch, test SMTP delivery, and inspect background cron daemon status.
          </p>
        </div>

        <button
          type="button"
          disabled={cronRunning}
          onClick={handleRunScheduler}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-nest-900 hover:bg-nest-50 font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 shrink-0"
        >
          <RefreshCw className={`w-4 h-4 text-nest-600 ${cronRunning ? 'animate-spin' : ''}`} />
          <span>{cronRunning ? 'Running Scheduler...' : 'Run Reminder Check Now'}</span>
        </button>
      </div>

      {/* Scheduler Execution Feedback */}
      {cronResult && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs sm:text-sm font-semibold animate-in fade-in space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Background Scheduler Executed Successfully!</span>
          </div>
          <p className="text-xs text-emerald-800">
            Checked scheduled doses and inventory thresholds. Evaluated doses: {cronResult.summary?.stage1Created ?? 0} Stage 1, {cronResult.summary?.stage2Created ?? 0} Stage 2, {cronResult.summary?.stage3Escalated ?? 0} Stage 3 emails, {cronResult.summary?.lowStockAlertsSent ?? 0} refill warnings.
          </p>
        </div>
      )}

      {/* Two Column Grid: 1. Send Test Email | 2. Escalation Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: 1-Click Live Test Email Delivery */}
        <div className="rounded-3xl bg-white border border-slate-200/90 p-5 md:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-nest-50 text-nest-700 flex items-center justify-center border border-nest-200 shrink-0">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-navy-950">Verify Email Delivery Live</h3>
              <p className="text-xs text-slate-500 font-medium">Send an instant test notification via Gmail SMTP / Resend</p>
            </div>
          </div>

          <form onSubmit={handleSendTestEmail} className="space-y-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Recipient Email Address
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  placeholder="your-email@gmail.com"
                  className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-nest-500 outline-none font-medium"
                />
                <button
                  type="submit"
                  disabled={testSending}
                  className="px-4 py-2.5 bg-nest-600 hover:bg-nest-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5 shrink-0 transition-transform active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{testSending ? 'Sending...' : 'Send Test'}</span>
                </button>
              </div>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs font-semibold ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
                {testResult.provider && (
                  <div className="mt-1 pl-6 text-[11px] text-slate-500">
                    Delivery Channel: <strong>{testResult.provider}</strong>
                    {testResult.messageId && ` (ID: ${testResult.messageId})`}
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Card 2: Automatic Escalation Policy & Dispatch Rules */}
        <div className="rounded-3xl bg-white border border-slate-200/90 p-5 md:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200 shrink-0">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-navy-950">Email Automation Policy</h3>
              <p className="text-xs text-slate-500 font-medium">When and to whom alerts are dispatched</p>
            </div>
          </div>

          <div className="space-y-2.5 pt-1 text-xs">
            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <PhoneCall className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-navy-950">Emergency SOS Broadcast:</strong>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Instant broadcast sent to all Care Circle members & emergency contacts upon tapping SOS.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-navy-950">Missed Dose (+30 mins):</strong>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Stage 3 critical escalation email sent to Primary Caregiver & Household Owner.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <Pill className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-navy-950">Low Medication Stock Warning:</strong>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Dispatched to Caregiver & Owner when stock falls to or below safety refill threshold.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Email Delivery Outbox / Proof Log */}
      <div className="rounded-3xl bg-white border border-slate-200/90 p-5 md:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-navy-950">Live Notification & Email Outbox</h3>
              <p className="text-xs text-slate-500 font-medium">Auditable record of all dispatched alerts</p>
            </div>
          </div>

          <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-700 rounded-xl">
            {notifications.length} Total Alerts
          </span>
        </div>

        {notifications.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 p-4">
            No notification events recorded yet. Send a test email or trigger an SOS to verify live logging!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Alert Title</th>
                  <th className="py-2.5 px-3">Channel / Provider</th>
                  <th className="py-2.5 px-3">Delivery Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {notifications.slice(0, 10).map((n) => (
                  <tr key={n._id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-3 text-[11px] font-medium text-slate-500 whitespace-nowrap">
                      {formatDateTime(n.createdAt)}
                    </td>
                    <td className="py-3 px-3 font-bold text-navy-950">
                      <div>{n.title}</div>
                      <div className="text-[11px] text-slate-500 font-normal truncate max-w-md">{n.message}</div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg text-[10px]">
                        <Mail className="w-3 h-3 text-nest-600" />
                        <span>{n.deliveryStatus === 'outbox_preview' ? 'Outbox Preview' : 'Gmail SMTP / Resend'}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full text-[10px]">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Verified Logged</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
