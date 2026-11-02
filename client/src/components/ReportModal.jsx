import React, { useState } from 'react';
import { Flag, X, AlertTriangle } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { getApiUrl } from '../services/api';

export default function ReportModal({ complaint, isOpen, onClose }) {
  const { showToast } = useNotifications();
  const [reason, setReason] = useState('Fake Complaint');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !complaint) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(getApiUrl(`/api/complaints/${complaint.id}/report`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, details })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Report submitted. Admin will review this complaint.', 'warning');
        onClose();
      } else {
        showToast(data.error || 'Failed to submit report', 'error');
      }
    } catch {
      showToast('Network error while submitting report', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#FBF9F5] dark:bg-[#1F1712] w-full max-w-md rounded-2xl shadow-2xl border border-[#E3D3C2] dark:border-[#38261A] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E3D3C2] dark:border-[#38261A] bg-rose-50/60 dark:bg-rose-950/40">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-base">
            <Flag className="w-5 h-5 text-rose-600 dark:text-rose-500" />
            <span>Report Complaint Misuse</span>
          </div>
          <button onClick={onClose} className="text-[#8C7A6B] hover:text-[#2E1E14] dark:hover:text-[#FAF5EE] p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 rounded-lg bg-[#F2ECE4] dark:bg-[#2A1E17] border border-[#DECDBB] dark:border-[#38261A] text-xs text-[#5A4030] dark:text-[#D8C7B5]">
            Reporting: <strong className="text-[#2E1E14] dark:text-[#FAF5EE]">{complaint.id}</strong> — "{complaint.title}"
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#4A3525] dark:text-[#D8C7B5] uppercase tracking-wider mb-2">
              Reason for Reporting *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] focus:outline-none focus:ring-2 focus:ring-[#C9650F] font-medium"
            >
              <option value="Fake Complaint">Fake Complaint / Fabricated</option>
              <option value="Spam">Spam / Unrelated Promotion</option>
              <option value="Abusive Content">Abusive / Defamatory Language</option>
              <option value="Inappropriate Comments">Inappropriate or Harassing Content</option>
              <option value="Misleading Information">Misleading / False Facts</option>
              <option value="Other">Other Policy Violation</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#4A3525] dark:text-[#D8C7B5] uppercase tracking-wider mb-2">
              Additional Details (Optional)
            </label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Explain why this content should be reviewed or moderated..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] placeholder-[#8C7A6B] focus:outline-none focus:ring-2 focus:ring-[#C9650F]"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-[#DECDBB] dark:border-[#38261A] text-[#4A3525] dark:text-[#D8C7B5] text-sm font-semibold hover:bg-[#EDE4D8] dark:hover:bg-[#2A1E17] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold shadow-md shadow-rose-900/20 transition disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
