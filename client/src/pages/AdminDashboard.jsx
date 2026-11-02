import React, { useState, useEffect } from 'react';
import { 
  Shield, Building2, Users, Briefcase, AlertTriangle, 
  CheckCircle2, XCircle, BarChart3, PlusCircle, Flag, 
  Send, UserCheck, UserX, Clock, ShieldAlert, Sparkles, Search,
  RefreshCw, ChevronLeft, ChevronRight, Eye, Phone, Mail
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { STATUS_STYLES, PRIORITY_STYLES, CATEGORY_COLORS } from '../components/ComplaintCard';
import ResolutionTimer from '../components/ResolutionTimer';
import { getApiUrl } from '../services/api';

export default function AdminDashboard({ onSelectComplaint }) {
  const { currentUser } = useAuth();
  const { showToast } = useNotifications();

  const [activeTab, setActiveTab] = useState('complaints'); // complaints | colleges | students | teachers | reports | analytics
  const [complaints, setComplaints] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [usersData, setUsersData] = useState({ students: [], teachers: [] });
  const [reports, setReports] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Complaints Hub Filter & Search States
  const [complaintStatusFilter, setComplaintStatusFilter] = useState('All');
  const [complaintSearch, setComplaintSearch] = useState('');
  const [complaintCollegeFilter, setComplaintCollegeFilter] = useState('All');
  const [complaintCategoryFilter, setComplaintCategoryFilter] = useState('All');
  const [complaintPriorityFilter, setComplaintPriorityFilter] = useState('All');
  const [complaintPage, setComplaintPage] = useState(1);
  const [complaintsCounts, setComplaintsCounts] = useState({
    all: 0, pending: 0, approved: 0, assigned: 0, inProgress: 0, resolved: 0, completed: 0, rejected: 0, escalated: 0
  });

  // Search & Filter States
  const [collegeSearch, setCollegeSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentCollegeFilter, setStudentCollegeFilter] = useState('');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherApprovalFilter, setTeacherApprovalFilter] = useState('All'); // 'All' | 'Waiting for Approval' | 'Approved' | 'Not Approved'

  const getTeacherStatus = (t) => {
    if (t?.approvalStatus) return t.approvalStatus;
    if (t?.isVerified) return 'Approved';
    if (t?.status === 'rejected' || t?.status === 'unapproved' || t?.status === 'blocked') return 'Not Approved';
    return 'Waiting for Approval';
  };

  // Modal / Action states
  const [reviewModalComplaint, setReviewModalComplaint] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [visibilityChoice, setVisibilityChoice] = useState('Public');

  const [assignModalComplaint, setAssignModalComplaint] = useState(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');

  const [escalateModalComplaint, setEscalateModalComplaint] = useState(null);
  const [escalationTarget, setEscalationTarget] = useState('College Principal & Grievance Cell');
  const [escalationReason, setEscalationReason] = useState('');

  // Register College Modal
  const [isAddCollegeOpen, setIsAddCollegeOpen] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColCode, setNewColCode] = useState('');
  const [newColId, setNewColId] = useState('');
  const [newColPrincipal, setNewColPrincipal] = useState('');
  const [newColAddress, setNewColAddress] = useState('');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('scb_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      'x-user-id': currentUser?.id || 'USR-00001'
    };
  };

  const fetchAllData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setIsRefreshing(true);
      const headers = getAuthHeaders();

      const [resComp, resCol, resUsers, resRep, resAna] = await Promise.all([
        fetch(getApiUrl('/api/admin/complaints?limit=300'), { headers }),
        fetch(getApiUrl('/api/colleges'), { headers }),
        fetch(getApiUrl('/api/admin/users'), { headers }),
        fetch(getApiUrl('/api/admin/reports'), { headers }),
        fetch(getApiUrl('/api/admin/analytics'), { headers })
      ]);

      const safeJson = async (res) => {
        try {
          if (!res.ok) {
            console.warn(`[Admin] HTTP ${res.status} from ${res.url}`);
            return null;
          }
          return await res.json();
        } catch (e) {
          console.error('[Admin] JSON parse error:', e);
          return null;
        }
      };

      const dataComp = await safeJson(resComp);
      const dataCol = await safeJson(resCol);
      const dataUsers = await safeJson(resUsers);
      const dataRep = await safeJson(resRep);
      const dataAna = await safeJson(resAna);

      if (dataComp?.complaints) {
        setComplaints(dataComp.complaints);
        if (dataComp.counts) setComplaintsCounts(dataComp.counts);
      }
      if (dataCol?.colleges) setColleges(dataCol.colleges);
      if (dataUsers && (dataUsers.students || dataUsers.teachers)) setUsersData(dataUsers);
      if (dataRep?.reports) setReports(dataRep.reports);
      if (dataAna?.metrics) setAnalytics(dataAna);
    } catch (err) {
      console.error('Error loading admin console:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    // Auto-refresh interval (every 10 seconds) so newly submitted complaints appear immediately
    const interval = setInterval(() => {
      fetchAllData(true);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="p-16 text-center bg-white dark:bg-brown-900 rounded-3xl border border-warm-200 dark:border-brown-800 shadow-sm">
        <h3 className="font-bold text-brown-900 dark:text-warm-100 text-lg">Administrator Privileges Required</h3>
        <p className="text-xs text-brown-500 dark:text-warm-400 mt-1">Please sign in with administrator credentials via Portal Login.</p>
      </div>
    );
  }

  // --- Handlers ---
  const handleApprove = async () => {
    if (!reviewModalComplaint) return;
    try {
      const res = await fetch(getApiUrl(`/api/complaints/${reviewModalComplaint.id}/review`), {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'approve',
          visibility: visibilityChoice
        })
      });
      if (res.ok) {
        showToast(`Complaint ${reviewModalComplaint.id} approved!`, 'success');
        setReviewModalComplaint(null);
        fetchAllData();
      }
    } catch {
      showToast('Error approving complaint', 'error');
    }
  };

  const handleReject = async () => {
    if (!reviewModalComplaint) return;
    if (!rejectionReason.trim()) {
      showToast('Rejection reason is mandatory', 'warning');
      return;
    }
    try {
      const res = await fetch(getApiUrl(`/api/complaints/${reviewModalComplaint.id}/review`), {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'reject',
          reason: rejectionReason
        })
      });
      if (res.ok) {
        showToast(`Complaint ${reviewModalComplaint.id} rejected with recorded reason.`, 'info');
        setReviewModalComplaint(null);
        setRejectionReason('');
        fetchAllData();
      }
    } catch {
      showToast('Error rejecting complaint', 'error');
    }
  };

  const handleAssignTeacher = async (e) => {
    e.preventDefault();
    if (!assignModalComplaint || !selectedTeacherId) return;
    try {
      const res = await fetch(getApiUrl(`/api/complaints/${assignModalComplaint.id}/assign`), {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ teacherId: selectedTeacherId })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Teacher assigned & assignment date recorded!`, 'success');
        setAssignModalComplaint(null);
        setSelectedTeacherId('');
        fetchAllData();
      } else {
        showToast(data.error || 'Assignment error', 'error');
      }
    } catch {
      showToast('Error assigning teacher', 'error');
    }
  };

  const handleEscalate = async (e) => {
    e.preventDefault();
    if (!escalateModalComplaint) return;
    try {
      const res = await fetch(getApiUrl(`/api/complaints/${escalateModalComplaint.id}/escalate`), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          reason: escalationReason,
          escalatedTo: escalationTarget
        })
      });
      if (res.ok) {
        showToast(`Complaint escalated to ${escalationTarget}!`, 'warning');
        setEscalateModalComplaint(null);
        setEscalationReason('');
        fetchAllData();
      }
    } catch {
      showToast('Error escalating', 'error');
    }
  };

  const handleExtendQuota = async (student) => {
    const completed = student.completedComplaintsCount || 0;
    if (completed < 10) {
      showToast(`Rule: Admin can only give 10 more complaints after 10 completed. Student has only completed ${completed}/10.`, 'warning');
      return;
    }
    try {
      const res = await fetch(getApiUrl(`/api/admin/users/${student.id}/quota`), {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ amount: 10 })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Granted +10 quota! New limit: ${data.user.complaintLimit}`, 'success');
        fetchAllData();
      } else {
        showToast(data.error || 'Failed to extend quota', 'error');
      }
    } catch {
      showToast('Failed to extend quota', 'error');
    }
  };

  const handleUserSanction = async (userId, newStatus) => {
    try {
      const res = await fetch(getApiUrl(`/api/admin/users/${userId}/sanction`), {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        showToast(`User status updated to: ${newStatus.toUpperCase()}`, 'info');
        fetchAllData();
      }
    } catch {
      showToast('Failed to apply sanction', 'error');
    }
  };

  const handleApproveTeacher = async (teacherId) => {
    try {
      const res = await fetch(getApiUrl(`/api/admin/teachers/${teacherId}/approve`), {
        method: 'PATCH',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Teacher account approved successfully! They can now log in.', 'success');
        fetchAllData();
      } else {
        showToast(data.error || 'Approval failed', 'error');
      }
    } catch {
      showToast('Approval request failed', 'error');
    }
  };

  const handleRejectTeacher = async (teacherId) => {
    try {
      const res = await fetch(getApiUrl(`/api/admin/teachers/${teacherId}/reject`), {
        method: 'PATCH',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Teacher account marked as Not Approved.', 'warning');
        fetchAllData();
      } else {
        showToast(data.error || 'Rejection failed', 'error');
      }
    } catch {
      showToast('Rejection request failed', 'error');
    }
  };

  const handleSetTeacherStatus = async (teacherId, targetStatus) => {
    try {
      const res = await fetch(getApiUrl(`/api/admin/teachers/${teacherId}/status`), {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: targetStatus })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Teacher approval status changed to ${targetStatus}`, 'success');
        fetchAllData();
      } else {
        showToast(data.error || 'Failed to update status', 'error');
      }
    } catch {
      showToast('Status update failed', 'error');
    }
  };

  const handleVerifyTeacher = async (teacherId) => {
    return handleApproveTeacher(teacherId);
  };

  const handleCollegeStatus = async (collegeId, status) => {
    try {
      const res = await fetch(getApiUrl(`/api/colleges/${collegeId}`), {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        showToast(`College status changed to ${status}`, 'success');
        fetchAllData();
      }
    } catch {
      showToast('Failed to update college', 'error');
    }
  };

  const handleDeleteCollege = async (collegeId, collegeName) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${collegeName}" (ID: ${collegeId})? This will remove the college record.`)) {
      return;
    }
    try {
      const res = await fetch(getApiUrl(`/api/colleges/${collegeId}`), {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || `College ${collegeName} deleted successfully`, 'info');
        fetchAllData();
      } else {
        showToast(data.error || 'Failed to delete college', 'error');
      }
    } catch {
      showToast('Error deleting college', 'error');
    }
  };

  const handleCreateCollege = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(getApiUrl('/api/colleges'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: newColName,
          code: newColCode,
          customId: newColId || undefined,
          principalName: newColPrincipal,
          address: newColAddress
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`College ${data.college.name} created with ID: ${data.college.id}`, 'success');
        setIsAddCollegeOpen(false);
        setNewColName('');
        setNewColCode('');
        setNewColId('');
        fetchAllData();
      } else {
        showToast(data.error || 'Failed to create college', 'error');
      }
    } catch {
      showToast('Error registering college', 'error');
    }
  };

  const handleReportAction = async (reportId, action, markFake = false) => {
    try {
      const res = await fetch(getApiUrl(`/api/admin/reports/${reportId}/action`), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action, markFake })
      });
      if (res.ok) {
        showToast('Report handled successfully', 'success');
        fetchAllData();
      }
    } catch {
      showToast('Failed to process report', 'error');
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-[#2A1B12] via-[#3E291B] to-[#24170E] text-[#FBF9F5] rounded-3xl p-6 sm:p-8 shadow-xl border border-[#523A2A]/60">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C9650F]/25 border border-[#E88C30]/40 text-[#F5C28B] text-xs font-bold">
              <Shield className="w-3.5 h-3.5" />
              <span>Full System Administration Console</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#FBF9F5]">
              Master Admin Control Center
            </h1>
            <p className="text-xs text-[#D8C7B5] max-w-2xl leading-relaxed">
              Super-admin governance over registered colleges, students, quota extensions (+10 after 10 completed), 
              faculty verifications, complaint approvals, assignment dates, and misuse moderation.
            </p>
          </div>

          {/* Quick Metrics */}
          {analytics?.metrics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-white/10 dark:bg-black/20 p-3 rounded-xl backdrop-blur-md text-center border border-white/10">
                <div className="text-[10px] text-[#D8C7B5] font-semibold uppercase">Waiting for Review</div>
                <div className="text-xl font-extrabold text-[#F5A623]">{analytics.metrics.pendingReview}</div>
              </div>
              <div className="bg-white/10 dark:bg-black/20 p-3 rounded-xl backdrop-blur-md text-center border border-white/10">
                <div className="text-[10px] text-[#D8C7B5] font-semibold uppercase">Being Worked On</div>
                <div className="text-xl font-extrabold text-blue-300">{analytics.metrics.inProgress}</div>
              </div>
              <div className="bg-white/10 dark:bg-black/20 p-3 rounded-xl backdrop-blur-md text-center border border-white/10">
                <div className="text-[10px] text-[#D8C7B5] font-semibold uppercase">Higher Authority</div>
                <div className="text-xl font-extrabold text-rose-300">{analytics.metrics.escalated}</div>
              </div>
              <div className="bg-white/10 dark:bg-black/20 p-3 rounded-xl backdrop-blur-md text-center border border-white/10">
                <div className="text-[10px] text-[#D8C7B5] font-semibold uppercase">Reported Issues</div>
                <div className="text-xl font-extrabold text-amber-300">{analytics.metrics.pendingReports}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#E3D3C2] dark:border-[#38261A] text-xs font-bold">
        {[
          { id: 'colleges', label: 'College Registrations', icon: Building2, count: colleges.length },
          { id: 'students', label: 'Students Data & Quotas', icon: Users, count: usersData.students?.length || 0 },
          { id: 'teachers', label: 'Teachers', icon: Briefcase, count: usersData.teachers?.length || 0, badge: (usersData.teachers || []).filter(t => getTeacherStatus(t) === 'Waiting for Approval').length || undefined },
          { id: 'complaints', label: 'Complaints', icon: Shield, count: complaints.length },
          { id: 'reports', label: 'Reported Issues', icon: Flag, count: reports.length },
          { id: 'analytics', label: 'Reports & Analytics', icon: BarChart3 },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-[#C9650F] to-[#A34C0C] text-white shadow-md shadow-[#C9650F]/25'
                  : 'bg-[#FBF9F5] dark:bg-[#1F1712] border border-[#E3D3C2] dark:border-[#38261A] text-[#4A3525] dark:text-[#D8C7B5] hover:bg-[#F2ECE4] dark:hover:bg-[#2A1E17]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                  activeTab === tab.id ? 'bg-white/25 text-white' : 'bg-[#EDE4D8] dark:bg-[#2A1E17] text-[#6D5543] dark:text-[#D8C7B5]'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: COMPLAINTS HUB */}
      {activeTab === 'complaints' && (() => {
        // Apply client filters on complaints
        const filteredComplaints = complaints.filter(c => {
          if (complaintStatusFilter !== 'All') {
            if (complaintStatusFilter === 'In Progress') {
              if (!['In Progress', 'Not Done', 'Approved', 'Assigned'].includes(c.status)) return false;
            } else if (complaintStatusFilter === 'Escalated') {
              if (!c.isEscalated && c.status !== 'Escalated') return false;
            } else if (c.status !== complaintStatusFilter) {
              return false;
            }
          }
          if (complaintCollegeFilter !== 'All' && String(c.collegeId) !== String(complaintCollegeFilter)) {
            return false;
          }
          if (complaintCategoryFilter !== 'All' && (c.category || '').toLowerCase() !== complaintCategoryFilter.toLowerCase()) {
            return false;
          }
          if (complaintPriorityFilter !== 'All' && (c.priority || '').toLowerCase() !== complaintPriorityFilter.toLowerCase()) {
            return false;
          }
          if (complaintSearch.trim()) {
            const q = complaintSearch.toLowerCase();
            const searchable = [
              c.id, c.title, c.description, c.collegeName, String(c.collegeId),
              c.category, c.priority, c.status, c.studentName, c.studentAnonymousId,
              c.assignedTeacherName, c.assignedTeacherRefId,
              c.studentRealDetails?.name, c.studentRealDetails?.mobile, c.studentRealDetails?.email
            ].filter(Boolean).map(x => String(x).toLowerCase());
            if (!searchable.some(s => s.includes(q))) return false;
          }
          return true;
        });

        const pageSize = 12;
        const totalPages = Math.ceil(filteredComplaints.length / pageSize) || 1;
        const currentPage = Math.min(complaintPage, totalPages);
        const paginatedComplaints = filteredComplaints.slice((currentPage - 1) * pageSize, currentPage * pageSize);

        return (
          <div className="space-y-4">
            {/* Header with live refresh button */}
            <div className="bg-[#FBF9F5] dark:bg-[#1F1712] p-5 rounded-2xl border border-[#E3D3C2] dark:border-[#38261A] shadow-xs flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="font-extrabold text-[#2E1E14] dark:text-[#FAF5EE] text-base">Complaints Workflow Management</h3>
                <p className="text-xs text-[#7A6250] dark:text-[#A89685]">
                  Live administrator feed of student grievances across all institutions. Audit complainant details, assign faculty, and resolve escalations.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Total Matching: <strong className="text-slate-800 dark:text-slate-200">{filteredComplaints.length}</strong> / {complaints.length}
                </div>
                <button
                  type="button"
                  onClick={() => fetchAllData(true)}
                  disabled={isRefreshing}
                  className="px-3 py-1.5 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#5A4030] dark:text-[#D8C7B5] hover:bg-[#EDE4D8] dark:hover:bg-[#38261A] text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
                  title="Refresh complaints database"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#C9650F]' : ''}`} />
                  <span className="hidden sm:inline">Refresh Data</span>
                </button>
              </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {[
                { id: 'All', label: 'All Complaints', count: complaintsCounts.all || complaints.length },
                { id: 'Pending', label: 'Waiting for Review', count: complaintsCounts.pending, color: 'text-amber-700 bg-amber-100 dark:bg-amber-950/60' },
                { id: 'In Progress', label: 'Being Worked On', count: complaintsCounts.inProgress, color: 'text-blue-700 bg-blue-100 dark:bg-blue-950/60' },
                { id: 'Resolved', label: 'Solved (Needs Verification)', count: complaintsCounts.resolved, color: 'text-purple-700 bg-purple-100 dark:bg-purple-950/60' },
                { id: 'Completed', label: 'Closed & Verified', count: complaintsCounts.completed, color: 'text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60' },
                { id: 'Rejected', label: 'Not Accepted', count: complaintsCounts.rejected, color: 'text-slate-700 bg-slate-100 dark:bg-slate-800' },
                { id: 'Escalated', label: 'Sent to Higher Authority', count: complaintsCounts.escalated, color: 'text-rose-700 bg-rose-100 dark:bg-rose-950/60' }
              ].map(st => (
                <button
                  key={st.id}
                  onClick={() => { setComplaintStatusFilter(st.id); setComplaintPage(1); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                    complaintStatusFilter === st.id
                      ? 'bg-[#2E1E14] dark:bg-[#FAF5EE] text-white dark:text-[#2E1E14] shadow-xs'
                      : 'bg-[#F2ECE4] dark:bg-[#251B15] text-[#5A4030] dark:text-[#D8C7B5] hover:bg-[#EAE1D5] dark:hover:bg-[#2F221B]'
                  }`}
                >
                  <span>{st.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    complaintStatusFilter === st.id ? 'bg-white/30 text-white dark:bg-black/20 dark:text-[#2E1E14]' : 'bg-[#DECDBB] dark:bg-[#3D2B20] text-[#4A3525] dark:text-[#FAF5EE]'
                  }`}>
                    {st.count || 0}
                  </span>
                </button>
              ))}
            </div>

            {/* Filter Bar: Search, College, Category, Priority */}
            <div className="bg-[#FBF9F5] dark:bg-[#1F1712] p-3 rounded-2xl border border-[#E3D3C2] dark:border-[#38261A] shadow-xs flex items-center gap-3 flex-wrap text-xs">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8C7A6B]" />
                <input
                  type="text"
                  value={complaintSearch}
                  onChange={(e) => { setComplaintSearch(e.target.value); setComplaintPage(1); }}
                  placeholder="Search by ID, title, description, student, or college..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                />
              </div>

              {/* College Filter */}
              <select
                value={complaintCollegeFilter}
                onChange={(e) => { setComplaintCollegeFilter(e.target.value); setComplaintPage(1); }}
                className="py-1.5 px-3 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] focus:ring-2 focus:ring-[#C9650F] focus:outline-none text-xs font-semibold"
              >
                <option value="All">All Colleges</option>
                {colleges.map(col => (
                  <option key={col.id} value={col.id}>{col.name} ({col.id})</option>
                ))}
              </select>

              {/* Category Filter */}
              <select
                value={complaintCategoryFilter}
                onChange={(e) => { setComplaintCategoryFilter(e.target.value); setComplaintPage(1); }}
                className="py-1.5 px-3 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] focus:ring-2 focus:ring-[#C9650F] focus:outline-none text-xs font-semibold"
              >
                <option value="All">All Categories</option>
                {['Infrastructure', 'Academic', 'Hostel', 'Examination', 'Fees/Administration', 'Harassment/Safety', 'Library', 'Transport', 'Other'].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Priority Filter */}
              <select
                value={complaintPriorityFilter}
                onChange={(e) => { setComplaintPriorityFilter(e.target.value); setComplaintPage(1); }}
                className="py-1.5 px-3 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] focus:ring-2 focus:ring-[#C9650F] focus:outline-none text-xs font-semibold"
              >
                <option value="All">All Priorities</option>
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>

              {(complaintSearch || complaintStatusFilter !== 'All' || complaintCollegeFilter !== 'All' || complaintCategoryFilter !== 'All' || complaintPriorityFilter !== 'All') && (
                <button
                  type="button"
                  onClick={() => {
                    setComplaintSearch('');
                    setComplaintStatusFilter('All');
                    setComplaintCollegeFilter('All');
                    setComplaintCategoryFilter('All');
                    setComplaintPriorityFilter('All');
                    setComplaintPage(1);
                  }}
                  className="px-2.5 py-1 text-xs text-[#C9650F] hover:underline font-semibold"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Complaints Table */}
            <div className="bg-[#FBF9F5] dark:bg-[#1F1712] rounded-2xl border border-[#E3D3C2] dark:border-[#38261A] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F4ECE2] dark:bg-[#2A1E17] text-[#4A3525] dark:text-[#D8C7B5] font-bold uppercase tracking-wider text-[10px] border-b border-[#E3D3C2] dark:border-[#38261A]">
                    <tr>
                      <th className="py-3 px-4">ID & Title</th>
                      <th className="py-3 px-3">College</th>
                      <th className="py-3 px-3">Complainant Student</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Priority</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Assigned Resolver</th>
                      <th className="py-3 px-3">Timeline & SLA</th>
                      <th className="py-3 px-4 text-right">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE7DC] dark:divide-[#2E2017]">
                    {paginatedComplaints.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-[#8C7A6B] text-xs">
                          {complaints.length === 0
                            ? 'No student grievances submitted yet.'
                            : 'No complaints match the selected filter criteria.'}
                        </td>
                      </tr>
                    ) : (
                      paginatedComplaints.map(c => {
                        const studentDetails = c.studentRealDetails || {};
                        return (
                          <tr key={c.id} className="hover:bg-[#F6EFE7]/80 dark:hover:bg-[#281C15]/50 transition">
                            <td className="py-3 px-4 max-w-xs">
                              <div className="font-mono font-bold text-[#2E1E14] dark:text-[#FAF5EE] text-xs">{c.id}</div>
                              <div className="font-semibold text-[#4A3525] dark:text-[#D8C7B5] truncate" title={c.title}>{c.title}</div>
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-bold text-[#2E1E14] dark:text-[#FAF5EE]">{c.collegeName}</span>
                              <div className="text-[10px] font-mono text-[#8C7A6B] dark:text-[#9F8C7D]">ID: {c.collegeId}</div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="space-y-0.5">
                                <div className="font-bold text-[#2E1E14] dark:text-[#FAF5EE]">
                                  {studentDetails.name || c.studentName || 'Student'}
                                </div>
                                {studentDetails.mobile && (
                                  <div className="flex items-center gap-1 text-[10px] text-[#7A6250] dark:text-[#A89685] font-mono">
                                    <Phone className="w-2.5 h-2.5 text-[#C9650F]" />
                                    <span>+91 {studentDetails.mobile}</span>
                                  </div>
                                )}
                                <div className="text-[10px] text-[#8C7A6B] dark:text-[#9F8C7D]">
                                  {c.isAnonymous ? '(Anonymous Moniker: ' + (c.studentAnonymousId || 'Hidden') + ')' : (studentDetails.studentId || c.studentAnonymousId || '')}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${CATEGORY_COLORS[c.category] || CATEGORY_COLORS.Other}`}>
                                {c.category}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${PRIORITY_STYLES[c.priority]}`}>
                                {c.priority}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLES[c.status] || 'bg-gray-100 text-gray-800'}`}>
                                {c.status}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              {c.assignedTeacherName ? (
                                <div className="font-semibold text-[#2E1E14] dark:text-[#FAF5EE]">
                                  {c.assignedTeacherName}
                                  <div className="text-[10px] text-[#8C7A6B] dark:text-[#9F8C7D] font-mono">{c.assignedTeacherRefId}</div>
                                </div>
                              ) : (
                                <span className="text-[#8C7A6B] italic">Unassigned</span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              {c.isEscalated ? (
                                <div className="space-y-0.5">
                                  <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1 text-[11px]">
                                    <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
                                    <span>Sent Higher</span>
                                  </span>
                                  <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">Sent to Principal</div>
                                </div>
                              ) : c.assignedAt ? (
                                <ResolutionTimer 
                                  assignedAt={c.assignedAt} 
                                  targetHours={c.slaHours || 24} 
                                  isEscalated={c.isEscalated} 
                                  compact={true} 
                                />
                              ) : (
                                <span className="text-[#8C7A6B] text-[11px]">Not assigned</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                              {/* Pending Review action */}
                              {c.status === 'Pending' && (
                                <button
                                  onClick={() => {
                                    setReviewModalComplaint(c);
                                    setVisibilityChoice(c.category === 'Harassment/Safety' ? 'Restricted' : 'Public');
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-[#C9650F] hover:bg-[#A34C0C] text-white font-bold text-[11px] shadow-xs cursor-pointer"
                                >
                                  Review
                                </button>
                              )}

                              {/* Assign Teacher Action */}
                              {(c.status === 'Approved' || (c.status === 'In Progress' && !c.assignedTeacherId)) && (
                                <button
                                  onClick={() => {
                                    setAssignModalComplaint(c);
                                    const match = usersData.teachers.find(t => t.collegeId === c.collegeId && t.isVerified);
                                    if (match) setSelectedTeacherId(match.id);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-[#3E291B] hover:bg-[#291B12] text-white font-bold text-[11px] shadow-xs border border-[#523A2A] cursor-pointer"
                                >
                                  Assign Teacher
                                </button>
                              )}

                              {/* Escalate button */}
                              {!c.isEscalated && c.status !== 'Completed' && c.status !== 'Rejected' && (
                                <button
                                  onClick={() => setEscalateModalComplaint(c)}
                                  className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold text-[11px] transition cursor-pointer"
                                  title="Forward to College Principal"
                                >
                                  Send Higher
                                </button>
                              )}

                              {/* Open detail */}
                              <button
                                onClick={() => onSelectComplaint(c.id)}
                                className="px-2.5 py-1 rounded-lg bg-[#EDE4D8] hover:bg-[#E2D6C6] dark:bg-[#2A1E17] dark:hover:bg-[#34261D] text-[#4A3525] dark:text-[#D8C7B5] font-semibold text-[11px] transition border border-[#DECDBB] dark:border-[#38261A] cursor-pointer"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {filteredComplaints.length > pageSize && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-[#E3D3C2] dark:border-[#38261A] bg-[#F7F2EC] dark:bg-[#221914] text-xs">
                  <div className="text-[#7A6250] dark:text-[#A89685]">
                    Showing <strong>{(currentPage - 1) * pageSize + 1}</strong> to <strong>{Math.min(currentPage * pageSize, filteredComplaints.length)}</strong> of <strong>{filteredComplaints.length}</strong> complaints
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setComplaintPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 rounded-lg border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#5A4030] dark:text-[#D8C7B5] disabled:opacity-40 flex items-center gap-1 font-bold"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Previous</span>
                    </button>
                    <span className="font-bold text-[#2E1E14] dark:text-[#FAF5EE]">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setComplaintPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 rounded-lg border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#5A4030] dark:text-[#D8C7B5] disabled:opacity-40 flex items-center gap-1 font-bold"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* TAB 2: COLLEGES MANAGER */}
      {activeTab === 'colleges' && (() => {
        const filteredColleges = colleges.filter(c => {
          if (!collegeSearch.trim()) return true;
          const q = collegeSearch.toLowerCase();
          return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.id.includes(q) || (c.principalName && c.principalName.toLowerCase().includes(q));
        });

        return (
          <div className="space-y-4">
            <div className="bg-[#FBF9F5] dark:bg-[#1F1712] p-5 rounded-2xl border border-[#E3D3C2] dark:border-[#38261A] shadow-xs flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="font-extrabold text-[#2E1E14] dark:text-[#FAF5EE] text-base">Multi-College Registry</h3>
                <p className="text-xs text-[#7A6250] dark:text-[#A89685]">
                  Every registered college receives a permanent unique College ID that binds students and teachers.
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative min-w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8C7A6B]" />
                  <input
                    type="text"
                    value={collegeSearch}
                    onChange={(e) => setCollegeSearch(e.target.value)}
                    placeholder="Search by name, code, or ID..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                  />
                </div>

                <button
                  onClick={() => setIsAddCollegeOpen(true)}
                  className="px-4 py-2 bg-[#C9650F] hover:bg-[#A34C0C] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm shadow-[#C9650F]/20 transition"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Register New College</span>
                </button>
              </div>
            </div>

            {filteredColleges.length === 0 ? (
              <div className="bg-[#FBF9F5] dark:bg-[#1F1712] rounded-2xl border border-[#E3D3C2] dark:border-[#38261A] p-12 text-center space-y-3">
                <Building2 className="w-12 h-12 text-[#8C7A6B] mx-auto" />
                <h4 className="font-bold text-[#2E1E14] dark:text-[#FAF5EE] text-base">No Colleges Found</h4>
                <p className="text-xs text-[#7A6250] dark:text-[#A89685] max-w-md mx-auto leading-relaxed">
                  {collegeSearch ? 'No colleges match your search criteria. Try a different search term.' : 'Click "Register New College" above or use the Front Page to register a college.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredColleges.map(col => (
                <div key={col.id} className="bg-[#FBF9F5] dark:bg-[#1F1712] rounded-2xl border border-[#E3D3C2] dark:border-[#38261A] p-5 shadow-xs space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-extrabold text-[#2E1E14] dark:text-[#FAF5EE] text-base">{col.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono bg-[#EDE4D8] dark:bg-[#2A1E17] text-[#5A3E2B] dark:text-[#E8DACB] text-xs font-bold px-2 py-0.5 rounded border border-[#DECDBB] dark:border-[#38261A]">
                          College ID: {col.id}
                        </span>
                        <span className="font-bold text-[#7A6250] dark:text-[#A89685] text-xs">Code: {col.code}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                        col.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' :
                        col.status === 'restricted' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800' :
                        'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                      }`}>
                        {col.status}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-[#5A4030] dark:text-[#D8C7B5] space-y-1 pt-1">
                    <div>Principal: <strong className="text-[#2E1E14] dark:text-[#FAF5EE]">{col.principalName}</strong></div>
                    <div>Contact: {col.contactEmail} • {col.contactPhone}</div>
                    <div>Campus: {col.address}</div>
                  </div>

                  {/* College Status & Management Controls */}
                  <div className="flex items-center justify-between pt-3 border-t border-[#EFE7DC] dark:border-[#2E2017] text-xs flex-wrap gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#7A6250] dark:text-[#A89685] font-medium">Status:</span>
                      <button
                        onClick={() => handleCollegeStatus(col.id, 'active')}
                        className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition ${col.status === 'active' ? 'bg-emerald-600 text-white' : 'bg-[#EDE4D8] dark:bg-[#2A1E17] text-[#4A3525] dark:text-[#D8C7B5] hover:bg-[#E2D6C6]'}`}
                      >
                        Active
                      </button>
                      <button
                        onClick={() => handleCollegeStatus(col.id, 'restricted')}
                        className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition ${col.status === 'restricted' ? 'bg-amber-500 text-white' : 'bg-[#EDE4D8] dark:bg-[#2A1E17] text-[#4A3525] dark:text-[#D8C7B5] hover:bg-[#E2D6C6]'}`}
                      >
                        Restricted
                      </button>
                      <button
                        onClick={() => handleCollegeStatus(col.id, 'inactive')}
                        className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition ${col.status === 'inactive' ? 'bg-rose-600 text-white' : 'bg-[#EDE4D8] dark:bg-[#2A1E17] text-[#4A3525] dark:text-[#D8C7B5] hover:bg-[#E2D6C6]'}`}
                      >
                        Inactive
                      </button>
                    </div>

                    {/* Delete College Action */}
                    <button
                      onClick={() => handleDeleteCollege(col.id, col.name)}
                      className="px-2.5 py-1 rounded-md font-semibold text-[11px] bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800 transition"
                      title="Permanently remove this college"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ); })()}

      {/* TAB 3: STUDENTS & QUOTA (+10) */}
      {activeTab === 'students' && (() => {
        const filteredStudents = (usersData.students || []).filter(std => {
          if (studentCollegeFilter && std.collegeId !== studentCollegeFilter) return false;
          if (!studentSearch.trim()) return true;
          const q = studentSearch.toLowerCase();
          return (std.name && std.name.toLowerCase().includes(q)) ||
                 (std.studentId && std.studentId.toLowerCase().includes(q)) ||
                 (std.mobile && std.mobile.includes(q)) ||
                 (std.email && std.email.toLowerCase().includes(q));
        });

        return (
          <div className="space-y-4">
            <div className="bg-[#FBF9F5] dark:bg-[#1F1712] p-5 rounded-2xl border border-[#E3D3C2] dark:border-[#38261A] shadow-xs flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="font-extrabold text-[#2E1E14] dark:text-[#FAF5EE] text-base">Student Quota & Identity Directory</h3>
                <p className="text-xs text-[#7A6250] dark:text-[#A89685]">
                  Authorized Administrator view: Student real identities, contact info, quota status, and strictly enforced +10 quota extension rule (granted only after 10 completed complaints).
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8C7A6B]" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search students..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                  />
                </div>

                <select
                  value={studentCollegeFilter}
                  onChange={(e) => setStudentCollegeFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] font-medium focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                >
                  <option value="">All Colleges</option>
                  {colleges.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                  ))}
                </select>

                <span className="text-xs font-bold text-[#6D5543] dark:text-[#C7B5A3]">
                  {filteredStudents.length} Students
                </span>
              </div>
            </div>

            <div className="bg-[#FBF9F5] dark:bg-[#1F1712] rounded-2xl border border-[#E3D3C2] dark:border-[#38261A] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F4ECE2] dark:bg-[#2A1E17] text-[#4A3525] dark:text-[#D8C7B5] font-bold uppercase tracking-wider text-[10px] border-b border-[#E3D3C2] dark:border-[#38261A]">
                    <tr>
                      <th className="py-3.5 px-4">Student Real Name & ID</th>
                      <th className="py-3.5 px-3">Public Masked Tag</th>
                      <th className="py-3.5 px-3">College</th>
                      <th className="py-3.5 px-3">Mobile & Email</th>
                      <th className="py-3.5 px-3">Quota & Completion Progress</th>
                      <th className="py-3.5 px-3">Status</th>
                      <th className="py-3.5 px-4 text-right">Quota (+10) & Sanctions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE7DC] dark:divide-[#2E2017]">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-[#8C7A6B] text-xs">
                          {studentSearch || studentCollegeFilter ? 'No students match the filter.' : 'No students registered yet.'}
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map(std => {
                      const completed = std.completedComplaintsCount || 0;
                      const isEligibleForQuota = completed >= 10;

                      return (
                        <tr key={std.id} className="hover:bg-[#F6EFE7]/80 dark:hover:bg-[#281C15]/50 transition">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-[#2E1E14] dark:text-[#FAF5EE] text-sm">{std.name}</div>
                            <div className="font-mono text-[11px] text-[#A34C0C] dark:text-[#F5C28B] font-semibold">{std.studentId} • {std.id}</div>
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="bg-[#EDE4D8] dark:bg-[#2A1E17] text-[#4A3525] dark:text-[#D8C7B5] font-bold px-2 py-0.5 rounded border border-[#DECDBB] dark:border-[#38261A]">
                              {std.maskedName}
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="font-bold text-[#2E1E14] dark:text-[#FAF5EE]">{std.collegeName}</div>
                            <div className="text-[10px] font-mono text-[#8C7A6B] dark:text-[#9F8C7D]">ID: {std.collegeId}</div>
                          </td>
                          <td className="py-3.5 px-3 font-mono">
                            <div className="text-[#2E1E14] dark:text-[#FAF5EE]">{std.mobile}</div>
                            <div className="text-[10px] text-[#8C7A6B] dark:text-[#9F8C7D]">{std.email}</div>
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-[#C9650F] dark:text-[#F5A623] text-xs">
                                  {std.complaintsSubmitted || 0} / {std.complaintLimit || 10}
                                </span>
                                <span className="text-[10px] text-[#8C7A6B]">submitted</span>
                              </div>
                              <div className="flex items-center gap-1">
                                {isEligibleForQuota ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                    ✓ {completed} Completed (Eligible)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#EFE7DC] dark:bg-[#2A1E17] text-[#7A6250] dark:text-[#A89685] border border-[#DECDBB] dark:border-[#38261A]">
                                    Completed: {completed}/10
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              std.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' :
                              std.status === 'warned' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800' :
                              std.status === 'restricted' ? 'bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-800' :
                              'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                            }`}>
                              {std.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                            {/* Grant +10 Quota - strictly conditionally styled */}
                            <button
                              onClick={() => handleExtendQuota(std)}
                              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] shadow-xs transition ${
                                isEligibleForQuota
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-700/20'
                                  : 'bg-[#EDE4D8] dark:bg-[#2A1E17] hover:bg-[#E2D6C6] text-[#7A6250] dark:text-[#A89685] border border-[#DECDBB] dark:border-[#38261A]'
                              }`}
                              title={
                                isEligibleForQuota
                                  ? "Grant +10 Quota (Student has completed 10 complaints)"
                                  : `Admin can only give 10 more after 10 completed. Currently: ${completed}/10`
                              }
                            >
                              +10 Quota {isEligibleForQuota ? '✓' : `(${completed}/10)`}
                            </button>

                            {/* Sanction Actions */}
                            <button
                              onClick={() => handleUserSanction(std.id, std.status === 'warned' ? 'active' : 'warned')}
                              className="px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/60 font-semibold text-[11px] border border-amber-300 dark:border-amber-800 transition"
                            >
                              {std.status === 'warned' ? 'Unwarn' : 'Warn'}
                            </button>

                            <button
                              onClick={() => handleUserSanction(std.id, std.status === 'blocked' ? 'active' : 'blocked')}
                              className={`px-2 py-1 rounded-lg font-bold text-[11px] transition ${
                                std.status === 'blocked' 
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' 
                                  : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                              }`}
                            >
                              {std.status === 'blocked' ? 'Unblock' : 'Block'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ); })()}

      {/* TAB 4: TEACHERS APPROVAL & VERIFICATION HUB */}
      {activeTab === 'teachers' && (() => {
        const allTeachers = usersData.teachers || [];
        const waitingTeachers = allTeachers.filter(t => getTeacherStatus(t) === 'Waiting for Approval');
        const approvedTeachers = allTeachers.filter(t => getTeacherStatus(t) === 'Approved');
        const notApprovedTeachers = allTeachers.filter(t => getTeacherStatus(t) === 'Not Approved');

        const filteredTeachers = allTeachers.filter(t => {
          const status = getTeacherStatus(t);
          if (teacherApprovalFilter !== 'All' && status !== teacherApprovalFilter) return false;
          if (!teacherSearch.trim()) return true;
          const q = teacherSearch.toLowerCase();
          return (t.name && t.name.toLowerCase().includes(q)) ||
                 (t.teacherId && t.teacherId.toLowerCase().includes(q)) ||
                 (t.collegeName && t.collegeName.toLowerCase().includes(q)) ||
                 (t.collegeId && String(t.collegeId).toLowerCase().includes(q)) ||
                 (t.department && t.department.toLowerCase().includes(q)) ||
                 (t.mobile && t.mobile.includes(q)) ||
                 (t.email && t.email.toLowerCase().includes(q));
        });

        return (
          <div className="space-y-4">
            {/* Header with live refresh button & explanation */}
            <div className="bg-[#FBF9F5] dark:bg-[#1F1712] p-5 rounded-2xl border border-[#E3D3C2] dark:border-[#38261A] shadow-xs flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-[#2E1E14] dark:text-[#FAF5EE] text-base">Teacher Account Approval & Faculty Hub</h3>
                  {waitingTeachers.length > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white animate-pulse">
                      {waitingTeachers.length} Waiting
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#7A6250] dark:text-[#A89685] mt-0.5">
                  Admin authorization required for all faculty accounts. Teachers waiting for approval or marked as Not Approved cannot access the Teacher Dashboard.
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative min-w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8C7A6B]" />
                  <input
                    type="text"
                    value={teacherSearch}
                    onChange={(e) => setTeacherSearch(e.target.value)}
                    placeholder="Search by name, mobile, ID, dept..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => fetchAllData(true)}
                  disabled={isRefreshing}
                  className="px-3 py-1.5 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#5A4030] dark:text-[#D8C7B5] hover:bg-[#EDE4D8] dark:hover:bg-[#38261A] text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
                  title="Refresh teacher list"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#C9650F]' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
            </div>

            {/* Quick Stats Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div 
                onClick={() => setTeacherApprovalFilter('All')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                  teacherApprovalFilter === 'All'
                    ? 'bg-white dark:bg-[#2A1E17] border-[#C9650F] shadow-sm'
                    : 'bg-[#FBF9F5] dark:bg-[#1F1712] border-[#E3D3C2] dark:border-[#38261A] hover:border-[#DECDBB]'
                }`}
              >
                <div className="text-[11px] font-bold text-[#7A6250] dark:text-[#A89685]">All Registered Teachers</div>
                <div className="text-xl font-extrabold text-[#2E1E14] dark:text-[#FAF5EE] mt-0.5">{allTeachers.length}</div>
              </div>

              <div 
                onClick={() => setTeacherApprovalFilter('Waiting for Approval')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                  teacherApprovalFilter === 'Waiting for Approval'
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 shadow-sm'
                    : 'bg-[#FBF9F5] dark:bg-[#1F1712] border-[#E3D3C2] dark:border-[#38261A] hover:border-amber-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400">Waiting for Approval</div>
                  {waitingTeachers.length > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />}
                </div>
                <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">{waitingTeachers.length}</div>
              </div>

              <div 
                onClick={() => setTeacherApprovalFilter('Approved')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                  teacherApprovalFilter === 'Approved'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 shadow-sm'
                    : 'bg-[#FBF9F5] dark:bg-[#1F1712] border-[#E3D3C2] dark:border-[#38261A] hover:border-emerald-300'
                }`}
              >
                <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">Approved</div>
                <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{approvedTeachers.length}</div>
              </div>

              <div 
                onClick={() => setTeacherApprovalFilter('Not Approved')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                  teacherApprovalFilter === 'Not Approved'
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 shadow-sm'
                    : 'bg-[#FBF9F5] dark:bg-[#1F1712] border-[#E3D3C2] dark:border-[#38261A] hover:border-rose-300'
                }`}
              >
                <div className="text-[11px] font-bold text-rose-700 dark:text-rose-400">Not Approved</div>
                <div className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">{notApprovedTeachers.length}</div>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold">
              {[
                { id: 'All', label: 'All Accounts', count: allTeachers.length },
                { id: 'Waiting for Approval', label: 'Waiting for Approval', count: waitingTeachers.length, highlight: waitingTeachers.length > 0 },
                { id: 'Approved', label: 'Approved', count: approvedTeachers.length },
                { id: 'Not Approved', label: 'Not Approved', count: notApprovedTeachers.length },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setTeacherApprovalFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
                    teacherApprovalFilter === f.id
                      ? 'bg-[#2E1E14] dark:bg-[#FAF5EE] text-white dark:text-[#2E1E14] shadow-xs'
                      : 'bg-[#F2ECE4] dark:bg-[#251B15] text-[#5A4030] dark:text-[#D8C7B5] hover:bg-[#EAE1D5]'
                  }`}
                >
                  <span>{f.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    teacherApprovalFilter === f.id
                      ? 'bg-white/30 text-white dark:bg-black/20 dark:text-[#2E1E14]'
                      : f.highlight ? 'bg-amber-500 text-white' : 'bg-[#DECDBB] dark:bg-[#3D2B20] text-[#4A3525] dark:text-[#FAF5EE]'
                  }`}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Teachers Table */}
            <div className="bg-[#FBF9F5] dark:bg-[#1F1712] rounded-2xl border border-[#E3D3C2] dark:border-[#38261A] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F4ECE2] dark:bg-[#2A1E17] text-[#4A3525] dark:text-[#D8C7B5] font-bold uppercase tracking-wider text-[10px] border-b border-[#E3D3C2] dark:border-[#38261A]">
                    <tr>
                      <th className="py-3.5 px-4">Teacher Name & ID</th>
                      <th className="py-3.5 px-3">Registered Mobile</th>
                      <th className="py-3.5 px-3">College & ID</th>
                      <th className="py-3.5 px-3">Department</th>
                      <th className="py-3.5 px-3">Account Status</th>
                      <th className="py-3.5 px-4 text-right">Approval Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE7DC] dark:divide-[#2E2017]">
                    {filteredTeachers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-[#8C7A6B] text-xs">
                          {teacherSearch || teacherApprovalFilter !== 'All' 
                            ? 'No teachers match the selected status or search query.' 
                            : 'No teacher accounts registered in the system yet.'}
                        </td>
                      </tr>
                    ) : (
                      filteredTeachers.map(t => {
                        const status = getTeacherStatus(t);
                        return (
                          <tr key={t.id} className="hover:bg-[#F6EFE7]/80 dark:hover:bg-[#281C15]/50 transition">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-[#2E1E14] dark:text-[#FAF5EE] text-sm">{t.name}</div>
                              <div className="font-mono text-[11px] text-[#A34C0C] dark:text-[#F5C28B] font-semibold">{t.teacherId || t.id}</div>
                            </td>
                            <td className="py-3.5 px-3 font-mono">
                              <div className="text-[#2E1E14] dark:text-[#FAF5EE] font-bold flex items-center gap-1.5">
                                <Phone className="w-3 h-3 text-[#8C7A6B]" />
                                <span>{t.mobile || 'No mobile'}</span>
                              </div>
                              {t.email && (
                                <div className="text-[10px] text-[#8C7A6B] flex items-center gap-1.5 mt-0.5">
                                  <Mail className="w-3 h-3 text-[#8C7A6B]" />
                                  <span>{t.email}</span>
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-3">
                              <div className="font-bold text-[#2E1E14] dark:text-[#FAF5EE]">{t.collegeName || 'N/A'}</div>
                              <div className="text-[10px] text-[#8C7A6B] dark:text-[#9F8C7D] font-mono">ID: {t.collegeId || 'N/A'}</div>
                            </td>
                            <td className="py-3.5 px-3 text-[#5A4030] dark:text-[#D8C7B5] font-medium">
                              {t.department || 'General Faculty'}
                            </td>
                            <td className="py-3.5 px-3">
                              {status === 'Approved' && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-xs">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                  <span>Approved</span>
                                </span>
                              )}
                              {status === 'Waiting for Approval' && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shadow-xs">
                                  <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                  <span>Waiting for Approval</span>
                                </span>
                              )}
                              {status === 'Not Approved' && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 shadow-xs">
                                  <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                                  <span>Not Approved</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-2 flex-wrap">
                                {/* Quick Approve Button */}
                                {status !== 'Approved' && (
                                  <button
                                    onClick={() => handleApproveTeacher(t.id)}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-xs flex items-center gap-1 transition"
                                    title="Approve this teacher account so they can log in"
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Approve</span>
                                  </button>
                                )}

                                {/* Quick Reject Button */}
                                {status !== 'Not Approved' && (
                                  <button
                                    onClick={() => handleRejectTeacher(t.id)}
                                    className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 dark:text-rose-300 font-bold text-[11px] rounded-lg border border-rose-300 dark:border-rose-800 shadow-xs flex items-center gap-1 transition"
                                    title="Reject this teacher account"
                                  >
                                    <XCircle className="w-3 h-3" />
                                    <span>Reject</span>
                                  </button>
                                )}

                                {/* Direct Status Switcher Dropdown */}
                                <select
                                  value={status}
                                  onChange={(e) => handleSetTeacherStatus(t.id, e.target.value)}
                                  className="px-2 py-1 text-[11px] rounded-lg border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] font-semibold focus:ring-1 focus:ring-[#C9650F] focus:outline-none"
                                  title="Change approval status directly"
                                >
                                  <option value="Waiting for Approval">Waiting for Approval</option>
                                  <option value="Approved">Approved</option>
                                  <option value="Not Approved">Not Approved</option>
                                </select>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB 5: MISUSE & REPORTS */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="bg-[#FBF9F5] dark:bg-[#1F1712] p-5 rounded-2xl border border-[#E3D3C2] dark:border-[#38261A] shadow-xs">
            <h3 className="font-extrabold text-[#2E1E14] dark:text-[#FAF5EE] text-base">Misuse Control & Abuse Reports</h3>
            <p className="text-xs text-[#7A6250] dark:text-[#A89685]">
              Review flagged complaints reported by users for fake information, spam, or abusive language.
            </p>
          </div>

          <div className="space-y-3">
            {reports.length === 0 ? (
              <div className="p-12 text-center bg-[#FBF9F5] dark:bg-[#1F1712] rounded-2xl border border-[#E3D3C2] dark:border-[#38261A] text-[#8C7A6B] text-xs">
                No active misuse reports.
              </div>
            ) : (
              reports.map(rep => (
                <div key={rep.id} className="bg-[#FBF9F5] dark:bg-[#1F1712] p-5 rounded-2xl border border-[#E3D3C2] dark:border-[#38261A] shadow-xs flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-[#C9650F] dark:text-[#F5A623]">{rep.complaintId}</span>
                      <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-bold text-[10px] uppercase border border-rose-200 dark:border-rose-800">
                        {rep.reason}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        rep.status === 'pending' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800' : 'bg-[#EDE4D8] dark:bg-[#2A1E17] text-[#4A3525] dark:text-[#D8C7B5] border border-[#DECDBB] dark:border-[#38261A]'
                      }`}>
                        {rep.status}
                      </span>
                    </div>
                    <h4 className="font-bold text-[#2E1E14] dark:text-[#FAF5EE] text-sm">{rep.complaintTitle}</h4>
                    <p className="text-xs text-[#5A4030] dark:text-[#D8C7B5] leading-relaxed">{rep.details || 'No additional comment provided.'}</p>
                    {rep.adminAction && (
                      <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Action taken: {rep.adminAction}</div>
                    )}
                  </div>

                  {rep.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleReportAction(rep.id, 'action_taken', true)}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                      >
                        Mark Fake & Penalize Student
                      </button>
                      <button
                        onClick={() => handleReportAction(rep.id, 'dismissed', false)}
                        className="px-3 py-1.5 bg-[#EDE4D8] hover:bg-[#E2D6C6] dark:bg-[#2A1E17] dark:hover:bg-[#34261D] text-[#4A3525] dark:text-[#D8C7B5] font-semibold text-xs rounded-xl transition"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 6: ANALYTICS */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-[#FBF9F5] dark:bg-[#1F1712] p-5 rounded-2xl border border-[#E3D3C2] dark:border-[#38261A] shadow-xs space-y-1">
              <div className="text-xs font-bold text-[#7A6250] dark:text-[#A89685] uppercase">System Resolution Rate</div>
              <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {analytics.metrics.systemResolutionRate}%
              </div>
              <p className="text-[11px] text-[#8C7A6B]">Effective resolution across all active colleges</p>
            </div>
            <div className="bg-[#FBF9F5] dark:bg-[#1F1712] p-5 rounded-2xl border border-[#E3D3C2] dark:border-[#38261A] shadow-xs space-y-1">
              <div className="text-xs font-bold text-[#7A6250] dark:text-[#A89685] uppercase">Average Turnaround Time</div>
              <div className="text-3xl font-extrabold text-[#C9650F] dark:text-[#F5A623]">
                {analytics.metrics.avgTurnaroundHours} hrs
              </div>
              <p className="text-[11px] text-[#8C7A6B]">From assignment date to verified completion</p>
            </div>
            <div className="bg-[#FBF9F5] dark:bg-[#1F1712] p-5 rounded-2xl border border-[#E3D3C2] dark:border-[#38261A] shadow-xs space-y-1">
              <div className="text-xs font-bold text-[#7A6250] dark:text-[#A89685] uppercase">Total User Network</div>
              <div className="text-3xl font-extrabold text-[#4A3525] dark:text-[#E8DACB]">
                {analytics.metrics.totalStudents + analytics.metrics.totalTeachers}
              </div>
              <p className="text-[11px] text-[#8C7A6B]">{analytics.metrics.totalStudents} students • {analytics.metrics.totalTeachers} teachers</p>
            </div>
          </div>

          {/* Category Breakdown Bar */}
          <div className="bg-[#FBF9F5] dark:bg-[#1F1712] p-6 rounded-2xl border border-[#E3D3C2] dark:border-[#38261A] shadow-xs space-y-4">
            <h3 className="font-extrabold text-[#2E1E14] dark:text-[#FAF5EE] text-base">Complaints by Category</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(analytics.categoryBreakdown || {}).map(([cat, count]) => (
                <div key={cat} className="p-3 rounded-xl bg-[#F4ECE2] dark:bg-[#2A1E17] border border-[#DECDBB] dark:border-[#38261A] flex items-center justify-between">
                  <span className="font-semibold text-xs text-[#2E1E14] dark:text-[#FAF5EE]">{cat}</span>
                  <span className="font-bold text-xs text-[#C9650F] dark:text-[#F5A623] bg-[#EFE7DC] dark:bg-[#38261A] px-2 py-0.5 rounded-full">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- MODALS --- */}

      {/* Admin Review Modal (Approve or Reject with reason) */}
      {reviewModalComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#FBF9F5] dark:bg-[#1F1712] w-full max-w-lg rounded-2xl shadow-2xl border border-[#E3D3C2] dark:border-[#38261A] overflow-hidden space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-[#E3D3C2] dark:border-[#38261A] pb-3">
              <h3 className="font-extrabold text-[#2E1E14] dark:text-[#FAF5EE] text-base">
                Admin Review: {reviewModalComplaint.id}
              </h3>
              <button onClick={() => setReviewModalComplaint(null)} className="text-[#8C7A6B] hover:text-[#2E1E14] dark:hover:text-[#FAF5EE]">✕</button>
            </div>

            <div className="p-3 bg-[#F2ECE4] dark:bg-[#2A1E17] rounded-xl text-xs space-y-1 border border-[#DECDBB] dark:border-[#38261A]">
              <div className="font-bold text-[#2E1E14] dark:text-[#FAF5EE]">{reviewModalComplaint.title}</div>
              <div className="text-[#5A4030] dark:text-[#D8C7B5] line-clamp-2">{reviewModalComplaint.description}</div>
            </div>

            {/* Visibility choice on approval */}
            <div>
              <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] uppercase tracking-wider mb-1.5">
                Visibility Setting (if Approved)
              </label>
              <select
                value={visibilityChoice}
                onChange={(e) => setVisibilityChoice(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] font-medium"
              >
                <option value="Public">Public (Transparent on Public Board)</option>
                <option value="Restricted">Restricted (Sensitive Issue Protection)</option>
                <option value="Confidential">Confidential (Admin & Teacher Only)</option>
              </select>
            </div>

            {/* Mandatory rejection reason */}
            <div>
              <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] uppercase tracking-wider mb-1.5">
                Rejection Reason (Required if Rejecting)
              </label>
              <textarea
                rows={2}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter official institutional reason for rejecting this complaint..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE]"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleReject}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition"
              >
                Reject with Reason
              </button>
              <button
                onClick={handleApprove}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#C9650F] to-[#A34C0C] hover:from-[#B5590B] hover:to-[#914209] text-white font-bold text-xs shadow-md shadow-[#C9650F]/20 transition"
              >
                Approve Complaint
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Assignment Modal (Strictly same college!) */}
      {assignModalComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#FBF9F5] dark:bg-[#1F1712] w-full max-w-md rounded-2xl shadow-2xl border border-[#E3D3C2] dark:border-[#38261A] overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E3D3C2] dark:border-[#38261A] pb-3">
              <h3 className="font-extrabold text-[#2E1E14] dark:text-[#FAF5EE] text-base">
                Assign Teacher: {assignModalComplaint.id}
              </h3>
              <button onClick={() => setAssignModalComplaint(null)} className="text-[#8C7A6B] hover:text-[#2E1E14] dark:hover:text-[#FAF5EE]">✕</button>
            </div>

            <div className="p-3 bg-[#F2ECE4] dark:bg-[#2A1E17] rounded-xl text-xs space-y-1 text-[#4A3525] dark:text-[#D8C7B5] border border-[#DECDBB] dark:border-[#38261A]">
              <div>Complaint College ID: <strong>{assignModalComplaint.collegeId}</strong></div>
              <p className="text-[#7A6250] dark:text-[#A89685] text-[11px]">
                Rule: Only verified teachers registered under College {assignModalComplaint.collegeId} can be assigned (max 10 active complaints per teacher).
              </p>
            </div>

            <form onSubmit={handleAssignTeacher} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] uppercase tracking-wider mb-1.5">
                  Select Verified Teacher from College {assignModalComplaint.collegeId} *
                </label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] font-medium"
                  required
                >
                  <option value="">-- Choose Teacher --</option>
                  {usersData.teachers
                    .filter(t => t.collegeId === assignModalComplaint.collegeId)
                    .map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.teacherId}) — {t.department}
                      </option>
                    ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#C9650F] to-[#A34C0C] hover:from-[#B5590B] hover:to-[#914209] text-white font-bold text-xs shadow-md shadow-[#C9650F]/20 transition"
              >
                Assign Teacher
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Escalate Modal */}
      {escalateModalComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#FBF9F5] dark:bg-[#1F1712] w-full max-w-md rounded-2xl shadow-2xl border border-[#E3D3C2] dark:border-[#38261A] overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E3D3C2] dark:border-[#38261A] pb-3">
              <h3 className="font-extrabold text-base text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                <ShieldAlert className="w-5 h-5" />
                <span>Send to Higher Authority: {escalateModalComplaint.id}</span>
              </h3>
              <button onClick={() => setEscalateModalComplaint(null)} className="text-[#8C7A6B] hover:text-[#2E1E14] dark:hover:text-[#FAF5EE]">✕</button>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-xs space-y-1 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60">
              <div className="font-bold flex items-center gap-1">
                <span>⚠️ What does Send to Higher Authority mean?</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                This sends the complaint directly to the <strong>College Principal</strong> for urgent attention when it is not solved within 24 hours.
              </p>
            </div>

            <form onSubmit={handleEscalate} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#4A3525] dark:text-[#D8C7B5] uppercase tracking-wider mb-1">
                  Send to Authority *
                </label>
                <input
                  type="text"
                  value={escalationTarget}
                  onChange={(e) => setEscalationTarget(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-[#4A3525] dark:text-[#D8C7B5] uppercase tracking-wider mb-1">
                  Reason for Sending Higher *
                </label>
                <textarea
                  rows={2}
                  value={escalationReason}
                  onChange={(e) => setEscalationReason(e.target.value)}
                  placeholder="Not solved within 24 hours / urgent attention needed..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE]"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-md shadow-rose-700/20"
              >
                Send to Higher Authority
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Register College Modal */}
      {isAddCollegeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#FBF9F5] dark:bg-[#1F1712] w-full max-w-md rounded-2xl shadow-2xl border border-[#E3D3C2] dark:border-[#38261A] overflow-hidden p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-[#E3D3C2] dark:border-[#38261A] pb-3">
              <h3 className="font-extrabold text-[#2E1E14] dark:text-[#FAF5EE] text-base">Register College / School</h3>
              <button onClick={() => setIsAddCollegeOpen(false)} className="text-[#8C7A6B] hover:text-[#2E1E14] dark:hover:text-[#FAF5EE]">✕</button>
            </div>

            <form onSubmit={handleCreateCollege} className="space-y-3">
              <div>
                <label className="block font-bold text-[#4A3525] dark:text-[#D8C7B5] uppercase tracking-wider mb-1">College Full Name *</label>
                <input
                  type="text"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  placeholder="e.g. St. Xavier Institute of Tech"
                  className="w-full px-3 py-2 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE]"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-[#4A3525] dark:text-[#D8C7B5] uppercase tracking-wider mb-1">Code *</label>
                  <input
                    type="text"
                    value={newColCode}
                    onChange={(e) => setNewColCode(e.target.value)}
                    placeholder="e.g. SXIT"
                    className="w-full px-3 py-2 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#4A3525] dark:text-[#D8C7B5] uppercase tracking-wider mb-1">Permanent College ID</label>
                  <input
                    type="text"
                    value={newColId}
                    onChange={(e) => setNewColId(e.target.value)}
                    placeholder="Auto 4-digit or custom"
                    className="w-full px-3 py-2 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-[#4A3525] dark:text-[#D8C7B5] uppercase tracking-wider mb-1">Principal / Dean Name</label>
                <input
                  type="text"
                  value={newColPrincipal}
                  onChange={(e) => setNewColPrincipal(e.target.value)}
                  placeholder="Dr. ..."
                  className="w-full px-3 py-2 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#4A3525] dark:text-[#D8C7B5] uppercase tracking-wider mb-1">Campus Address</label>
                <input
                  type="text"
                  value={newColAddress}
                  onChange={(e) => setNewColAddress(e.target.value)}
                  placeholder="Sector, City..."
                  className="w-full px-3 py-2 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#C9650F] to-[#A34C0C] hover:from-[#B5590B] hover:to-[#914209] text-white font-bold shadow-md shadow-[#C9650F]/20 transition"
              >
                Create College Profile
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
