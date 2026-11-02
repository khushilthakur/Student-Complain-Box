import React, { useState, useEffect } from 'react';
import { 
  X, Building2, User, Clock, CheckCircle2, XCircle, 
  Send, ShieldCheck, ShieldAlert, AlertTriangle, Paperclip, MessageSquare, ExternalLink,
  Sparkles, HelpCircle
} from 'lucide-react';
import { CATEGORY_COLORS, PRIORITY_STYLES, STATUS_STYLES } from './ComplaintCard';
import ResolutionTimer from './ResolutionTimer';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { getApiUrl } from '../services/api';

export default function ComplaintDetailModal({ complaintId, isOpen, onClose, onRefresh }) {
  const { currentUser, role } = useAuth();
  const { showToast } = useNotifications();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Verification state
  const [verificationFeedback, setVerificationFeedback] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Teacher resolution proof state
  const [resolutionText, setResolutionText] = useState('');
  const [resolutionProofUrl, setResolutionProofUrl] = useState('');
  const [resolving, setResolving] = useState(false);

  // Teacher progress update note state
  const [progressNote, setProgressNote] = useState('');
  const [updatingNote, setUpdatingNote] = useState(false);

  const fetchDetails = async () => {
    if (!complaintId) return;
    try {
      setLoading(true);
      const res = await fetch(getApiUrl(`/api/complaints/${complaintId}`), {
        headers: currentUser ? { 'x-user-id': currentUser.id } : {}
      });
      const result = await res.json();
      if (res.ok) {
        setData(result);
      } else {
        showToast(result.error || 'Failed to load complaint', 'error');
      }
    } catch {
      showToast('Network error loading details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && complaintId) {
      fetchDetails();
    } else {
      setData(null);
    }
  }, [isOpen, complaintId]);

  if (!isOpen) return null;

  const complaint = data?.complaint;
  const activities = data?.activities || [];
  const comments = data?.comments || [];

  const isAssignedTeacher = currentUser && currentUser.id === complaint?.assignedTeacherId;
  const isAdmin = currentUser && currentUser.role === 'admin';
  const isStudentAuthor = currentUser && currentUser.id === complaint?.studentUserId;
  const canVerify = (isStudentAuthor || isAdmin) && complaint?.status === 'Resolved';

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(getApiUrl(`/api/complaints/${complaint.id}/comments`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(currentUser ? { 'x-user-id': currentUser.id } : {})
        },
        body: JSON.stringify({ text: newComment })
      });
      const resData = await res.json();
      if (res.ok) {
        setNewComment('');
        fetchDetails();
        showToast('Comment added', 'success');
      } else {
        showToast(resData.error || 'Failed to post comment', 'error');
      }
    } catch {
      showToast('Error posting comment', 'error');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleVerify = async (decision) => {
    setVerifying(true);
    try {
      const res = await fetch(getApiUrl(`/api/complaints/${complaint.id}/verify`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id
        },
        body: JSON.stringify({
          decision,
          feedback: verificationFeedback
        })
      });
      const resData = await res.json();
      if (res.ok) {
        showToast(decision === 'Done' ? 'Complaint marked as Completed!' : 'Sent back to In Progress', 'success');
        fetchDetails();
        if (onRefresh) onRefresh();
      } else {
        showToast(resData.error || 'Verification failed', 'error');
      }
    } catch {
      showToast('Error during verification', 'error');
    } finally {
      setVerifying(false);
    }
  };

  const handleTeacherResolve = async (e) => {
    e.preventDefault();
    if (!resolutionText.trim()) {
      showToast('Please provide resolution details/proof', 'warning');
      return;
    }
    setResolving(true);
    try {
      const res = await fetch(getApiUrl(`/api/complaints/${complaint.id}/resolve`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id
        },
        body: JSON.stringify({
          explanation: resolutionText,
          proofUrl: resolutionProofUrl
        })
      });
      const resData = await res.json();
      if (res.ok) {
        showToast('Complaint marked as Resolved! Sent for student verification.', 'success');
        setResolutionText('');
        setResolutionProofUrl('');
        fetchDetails();
        if (onRefresh) onRefresh();
      } else {
        showToast(resData.error || 'Failed to resolve', 'error');
      }
    } catch {
      showToast('Error submitting resolution', 'error');
    } finally {
      setResolving(false);
    }
  };

  const handleTeacherUpdate = async (e) => {
    e.preventDefault();
    if (!progressNote.trim()) return;
    setUpdatingNote(true);
    try {
      const res = await fetch(getApiUrl(`/api/complaints/${complaint.id}/teacher-update`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id
        },
        body: JSON.stringify({ note: progressNote })
      });
      const resData = await res.json();
      if (res.ok) {
        showToast('Progress update posted', 'success');
        setProgressNote('');
        fetchDetails();
      } else {
        showToast(resData.error || 'Failed to update', 'error');
      }
    } catch {
      showToast('Error updating complaint', 'error');
    } finally {
      setUpdatingNote(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#FBF9F5] dark:bg-[#1C1511] w-full max-w-4xl rounded-2xl shadow-2xl border border-[#E3D3C2] dark:border-[#38281E] overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E3D3C2] dark:border-[#38281E] bg-[#F5EFEB] dark:bg-[#231B16] sticky top-0 z-10">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-mono text-sm font-extrabold px-2.5 py-1 rounded-lg bg-[#F1E9DF] dark:bg-[#34241B] text-[#5F442E] dark:text-[#FCDCAC] border border-[#E3D3C2] dark:border-[#4D3B2F]">
              {complaint ? complaint.id : 'Loading...'}
            </span>
            {complaint && (
              <>
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-white dark:bg-[#2B201A] text-[#5F442E] dark:text-warm-200 border border-[#E8DDD2] dark:border-[#3E2E24]">
                  <Building2 className="w-3.5 h-3.5 text-[#AA9482]" />
                  <span>College ID: {complaint.collegeId}</span>
                </span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${PRIORITY_STYLES[complaint.priority]}`}>
                  {complaint.priority}
                </span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${STATUS_STYLES[complaint.status]}`}>
                  {complaint.status}
                </span>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-[#8C7563] hover:text-[#2E1E14] dark:hover:text-warm-100 p-1.5 rounded-lg hover:bg-[#EBE1D7] dark:hover:bg-[#2B201A] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        {loading || !complaint ? (
          <div className="p-12 text-center text-[#8C7563] dark:text-warm-400 font-medium">Loading complaint details...</div>
        ) : (
          <div className="p-6 overflow-y-auto space-y-6">
            {/* Title & Metadata */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-sm font-bold text-[#C9650F] dark:text-[#FAC37A]">
                  {complaint.collegeName}
                </span>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-md border ${CATEGORY_COLORS[complaint.category] || CATEGORY_COLORS.Other}`}>
                  {complaint.category}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#2E1E14] dark:text-[#F5EFEB] leading-tight">
                {complaint.title}
              </h2>
            </div>

            {/* Student Privacy Banner */}
            <div className="p-4 rounded-xl border border-[#E3D3C2] dark:border-[#38281E] bg-[#FAF6F0] dark:bg-[#251D18] flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#F1E9DF] dark:bg-[#38281E] text-[#7A5B42] dark:text-[#FCDCAC] flex items-center justify-center font-bold">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#2E1E14] dark:text-warm-100 text-sm">
                      {complaint.displayName || 'Anonymous Student'}
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#EBE1D7] dark:bg-[#34241B] text-[#5F442E] dark:text-warm-300">
                      Privacy Protected
                    </span>
                  </div>
                  <p className="text-xs text-[#8C7563] dark:text-warm-400 mt-0.5">
                    Real student details are strictly confidential and concealed from public & teachers.
                  </p>
                </div>
              </div>

              {/* If viewer is Admin, show authorized real audit info */}
              {complaint.studentRealDetails && isAdmin && (
                <div className="w-full mt-2 pt-2 border-t border-[#E3D3C2] dark:border-[#38281E] bg-[#F5EFEB] dark:bg-[#1E1713] p-3 rounded-lg text-xs text-[#5F442E] dark:text-warm-200 space-y-1">
                  <div className="font-bold text-[#2E1E14] dark:text-warm-100 flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4 text-[#C9650F]" />
                    <span>Administrator View (Confidential Student Data):</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono">
                    <div>Name: <strong>{complaint.studentRealDetails.name}</strong></div>
                    <div>Mobile: <strong>{complaint.studentRealDetails.mobile}</strong></div>
                    <div>Student ID: <strong>{complaint.studentRealDetails.studentId}</strong></div>
                    <div>Quota: <strong>{complaint.studentRealDetails.complaintsSubmitted}/{complaint.studentRealDetails.complaintLimit}</strong></div>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="prose prose-stone max-w-none text-[#4D3B2F] dark:text-warm-200 text-sm leading-relaxed whitespace-pre-wrap bg-white dark:bg-[#221A15] p-4 rounded-xl border border-[#E3D3C2] dark:border-[#38281E]">
              {complaint.description}
            </div>

            {/* SLA & Escalation Simplification Guidance Card */}
            <div className="p-4 rounded-2xl bg-[#FAF6F0] dark:bg-[#231A15] border border-[#E3D3C2] dark:border-[#38281E] text-xs space-y-2">
              <div className="font-bold text-[#2E1E14] dark:text-warm-100 flex items-center gap-1.5 text-xs">
                <Sparkles className="w-4 h-4 text-[#C9650F]" />
                <span>Quick Guide: Response Time & Higher Authority</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-[#6E5848] dark:text-warm-300">
                <div className="p-3 rounded-xl bg-white dark:bg-[#2B201A] border border-[#E8DDD2] dark:border-[#3E2E24]">
                  <strong className="text-[#2E1E14] dark:text-warm-100 block mb-0.5">🎯 Expected Response Time:</strong>
                  <span>The expected time window for the teacher to solve this complaint ({complaint.slaHours || 72} hours). It ensures teachers take action quickly.</span>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-[#2B201A] border border-[#E8DDD2] dark:border-[#3E2E24]">
                  <strong className="text-[#2E1E14] dark:text-warm-100 block mb-0.5">⚡ What is Higher Authority?</strong>
                  <span>When a complaint is delayed past the deadline, it is sent directly to the College Principal for urgent attention.</span>
                </div>
              </div>
            </div>

            {/* Proofs / Attachments */}
            {complaint.proofs && complaint.proofs.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-[#6E5848] dark:text-warm-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Submitted Evidence & Attachments ({complaint.proofs.length})</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {complaint.proofs.map(prf => (
                    <a
                      key={prf.id}
                      href={prf.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl border border-[#E3D3C2] dark:border-[#38281E] hover:border-[#C9650F] bg-white dark:bg-[#221A15] transition group"
                    >
                      <div className="w-12 h-12 rounded-lg bg-[#F1E9DF] dark:bg-[#34241B] overflow-hidden shrink-0 flex items-center justify-center">
                        <img src={prf.url} alt={prf.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="overflow-hidden flex-1">
                        <div className="text-xs font-bold text-[#2E1E14] dark:text-warm-100 truncate group-hover:text-[#C9650F]">
                          {prf.name}
                        </div>
                        <div className="text-[11px] text-[#8C7563] dark:text-warm-400">
                          Uploaded by {prf.uploadedByRole}
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-[#AA9482] group-hover:text-[#C9650F] shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Assignment Date & 24hr Notice Display */}
            {complaint.assignedAt && (
              <ResolutionTimer
                assignedAt={complaint.assignedAt}
                deadlineAt={complaint.deadlineAt}
                isEscalated={complaint.isEscalated}
                status={complaint.status}
              />
            )}

            {/* Escalation details if escalated */}
            {complaint.isEscalated && (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 text-rose-950 dark:text-rose-200 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-sm text-rose-800 dark:text-rose-300">
                  <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>Complaint Sent to Higher Authority</span>
                </div>
                <p className="text-xs">
                  Sent to: <strong>{complaint.escalatedTo || 'College Principal'}</strong>
                </p>
                <p className="text-xs text-rose-800 dark:text-rose-300">
                  Reason: {complaint.escalationReason || 'Not solved within expected time.'}
                </p>
              </div>
            )}

            {/* Rejection notice if rejected */}
            {complaint.status === 'Rejected' && (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 text-rose-950 dark:text-rose-200 space-y-1">
                <div className="font-bold text-sm text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span>Complaint Not Accepted</span>
                </div>
                <p className="text-xs text-rose-900 dark:text-rose-200 mt-1">
                  <strong>Reason Not Accepted:</strong> {complaint.rejectionReason}
                </p>
              </div>
            )}

            {/* Teacher Resolution Proof & Explanation */}
            {complaint.resolutionProof && (
              <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm text-emerald-900 dark:text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Teacher Solution Details</span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-400">
                    Solved by: {complaint.resolutionProof.resolvedBy}
                  </span>
                </div>
                <p className="text-xs text-emerald-950 dark:text-emerald-200 whitespace-pre-wrap leading-relaxed">
                  {complaint.resolutionProof.text}
                </p>
                {complaint.resolutionProof.proofUrl && (
                  <div className="pt-2">
                    <a
                      href={complaint.resolutionProof.proofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-300 bg-white dark:bg-[#231B16] px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-[#2A1F18] transition"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>View Solution Proof Image</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Verification Action Box (For Student Author or Admin) */}
            {canVerify && (
              <div className="p-5 rounded-2xl bg-[#FAF6F0] dark:bg-[#251D18] border-2 border-[#DDD0C3] dark:border-[#3D2C22] shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-[#2E1E14] dark:text-warm-100 font-bold text-sm">
                  <ShieldCheck className="w-5 h-5 text-[#C9650F]" />
                  <span>Please Verify Solution</span>
                </div>
                <p className="text-xs text-[#6E5848] dark:text-warm-300 leading-relaxed">
                  The teacher has submitted proof of the solution. Please check whether the problem is fixed.
                  Selecting <strong>Solved (Close Complaint)</strong> will officially close the complaint. 
                  If the issue remains, select <strong>Still Not Solved</strong> to return it to the teacher.
                </p>

                <input
                  type="text"
                  placeholder="Optional remarks..."
                  value={verificationFeedback}
                  onChange={(e) => setVerificationFeedback(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#DDD0C3] dark:border-[#3D2C22] bg-white dark:bg-[#1E1713] text-[#2E1E14] dark:text-[#F5EFEB] focus:outline-none focus:ring-2 focus:ring-[#C9650F]"
                />

                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={() => handleVerify('Done')}
                    disabled={verifying}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Solved (Close Complaint)</span>
                  </button>
                  <button
                    onClick={() => handleVerify('Not Done')}
                    disabled={verifying}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#7A5B42] hover:bg-[#5F442E] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Still Not Solved</span>
                  </button>
                </div>
              </div>
            )}

            {/* Verification completed status notice */}
            {complaint.verification?.status === 'Done' && (
              <div className="p-3 rounded-xl bg-emerald-100/80 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-950 dark:text-emerald-300 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Verified as Done by {complaint.verification.verifiedBy}. Complaint is officially Completed.</span>
              </div>
            )}

            {/* Teacher Workbench Actions (Visible only to assigned teacher) */}
            {isAssignedTeacher && complaint.status !== 'Completed' && complaint.status !== 'Resolved' && (
              <div className="p-5 rounded-2xl bg-[#FAF6F0] dark:bg-[#251D18] border border-[#DDD0C3] dark:border-[#3D2C22] space-y-4">
                <div className="font-bold text-sm text-[#2E1E14] dark:text-warm-100 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#C9650F]" />
                  <span>Teacher Action Center (Assigned to You)</span>
                </div>

                {/* Post update note */}
                <form onSubmit={handleTeacherUpdate} className="flex gap-2">
                  <input
                    type="text"
                    value={progressNote}
                    onChange={(e) => setProgressNote(e.target.value)}
                    placeholder="Post an official progress update..."
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-[#DDD0C3] dark:border-[#3D2C22] bg-white dark:bg-[#1E1713] text-[#2E1E14] dark:text-[#F5EFEB] focus:outline-none focus:ring-2 focus:ring-[#C9650F]"
                  />
                  <button
                    type="submit"
                    disabled={updatingNote || !progressNote.trim()}
                    className="px-4 py-2 bg-[#7A5B42] hover:bg-[#5F442E] text-white font-bold text-xs rounded-xl transition"
                  >
                    Post Update
                  </button>
                </form>

                {/* Mark Resolved with Proof */}
                <div className="pt-2 border-t border-[#E3D3C2] dark:border-[#38281E]">
                  <h5 className="text-xs font-bold text-[#4D3B2F] dark:text-warm-200 uppercase tracking-wider mb-2">
                    Submit Solution Proof & Mark Solved
                  </h5>
                  <form onSubmit={handleTeacherResolve} className="space-y-2">
                    <textarea
                      rows={2}
                      value={resolutionText}
                      onChange={(e) => setResolutionText(e.target.value)}
                      placeholder="Explanation of how the problem was solved..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#DDD0C3] dark:border-[#3D2C22] bg-white dark:bg-[#1E1713] text-[#2E1E14] dark:text-[#F5EFEB] focus:outline-none focus:ring-2 focus:ring-[#C9650F]"
                      required
                    />
                    <input
                      type="url"
                      value={resolutionProofUrl}
                      onChange={(e) => setResolutionProofUrl(e.target.value)}
                      placeholder="Solution proof photo / document link (optional)..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#DDD0C3] dark:border-[#3D2C22] bg-white dark:bg-[#1E1713] text-[#2E1E14] dark:text-[#F5EFEB] focus:outline-none focus:ring-2 focus:ring-[#C9650F]"
                    />
                    <button
                      type="submit"
                      disabled={resolving}
                      className="w-full py-2.5 bg-[#C9650F] hover:bg-[#A34C0C] text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{resolving ? 'Submitting...' : 'Mark Complaint as Solved'}</span>
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Activity History Timeline */}
            <div>
              <h4 className="text-xs font-bold text-[#4D3B2F] dark:text-warm-200 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#C9650F]" />
                <span>Complete Activity History ({activities.length})</span>
              </h4>
              <div className="relative pl-6 border-l-2 border-[#E3D3C2] dark:border-[#38281E] space-y-4 text-xs">
                {activities.map(act => (
                  <div key={act.id} className="relative">
                    <div className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-white dark:bg-[#1C1511] border-2 border-[#C9650F]" />
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-bold text-[#2E1E14] dark:text-warm-100">
                        {act.action} by <span className="text-[#C9650F]">{act.actorName}</span> ({act.actorRole})
                      </span>
                      <span className="text-[11px] text-[#8C7563] dark:text-warm-400 shrink-0">
                        {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(act.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[#6E5848] dark:text-warm-400 mt-0.5">{act.details}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Comments Section */}
            <div className="pt-4 border-t border-[#E3D3C2] dark:border-[#38281E]">
              <h4 className="text-xs font-bold text-[#4D3B2F] dark:text-warm-200 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-[#C9650F]" />
                <span>Discussion & Official Updates ({comments.length})</span>
              </h4>

              <div className="space-y-3 mb-4">
                {comments.length === 0 ? (
                  <p className="text-xs text-[#8C7563] dark:text-warm-400 italic">No comments yet. Be the first to reply.</p>
                ) : (
                  comments.map(cmt => (
                    <div
                      key={cmt.id}
                      className={`p-3 rounded-xl border text-xs leading-relaxed ${
                        cmt.isOfficial
                          ? 'bg-[#FAF6F0] dark:bg-[#251D18] border-[#DDD0C3] dark:border-[#3D2C22]'
                          : 'bg-white dark:bg-[#221A15] border-[#E3D3C2] dark:border-[#38281E]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#2E1E14] dark:text-warm-100">{cmt.authorName}</span>
                          {cmt.isOfficial && (
                            <span className="bg-[#7A5B42] text-white text-[10px] font-bold px-1.5 py-0.2 rounded uppercase">
                              Official {cmt.authorRole}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#8C7563] dark:text-warm-400">
                          {new Date(cmt.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-[#6E5848] dark:text-warm-300">{cmt.text}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Comment Input */}
              <form onSubmit={handleSendComment} className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={currentUser ? "Write a comment or response..." : "Write a public comment..."}
                  className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-[#DDD0C3] dark:border-[#3D2C22] bg-white dark:bg-[#1E1713] text-[#2E1E14] dark:text-[#F5EFEB] focus:outline-none focus:ring-2 focus:ring-[#C9650F]"
                />
                <button
                  type="submit"
                  disabled={submittingComment || !newComment.trim()}
                  className="px-4 py-2.5 bg-[#C9650F] hover:bg-[#A34C0C] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
