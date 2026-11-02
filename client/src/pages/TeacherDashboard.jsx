import React, { useState, useEffect } from 'react';
import {
  Briefcase, Building2, Clock, CheckCircle2,
  AlertTriangle, Filter, ExternalLink, Paperclip
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ComplaintCard from '../components/ComplaintCard';
import { getApiUrl } from '../services/api';

export default function TeacherDashboard({ onSelectComplaint }) {
  const { currentUser } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');

  const fetchTeacherComplaints = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('scb_token');
      const res = await fetch(getApiUrl('/api/complaints/teacher'), {
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
      console.error('Failed to load teacher complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeacherComplaints();
  }, [currentUser]);

  if (!currentUser || currentUser.role !== 'teacher') {
    return (
      <div className="p-16 text-center bg-white dark:bg-brown-900 rounded-3xl border border-warm-200 dark:border-brown-800 shadow-sm">
        <h3 className="font-bold text-brown-900 dark:text-warm-100 text-lg">Faculty Workspace</h3>
        <p className="text-xs text-brown-500 dark:text-warm-400 mt-1">Please sign in with faculty credentials via Portal Login.</p>
      </div>
    );
  }

  const isApproved = currentUser?.approvalStatus === 'Approved' || (!currentUser?.approvalStatus && currentUser?.isVerified);
  if (!isApproved) {
    return (
      <div className="p-12 sm:p-16 text-center bg-amber-50 dark:bg-amber-950/40 rounded-3xl border border-amber-300 dark:border-amber-800 shadow-sm max-w-2xl mx-auto my-8 space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center mx-auto">
          <Clock className="w-6 h-6" />
        </div>
        <h3 className="font-extrabold text-[#2E1E14] dark:text-[#FAF5EE] text-lg">
          Account Waiting for Admin Approval
        </h3>
        <p className="text-sm text-[#7A6250] dark:text-[#C5B3A2] leading-relaxed">
          Your account is waiting for Admin approval. You can log in after your account is approved.
        </p>
      </div>
    );
  }

  const totalAssigned = complaints.length;
  const inProgressCount = complaints.filter(c => c.status === 'In Progress' || c.status === 'Assigned' || c.status === 'Not Done').length;
  const resolvedCount = complaints.filter(c => c.status === 'Resolved' || c.status === 'Completed').length;
  const escalatedCount = complaints.filter(c => c.isEscalated || c.status === 'Escalated').length;

  const filtered = complaints.filter(c => {
    if (statusFilter === 'All') return true;
    if (statusFilter === 'In Progress') return c.status === 'In Progress' || c.status === 'Assigned' || c.status === 'Not Done';
    if (statusFilter === 'Resolved') return c.status === 'Resolved';
    if (statusFilter === 'Completed') return c.status === 'Completed';
    if (statusFilter === 'Escalated') return c.isEscalated || c.status === 'Escalated';
    return true;
  });

  return (
    <div className="space-y-8 pb-16">
      {/* Teacher Profile Banner */}
      <div className="bg-gradient-to-r from-[#2A1B12] via-[#3E291B] to-[#24170E] text-[#FBF9F5] rounded-3xl p-6 sm:p-8 shadow-xl border border-[#523A2A]/60">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C9650F]/25 border border-[#E88C30]/40 text-[#F5C28B] text-xs font-semibold">
              <Briefcase className="w-3.5 h-3.5" />
              <span>Assigned Faculty Resolver Desk</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#FBF9F5]">
              {currentUser.name}
            </h1>

            <div className="flex items-center gap-3 text-xs flex-wrap">
              <span className="bg-white/10 dark:bg-black/20 px-3 py-1 rounded-lg backdrop-blur-md font-mono border border-white/10">
                Teacher ID: <strong className="text-[#F5A623]">{currentUser.teacherId}</strong>
              </span>
              <span className="bg-white/10 dark:bg-black/20 px-3 py-1 rounded-lg backdrop-blur-md border border-white/10">
                College ID: <strong className="text-[#F5C28B]">{currentUser.collegeId}</strong>
              </span>
              <span className="bg-white/10 dark:bg-black/20 px-3 py-1 rounded-lg backdrop-blur-md border border-white/10">
                Dept: <strong className="text-[#D8C7B5]">{currentUser.department || 'Academic Faculty'}</strong>
              </span>
              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${currentUser.isVerified ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300'
                }`}>
                {currentUser.isVerified ? 'Verified Teacher' : 'Waiting for Approval'}
              </span>
            </div>

            <p className="text-[11px] text-[#D8C7B5] max-w-xl leading-relaxed pt-1">
              Notice: Student privacy is strictly protected. Please review complaints assigned to you promptly (target response time is 24 hours).
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-2.5 sm:w-72">
            <div className="bg-white/10 dark:bg-black/20 p-3 rounded-xl border border-white/10 text-center">
              <div className="text-[10px] text-[#D8C7B5] font-semibold uppercase">Total Assigned</div>
              <div className="text-xl font-extrabold text-[#FBF9F5] mt-0.5">{totalAssigned}</div>
            </div>
            <div className="bg-white/10 dark:bg-black/20 p-3 rounded-xl border border-white/10 text-center">
              <div className="text-[10px] text-[#D8C7B5] font-semibold uppercase">Being Worked On</div>
              <div className="text-xl font-extrabold text-[#F5A623] mt-0.5">{inProgressCount}</div>
            </div>
            <div className="bg-white/10 dark:bg-black/20 p-3 rounded-xl border border-white/10 text-center">
              <div className="text-[10px] text-[#D8C7B5] font-semibold uppercase">Solved</div>
              <div className="text-xl font-extrabold text-emerald-300 mt-0.5">{resolvedCount}</div>
            </div>
            <div className="bg-white/10 dark:bg-black/20 p-3 rounded-xl border border-white/10 text-center">
              <div className="text-[10px] text-[#D8C7B5] font-semibold uppercase">Higher Authority</div>
              <div className="text-xl font-extrabold text-rose-300 mt-0.5">{escalatedCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Complaints Workbench */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-extrabold text-[#2E1E14] dark:text-[#FAF5EE] text-lg">
              My Assigned Complaints
            </h2>
            <p className="text-xs text-[#7A6250] dark:text-[#A89685]">
              Select any complaint to review date & time, submit solution proof, or mark as Solved.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-medium">
            {[
              { id: 'All', label: 'All' },
              { id: 'In Progress', label: 'Being Worked On' },
              { id: 'Resolved', label: 'Solved' },
              { id: 'Completed', label: 'Solved & Confirmed' },
              { id: 'Escalated', label: 'Higher Authority' }
            ].map(st => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`px-3 py-1.5 rounded-lg transition ${statusFilter === st.id
                    ? 'bg-gradient-to-r from-[#C9650F] to-[#A34C0C] text-white font-bold shadow-xs'
                    : 'bg-[#FBF9F5] dark:bg-[#1F1712] border border-[#E3D3C2] dark:border-[#38261A] text-[#4A3525] dark:text-[#D8C7B5] hover:bg-[#F2ECE4] dark:hover:bg-[#2A1E17]'
                  }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center text-[#7A6250] bg-[#FBF9F5] dark:bg-[#1F1712] rounded-2xl border border-[#E3D3C2] dark:border-[#38261A]">
            Loading assigned tasks...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center bg-[#FBF9F5] dark:bg-[#1F1712] rounded-2xl border border-[#E3D3C2] dark:border-[#38261A] space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h3 className="font-bold text-[#2E1E14] dark:text-[#FAF5EE] text-base">No pending assignments</h3>
            <p className="text-xs text-[#7A6250] dark:text-[#A89685]">All complaints in this filter are up to date.</p>
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
    </div>
  );
}
