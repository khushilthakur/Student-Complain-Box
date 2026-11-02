import React, { useState, useEffect } from 'react';
import { 
  User, PlusCircle, Building2, ShieldCheck, CheckCircle2, 
  XCircle, Clock, AlertTriangle, AlertCircle, ArrowUpRight, Lock 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import ComplaintCard from '../components/ComplaintCard';
import SubmitComplaintModal from '../components/SubmitComplaintModal';
import { getApiUrl } from '../services/api';

export default function StudentDashboard({ onSelectComplaint, isSubmitOpen, setIsSubmitOpen }) {
  const { currentUser, refreshUser } = useAuth();
  const { showToast } = useNotifications();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('All');

  const fetchMyComplaints = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('scb_token');
      const res = await fetch(getApiUrl('/api/complaints/my'), {
        headers: {
          'x-user-id': currentUser.id,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (data.complaints) {
        setComplaints(data.complaints);
      }
    } catch (err) {
      console.error('Failed to load my complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyComplaints();
  }, [currentUser]);

  if (!currentUser || currentUser.role !== 'student') {
    return (
      <div className="p-16 text-center bg-white dark:bg-brown-900 rounded-3xl border border-warm-200 dark:border-brown-800 shadow-sm">
        <h3 className="font-bold text-brown-900 dark:text-warm-100 text-lg">Student Portal</h3>
        <p className="text-xs text-brown-500 dark:text-warm-400 mt-1">Please sign in with your mobile number via Portal Login.</p>
      </div>
    );
  }

  const quotaLimit = currentUser.complaintLimit || 10;
  const quotaUsed = currentUser.complaintsSubmitted || complaints.length;
  const quotaRemaining = Math.max(0, quotaLimit - quotaUsed);
  const quotaPercent = Math.min(100, Math.round((quotaUsed / quotaLimit) * 100));
  const isQuotaExhausted = quotaRemaining === 0;

  // Filter complaints
  const filtered = complaints.filter(c => {
    if (filterStatus === 'All') return true;
    if (filterStatus === 'Resolved') return c.status === 'Resolved';
    if (filterStatus === 'In Progress') return c.status === 'In Progress' || c.status === 'Assigned';
    if (filterStatus === 'Completed') return c.status === 'Completed';
    if (filterStatus === 'Pending') return c.status === 'Pending';
    if (filterStatus === 'Rejected') return c.status === 'Rejected';
    return true;
  });

  const resolvedAwaitingVerify = complaints.filter(c => c.status === 'Resolved' && c.verification?.status === 'Pending');

  const completedCount = complaints.filter(c => c.status === 'Completed').length;

  return (
    <div className="space-y-8 pb-16">
      {/* Student Banner */}
      <div className="bg-gradient-to-r from-[#2A1B12] via-[#3E291B] to-[#24170E] text-[#FBF9F5] rounded-3xl p-6 sm:p-8 shadow-xl border border-[#523A2A]/60">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Identity Concealed From Public & Faculty Resolvers</span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#FBF9F5]">
                Welcome, {currentUser.name}
              </h1>
              <p className="text-xs text-[#D8C7B5] mt-1">
                Your complaints are published under your protected moniker: <strong className="text-[#F5A623]">{currentUser.maskedName || 'Student #A782'}</strong>.
              </p>
            </div>

            {/* IDs Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 text-xs">
              <div className="bg-white/10 dark:bg-black/20 p-2.5 rounded-xl backdrop-blur-md border border-white/10">
                <span className="text-[10px] text-[#D8C7B5] block font-medium">User ID</span>
                <span className="font-mono font-bold text-white text-xs">{currentUser.id}</span>
              </div>
              <div className="bg-white/10 dark:bg-black/20 p-2.5 rounded-xl backdrop-blur-md border border-white/10">
                <span className="text-[10px] text-[#D8C7B5] block font-medium">Student ID</span>
                <span className="font-mono font-bold text-emerald-300 text-xs">{currentUser.studentId}</span>
              </div>
              <div className="bg-white/10 dark:bg-black/20 p-2.5 rounded-xl backdrop-blur-md border border-white/10">
                <span className="text-[10px] text-[#D8C7B5] block font-medium">College ID</span>
                <span className="font-mono font-bold text-[#F5C28B] text-xs">{currentUser.collegeId}</span>
              </div>
              <div className="bg-white/10 dark:bg-black/20 p-2.5 rounded-xl backdrop-blur-md border border-white/10">
                <span className="text-[10px] text-[#D8C7B5] block font-medium">Status</span>
                <span className="font-bold text-white uppercase text-xs">{currentUser.status}</span>
              </div>
            </div>
          </div>

          {/* Quota Meter Card */}
          <div className="w-full sm:w-80 bg-white/10 dark:bg-black/20 backdrop-blur-md p-5 rounded-2xl border border-white/15 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#D8C7B5]">Complaint Quota Limit</span>
              <span className="font-mono font-extrabold text-[#F5A623]">
                {quotaUsed} / {quotaLimit} used
              </span>
            </div>

            {/* Meter Bar */}
            <div className="w-full bg-black/40 rounded-full h-3 overflow-hidden p-0.5 border border-white/10">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isQuotaExhausted ? 'bg-rose-500' : quotaPercent > 70 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${quotaPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#D8C7B5]">
              <span>{quotaRemaining} complaints left</span>
              <span className="text-[10px] text-[#D8C7B5]">Completed: <strong className="text-emerald-300">{completedCount}/10</strong></span>
            </div>

            <div className="p-2 rounded-lg bg-black/20 border border-white/5 text-[10px] text-[#D8C7B5] leading-tight">
              💡 Admin can only grant +10 more quota after your 10 complaints are marked <strong>Completed</strong>.
            </div>

            <button
              onClick={() => setIsSubmitOpen(true)}
              disabled={isQuotaExhausted}
              className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition ${
                isQuotaExhausted
                  ? 'bg-stone-700 text-stone-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#C9650F] to-[#A34C0C] hover:from-[#B5590B] hover:to-[#914209] text-white shadow-[#C9650F]/20'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isQuotaExhausted ? 'Quota Full (10 Completed needed for +10)' : 'Submit New Complaint'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Urgent Action Banner for Resolved Awaiting Verification */}
      {resolvedAwaitingVerify.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-800 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 font-extrabold text-amber-900 dark:text-amber-200 text-sm">
            <AlertTriangle className="w-5 h-5 text-[#C9650F] dark:text-[#F5A623]" />
            <span>Student Confirmation Required ({resolvedAwaitingVerify.length} {resolvedAwaitingVerify.length === 1 ? 'Complaint' : 'Complaints'} Waiting for Your Confirmation)</span>
          </div>
          <p className="text-xs text-amber-800 dark:text-amber-300">
            A teacher has completed work and submitted solution proof. Please confirm whether it is Done to officially close the complaint!
          </p>
          <div className="flex gap-2 flex-wrap">
            {resolvedAwaitingVerify.map(c => (
              <button
                key={c.id}
                onClick={() => onSelectComplaint(c.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#2A1E17] border border-amber-300 dark:border-amber-700 text-xs font-bold text-[#3E291B] dark:text-[#FAF5EE] hover:bg-amber-100 dark:hover:bg-[#34261D] shadow-xs transition"
              >
                <span>Confirm {c.id}: {c.title.substring(0, 25)}...</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Complaints List & Filter */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <h2 className="font-extrabold text-[#2E1E14] dark:text-[#FAF5EE] text-lg">My Registered Complaints</h2>
            <span className="bg-[#EDE4D8] dark:bg-[#2A1E17] text-[#5A3E2B] dark:text-[#E8DACB] text-xs font-bold px-2.5 py-0.5 rounded-full border border-[#DECDBB] dark:border-[#38261A]">
              {complaints.length}
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-medium">
            {[
              { id: 'All', label: 'All' },
              { id: 'Pending', label: 'Waiting' },
              { id: 'In Progress', label: 'Being Worked On' },
              { id: 'Resolved', label: 'Solved' },
              { id: 'Completed', label: 'Solved & Confirmed' },
              { id: 'Rejected', label: 'Not Accepted' }
            ].map(status => (
              <button
                key={status.id}
                onClick={() => setFilterStatus(status.id)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  filterStatus === status.id
                    ? 'bg-gradient-to-r from-[#C9650F] to-[#A34C0C] text-white font-bold shadow-xs'
                    : 'bg-[#FBF9F5] dark:bg-[#1F1712] border border-[#E3D3C2] dark:border-[#38261A] text-[#4A3525] dark:text-[#D8C7B5] hover:bg-[#F2ECE4] dark:hover:bg-[#2A1E17]'
                }`}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center text-[#7A6250] bg-[#FBF9F5] dark:bg-[#1F1712] rounded-2xl border border-[#E3D3C2] dark:border-[#38261A]">
            Loading your complaints...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center bg-[#FBF9F5] dark:bg-[#1F1712] rounded-2xl border border-[#E3D3C2] dark:border-[#38261A] space-y-3">
            <h3 className="font-bold text-[#2E1E14] dark:text-[#FAF5EE] text-base">No complaints in this status</h3>
            <p className="text-xs text-[#7A6250] dark:text-[#A89685]">
              You haven't filed any complaints matching this filter yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(c => (
              <ComplaintCard
                key={c.id}
                complaint={c}
                onSelect={(comp) => onSelectComplaint(comp.id)}
                activeUserId={currentUser.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Submission Modal */}
      <SubmitComplaintModal
        isOpen={isSubmitOpen}
        onClose={() => setIsSubmitOpen(false)}
        onSuccess={() => {
          fetchMyComplaints();
          refreshUser();
        }}
        studentUser={currentUser}
      />
    </div>
  );
}
