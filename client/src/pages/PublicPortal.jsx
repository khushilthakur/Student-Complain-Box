import React, { useState, useEffect } from 'react';
import { 
  Building2, ShieldCheck, GraduationCap, Briefcase, 
  Smartphone, KeyRound, User, Mail, CheckCircle2, 
  ArrowRight, AlertCircle, RefreshCw, Copy, Check, 
  Shield, School, UserPlus, LogIn, AlertTriangle,
  Flame, Clock, BarChart3, Trophy, ExternalLink, ChevronRight,
  Info, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { getApiUrl } from '../services/api';

export default function PublicPortal({ 
  onSelectComplaint, 
  onOpenSubmitModal, 
  initialCollegeId, 
  onClearCollegeFilter, 
  onNavigateRankings, 
  onSelectCollege 
}) {
  const { currentUser, setAuthSession } = useAuth();
  const { showToast } = useNotifications();

  // Active Front Page Tab: 'college' | 'student' | 'teacher' | 'highPending'
  const [activeSection, setActiveSection] = useState('college');

  // Shared Colleges List
  const [colleges, setColleges] = useState([]);
  const [collegesLoading, setCollegesLoading] = useState(true);

  // Highest Pending Colleges (Top 3) State
  const [highestPendingColleges, setHighestPendingColleges] = useState([]);
  const [rankingsLoading, setRankingsLoading] = useState(true);
  const [selectedCollegeModal, setSelectedCollegeModal] = useState(null);

  // --- College Registration State ---
  const [colName, setColName] = useState('');
  const [colCode, setColCode] = useState('');
  const [colCustomId, setColCustomId] = useState('');
  const [colPrincipal, setColPrincipal] = useState('');
  const [colEmail, setColEmail] = useState('');
  const [colPhone, setColPhone] = useState('');
  const [colAddress, setColAddress] = useState('');
  const [colAffiliation, setColAffiliation] = useState('');
  const [colRegLoading, setColRegLoading] = useState(false);
  const [colRegSuccess, setColRegSuccess] = useState(null); // Stores registered college receipt
  const [colRegError, setColRegError] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  // --- Student Auth State ---
  const [studentStep, setStudentStep] = useState('mobile'); // 'mobile' | 'otp' | 'register'
  const [studentMobile, setStudentMobile] = useState('');
  const [studentOtp, setStudentOtp] = useState('');
  const [studentGeneratedOtp, setStudentGeneratedOtp] = useState('');
  const [studentResendCooldown, setStudentResendCooldown] = useState(0);
  const [studentExpirySeconds, setStudentExpirySeconds] = useState(300);
  const [studentName, setStudentName] = useState('');
  const [studentCollegeId, setStudentCollegeId] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState('');

  // --- Teacher Auth State ---
  const [teacherMode, setTeacherMode] = useState('login'); // 'login' | 'register'
  const [teacherLoginMethod, setTeacherLoginMethod] = useState('otp'); // 'otp' | 'password'
  const [teacherStep, setTeacherStep] = useState('mobile'); // 'mobile' | 'otp'
  const [teacherMobile, setTeacherMobile] = useState('');
  const [teacherOtp, setTeacherOtp] = useState('');
  const [teacherGeneratedOtp, setTeacherGeneratedOtp] = useState('');
  const [teacherResendCooldown, setTeacherResendCooldown] = useState(0);
  const [teacherExpirySeconds, setTeacherExpirySeconds] = useState(300);

  // Teacher password fallback
  const [teacherIdentifier, setTeacherIdentifier] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');

  // Teacher Registration form state
  const [teacherName, setTeacherName] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherCollegeId, setTeacherCollegeId] = useState('');
  const [teacherEmployeeId, setTeacherEmployeeId] = useState('');
  const [teacherDepartment, setTeacherDepartment] = useState('');
  const [teacherDesignation, setTeacherDesignation] = useState('Assistant Professor');
  const [teacherConfirmPassword, setTeacherConfirmPassword] = useState('');
  const [teacherRegStep, setTeacherRegStep] = useState('form'); // 'form' | 'otp' | 'success'
  const [teacherRegOtp, setTeacherRegOtp] = useState('');
  const [teacherRegGeneratedOtp, setTeacherRegGeneratedOtp] = useState('');
  const [teacherRegResendCooldown, setTeacherRegResendCooldown] = useState(0);
  const [teacherRegExpirySeconds, setTeacherRegExpirySeconds] = useState(300);
  const [teacherRegSuccessData, setTeacherRegSuccessData] = useState(null);

  const [teacherLoading, setTeacherLoading] = useState(false);
  const [teacherError, setTeacherError] = useState('');
  const [teacherSuccessMsg, setTeacherSuccessMsg] = useState('');
  const [copiedOtp, setCopiedOtp] = useState(false);

  const fetchColleges = async () => {
    try {
      setCollegesLoading(true);
      const res = await fetch(getApiUrl('/api/colleges'));
      const data = await res.json();
      if (data.colleges) {
        setColleges(data.colleges);
        if (data.colleges.length > 0) {
          if (!studentCollegeId) setStudentCollegeId(data.colleges[0].id);
          if (!teacherCollegeId) setTeacherCollegeId(data.colleges[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load colleges list:', err);
    } finally {
      setCollegesLoading(false);
    }
  };

  const fetchHighestPending = async () => {
    try {
      setRankingsLoading(true);
      const res = await fetch(getApiUrl('/api/colleges/rankings'));
      if (res.ok) {
        const data = await res.json();
        if (data && data.rankings && Array.isArray(data.rankings.highestPending)) {
          setHighestPendingColleges(data.rankings.highestPending.slice(0, 3));
        }
      }
    } catch (err) {
      console.error('Failed to load highest pending colleges:', err);
    } finally {
      setRankingsLoading(false);
    }
  };

  useEffect(() => {
    fetchColleges();
    fetchHighestPending();

    const handleSwitchSection = (e) => {
      if (e.detail) {
        setActiveSection(e.detail);
        if (e.detail === 'college') {
          setTimeout(() => {
            const el = document.getElementById('college-section-anchor');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }, 50);
        }
      }
    };
    window.addEventListener('switch-public-section', handleSwitchSection);
    return () => window.removeEventListener('switch-public-section', handleSwitchSection);
  }, []);

  const handleSelectCollegeForComplaint = (college) => {
    if (!college || !college.id) return;
    setStudentCollegeId(college.id);
    setActiveSection('student');
    showToast(`Selected ${college.name} (ID: ${college.id}) for grievance registration.`, 'info');
    setTimeout(() => {
      const el = document.getElementById('student-section-anchor');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const handleScrollToHighPending = () => {
    const el = document.getElementById('high-pending-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Copy College ID to clipboard
  const handleCopyCollegeId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2500);
  };

  // --- College Registration Handler ---
  const handleRegisterCollege = async (e) => {
    e.preventDefault();
    setColRegError('');
    setColRegSuccess(null);

    if (!colName.trim()) {
      setColRegError('College Name is required.');
      return;
    }
    if (!colCode.trim()) {
      setColRegError('College Code / Acronym is required.');
      return;
    }

    setColRegLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/colleges/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: colName.trim(),
          code: colCode.trim(),
          customId: colCustomId.trim() || undefined,
          principalName: colPrincipal.trim(),
          contactEmail: colEmail.trim(),
          contactPhone: colPhone.trim(),
          address: colAddress.trim(),
          affiliation: colAffiliation.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.college) {
        setColRegSuccess(data.college);
        showToast(`College "${data.college.name}" registered successfully with College ID: ${data.college.id}!`, 'success');
        setColName('');
        setColCode('');
        setColCustomId('');
        setColPrincipal('');
        setColEmail('');
        setColPhone('');
        setColAddress('');
        setColAffiliation('');
        fetchColleges();
      } else {
        setColRegError(data.error || 'Failed to register college.');
      }
    } catch {
      setColRegError('Network error registering college.');
    } finally {
      setColRegLoading(false);
    }
  };

  // Helper: validate 10-digit Indian mobile
  const isValidIndianMobile = (num) => {
    if (!num) return false;
    const s = String(num).trim();
    if (/[^0-9+\-\s\(\)]/.test(s)) return false;
    const cleaned = s.replace(/[\s\-\(\)]/g, '');
    let digits = cleaned;
    if (digits.startsWith('+91')) digits = digits.slice(3);
    else if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2);
    else if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
    else if (digits.startsWith('+')) return false;
    if (!/^\d{10}$/.test(digits)) return false;
    if (!/^[6-9]/.test(digits)) return false;
    if (/^(\d)\1{9}$/.test(digits)) return false;
    return true;
  };

  const normalizeIndianMobile = (num) => {
    if (!num) return '';
    const s = String(num).trim().replace(/[\s\-\(\)]/g, '');
    if (s.startsWith('+91')) return s.slice(3);
    if (s.startsWith('91') && s.length === 12) return s.slice(2);
    if (s.startsWith('0') && s.length === 11) return s.slice(1);
    return s;
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopyCode = (codeToCopy, targetField = 'student') => {
    if (!codeToCopy) return;
    try {
      navigator.clipboard.writeText(codeToCopy);
    } catch {
      // fallback
    }
    setCopiedOtp(true);
    setTimeout(() => setCopiedOtp(false), 2000);
    if (targetField === 'student') {
      setStudentOtp(codeToCopy);
    } else if (targetField === 'teacherLogin') {
      setTeacherOtp(codeToCopy);
    } else if (targetField === 'teacherReg') {
      setTeacherRegOtp(codeToCopy);
    }
  };

  // Countdown timer for student OTP
  useEffect(() => {
    let timer;
    if (studentStep === 'otp' && activeSection === 'student') {
      timer = setInterval(() => {
        setStudentResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
        setStudentExpirySeconds(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [studentStep, activeSection]);

  // Countdown timer for teacher sign in OTP
  useEffect(() => {
    let timer;
    if (teacherStep === 'otp' && activeSection === 'teacher' && teacherMode === 'login') {
      timer = setInterval(() => {
        setTeacherResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
        setTeacherExpirySeconds(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [teacherStep, activeSection, teacherMode]);

  // Countdown timer for teacher registration OTP
  useEffect(() => {
    let timer;
    if (teacherRegStep === 'otp' && activeSection === 'teacher' && teacherMode === 'register') {
      timer = setInterval(() => {
        setTeacherRegResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
        setTeacherRegExpirySeconds(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [teacherRegStep, activeSection, teacherMode]);

  // --- Student Handlers ---
  const handleSendStudentOtp = async (e, isResend = false) => {
    if (e && e.preventDefault) e.preventDefault();
    setStudentError('');

    if (!isValidIndianMobile(studentMobile)) {
      setStudentError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    const cleanNum = normalizeIndianMobile(studentMobile);
    setStudentLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/auth/send-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: cleanNum,
          role: 'student'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setStudentGeneratedOtp(data.otp);
        setStudentStep('otp');
        setStudentResendCooldown(data.resendCooldown || 30);
        setStudentExpirySeconds(data.expiresInSeconds || 300);
        showToast(isResend ? 'A new OTP has been sent.' : (data.message || 'Your OTP is ready. Enter the code displayed above.'), 'info');
      } else {
        setStudentError(data.error || 'Failed to generate verification code.');
        if (data.cooldownRemaining) {
          setStudentResendCooldown(data.cooldownRemaining);
        }
      }
    } catch {
      setStudentError('Network error sending verification code.');
    } finally {
      setStudentLoading(false);
    }
  };

  const handleVerifyStudentOtp = async (e) => {
    e.preventDefault();
    setStudentError('');
    if (!studentOtp || studentOtp.trim().length !== 6) {
      setStudentError('Please enter the 6-digit verification code.');
      return;
    }

    setStudentLoading(true);
    try {
      const cleanNum = normalizeIndianMobile(studentMobile);
      const res = await fetch(getApiUrl('/api/auth/verify-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: cleanNum, otp: studentOtp.trim(), role: 'student' })
      });
      const data = await res.json();
      if (res.ok) {
        setAuthSession(data.user, data.token);
        showToast(data.message || `Welcome, ${data.user?.name || 'Student'}!`, 'success');
      } else {
        setStudentError(data.error || 'Verification code is invalid.');
      }
    } catch {
      setStudentError('Network error verifying code.');
    } finally {
      setStudentLoading(false);
    }
  };

  const handleRegisterStudent = async (e) => {
    e.preventDefault();
    setStudentError('');
    if (!studentName.trim() || !studentCollegeId) {
      setStudentError('Full Name and College selection are required.');
      return;
    }

    setStudentLoading(true);
    try {
      const cleanNum = normalizeIndianMobile(studentMobile);
      const res = await fetch(getApiUrl('/api/auth/register-student'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: cleanNum,
          name: studentName.trim(),
          collegeId: studentCollegeId.trim(),
          email: studentEmail.trim() || undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        setAuthSession(data.user, data.token);
        showToast(`Registration complete! Your Student ID is ${data.user.studentId}.`, 'success');
      } else {
        setStudentError(data.error || 'Registration failed.');
      }
    } catch {
      setStudentError('Network error during student registration.');
    } finally {
      setStudentLoading(false);
    }
  };

  // --- Teacher Handlers ---
  const handleSendTeacherOtp = async (e, isResend = false) => {
    if (e && e.preventDefault) e.preventDefault();
    setTeacherError('');

    if (!isValidIndianMobile(teacherMobile)) {
      setTeacherError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    const cleanNum = normalizeIndianMobile(teacherMobile);
    setTeacherLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/auth/send-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: cleanNum,
          role: 'teacher'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setTeacherGeneratedOtp(data.otp);
        setTeacherStep('otp');
        setTeacherResendCooldown(data.resendCooldown || 30);
        setTeacherExpirySeconds(data.expiresInSeconds || 300);
        showToast(isResend ? 'A new OTP has been sent.' : (data.message || 'Your OTP is ready. Enter the code displayed above.'), 'info');
      } else {
        setTeacherError(data.error || 'Failed to generate verification code.');
        if (data.cooldownRemaining) {
          setTeacherResendCooldown(data.cooldownRemaining);
        }
      }
    } catch {
      setTeacherError('Network error sending verification code.');
    } finally {
      setTeacherLoading(false);
    }
  };

  const handleVerifyTeacherOtp = async (e) => {
    e.preventDefault();
    setTeacherError('');
    if (!teacherOtp || teacherOtp.trim().length !== 6) {
      setTeacherError('Please enter the 6-digit verification code.');
      return;
    }

    setTeacherLoading(true);
    try {
      const cleanNum = normalizeIndianMobile(teacherMobile);
      const res = await fetch(getApiUrl('/api/auth/verify-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: cleanNum,
          otp: teacherOtp.trim(),
          role: 'teacher'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setAuthSession(data.user, data.token);
        showToast(data.message || `Welcome, Professor ${data.user.name}!`, 'success');
      } else {
        setTeacherError(data.error || 'Teacher verification failed.');
      }
    } catch {
      setTeacherError('Network error verifying teacher OTP.');
    } finally {
      setTeacherLoading(false);
    }
  };

  const handleTeacherLogin = async (e) => {
    e.preventDefault();
    setTeacherError('');
    setTeacherSuccessMsg('');
    if (!teacherIdentifier.trim() || !teacherPassword) {
      setTeacherError('Please enter Faculty ID / Mobile and Password.');
      return;
    }

    setTeacherLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/auth/login-teacher'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: teacherIdentifier.trim(),
          password: teacherPassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        setAuthSession(data.user, data.token);
        showToast(`Welcome, Professor ${data.user.name}!`, 'success');
      } else {
        setTeacherError(data.error || 'Teacher authentication failed.');
      }
    } catch {
      setTeacherError('Network error during teacher login.');
    } finally {
      setTeacherLoading(false);
    }
  };

  const handleStartTeacherRegister = async (e) => {
    e.preventDefault();
    setTeacherError('');
    setTeacherSuccessMsg('');

    if (!teacherName.trim()) {
      setTeacherError('Please enter Teacher Full Name.');
      return;
    }
    if (!isValidIndianMobile(teacherMobile)) {
      setTeacherError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (!teacherCollegeId) {
      setTeacherError('Please select a College.');
      return;
    }
    if (!teacherEmployeeId.trim()) {
      setTeacherError('Please enter Teacher ID or Employee ID.');
      return;
    }
    if (!teacherDepartment.trim()) {
      setTeacherError('Please enter Department.');
      return;
    }
    if (!teacherDesignation.trim()) {
      setTeacherError('Please enter Designation.');
      return;
    }
    if (!teacherPassword || teacherPassword.length < 6) {
      setTeacherError('Password must be at least 6 characters.');
      return;
    }
    if (teacherPassword !== teacherConfirmPassword) {
      setTeacherError('Passwords do not match.');
      return;
    }

    setTeacherLoading(true);
    try {
      const cleanNum = normalizeIndianMobile(teacherMobile);
      const res = await fetch(getApiUrl('/api/auth/send-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: cleanNum,
          role: 'teacher'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setTeacherRegGeneratedOtp(data.otp);
        setTeacherRegStep('otp');
        setTeacherRegResendCooldown(data.resendCooldown || 30);
        setTeacherRegExpirySeconds(data.expiresInSeconds || 300);
        showToast('Your OTP is ready. Enter the code displayed above.', 'info');
      } else {
        setTeacherError(data.error || 'Failed to send OTP for registration.');
        if (data.cooldownRemaining) {
          setTeacherRegResendCooldown(data.cooldownRemaining);
        }
      }
    } catch {
      setTeacherError('Network error sending verification code.');
    } finally {
      setTeacherLoading(false);
    }
  };

  const handleVerifyAndRegisterTeacher = async (e) => {
    e.preventDefault();
    setTeacherError('');
    setTeacherSuccessMsg('');

    if (!teacherRegOtp || teacherRegOtp.trim().length !== 6) {
      setTeacherError('Please enter the 6-digit verification code.');
      return;
    }

    setTeacherLoading(true);
    try {
      const cleanNum = normalizeIndianMobile(teacherMobile);
      const res = await fetch(getApiUrl('/api/auth/register-teacher'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: teacherName.trim(),
          mobile: cleanNum,
          email: teacherEmail.trim() || undefined,
          collegeId: teacherCollegeId.trim(),
          teacherId: teacherEmployeeId.trim(),
          department: teacherDepartment.trim(),
          designation: teacherDesignation.trim(),
          password: teacherPassword,
          otp: teacherRegOtp.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        setTeacherRegSuccessData(data);
        setTeacherRegStep('success');
        setTeacherSuccessMsg('Your registration has been submitted successfully. Please wait for Admin approval.');
        showToast('Registration submitted! Awaiting Admin approval.', 'success');
      } else {
        setTeacherError(data.error || 'Faculty registration failed.');
      }
    } catch {
      setTeacherError('Network error during faculty registration.');
    } finally {
      setTeacherLoading(false);
    }
  };

  const resetTeacherRegistrationForm = () => {
    setTeacherName('');
    setTeacherMobile('');
    setTeacherEmail('');
    setTeacherEmployeeId('');
    setTeacherDepartment('');
    setTeacherPassword('');
    setTeacherConfirmPassword('');
    setTeacherRegOtp('');
    setTeacherRegGeneratedOtp('');
    setTeacherRegStep('form');
    setTeacherRegSuccessData(null);
    setTeacherError('');
    setTeacherSuccessMsg('');
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2A1B12] via-[#3E291B] to-[#24170E] text-[#FBF9F5] p-6 sm:p-10 shadow-2xl border border-[#523A2A]/60">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-[#C9650F]/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-64 h-64 rounded-full bg-[#E88C30]/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#C9650F]/25 border border-[#E88C30]/40 text-[#F5C28B] text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-[#F5A623]" />
            <span>Confidential Institutional Grievance System • Strict Identity Protection</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#FBF9F5] leading-tight">
            Centralized Multi-College <br />
            <span className="bg-gradient-to-r from-[#F5C28B] via-[#E88C30] to-[#F5A623] bg-clip-text text-transparent">
              Student Grievance & Registration Portal
            </span>
          </h1>

          <p className="text-[#D8C7B5] text-xs sm:text-sm leading-relaxed max-w-2xl">
            Register your institution, enroll students with protected pseudonyms, and enable verified faculty to resolve grievances.
            Personal details and grievance data are strictly confidential and protected from public view.
          </p>

          {/* Privacy & Governance Notice */}
          <div className="bg-black/30 border border-white/10 rounded-2xl p-3.5 sm:p-4 text-xs text-[#E3D3C2] flex items-start gap-3 backdrop-blur-md">
            <Shield className="w-5 h-5 text-[#F5A623] shrink-0 mt-0.5" />
            <div>
              <strong className="text-white font-bold block mb-0.5">Zero Public Data Exposure Guarantee</strong>
              <span>Grievance records, student contact information, and resolver assignments are never visible to the public or unauthorized users. All institutional data is securely stored and managed exclusively in the Admin Backend.</span>
            </div>
          </div>

          {/* Action Buttons on Public Portal */}
          <div className="flex flex-wrap items-center gap-3 pt-3">
            <button
              type="button"
              onClick={handleScrollToHighPending}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-orange-500/25 flex items-center gap-2 transform active:scale-95 transition"
              title="View Top 3 Colleges with Highest Pending Complaints"
            >
              <AlertTriangle className="w-4 h-4 text-amber-200 animate-pulse" />
              <span>Top 3 High Pending Colleges</span>
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] uppercase font-bold tracking-wider">Backlog Alert</span>
            </button>

            {onNavigateRankings && (
              <button
                type="button"
                onClick={onNavigateRankings}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs sm:text-sm backdrop-blur-md flex items-center gap-2 transition"
              >
                <BarChart3 className="w-4 h-4 text-amber-400" />
                <span>All College Rankings</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => { setActiveSection('college'); }}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-semibold text-xs flex items-center gap-1.5 transition"
            >
              <Building2 className="w-4 h-4 text-amber-300" />
              <span>Register College</span>
            </button>
          </div>
        </div>
      </section>

      {/* SECTION: TOP 3 COLLEGES WITH HIGHEST PENDING COMPLAINTS */}
      <section id="high-pending-section" className="space-y-4">
        <div className="bg-[#FBF9F5] dark:bg-[#1F1712] rounded-3xl p-6 sm:p-8 border border-[#E3D3C2] dark:border-[#38261A] shadow-xs">
          <div className="flex items-start sm:items-center justify-between flex-wrap gap-4 border-b border-[#E3D3C2] dark:border-[#38261A] pb-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-bold mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 animate-pulse" />
                <span>Public Transparency Backlog • Highest Pending Complaints</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#2E1E14] dark:text-[#FAF5EE] tracking-tight">
                Top 3 Colleges with Highest Pending Complaints
              </h2>
              <p className="text-xs text-[#7A6250] dark:text-[#A89685] mt-1 max-w-2xl leading-relaxed">
                Live accountability metrics showcasing registered institutions with the largest unresolved student grievance queues awaiting faculty resolution.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchHighestPending}
                disabled={rankingsLoading}
                className="px-3 py-2 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#5A4030] dark:text-[#D8C7B5] hover:bg-[#EDE4D8] dark:hover:bg-[#38261A] text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
                title="Refresh live backlog"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${rankingsLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh Backlog</span>
              </button>

              {onNavigateRankings && (
                <button
                  type="button"
                  onClick={onNavigateRankings}
                  className="px-3.5 py-2 rounded-xl bg-[#C9650F] hover:bg-[#A34C0C] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                >
                  <span>View All Rankings</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="pt-6">
            {rankingsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map(n => (
                  <div key={n} className="p-6 rounded-2xl bg-[#F2ECE4] dark:bg-[#2A1E17] animate-pulse space-y-4">
                    <div className="h-6 w-24 bg-black/10 rounded-lg" />
                    <div className="h-4 w-3/4 bg-black/10 rounded-lg" />
                    <div className="h-20 bg-black/10 rounded-xl" />
                  </div>
                ))}
              </div>
            ) : highestPendingColleges.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#7A6250] dark:text-[#A89685]">
                No pending complaint records found across registered institutions.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {highestPendingColleges.map((col, idx) => {
                  const unresolvedTotal = (col.pendingComplaints || 0) + (col.inProgressComplaints || 0);
                  const isFirst = idx === 0;
                  const isSecond = idx === 1;

                  return (
                    <div
                      key={col.id}
                      className={`relative overflow-hidden rounded-2xl border transition duration-200 p-5 flex flex-col justify-between ${
                        isFirst
                          ? 'bg-gradient-to-b from-rose-50/80 via-white to-amber-50/30 dark:from-rose-950/30 dark:via-[#221812] dark:to-amber-950/20 border-rose-300 dark:border-rose-900 shadow-md shadow-rose-500/10'
                          : isSecond
                          ? 'bg-gradient-to-b from-amber-50/80 via-white to-orange-50/30 dark:from-amber-950/30 dark:via-[#221812] dark:to-orange-950/20 border-amber-300 dark:border-amber-900 shadow-xs'
                          : 'bg-white dark:bg-[#221812] border-[#DECDBB] dark:border-[#38261A] shadow-xs'
                      }`}
                    >
                      {/* Top Rank Badge */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-7 h-7 rounded-xl flex items-center justify-center font-extrabold text-xs text-white shadow-xs ${
                              isFirst
                                ? 'bg-gradient-to-tr from-rose-600 to-amber-500'
                                : isSecond
                                ? 'bg-gradient-to-tr from-amber-500 to-orange-500'
                                : 'bg-[#8C7A6B]'
                            }`}
                          >
                            #{idx + 1}
                          </span>
                          <div>
                            <span
                              className={`text-[11px] font-extrabold uppercase tracking-wide block ${
                                isFirst
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : isSecond
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-[#8C7A6B] dark:text-[#C7B4A3]'
                              }`}
                            >
                              {isFirst ? 'Highest Backlog' : isSecond ? '2nd High Backlog' : '3rd High Backlog'}
                            </span>
                            <span className="text-[10px] text-[#8C7A6B] font-mono">ID: {col.id}</span>
                          </div>
                        </div>

                        {/* Total Unresolved Pill */}
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950/90 border border-rose-300 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs font-black">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                            <span>{unresolvedTotal} Pending</span>
                          </span>
                        </div>
                      </div>

                      {/* College Name */}
                      <div className="space-y-1.5 mb-4">
                        <h3 className="font-extrabold text-xs sm:text-sm text-[#2E1E14] dark:text-[#FAF5EE] line-clamp-2 leading-snug">
                          {col.name}
                        </h3>
                        <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-[#7A6250] dark:text-[#A89685]">
                          <span className="px-2 py-0.5 rounded-md bg-[#EDE4D8] dark:bg-[#2A1E17] font-mono font-bold text-[#A34C0C] dark:text-[#F5C28B]">
                            {col.code}
                          </span>
                          {col.affiliation && (
                            <span className="truncate max-w-[170px]" title={col.affiliation}>
                              • {col.affiliation}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Metrics Card */}
                      <div className="p-3 rounded-xl bg-[#F2ECE4] dark:bg-[#2A1E17] border border-[#DECDBB] dark:border-[#38261A] space-y-2 mb-4 text-xs">
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="bg-white/80 dark:bg-[#1E1713]/80 p-2 rounded-lg border border-[#DECDBB] dark:border-[#38261A]">
                            <span className="text-[#8C7A6B] block text-[10px]">Awaiting Review</span>
                            <strong className="text-rose-600 dark:text-rose-400 font-extrabold text-xs">
                              {col.pendingComplaints || 0}
                            </strong>
                          </div>
                          <div className="bg-white/80 dark:bg-[#1E1713]/80 p-2 rounded-lg border border-[#DECDBB] dark:border-[#38261A]">
                            <span className="text-[#8C7A6B] block text-[10px]">In Resolution</span>
                            <strong className="text-amber-600 dark:text-amber-400 font-extrabold text-xs">
                              {col.inProgressComplaints || 0}
                            </strong>
                          </div>
                        </div>

                        <div className="space-y-1 pt-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-[#7A6250] dark:text-[#A89685]">Resolution Rate</span>
                            <strong className="font-extrabold text-[#2E1E14] dark:text-[#FAF5EE]">
                              {col.resolutionRate || 0}%
                            </strong>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-[#E5D7C7] dark:bg-[#3D2B20] overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                (col.resolutionRate || 0) > 60
                                  ? 'bg-emerald-500'
                                  : (col.resolutionRate || 0) > 30
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.max(col.resolutionRate || 0, 5)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleSelectCollegeForComplaint(col)}
                          className="w-full py-2 px-2.5 rounded-xl bg-gradient-to-r from-[#C9650F] to-[#A34C0C] hover:from-[#B5590B] hover:to-[#914209] text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1 transition"
                        >
                          <GraduationCap className="w-3.5 h-3.5" />
                          <span>File Grievance</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedCollegeModal(col)}
                          className="w-full py-2 px-2.5 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#1F1712] hover:bg-[#EDE4D8] dark:hover:bg-[#2A1E17] text-[#5A4030] dark:text-[#D8C7B5] font-bold text-xs flex items-center justify-center gap-1 transition"
                        >
                          <Info className="w-3.5 h-3.5 text-amber-500" />
                          <span>Details</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Front Page Interactive Section Switcher */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-[#E3D3C2] dark:border-[#38261A] pb-3 flex-wrap gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#2E1E14] dark:text-[#FAF5EE]">
              Institutional Access & Registration
            </h2>
            <p className="text-xs text-[#7A6250] dark:text-[#A89685]">
              Select your portal below to register an institution or access your workspace
            </p>
          </div>

          {/* Tab Navigation Buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-[#F1E9DF] dark:bg-[#251B15] rounded-2xl border border-[#DECDBB] dark:border-[#3D2B20] text-xs font-bold">
            <button
              onClick={() => { setActiveSection('college'); setColRegError(''); }}
              className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 ${
                activeSection === 'college'
                  ? 'bg-gradient-to-r from-[#C9650F] to-[#A34C0C] text-white shadow-sm'
                  : 'text-[#5A4030] dark:text-[#D8C7B5] hover:text-[#2E1E14] dark:hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>College Registration</span>
            </button>

            <button
              onClick={() => { setActiveSection('student'); setStudentError(''); }}
              className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 ${
                activeSection === 'student'
                  ? 'bg-gradient-to-r from-[#C9650F] to-[#A34C0C] text-white shadow-sm'
                  : 'text-[#5A4030] dark:text-[#D8C7B5] hover:text-[#2E1E14] dark:hover:text-white'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Student Portal</span>
            </button>

            <button
              onClick={() => { setActiveSection('teacher'); setTeacherError(''); }}
              className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 ${
                activeSection === 'teacher'
                  ? 'bg-gradient-to-r from-[#C9650F] to-[#A34C0C] text-white shadow-sm'
                  : 'text-[#5A4030] dark:text-[#D8C7B5] hover:text-[#2E1E14] dark:hover:text-white'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Teacher Portal</span>
            </button>

            <button
              onClick={() => { setActiveSection('highPending'); }}
              className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 ${
                activeSection === 'highPending'
                  ? 'bg-gradient-to-r from-amber-600 to-rose-600 text-white shadow-sm'
                  : 'text-[#5A4030] dark:text-[#D8C7B5] hover:text-[#2E1E14] dark:hover:text-white'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>High Pending (Top 3)</span>
            </button>
          </div>
        </div>

        {/* SECTION 1: COLLEGE REGISTRATION FORM */}
        {activeSection === 'college' && (
          <div id="college-section-anchor" className="bg-[#FBF9F5] dark:bg-[#1F1712] rounded-3xl border border-[#E3D3C2] dark:border-[#38261A] p-6 sm:p-8 shadow-sm">
            {colRegSuccess ? (
              /* Success Receipt */
              <div className="space-y-6 max-w-2xl mx-auto text-center py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-[#2E1E14] dark:text-[#FAF5EE]">
                    College Registered Successfully!
                  </h3>
                  <p className="text-xs text-[#7A6250] dark:text-[#A89685] mt-1">
                    Your institutional record has been securely stored in the Admin Backend database.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-[#F4ECE2] dark:bg-[#2A1E17] border border-[#DECDBB] dark:border-[#3D2B20] text-left space-y-4">
                  <div className="flex items-center justify-between border-b border-[#E3D3C2] dark:border-[#38261A] pb-3">
                    <span className="text-xs font-semibold text-[#7A6250] dark:text-[#A89685]">Permanent College ID</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-mono font-extrabold text-[#C9650F] bg-white dark:bg-[#1F1712] px-3 py-1 rounded-lg border border-[#DECDBB] dark:border-[#38261A]">
                        {colRegSuccess.id}
                      </span>
                      <button
                        onClick={() => handleCopyCollegeId(colRegSuccess.id)}
                        className="p-1.5 rounded-lg border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#1F1712] text-[#5A4030] dark:text-[#D8C7B5] hover:bg-[#EDE4D8] transition"
                        title="Copy College ID"
                      >
                        {copiedId ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[#8C7A6B] block">Institution Name:</span>
                      <strong className="text-[#2E1E14] dark:text-[#FAF5EE]">{colRegSuccess.name}</strong>
                    </div>
                    <div>
                      <span className="text-[#8C7A6B] block">Code / Acronym:</span>
                      <strong className="text-[#2E1E14] dark:text-[#FAF5EE]">{colRegSuccess.code}</strong>
                    </div>
                    <div>
                      <span className="text-[#8C7A6B] block">Principal / Head:</span>
                      <span className="text-[#2E1E14] dark:text-[#FAF5EE]">{colRegSuccess.principalName}</span>
                    </div>
                    <div>
                      <span className="text-[#8C7A6B] block">Official Email:</span>
                      <span className="text-[#2E1E14] dark:text-[#FAF5EE]">{colRegSuccess.contactEmail}</span>
                    </div>
                    <div>
                      <span className="text-[#8C7A6B] block">Phone / Mobile:</span>
                      <span className="text-[#2E1E14] dark:text-[#FAF5EE]">{colRegSuccess.contactPhone || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[#8C7A6B] block">Registration Status:</span>
                      <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                        {colRegSuccess.status}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-900 dark:text-amber-200">
                    <p className="font-semibold">Next Step:</p>
                    <p className="text-[11px] mt-0.5 text-amber-800 dark:text-amber-300">
                      Share the College ID <strong>{colRegSuccess.id}</strong> with students and teachers of your institution. They can now select your college during registration.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setColRegSuccess(null)}
                    className="px-5 py-2.5 rounded-xl border border-[#DECDBB] dark:border-[#38261A] text-xs font-bold text-[#5A4030] dark:text-[#D8C7B5] hover:bg-[#EDE4D8] dark:hover:bg-[#2A1E17] transition"
                  >
                    Register Another College
                  </button>
                  <button
                    onClick={() => {
                      setColRegSuccess(null);
                      setActiveSection('student');
                      setStudentCollegeId(colRegSuccess.id);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-[#C9650F] hover:bg-[#A34C0C] text-white text-xs font-bold flex items-center gap-2 shadow-sm transition"
                  >
                    <span>Proceed to Student Registration</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              /* College Registration Form */
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="text-center space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EDE4D8] dark:bg-[#2A1E17] text-[#7A5B42] dark:text-[#E8DACB] text-xs font-semibold">
                    <School className="w-3.5 h-3.5 text-[#C9650F]" />
                    <span>Official Institutional Onboarding</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-[#2E1E14] dark:text-[#FAF5EE]">
                    Register College or University
                  </h3>
                  <p className="text-xs text-[#7A6250] dark:text-[#A89685]">
                    Fill in your institution details. All registered data is stored and managed securely in the Admin Backend.
                  </p>
                </div>

                {colRegError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{colRegError}</span>
                  </div>
                )}

                <form onSubmit={handleRegisterCollege} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] mb-1">
                        College / Institution Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={colName}
                        onChange={(e) => setColName(e.target.value)}
                        placeholder="e.g. Government Engineering College"
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] mb-1">
                        College Code / Acronym *
                      </label>
                      <input
                        type="text"
                        required
                        value={colCode}
                        onChange={(e) => setColCode(e.target.value.toUpperCase())}
                        placeholder="e.g. GEC or IITB"
                        className="w-full px-3.5 py-2.5 text-xs font-mono uppercase rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] mb-1">
                        Principal / Director Name
                      </label>
                      <input
                        type="text"
                        value={colPrincipal}
                        onChange={(e) => setColPrincipal(e.target.value)}
                        placeholder="e.g. Dr. Rajesh Sharma"
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] mb-1">
                        Official Contact Email
                      </label>
                      <input
                        type="email"
                        value={colEmail}
                        onChange={(e) => setColEmail(e.target.value)}
                        placeholder="e.g. contact@gec.edu.in"
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] mb-1">
                        Official Phone / Helpline
                      </label>
                      <input
                        type="tel"
                        value={colPhone}
                        onChange={(e) => setColPhone(e.target.value)}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] mb-1">
                        Custom 4-Digit College ID <span className="text-[#8C7A6B] font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        maxLength={4}
                        value={colCustomId}
                        onChange={(e) => setColCustomId(e.target.value.replace(/\D/g, ''))}
                        placeholder="Auto-generated if left blank (e.g. 5001)"
                        className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] mb-1">
                        Campus Address & City
                      </label>
                      <input
                        type="text"
                        value={colAddress}
                        onChange={(e) => setColAddress(e.target.value)}
                        placeholder="e.g. Sector 15, Gandhinagar, Gujarat"
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] mb-1">
                        Affiliation / University
                      </label>
                      <input
                        type="text"
                        value={colAffiliation}
                        onChange={(e) => setColAffiliation(e.target.value)}
                        placeholder="e.g. Gujarat Technological University (GTU)"
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={colRegLoading}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-[#C9650F] to-[#A34C0C] hover:from-[#B5590B] hover:to-[#914209] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#C9650F]/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
                    >
                      {colRegLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Registering Institution...</span>
                        </>
                      ) : (
                        <>
                          <Building2 className="w-4 h-4" />
                          <span>Register College & Generate Permanent ID</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* SECTION 2: STUDENT PORTAL (LOGIN & REGISTRATION) */}
        {activeSection === 'student' && (
          <div id="student-section-anchor" className="bg-[#FBF9F5] dark:bg-[#1F1712] rounded-3xl border border-[#E3D3C2] dark:border-[#38261A] p-6 sm:p-8 shadow-sm max-w-xl mx-auto space-y-6">
            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EDE4D8] dark:bg-[#2A1E17] text-[#7A5B42] dark:text-[#E8DACB] text-xs font-semibold">
                <GraduationCap className="w-3.5 h-3.5 text-[#C9650F]" />
                <span>Student Verification & Access</span>
              </div>
              <h3 className="text-xl font-extrabold text-[#2E1E14] dark:text-[#FAF5EE]">
                {studentStep === 'register' ? 'Complete Student Profile' : 'Student OTP Sign In / Registration'}
              </h3>
              <p className="text-xs text-[#7A6250] dark:text-[#A89685]">
                {studentStep === 'register' 
                  ? 'Your real identity is strictly shielded. A permanent Student ID and masked tag will be generated.'
                  : 'Enter your 10-digit mobile number to receive a secure one-time passcode.'}
              </p>
            </div>

            {studentError && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{studentError}</span>
              </div>
            )}

            {/* STEP 1: MOBILE INPUT */}
            {studentStep === 'mobile' && (
              <form onSubmit={handleSendStudentOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] mb-1">
                    Student Mobile Number *
                  </label>
                  <div className="relative">
                    <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C7A6B]" />
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={studentMobile}
                      onChange={(e) => setStudentMobile(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 10-digit mobile number"
                      className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={studentLoading || studentMobile.length < 10}
                  className="w-full py-2.5 rounded-xl bg-[#C9650F] hover:bg-[#A34C0C] text-white font-bold text-xs shadow-md shadow-[#C9650F]/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {studentLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Sending OTP...</span>
                    </>
                  ) : (
                    <>
                      <span>Send 6-Digit OTP Code</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 2: OTP VERIFY */}
            {studentStep === 'otp' && (
              <form onSubmit={handleVerifyStudentOtp} className="space-y-4">
                {/* TOP OTP BANNER */}
                {studentGeneratedOtp && (
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-[#FFF9F3] via-[#FEF3E4] to-[#FCEAD2] dark:from-[#2A1D13] dark:via-[#22160E] dark:to-[#191009] border-2 border-[#C9650F] dark:border-[#F5A623] shadow-md shadow-[#C9650F]/15 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#C9650F] text-white flex items-center justify-center shadow-xs">
                          <KeyRound className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-extrabold text-[#2E1E14] dark:text-[#FAF5EE] flex items-center gap-1.5">
                            <span>Your OTP is ready</span>
                            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          </h4>
                          <p className="text-[11px] text-[#7A6250] dark:text-[#C5B3A2]">
                            Enter the code displayed below to continue
                          </p>
                        </div>
                      </div>

                      {/* 5-Minute Expiry Countdown */}
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/90 dark:bg-[#18120E] border border-[#DECDBB] dark:border-[#38261A] text-[11px] font-bold text-[#A34C0C] dark:text-[#F5A623]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatTimer(studentExpirySeconds)}</span>
                      </div>
                    </div>

                    {/* Display OTP Box + Copy Button */}
                    <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-[#18120E] border border-[#DECDBB] dark:border-[#38261A]">
                      <div className="font-mono text-2xl sm:text-3xl font-black tracking-[0.25em] text-[#C9650F] dark:text-[#F5A623] pl-2 select-all">
                        {studentGeneratedOtp}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyCode(studentGeneratedOtp, 'student')}
                        className="px-3 py-1.5 rounded-lg bg-[#EDE4D8] hover:bg-[#DECDBB] dark:bg-[#2A1E17] dark:hover:bg-[#38261A] text-[#2E1E14] dark:text-[#FAF5EE] text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
                        title="Copy OTP"
                      >
                        {copiedOtp ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-emerald-700 dark:text-emerald-300">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-[#C9650F]" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5]">
                      Enter 6-Digit Verification Code *
                    </label>
                    <div className="text-[11px] text-[#A34C0C] dark:text-[#FDBA74] flex items-center gap-1 font-semibold">
                      <Clock className="w-3 h-3" />
                      <span>Expires in {formatTimer(studentExpirySeconds)}</span>
                    </div>
                  </div>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C7A6B]" />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={studentOtp}
                      onChange={(e) => setStudentOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="w-full pl-10 pr-4 py-2.5 text-xs font-mono tracking-widest text-center rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <button
                    type="button"
                    onClick={() => { setStudentStep('mobile'); setStudentOtp(''); setStudentGeneratedOtp(''); setStudentError(''); }}
                    className="text-[#8C7A6B] hover:text-[#2E1E14] dark:hover:text-[#FAF5EE] underline cursor-pointer"
                  >
                    Change Number
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleSendStudentOtp(e, true)}
                    disabled={studentResendCooldown > 0 || studentLoading}
                    className="text-[#C9650F] dark:text-[#E88C30] font-semibold hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
                  >
                    {studentResendCooldown > 0 ? `Resend in ${studentResendCooldown}s` : 'Resend OTP'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={studentLoading || studentOtp.length < 6}
                  className="w-full py-2.5 rounded-xl bg-[#C9650F] hover:bg-[#A34C0C] text-white font-bold text-xs shadow-md shadow-[#C9650F]/20 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                >
                  {studentLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verify & Continue</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 3: STUDENT REGISTRATION (If new user) */}
            {studentStep === 'register' && (
              <form onSubmit={handleRegisterStudent} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] mb-1">
                    Full Real Name * <span className="text-[#8C7A6B] font-normal">(Never shown to teachers or public)</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C7A6B]" />
                    <input
                      type="text"
                      required
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="e.g. Rohan Verma"
                      className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] mb-1">
                    Select Your Registered College *
                  </label>
                  <select
                    required
                    value={studentCollegeId}
                    onChange={(e) => setStudentCollegeId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] focus:ring-2 focus:ring-[#C9650F] focus:outline-none font-medium"
                  >
                    <option value="">-- Choose Registered College --</option>
                    {colleges.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} (ID: {c.id}) {c.status !== 'active' ? `[${c.status}]` : ''}
                      </option>
                    ))}
                  </select>
                  {colleges.length === 0 && (
                    <p className="text-[11px] text-amber-600 mt-1">
                      No colleges registered yet. Please click the "College Registration" tab to register your institution first!
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] mb-1">
                    Email Address <span className="text-[#8C7A6B] font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C7A6B]" />
                    <input
                      type="email"
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                      placeholder="e.g. rohan@student.edu"
                      className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={studentLoading || !studentName.trim() || !studentCollegeId}
                  className="w-full py-2.5 rounded-xl bg-[#C9650F] hover:bg-[#A34C0C] text-white font-bold text-xs shadow-md shadow-[#C9650F]/20 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                >
                  {studentLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Creating Student Account...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Complete Registration & Access Dashboard</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* SECTION 3: TEACHER PORTAL */}
        {activeSection === 'teacher' && (
          <div className="bg-[#FBF9F5] dark:bg-[#1F1712] rounded-3xl border border-[#E3D3C2] dark:border-[#38261A] p-6 sm:p-8 shadow-sm max-w-xl mx-auto space-y-6">
            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EDE4D8] dark:bg-[#2A1E17] text-[#7A5B42] dark:text-[#E8DACB] text-xs font-semibold">
                <Briefcase className="w-3.5 h-3.5 text-[#C9650F]" />
                <span>Faculty Resolver Workspace</span>
              </div>
              <h3 className="text-xl font-extrabold text-[#2E1E14] dark:text-[#FAF5EE]">
                {teacherMode === 'login' ? 'Teacher / Faculty Sign In' : 'New Faculty Registration'}
              </h3>
              <p className="text-xs text-[#7A6250] dark:text-[#A89685]">
                {teacherMode === 'login'
                  ? 'Sign in to access assigned grievance queues and update resolution steps.'
                  : 'Register as an institutional faculty resolver. Your application is routed to the Admin Backend for verification.'}
              </p>
            </div>

            {/* Two Clearly Visible Options: Teacher Sign In vs New Faculty Registration */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#EDE4D8] dark:bg-[#2A1E17] rounded-xl text-xs font-bold border border-[#DECDBB] dark:border-[#38261A]">
              <button
                type="button"
                onClick={() => {
                  setTeacherMode('login');
                  setTeacherError('');
                  setTeacherSuccessMsg('');
                }}
                className={`py-2 px-3 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  teacherMode === 'login'
                    ? 'bg-white dark:bg-[#1F1712] text-[#C9650F] shadow-xs'
                    : 'text-[#7A6250] dark:text-[#A89685] hover:text-[#2E1E14]'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Teacher Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTeacherMode('register');
                  setTeacherError('');
                  setTeacherSuccessMsg('');
                }}
                className={`py-2 px-3 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  teacherMode === 'register'
                    ? 'bg-white dark:bg-[#1F1712] text-[#C9650F] shadow-xs'
                    : 'text-[#7A6250] dark:text-[#A89685] hover:text-[#2E1E14]'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>New Faculty Registration</span>
              </button>
            </div>

            {teacherError && (
              <div className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
                teacherError.includes('waiting for Admin approval')
                  ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-900 text-amber-900 dark:text-amber-200'
                  : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
              }`}>
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="font-semibold">{teacherError}</span>
              </div>
            )}

            {teacherSuccessMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span className="font-semibold">{teacherSuccessMsg}</span>
              </div>
            )}

            {/* SUB-VIEW 1: TEACHER SIGN IN */}
            {teacherMode === 'login' && (
              <div className="space-y-4">
                {/* Method Switcher */}
                <div className="flex items-center justify-between text-xs pb-1 border-b border-[#DECDBB] dark:border-[#38261A]">
                  <span className="font-bold text-[#5A4030] dark:text-[#D8C7B5]">Sign In Method</span>
                  <button
                    type="button"
                    onClick={() => {
                      setTeacherLoginMethod(prev => (prev === 'otp' ? 'password' : 'otp'));
                      setTeacherError('');
                    }}
                    className="font-bold text-[#C9650F] hover:underline cursor-pointer"
                  >
                    {teacherLoginMethod === 'otp' ? 'Use Teacher ID & Password' : 'Use Mobile Number & OTP'}
                  </button>
                </div>

                {teacherLoginMethod === 'otp' ? (
                  teacherStep === 'mobile' ? (
                    <form onSubmit={handleSendTeacherOtp} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] mb-1">
                          Teacher Mobile Number *
                        </label>
                        <div className="relative">
                          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs font-bold text-[#5A4030] dark:text-[#D8C7B5] border-r border-[#DECDBB] dark:border-[#38261A] pr-2.5">
                            <span className="text-sm">🇮🇳</span>
                            <span>+91</span>
                          </div>
                          <input
                            type="tel"
                            required
                            value={teacherMobile}
                            onChange={(e) => {
                              setTeacherMobile(e.target.value);
                              setTeacherError('');
                            }}
                            placeholder="Enter 10-digit mobile number"
                            className="w-full pl-20 pr-4 py-2.5 text-xs rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                          />
                        </div>
                        <p className="text-[11px] text-[#7A6250] dark:text-[#A89685] mt-1">
                          Enter your 10-digit Indian mobile number. Pre-registration is not required.
                        </p>
                      </div>

                      <button
                        type="submit"
                        disabled={teacherLoading || !teacherMobile.trim()}
                        className="w-full py-2.5 rounded-xl bg-[#C9650F] hover:bg-[#A34C0C] text-white font-bold text-xs shadow-md shadow-[#C9650F]/20 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                      >
                        {teacherLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Generating OTP...</span>
                          </>
                        ) : (
                          <>
                            <KeyRound className="w-4 h-4" />
                            <span>Generate Login OTP</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyTeacherOtp} className="space-y-4">
                      {/* TOP OTP BANNER */}
                      {teacherGeneratedOtp && (
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#FFF9F3] via-[#FEF3E4] to-[#FCEAD2] dark:from-[#2A1D13] dark:via-[#22160E] dark:to-[#191009] border-2 border-[#C9650F] dark:border-[#F5A623] shadow-md shadow-[#C9650F]/15 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-[#C9650F] text-white flex items-center justify-center shadow-xs">
                                <KeyRound className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="text-xs sm:text-sm font-extrabold text-[#2E1E14] dark:text-[#FAF5EE] flex items-center gap-1.5">
                                  <span>Your OTP is ready</span>
                                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                </h4>
                                <p className="text-[11px] text-[#7A6250] dark:text-[#C5B3A2]">
                                  Enter the code displayed below to continue
                                </p>
                              </div>
                            </div>

                            {/* 5-Minute Expiry Countdown */}
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/90 dark:bg-[#18120E] border border-[#DECDBB] dark:border-[#38261A] text-[11px] font-bold text-[#A34C0C] dark:text-[#F5A623]">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{formatTimer(teacherExpirySeconds)}</span>
                            </div>
                          </div>

                          {/* Display OTP Box + Copy Button */}
                          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-[#18120E] border border-[#DECDBB] dark:border-[#38261A]">
                            <div className="font-mono text-2xl sm:text-3xl font-black tracking-[0.25em] text-[#C9650F] dark:text-[#F5A623] pl-2 select-all">
                              {teacherGeneratedOtp}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCopyCode(teacherGeneratedOtp, 'teacherLogin')}
                              className="px-3 py-1.5 rounded-lg bg-[#EDE4D8] hover:bg-[#DECDBB] dark:bg-[#2A1E17] dark:hover:bg-[#38261A] text-[#2E1E14] dark:text-[#FAF5EE] text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
                              title="Copy OTP"
                            >
                              {copiedOtp ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                  <span className="text-emerald-700 dark:text-emerald-300">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-[#C9650F]" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="p-3.5 rounded-xl bg-[#EDE4D8] dark:bg-[#2A1E17] border border-[#DECDBB] dark:border-[#38261A] text-xs flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-[#7A6250] dark:text-[#A89685] uppercase font-bold">Verifying Teacher</div>
                          <div className="font-extrabold text-[#2E1E14] dark:text-[#FAF5EE] text-sm">+91 {normalizeIndianMobile(teacherMobile)}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setTeacherStep('mobile');
                            setTeacherOtp('');
                            setTeacherGeneratedOtp('');
                            setTeacherError('');
                          }}
                          className="text-xs font-bold text-[#C9650F] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>Change Number</span>
                        </button>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5]">
                            Enter 6-Digit OTP *
                          </label>
                          <div className="text-[11px] text-[#A34C0C] dark:text-[#FDBA74] flex items-center gap-1 font-semibold">
                            <Clock className="w-3 h-3" />
                            <span>Expires in {formatTimer(teacherExpirySeconds)}</span>
                          </div>
                        </div>
                        <div className="relative">
                          <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C7A6B]" />
                          <input
                            type="text"
                            required
                            maxLength={6}
                            value={teacherOtp}
                            onChange={(e) => setTeacherOtp(e.target.value.replace(/\D/g, ''))}
                            placeholder="000000"
                            className="w-full pl-10 pr-4 py-2.5 text-xs font-mono tracking-widest text-center rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <button
                          type="button"
                          onClick={() => { setTeacherStep('mobile'); setTeacherOtp(''); setTeacherGeneratedOtp(''); setTeacherError(''); }}
                          className="text-[#8C7A6B] hover:text-[#2E1E14] dark:hover:text-[#FAF5EE] underline cursor-pointer"
                        >
                          Change Number
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleSendTeacherOtp(e, true)}
                          disabled={teacherResendCooldown > 0 || teacherLoading}
                          className="text-[#C9650F] dark:text-[#E88C30] font-semibold hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
                        >
                          {teacherResendCooldown > 0 ? `Resend in ${teacherResendCooldown}s` : 'Resend OTP'}
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={teacherLoading || teacherOtp.length < 6}
                        className="w-full py-2.5 rounded-xl bg-[#C9650F] hover:bg-[#A34C0C] text-white font-bold text-xs shadow-md shadow-[#C9650F]/20 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                      >
                        {teacherLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Verifying...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Verify & Open Teacher Dashboard</span>
                          </>
                        )}
                      </button>
                    </form>
                  )
                ) : (
                  <form onSubmit={handleTeacherLogin} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] mb-1">
                        Teacher ID or Mobile Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={teacherIdentifier}
                        onChange={(e) => setTeacherIdentifier(e.target.value)}
                        placeholder="e.g. 5555-T100 or 9822334455"
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] mb-1">
                        Password *
                      </label>
                      <input
                        type="password"
                        required
                        value={teacherPassword}
                        onChange={(e) => setTeacherPassword(e.target.value)}
                        placeholder="Enter faculty password"
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={teacherLoading}
                      className="w-full py-2.5 rounded-xl bg-[#C9650F] hover:bg-[#A34C0C] text-white font-bold text-xs shadow-md shadow-[#C9650F]/20 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                    >
                      {teacherLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Authenticating...</span>
                        </>
                      ) : (
                        <>
                          <LogIn className="w-4 h-4" />
                          <span>Sign In as Resolver</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* SUB-VIEW 2: NEW FACULTY REGISTRATION */}
            {teacherMode === 'register' && (
              <div className="space-y-4">
                {teacherRegStep === 'form' && (
                  <form onSubmit={handleStartTeacherRegister} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] mb-1">
                        Full Faculty Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={teacherName}
                        onChange={(e) => setTeacherName(e.target.value)}
                        placeholder="e.g. Prof. Amit Patel"
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] mb-1">
                          Mobile Number *
                        </label>
                        <input
                          type="tel"
                          required
                          value={teacherMobile}
                          onChange={(e) => setTeacherMobile(e.target.value)}
                          placeholder="e.g. 9876543210"
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={teacherEmail}
                          onChange={(e) => setTeacherEmail(e.target.value)}
                          placeholder="e.g. amit@college.edu"
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] mb-1">
                          College *
                        </label>
                        <select
                          required
                          value={teacherCollegeId}
                          onChange={(e) => setTeacherCollegeId(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                        >
                          <option value="">-- Select College --</option>
                          {colleges.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.id})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] mb-1">
                          Teacher / Employee ID *
                        </label>
                        <input
                          type="text"
                          required
                          value={teacherEmployeeId}
                          onChange={(e) => setTeacherEmployeeId(e.target.value)}
                          placeholder="e.g. EMP-9081"
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] mb-1">
                          Department *
                        </label>
                        <input
                          type="text"
                          required
                          value={teacherDepartment}
                          onChange={(e) => setTeacherDepartment(e.target.value)}
                          placeholder="e.g. Computer Science"
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] mb-1">
                          Designation *
                        </label>
                        <select
                          required
                          value={teacherDesignation}
                          onChange={(e) => setTeacherDesignation(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                        >
                          <option value="Assistant Professor">Assistant Professor</option>
                          <option value="Associate Professor">Associate Professor</option>
                          <option value="Professor">Professor</option>
                          <option value="Head of Department (HOD)">Head of Department (HOD)</option>
                          <option value="Dean / Principal">Dean / Principal</option>
                          <option value="Lecturer">Lecturer</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] mb-1">
                          Password *
                        </label>
                        <input
                          type="password"
                          required
                          value={teacherPassword}
                          onChange={(e) => setTeacherPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] mb-1">
                          Confirm Password *
                        </label>
                        <input
                          type="password"
                          required
                          value={teacherConfirmPassword}
                          onChange={(e) => setTeacherConfirmPassword(e.target.value)}
                          placeholder="Re-enter password"
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={teacherLoading}
                      className="w-full py-2.5 rounded-xl bg-[#C9650F] hover:bg-[#A34C0C] text-white font-bold text-xs shadow-md shadow-[#C9650F]/20 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                    >
                      {teacherLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Generating OTP...</span>
                        </>
                      ) : (
                        <>
                          <KeyRound className="w-4 h-4" />
                          <span>Verify Mobile & Continue</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}

                {teacherRegStep === 'otp' && (
                  <form onSubmit={handleVerifyAndRegisterTeacher} className="space-y-4">
                    {/* TOP OTP BANNER */}
                    {teacherRegGeneratedOtp && (
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-[#FFF9F3] via-[#FEF3E4] to-[#FCEAD2] dark:from-[#2A1D13] dark:via-[#22160E] dark:to-[#191009] border-2 border-[#C9650F] dark:border-[#F5A623] shadow-md shadow-[#C9650F]/15 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-[#C9650F] text-white flex items-center justify-center shadow-xs">
                              <KeyRound className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-xs sm:text-sm font-extrabold text-[#2E1E14] dark:text-[#FAF5EE] flex items-center gap-1.5">
                                <span>Your OTP is ready</span>
                                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                              </h4>
                              <p className="text-[11px] text-[#7A6250] dark:text-[#C5B3A2]">
                                Enter the code displayed below to complete registration
                              </p>
                            </div>
                          </div>

                          {/* 5-Minute Expiry Countdown */}
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/90 dark:bg-[#18120E] border border-[#DECDBB] dark:border-[#38261A] text-[11px] font-bold text-[#A34C0C] dark:text-[#F5A623]">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{formatTimer(teacherRegExpirySeconds)}</span>
                          </div>
                        </div>

                        {/* Display OTP Box + Copy Button */}
                        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-[#18120E] border border-[#DECDBB] dark:border-[#38261A]">
                          <div className="font-mono text-2xl sm:text-3xl font-black tracking-[0.25em] text-[#C9650F] dark:text-[#F5A623] pl-2 select-all">
                            {teacherRegGeneratedOtp}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCopyCode(teacherRegGeneratedOtp, 'teacherReg')}
                            className="px-3 py-1.5 rounded-lg bg-[#EDE4D8] hover:bg-[#DECDBB] dark:bg-[#2A1E17] dark:hover:bg-[#38261A] text-[#2E1E14] dark:text-[#FAF5EE] text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
                            title="Copy OTP"
                          >
                            {copiedOtp ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span className="text-emerald-700 dark:text-emerald-300">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-[#C9650F]" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="p-3.5 rounded-xl bg-[#EDE4D8] dark:bg-[#2A1E17] border border-[#DECDBB] dark:border-[#38261A] text-xs flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-[#7A6250] dark:text-[#A89685] uppercase font-bold">Registering Faculty</div>
                        <div className="font-extrabold text-[#2E1E14] dark:text-[#FAF5EE] text-sm">
                          {teacherName} ({teacherEmployeeId})
                        </div>
                        <div className="text-[11px] text-[#7A6250]">
                          Mobile: +91 {normalizeIndianMobile(teacherMobile)} • {teacherDesignation}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTeacherRegStep('form');
                          setTeacherError('');
                        }}
                        className="text-xs font-bold text-[#C9650F] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>Edit Details</span>
                      </button>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5]">
                          Enter 6-Digit OTP *
                        </label>
                        <div className="text-[11px] text-[#A34C0C] dark:text-[#FDBA74] flex items-center gap-1 font-semibold">
                          <Clock className="w-3 h-3" />
                          <span>Expires in {formatTimer(teacherRegExpirySeconds)}</span>
                        </div>
                      </div>
                      <div className="relative">
                        <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C7A6B]" />
                        <input
                          type="text"
                          required
                          maxLength={6}
                          value={teacherRegOtp}
                          onChange={(e) => setTeacherRegOtp(e.target.value.replace(/\D/g, ''))}
                          placeholder="000000"
                          className="w-full pl-10 pr-4 py-2.5 text-xs font-mono tracking-widest text-center rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <button
                        type="button"
                        onClick={() => { setTeacherRegStep('form'); setTeacherError(''); }}
                        className="text-[#8C7A6B] hover:text-[#2E1E14] dark:hover:text-[#FAF5EE] underline cursor-pointer"
                      >
                        Back to Form
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleStartTeacherRegister(e)}
                        disabled={teacherRegResendCooldown > 0 || teacherLoading}
                        className="text-[#C9650F] dark:text-[#E88C30] font-semibold hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
                      >
                        {teacherRegResendCooldown > 0 ? `Resend in ${teacherRegResendCooldown}s` : 'Resend OTP'}
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={teacherLoading || teacherRegOtp.length < 6}
                      className="w-full py-2.5 rounded-xl bg-[#C9650F] hover:bg-[#A34C0C] text-white font-bold text-xs shadow-md shadow-[#C9650F]/20 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                    >
                      {teacherLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Verify OTP & Submit Registration</span>
                        </>
                      )}
                    </button>
                  </form>
                )}

                {teacherRegStep === 'success' && (
                  <div className="p-6 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300 mx-auto flex items-center justify-center shadow-xs">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-extrabold text-[#2E1E14] dark:text-[#FAF5EE]">
                        Registration Submitted Successfully!
                      </h4>
                      <p className="text-xs text-[#5A4030] dark:text-[#D8C7B5] mt-1 font-semibold">
                        Your registration has been submitted successfully. Please wait for Admin approval.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/80 dark:bg-[#18120E] border border-emerald-200 dark:border-emerald-900/60 text-left text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-[#8C7A6B]">Teacher ID:</span>
                        <strong className="text-[#2E1E14] dark:text-[#FAF5EE]">{teacherRegSuccessData?.teacherId || teacherEmployeeId}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8C7A6B]">Registered Name:</span>
                        <span className="text-[#2E1E14] dark:text-[#FAF5EE]">{teacherName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8C7A6B]">Mobile Number:</span>
                        <span className="text-[#2E1E14] dark:text-[#FAF5EE]">+91 {normalizeIndianMobile(teacherMobile)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-emerald-200/60 dark:border-emerald-900/40">
                        <span className="text-[#8C7A6B]">Account Status:</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          Waiting for Approval
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          resetTeacherRegistrationForm();
                          setTeacherMode('login');
                        }}
                        className="px-5 py-2.5 rounded-xl bg-[#C9650F] hover:bg-[#A34C0C] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Briefcase className="w-3.5 h-3.5" />
                        <span>Go to Teacher Sign In</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* SECTION 4: HIGH PENDING (TOP 3) DEEP DIVE */}
        {activeSection === 'highPending' && (
          <div className="bg-[#FBF9F5] dark:bg-[#1F1712] rounded-3xl border border-[#E3D3C2] dark:border-[#38261A] p-6 sm:p-8 shadow-sm space-y-6">
            <div className="text-center max-w-2xl mx-auto space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                <span>Urgent Resolution Backlog Focus</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-[#2E1E14] dark:text-[#FAF5EE]">
                Institutions with Highest Pending Complaints
              </h3>
              <p className="text-xs text-[#7A6250] dark:text-[#A89685]">
                These 3 institutions have the largest unresolved complaint queues awaiting faculty investigation and closure.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {highestPendingColleges.map((col, idx) => {
                const unresolvedTotal = (col.pendingComplaints || 0) + (col.inProgressComplaints || 0);
                return (
                  <div key={col.id} className="p-6 rounded-2xl bg-[#F2ECE4] dark:bg-[#2A1E17] border border-[#DECDBB] dark:border-[#38261A] space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white font-extrabold text-sm flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 text-xs font-extrabold">
                        {unresolvedTotal} Unresolved
                      </span>
                    </div>

                    <div>
                      <h4 className="font-extrabold text-sm text-[#2E1E14] dark:text-[#FAF5EE]">{col.name}</h4>
                      <p className="text-xs text-[#8C7A6B] font-mono mt-0.5">Code: {col.code} | ID: {col.id}</p>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between text-[#7A6250] dark:text-[#A89685]">
                        <span>Pending Review:</span>
                        <strong className="text-rose-600 dark:text-rose-400">{col.pendingComplaints || 0}</strong>
                      </div>
                      <div className="flex justify-between text-[#7A6250] dark:text-[#A89685]">
                        <span>In Resolution:</span>
                        <strong className="text-amber-600 dark:text-amber-400">{col.inProgressComplaints || 0}</strong>
                      </div>
                      <div className="flex justify-between text-[#7A6250] dark:text-[#A89685]">
                        <span>Completed:</span>
                        <strong className="text-emerald-600 dark:text-emerald-400">{col.completedComplaints || 0}</strong>
                      </div>
                      <div className="flex justify-between text-[#7A6250] dark:text-[#A89685]">
                        <span>Resolution Rate:</span>
                        <strong className="text-[#2E1E14] dark:text-[#FAF5EE]">{col.resolutionRate || 0}%</strong>
                      </div>
                    </div>

                    <div className="pt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelectCollegeForComplaint(col)}
                        className="flex-1 py-2 rounded-xl bg-[#C9650F] hover:bg-[#A34C0C] text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
                      >
                        <GraduationCap className="w-3.5 h-3.5" />
                        <span>File Grievance</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedCollegeModal(col)}
                        className="px-3 py-2 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#1F1712] text-[#5A4030] dark:text-[#D8C7B5] text-xs font-bold transition"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Institutional Architecture Highlights */}
      <section className="pt-4">
        <div className="text-center mb-6">
          <h3 className="text-lg sm:text-xl font-extrabold text-[#2E1E14] dark:text-[#FAF5EE]">
            Institutional Grievance Framework
          </h3>
          <p className="text-xs text-[#7A6250] dark:text-[#A89685]">
            Built with strict privacy, controlled filing quotas, and faculty resolution tracking
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-[#221812] border border-[#E3D3C2] dark:border-[#38261A] shadow-xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-[#F5EFEB] dark:bg-[#2C1F17] text-[#C9650F] flex items-center justify-center font-extrabold text-sm">
              01
            </div>
            <h4 className="font-extrabold text-sm text-[#2E1E14] dark:text-[#FAF5EE]">Student Privacy First</h4>
            <p className="text-xs text-[#6D5543] dark:text-[#C7B5A3] leading-relaxed">
              Student identities are completely shielded behind auto-generated pseudonyms. Regular users and peers can never view grievance records.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#221812] border border-[#E3D3C2] dark:border-[#38261A] shadow-xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-[#F5EFEB] dark:bg-[#2C1F17] text-[#C9650F] flex items-center justify-center font-extrabold text-sm">
              02
            </div>
            <h4 className="font-extrabold text-sm text-[#2E1E14] dark:text-[#FAF5EE]">College ID Architecture</h4>
            <p className="text-xs text-[#6D5543] dark:text-[#C7B5A3] leading-relaxed">
              Every registered institution receives a permanent 4-digit College ID, establishing isolated grievance domains for each campus.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#221812] border border-[#E3D3C2] dark:border-[#38261A] shadow-xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-[#F5EFEB] dark:bg-[#2C1F17] text-[#C9650F] flex items-center justify-center font-extrabold text-sm">
              03
            </div>
            <h4 className="font-extrabold text-sm text-[#2E1E14] dark:text-[#FAF5EE]">24-Hour SLAs</h4>
            <p className="text-xs text-[#6D5543] dark:text-[#C7B5A3] leading-relaxed">
              Assigned faculty resolvers work against monitored deadlines with automated 24-hour escalation notices for overdue complaints.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#221812] border border-[#E3D3C2] dark:border-[#38261A] shadow-xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-[#F5EFEB] dark:bg-[#2C1F17] text-[#C9650F] flex items-center justify-center font-extrabold text-sm">
              04
            </div>
            <h4 className="font-extrabold text-sm text-[#2E1E14] dark:text-[#FAF5EE]">Dedicated Admin Hub</h4>
            <p className="text-xs text-[#6D5543] dark:text-[#C7B5A3] leading-relaxed">
              All registered colleges, students, and faculty data are securely organized into distinct, dedicated control buttons in the Admin Backend.
            </p>
          </div>
        </div>
      </section>

      {/* College Backlog Details Modal */}
      {selectedCollegeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#FBF9F5] dark:bg-[#1F1712] rounded-3xl border border-[#E3D3C2] dark:border-[#38261A] max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-[#E3D3C2] dark:border-[#38261A] pb-4">
              <div>
                <span className="text-[11px] font-extrabold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>College Backlog Transparency Report</span>
                </span>
                <h3 className="text-lg sm:text-xl font-extrabold text-[#2E1E14] dark:text-[#FAF5EE] mt-1">
                  {selectedCollegeModal.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCollegeModal(null)}
                className="p-1.5 rounded-lg text-[#8C7A6B] hover:bg-[#EDE4D8] dark:hover:bg-[#2A1E17] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metrics Pods */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900">
                <span className="text-[10px] text-rose-700 dark:text-rose-300 block font-semibold">Pending</span>
                <strong className="text-xl font-extrabold text-rose-700 dark:text-rose-300">
                  {selectedCollegeModal.pendingComplaints || 0}
                </strong>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900">
                <span className="text-[10px] text-amber-700 dark:text-amber-300 block font-semibold">In Progress</span>
                <strong className="text-xl font-extrabold text-amber-700 dark:text-amber-300">
                  {selectedCollegeModal.inProgressComplaints || 0}
                </strong>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900">
                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 block font-semibold">Resolution</span>
                <strong className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300">
                  {selectedCollegeModal.resolutionRate || 0}%
                </strong>
              </div>
            </div>

            {/* Institution Metadata */}
            <div className="p-4 rounded-2xl bg-[#F2ECE4] dark:bg-[#2A1E17] border border-[#DECDBB] dark:border-[#38261A] space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-[#E3D3C2] dark:border-[#38261A] pb-2">
                <span className="text-[#8C7A6B]">Permanent College ID:</span>
                <strong className="font-mono text-[#C9650F]">{selectedCollegeModal.id}</strong>
              </div>
              <div className="flex justify-between border-b border-[#E3D3C2] dark:border-[#38261A] pb-2">
                <span className="text-[#8C7A6B]">College Code:</span>
                <strong className="font-mono text-[#2E1E14] dark:text-[#FAF5EE]">{selectedCollegeModal.code}</strong>
              </div>
              <div className="flex justify-between border-b border-[#E3D3C2] dark:border-[#38261A] pb-2">
                <span className="text-[#8C7A6B]">Principal / Head:</span>
                <span className="text-[#2E1E14] dark:text-[#FAF5EE]">{selectedCollegeModal.principalName || 'Not recorded'}</span>
              </div>
              <div className="flex justify-between border-b border-[#E3D3C2] dark:border-[#38261A] pb-2">
                <span className="text-[#8C7A6B]">Affiliation:</span>
                <span className="text-[#2E1E14] dark:text-[#FAF5EE]">{selectedCollegeModal.affiliation || 'General'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8C7A6B]">Campus Address:</span>
                <span className="text-[#2E1E14] dark:text-[#FAF5EE] text-right max-w-[220px] truncate">{selectedCollegeModal.address || 'Central Campus'}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  const college = selectedCollegeModal;
                  setSelectedCollegeModal(null);
                  handleSelectCollegeForComplaint(college);
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#C9650F] to-[#A34C0C] hover:from-[#B5590B] hover:to-[#914209] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
              >
                <GraduationCap className="w-4 h-4" />
                <span>File Grievance for this College</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCollegeModal(null)}
                className="px-4 py-2.5 rounded-xl border border-[#DECDBB] dark:border-[#38261A] text-xs font-bold text-[#5A4030] dark:text-[#D8C7B5] hover:bg-[#EDE4D8] dark:hover:bg-[#2A1E17] transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
