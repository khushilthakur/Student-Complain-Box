import React, { useState } from 'react';
import { X, Building2, ShieldAlert, Paperclip, Send, AlertTriangle, UploadCloud, Check } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { getApiUrl } from '../services/api';

const CATEGORIES = [
  'Academic',
  'Infrastructure',
  'Hostel',
  'Examination',
  'Fees/Administration',
  'Harassment/Safety',
  'Library',
  'Transport',
  'Other'
];

const PRIORITIES = [
  { value: 'Low', desc: 'Standard non-urgent issue (Target: within 7 days)' },
  { value: 'Medium', desc: 'Routine operational complaint (Target: within 3 days)' },
  { value: 'High', desc: 'Significant disruption (Target: within 48 hours)' },
  { value: 'Urgent', desc: 'Safety hazard or critical matter (Target: within 24 hours)' }
];

export default function SubmitComplaintModal({ isOpen, onClose, onSuccess, studentUser }) {
  const { showToast } = useNotifications();

  const [collegeId, setCollegeId] = useState(studentUser?.collegeId || '');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Infrastructure');
  const [priority, setPriority] = useState('Medium');
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  
  // File upload state
  const [proofUrl, setProofUrl] = useState('');
  const [proofName, setProofName] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const isSensitive = category === 'Harassment/Safety';

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploadingFile(true);
    try {
      const res = await fetch(getApiUrl('/api/upload'), {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setProofUrl(data.fileUrl);
        setProofName(data.filename);
        showToast('Evidence file attached successfully', 'success');
      } else {
        showToast(data.error || 'Failed to upload file', 'error');
      }
    } catch {
      showToast('Error uploading file', 'error');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim() || !description.trim()) {
      setErrorMsg('Please provide both a Title and detailed Description.');
      return;
    }

    if (collegeId.trim() !== studentUser.collegeId) {
      setErrorMsg(`Verification Error: You are registered under College ID ${studentUser.collegeId}. You cannot submit complaints for College ID ${collegeId}.`);
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('scb_token');
      const res = await fetch(getApiUrl('/api/complaints'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': studentUser.id,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          collegeId: collegeId.trim(),
          title: title.trim(),
          description: description.trim(),
          category,
          priority,
          isAnonymous,
          proofUrl: proofUrl || null,
          proofName: proofName || null
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Complaint ${data.complaint.id} registered and submitted for review.`, 'success');
        setTitle('');
        setDescription('');
        setProofUrl('');
        setProofName('');
        onSuccess();
        onClose();
      } else {
        setErrorMsg(data.error || 'Failed to submit complaint');
        showToast(data.error || 'Submission failed', 'error');
      }
    } catch {
      setErrorMsg('Network error while submitting complaint');
      showToast('Network error', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#FBF9F5] dark:bg-[#1C1511] w-full max-w-2xl rounded-3xl shadow-2xl border border-[#E3D3C2] dark:border-[#38281E] overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E3D3C2] dark:border-[#38281E] bg-[#F5EFEB] dark:bg-[#231B16]">
          <div>
            <h3 className="font-extrabold text-[#2E1E14] dark:text-[#F5EFEB] text-base">Submit Complaint</h3>
            <p className="text-xs text-[#6E5848] dark:text-warm-400">
              Submit your college issue directly to teachers and administrators.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#8C7563] hover:text-[#2E1E14] dark:hover:text-warm-100 hover:bg-[#EBE1D7] dark:hover:bg-[#2A1F18] transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 text-rose-900 dark:text-rose-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* College ID Verification Section */}
          <div>
            <label className="block font-bold text-[#4D3B2F] dark:text-warm-200 uppercase tracking-wider mb-1.5">
              College ID Verification *
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-[#AA9482] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={collegeId}
                onChange={(e) => setCollegeId(e.target.value)}
                placeholder="Enter your registered College ID (e.g. 5555)"
                className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-[#DDD0C3] dark:border-[#3D2C22] font-mono font-bold bg-white dark:bg-[#221A15] text-[#2E1E14] dark:text-[#F5EFEB] focus:outline-none focus:ring-2 focus:ring-[#C9650F]"
                required
              />
            </div>
            <p className="text-[11px] text-[#8C7563] dark:text-warm-400 mt-1">
              Your registered institution ID is <strong className="text-[#2E1E14] dark:text-warm-200">{studentUser?.collegeId}</strong>.
            </p>
          </div>

          {/* Title */}
          <div>
            <label className="block font-bold text-[#4D3B2F] dark:text-warm-200 uppercase tracking-wider mb-1.5">
              Complaint Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Water problem or broken bench in room 204"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#DDD0C3] dark:border-[#3D2C22] bg-white dark:bg-[#221A15] text-[#2E1E14] dark:text-[#F5EFEB] focus:outline-none focus:ring-2 focus:ring-[#C9650F]"
              required
            />
          </div>

          {/* Category & Importance Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[#4D3B2F] dark:text-warm-200 uppercase tracking-wider mb-1.5">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 text-xs rounded-xl border border-[#DDD0C3] dark:border-[#3D2C22] bg-white dark:bg-[#221A15] text-[#2E1E14] dark:text-[#F5EFEB] focus:outline-none focus:ring-2 focus:ring-[#C9650F] font-medium"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'Infrastructure' ? 'College Facilities' : cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#4D3B2F] dark:text-warm-200 uppercase tracking-wider mb-1.5">
                Importance & Response Time *
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2.5 text-xs rounded-xl border border-[#DDD0C3] dark:border-[#3D2C22] bg-white dark:bg-[#221A15] text-[#2E1E14] dark:text-[#F5EFEB] focus:outline-none focus:ring-2 focus:ring-[#C9650F] font-medium"
              >
                {PRIORITIES.map(p => (
                  <option key={p.value} value={p.value}>
                    {p.value} — {p.desc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sensitive Alert if Harassment/Safety */}
          {isSensitive && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Confidential Complaint Protection</strong>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                  Complaints filed under Safety & Well-being are marked as Urgent and kept Confidential to protect you.
                </p>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block font-bold text-brown-800 dark:text-warm-200 uppercase tracking-wider mb-1.5">
              Detailed Description *
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="State precise details: dates, times, specific locations, equipment numbers, and how it impacts student activities..."
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-warm-300 dark:border-brown-700 bg-white dark:bg-brown-900 text-brown-900 dark:text-warm-100 focus:outline-none focus:ring-2 focus:ring-[#C9650F]"
              required
            />
          </div>

          {/* Genuine File Attachment / Proof Upload */}
          <div>
            <label className="block font-bold text-brown-800 dark:text-warm-200 uppercase tracking-wider mb-1.5">
              Supporting Proof / Evidence Upload
            </label>
            <div className="p-4 border-2 border-dashed border-warm-300 dark:border-brown-700 rounded-2xl bg-warm-100/50 dark:bg-brown-900/50 hover:bg-warm-100 dark:hover:bg-brown-900 transition text-center">
              {proofUrl ? (
                <div className="flex items-center justify-between p-2.5 bg-white dark:bg-brown-800 rounded-xl border border-emerald-300 dark:border-emerald-700 text-xs">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-medium">
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Attached: {proofName || 'Evidence_file'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setProofUrl(''); setProofName(''); }}
                    className="text-brown-400 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-semibold underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <UploadCloud className="w-6 h-6 text-brown-400 dark:text-warm-400 mx-auto" />
                  <div className="text-xs text-brown-600 dark:text-warm-300">
                    <label className="font-bold text-[#C9650F] dark:text-[#FAC37A] hover:underline cursor-pointer">
                      <span>Click to upload photo or document</span>
                      <input
                        type="file"
                        onChange={handleFileUpload}
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx"
                        disabled={uploadingFile}
                      />
                    </label>
                    <span className="text-[#8C7563] dark:text-warm-400"> (PNG, JPG, PDF up to 5MB)</span>
                  </div>
                  {uploadingFile && <span className="text-xs text-[#C9650F] font-medium">Uploading file...</span>}
                </div>
              )}
            </div>
          </div>

          {/* Anonymous Setting */}
          <div className="p-3.5 rounded-xl bg-[#FAF6F0] dark:bg-[#251D18] border border-[#E3D3C2] dark:border-[#38281E] flex items-start gap-3">
            <input
              type="checkbox"
              id="anonToggle"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="mt-1 w-4 h-4 rounded text-[#C9650F] focus:ring-[#C9650F] border-[#DDD0C3] dark:border-[#3D2C22] dark:bg-[#1E1713]"
            />
            <label htmlFor="anonToggle" className="cursor-pointer">
              <span className="font-bold text-[#2E1E14] dark:text-warm-100 block">File as Anonymous</span>
              <span className="text-[11px] text-[#8C7563] dark:text-warm-400 block leading-normal mt-0.5">
                Conceals your student identity and displays "Anonymous Student" on the transparency board.
              </span>
            </label>
          </div>

          {/* Footer Submit */}
          <div className="flex items-center gap-3 pt-3 border-t border-[#E3D3C2] dark:border-[#38281E]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-[#DDD0C3] dark:border-[#3D2C22] text-[#6E5848] dark:text-warm-300 font-semibold hover:bg-[#F5EFEB] dark:hover:bg-[#2A1F18] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || uploadingFile}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#C9650F] hover:bg-[#A34C0C] text-white font-bold shadow-md shadow-[#C9650F]/20 transition flex items-center justify-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Submitting...' : 'Submit Complaint'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
