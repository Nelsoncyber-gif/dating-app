import { useState } from 'react';
import { Flag, ShieldOff, X } from 'lucide-react';
import api from '../../api/client';

const REPORT_REASONS = [
  'Inappropriate photos',
  'Harassment or abuse',
  'Fake profile',
  'Spam or scam',
  'Underage user',
  'Other',
];

export default function ReportBlockModal({ targetUserId, targetUserName, onClose, onBlocked }) {
  const [mode, setMode] = useState('menu'); // 'menu' | 'report'
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null); // 'reported' | 'blocked'

  async function handleReportSubmit(e) {
    e.preventDefault();
    const finalReason = reason === 'Other' ? customReason.trim() : reason;
    if (!finalReason) return;

    setSubmitting(true);
    setError('');
    try {
      await api.post('/safety/report', { reportedId: targetUserId, reason: finalReason });
      setDone('reported');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBlock() {
    setSubmitting(true);
    setError('');
    try {
      await api.post('/safety/block', { blockedId: targetUserId });
      setDone('blocked');
      onBlocked?.(targetUserId);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not block this user. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900 truncate">
            {done ? 'Done' : targetUserName || 'This user'}
          </h2>
          <button onClick={onClose} className="text-gray-400 shrink-0">
            <X size={20} />
          </button>
        </div>

        {done === 'reported' && (
          <p className="text-sm text-gray-600 mb-2">
            Thanks — your report has been submitted. We'll review it.
          </p>
        )}
        {done === 'blocked' && (
          <p className="text-sm text-gray-600 mb-2">
            {targetUserName || 'This user'} has been blocked. Any match between you has been removed.
          </p>
        )}
        {done && (
          <button
            onClick={onClose}
            className="w-full mt-2 bg-primary text-white font-medium rounded-lg py-2.5"
          >
            Close
          </button>
        )}

        {!done && mode === 'menu' && (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setMode('report')}
              className="flex items-center gap-3 text-left px-3 py-3 rounded-lg hover:bg-gray-50 transition"
            >
              <Flag size={18} className="text-gray-500" />
              <span className="text-sm text-gray-800">Report this profile</span>
            </button>
            <button
              onClick={handleBlock}
              disabled={submitting}
              className="flex items-center gap-3 text-left px-3 py-3 rounded-lg hover:bg-red-50 transition disabled:opacity-50"
            >
              <ShieldOff size={18} className="text-red-500" />
              <span className="text-sm text-red-500">Block this user</span>
            </button>
            {error && <p className="text-red-500 text-xs px-1">{error}</p>}
          </div>
        )}

        {!done && mode === 'report' && (
          <form onSubmit={handleReportSubmit} className="flex flex-col gap-3">
            <p className="text-xs text-gray-500">Why are you reporting this profile?</p>
            <div className="flex flex-col gap-1.5">
              {REPORT_REASONS.map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="reason"
                    value={r}
                    checked={reason === r}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  {r}
                </label>
              ))}
            </div>

            {reason === 'Other' && (
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Tell us more…"
                rows={2}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            )}

            {error && <p className="text-red-500 text-xs">{error}</p>}

            <button
              type="submit"
              disabled={submitting || !reason || (reason === 'Other' && !customReason.trim())}
              className="bg-primary text-white font-medium rounded-lg py-2.5 disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Submit Report'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
