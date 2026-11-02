import React, { useState, useEffect } from 'react';
import { 
  Building2, GraduationCap, Briefcase, Shield, 
  Smartphone, KeyRound, Lock, ArrowRight, RefreshCw,
  Clock, CheckCircle2, AlertCircle, ArrowLeft, Copy, Check,
  UserPlus, Mail, User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { getApiUrl } from '../services/api';

export default function DirectLoginPage({ onLoginSuccess }) {
  const { setAuthSession } = useAuth();
  const { showToast } = useNotifications();

  // Active Role Tab: 'student' | 'teacher' | 'admin'
  const [activeTab, setActiveTab] = useState('student');

  // Student OTP flow state
  const [studentStep, setStudentStep] = useState('mobile'); // 'mobile' | 'otp'
  const [studentMobile, setStudentMobile] = useState('');
  const [studentOtp, setStudentOtp] = useState('');
  const [studentGeneratedOtp, setStudentGeneratedOtp] = useState('');
  const [studentResendCooldown, setStudentResendCooldown] = useState(0);
  const [studentExpirySeconds, setStudentExpirySeconds] = useState(300);

  // Teacher mode: 'signin' | 'register'
  const [teacherMode, setTeacherMode] = useState('signin');

  // Teacher Sign In flow state
  const [teacherLoginMethod, setTeacherLoginMethod] = useState('otp'); // 'otp' | 'password'
  const [teacherStep, setTeacherStep] = useState('mobile'); // 'mobile' | 'otp'
  const [teacherMobile, setTeacherMobile] = useState('');
  const [teacherOtp, setTeacherOtp] = useState('');
  const [teacherGeneratedOtp, setTeacherGeneratedOtp] = useState('');
  const [teacherResendCooldown, setTeacherResendCooldown] = useState(0);
  const [teacherExpirySeconds, setTeacherExpirySeconds] = useState(300);

  // Teacher password fallback state
  const [teacherIdentifier, setTeacherIdentifier] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');

  // New Faculty Registration form state
  const [colleges, setColleges] = useState([]);
  const [teacherRegName, setTeacherRegName] = useState('');
  const [teacherRegMobile, setTeacherRegMobile] = useState('');
  const [teacherRegEmail, setTeacherRegEmail] = useState('');
  const [teacherRegCollegeId, setTeacherRegCollegeId] = useState('');
  const [teacherRegEmployeeId, setTeacherRegEmployeeId] = useState('');
  const [teacherRegDepartment, setTeacherRegDepartment] = useState('');
  const [teacherRegDesignation, setTeacherRegDesignation] = useState('Assistant Professor');
  const [teacherRegPassword, setTeacherRegPassword] = useState('');
  const [teacherRegConfirmPassword, setTeacherRegConfirmPassword] = useState('');

  // Teacher Registration OTP flow state
  const [teacherRegStep, setTeacherRegStep] = useState('form'); // 'form' | 'otp' | 'success'
  const [teacherRegOtp, setTeacherRegOtp] = useState('');
  const [teacherRegGeneratedOtp, setTeacherRegGeneratedOtp] = useState('');
  const [teacherRegResendCooldown, setTeacherRegResendCooldown] = useState(0);
  const [teacherRegExpirySeconds, setTeacherRegExpirySeconds] = useState(300);
  const [teacherRegSuccessData, setTeacherRegSuccessData] = useState(null);

  // Admin login state
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // UI state
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Load registered colleges for dropdown
  useEffect(() => {
    fetch(getApiUrl('/api/colleges'))
      .then(res => res.json())
      .then(data => {
        if (data.colleges && data.colleges.length > 0) {
          setColleges(data.colleges);
          if (!teacherRegCollegeId) {
            setTeacherRegCollegeId(data.colleges[0].id);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleCopyOtp = (codeToCopy) => {
    if (!codeToCopy) return;
    try {
      navigator.clipboard.writeText(codeToCopy);
    } catch {
      // fallback
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (activeTab === 'student') {
      setStudentOtp(codeToCopy);
    } else if (activeTab === 'teacher') {
      if (teacherMode === 'register') {
        setTeacherRegOtp(codeToCopy);
      } else {
        setTeacherOtp(codeToCopy);
      }
    }
  };

  // Student OTP countdown timers
  useEffect(() => {
    let timer;
    if (studentStep === 'otp' && activeTab === 'student') {
      timer = setInterval(() => {
        setStudentResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
        setStudentExpirySeconds(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [studentStep, activeTab]);

  // Teacher Sign In OTP countdown timers
  useEffect(() => {
    let timer;
    if (teacherStep === 'otp' && activeTab === 'teacher' && teacherMode === 'signin') {
      timer = setInterval(() => {
        setTeacherResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
        setTeacherExpirySeconds(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [teacherStep, activeTab, teacherMode]);

  // Teacher Registration OTP countdown timers
  useEffect(() => {
    let timer;
    if (teacherRegStep === 'otp' && activeTab === 'teacher' && teacherMode === 'register') {
      timer = setInterval(() => {
        setTeacherRegResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
        setTeacherRegExpirySeconds(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [teacherRegStep, activeTab, teacherMode]);

  const clearMessages = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    clearMessages();
  };

  // Helper: validate 10-digit Indian mobile
  const isValidIndianMobile = (num) => {
    if (!num) return false;
    const s = String(num).trim();
    if (/[^0-9+\-\s\(\)]/.test(s)) return false;
    const cleaned = s.replace(/[\s\-\(\)]/g, '');
    let digits = cleaned;
    if (digits.startsWith('+91')) {
      digits = digits.slice(3);
    } else if (digits.startsWith('91') && digits.length === 12) {
      digits = digits.slice(2);
    } else if (digits.startsWith('0') && digits.length === 11) {
      digits = digits.slice(1);
    } else if (digits.startsWith('+')) {
      return false;
    }
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

  // -------------------------------------------------------------
  // STUDENT LOGIN FLOW
  // -------------------------------------------------------------
  const handleSendStudentOtp = async (e, isResend = false) => {
    if (e && e.preventDefault) e.preventDefault();
    clearMessages();

    if (!isValidIndianMobile(studentMobile)) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setLoading(true);
    try {
      const cleanNum = normalizeIndianMobile(studentMobile);
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
        setSuccessMsg(data.message || 'Your OTP is ready. Enter the code displayed above.');
        showToast('Your OTP is ready. Enter the code displayed above.', 'info');
      } else {
        setErrorMsg(data.error || 'Failed to generate OTP. Please try again.');
        if (data.cooldownRemaining) {
          setStudentResendCooldown(data.cooldownRemaining);
        }
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyStudentOtp = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!studentOtp || studentOtp.trim().length !== 6) {
      setErrorMsg('Please enter the 6-digit OTP code.');
      return;
    }

    setLoading(true);
    try {
      const cleanNum = normalizeIndianMobile(studentMobile);
      const res = await fetch(getApiUrl('/api/auth/verify-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: cleanNum,
          otp: studentOtp.trim(),
          role: 'student'
        })
      });
      const data = await res.json();

      if (res.ok) {
        setAuthSession(data.user, data.token);
        showToast('Login successful. Welcome!', 'success');
        if (onLoginSuccess) onLoginSuccess('student');
      } else {
        setErrorMsg(data.error || 'Incorrect OTP. Please try again.');
      }
    } catch {
      setErrorMsg('Network error verifying OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // TEACHER SIGN IN FLOW
  // -------------------------------------------------------------
  const handleSendTeacherOtp = async (e, isResend = false) => {
    if (e && e.preventDefault) e.preventDefault();
    clearMessages();

    if (!isValidIndianMobile(teacherMobile)) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setLoading(true);
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
        setTeacherGeneratedOtp(data.otp);
        setTeacherStep('otp');
        setTeacherResendCooldown(data.resendCooldown || 30);
        setTeacherExpirySeconds(data.expiresInSeconds || 300);
        setSuccessMsg(data.message || 'Your OTP is ready. Enter the code displayed above.');
        showToast('Your OTP is ready. Enter the code displayed above.', 'info');
      } else {
        setErrorMsg(data.error || 'Failed to generate OTP. Please try again.');
        if (data.cooldownRemaining) {
          setTeacherResendCooldown(data.cooldownRemaining);
        }
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTeacherOtp = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!teacherOtp || teacherOtp.trim().length !== 6) {
      setErrorMsg('Please enter the 6-digit OTP code.');
      return;
    }

    setLoading(true);
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
        showToast('Login successful. Welcome!', 'success');
        if (onLoginSuccess) onLoginSuccess('teacher');
      } else {
        // Teacher not approved yet or invalid code
        setErrorMsg(data.error || 'Incorrect OTP. Please try again.');
      }
    } catch {
      setErrorMsg('Network error verifying OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherPasswordLogin = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!teacherIdentifier.trim() || !teacherPassword.trim()) {
      setErrorMsg('Please enter Teacher ID or Mobile, and Password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/auth/login-teacher'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: teacherIdentifier.trim(),
          password: teacherPassword.trim()
        })
      });
      const data = await res.json();

      if (res.ok) {
        setAuthSession(data.user, data.token);
        showToast('Teacher login successful!', 'success');
        if (onLoginSuccess) onLoginSuccess('teacher');
      } else {
        setErrorMsg(data.error || 'Invalid credentials or account not approved yet.');
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // NEW FACULTY REGISTRATION FLOW
  // -------------------------------------------------------------
  const handleStartTeacherRegistration = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!teacherRegName.trim()) {
      setErrorMsg('Please enter Teacher Full Name.');
      return;
    }
    if (!isValidIndianMobile(teacherRegMobile)) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (!teacherRegCollegeId) {
      setErrorMsg('Please select your College / Institution.');
      return;
    }
    if (!teacherRegEmployeeId.trim()) {
      setErrorMsg('Please enter your Teacher ID or Employee ID.');
      return;
    }
    if (!teacherRegDepartment.trim()) {
      setErrorMsg('Please enter your Department.');
      return;
    }
    if (!teacherRegDesignation.trim()) {
      setErrorMsg('Please enter or select your Designation.');
      return;
    }
    if (!teacherRegPassword || teacherRegPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (teacherRegPassword !== teacherRegConfirmPassword) {
      setErrorMsg('Passwords do not match. Please verify.');
      return;
    }

    setLoading(true);
    try {
      const cleanNum = normalizeIndianMobile(teacherRegMobile);
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
        setSuccessMsg(data.message || 'Your OTP is ready. Enter the code displayed above.');
        showToast('Your OTP is ready. Enter the code displayed above.', 'info');
      } else {
        setErrorMsg(data.error || 'Failed to generate OTP for registration.');
        if (data.cooldownRemaining) {
          setTeacherRegResendCooldown(data.cooldownRemaining);
        }
      }
    } catch {
      setErrorMsg('Network error sending verification OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegisterTeacher = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!teacherRegOtp || teacherRegOtp.trim().length !== 6) {
      setErrorMsg('Please enter the 6-digit OTP code.');
      return;
    }

    setLoading(true);
    try {
      const cleanNum = normalizeIndianMobile(teacherRegMobile);
      const res = await fetch(getApiUrl('/api/auth/register-teacher'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: teacherRegName.trim(),
          mobile: cleanNum,
          email: teacherRegEmail.trim() || undefined,
          collegeId: teacherRegCollegeId.trim(),
          teacherId: teacherRegEmployeeId.trim(),
          department: teacherRegDepartment.trim(),
          designation: teacherRegDesignation.trim(),
          password: teacherRegPassword,
          otp: teacherRegOtp.trim()
        })
      });
      const data = await res.json();

      if (res.ok) {
        setTeacherRegSuccessData(data);
        setSuccessMsg('Your registration has been submitted successfully. Please wait for Admin approval.');
        setTeacherRegStep('success');
        showToast('Registration submitted! Awaiting Admin approval.', 'success');
      } else {
        setErrorMsg(data.error || 'Registration failed. Please try again.');
      }
    } catch {
      setErrorMsg('Network error during registration.');
    } finally {
      setLoading(false);
    }
  };

  const resetTeacherRegistrationForm = () => {
    setTeacherRegName('');
    setTeacherRegMobile('');
    setTeacherRegEmail('');
    setTeacherRegEmployeeId('');
    setTeacherRegDepartment('');
    setTeacherRegPassword('');
    setTeacherRegConfirmPassword('');
    setTeacherRegOtp('');
    setTeacherRegGeneratedOtp('');
    setTeacherRegStep('form');
    setTeacherRegSuccessData(null);
    clearMessages();
  };

  // -------------------------------------------------------------
  // ADMIN LOGIN FLOW
  // -------------------------------------------------------------
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!adminEmail.trim() || !adminPassword.trim()) {
      setErrorMsg('Please enter administrator email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/auth/login-admin'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: adminEmail.trim(),
          password: adminPassword.trim()
        })
      });
      const data = await res.json();

      if (res.ok) {
        setAuthSession(data.user, data.token);
        showToast('Welcome, Administrator!', 'success');
        if (onLoginSuccess) onLoginSuccess('admin');
      } else {
        setErrorMsg(data.error || 'Invalid administrator credentials.');
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="py-8 sm:py-12 flex items-center justify-center">
      <div className="w-full max-w-lg space-y-6">
        
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EDE4D8] dark:bg-[#2A1E17] border border-[#DECDBB] dark:border-[#38261A] text-[#A34C0C] dark:text-[#F5C28B] text-xs font-bold">
            <Building2 className="w-4 h-4 text-[#C9650F]" />
            <span>Student Complaint Box • Official Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2E1E14] dark:text-[#FAF5EE] tracking-tight">
            Direct Portal Login
          </h1>
          <p className="text-xs sm:text-sm text-[#7A6250] dark:text-[#A89685] max-w-md mx-auto leading-relaxed">
            Enter your 10-digit Indian mobile number to generate your secure verification code.
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-[#FBF9F5] dark:bg-[#1F1712] rounded-3xl border border-[#E3D3C2] dark:border-[#38261A] shadow-xl overflow-hidden p-6 sm:p-8 space-y-6">
          
          {/* Role Navigation Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[#EDE4D8] dark:bg-[#2A1E17] border border-[#DECDBB] dark:border-[#38261A]">
            <button
              type="button"
              onClick={() => handleTabChange('student')}
              className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'student'
                  ? 'bg-white dark:bg-[#1F1712] text-[#C9650F] dark:text-[#F5A623] shadow-xs'
                  : 'text-[#6D5543] dark:text-[#D8C7B5] hover:text-[#2E1E14]'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Student</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('teacher')}
              className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'teacher'
                  ? 'bg-white dark:bg-[#1F1712] text-[#C9650F] dark:text-[#F5A623] shadow-xs'
                  : 'text-[#6D5543] dark:text-[#D8C7B5] hover:text-[#2E1E14]'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Teacher</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('admin')}
              className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-white dark:bg-[#1F1712] text-[#C9650F] dark:text-[#F5A623] shadow-xs'
                  : 'text-[#6D5543] dark:text-[#D8C7B5] hover:text-[#2E1E14]'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Admin</span>
            </button>
          </div>

          {/* Alert Messages */}
          {errorMsg && (
            <div className={`p-4 rounded-xl border text-xs flex items-start gap-2.5 ${
              errorMsg.includes('Admin approval') || errorMsg.includes('waiting for Admin approval')
                ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-400 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-900 text-rose-800 dark:text-rose-300'
            }`}>
              <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${
                errorMsg.includes('Admin approval') || errorMsg.includes('waiting for Admin approval')
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`} />
              <div>
                {errorMsg.includes('waiting for Admin approval') && (
                  <div className="font-extrabold text-xs uppercase tracking-wider mb-1 text-amber-800 dark:text-amber-300">
                    Account Waiting for Approval
                  </div>
                )}
                <span className="font-semibold leading-relaxed">{errorMsg}</span>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              <span className="font-semibold leading-relaxed">{successMsg}</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* 1. STUDENT LOGIN TAB                                      */}
          {/* ========================================================= */}
          {activeTab === 'student' && (
            <div className="space-y-5">
              {studentStep === 'mobile' ? (
                <form onSubmit={handleSendStudentOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] uppercase tracking-wider mb-1.5">
                      Student Mobile Number *
                    </label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs font-bold text-[#5A4030] dark:text-[#D8C7B5] border-r border-[#DECDBB] dark:border-[#38261A] pr-2.5">
                        <span className="text-sm">🇮🇳</span>
                        <span>+91</span>
                      </div>
                      <input
                        type="tel"
                        value={studentMobile}
                        onChange={(e) => {
                          setStudentMobile(e.target.value);
                          clearMessages();
                        }}
                        placeholder="Enter 10-digit mobile number"
                        className="w-full pl-20 pr-4 py-3 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] text-sm font-semibold tracking-wide placeholder:font-normal placeholder:text-xs placeholder:text-[#8C7A6B] focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                        autoFocus
                        required
                      />
                    </div>
                    <p className="text-[11px] text-[#7A6250] dark:text-[#A89685] mt-1.5">
                      Enter any valid 10-digit Indian mobile number. Pre-registration is not required.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !studentMobile.trim()}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#C9650F] to-[#A34C0C] hover:from-[#B5590B] hover:to-[#914209] text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-[#C9650F]/25 disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    {loading ? (
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

                  <div className="pt-2 text-center text-[11px] text-[#7A6250] dark:text-[#A89685] border-t border-[#DECDBB] dark:border-[#38261A]">
                    <span>Enter any valid 10-digit Indian mobile number to log in or initialize your student account.</span>
                  </div>
                </form>
              ) : (
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
                          onClick={() => handleCopyOtp(studentGeneratedOtp)}
                          className="px-3 py-1.5 rounded-lg bg-[#EDE4D8] hover:bg-[#DECDBB] dark:bg-[#2A1E17] dark:hover:bg-[#38261A] text-[#2E1E14] dark:text-[#FAF5EE] text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
                          title="Copy OTP"
                        >
                          {copied ? (
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
                      <div className="text-[10px] text-[#7A6250] dark:text-[#A89685] uppercase font-bold">Verifying Student</div>
                      <div className="font-extrabold text-[#2E1E14] dark:text-[#FAF5EE] text-sm">+91 {normalizeIndianMobile(studentMobile)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setStudentStep('mobile');
                        setStudentOtp('');
                        setStudentGeneratedOtp('');
                        clearMessages();
                      }}
                      className="text-xs font-bold text-[#C9650F] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Change</span>
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] uppercase tracking-wider mb-1.5">
                      Enter 6-Digit OTP *
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={studentOtp}
                      onChange={(e) => {
                        setStudentOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                        clearMessages();
                      }}
                      placeholder="• • • • • •"
                      className="w-full text-center tracking-[0.4em] py-3 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] text-lg font-mono font-extrabold focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                      autoFocus
                      required
                    />
                    <p className="text-[11px] text-[#7A6250] dark:text-[#A89685] mt-1.5">
                      Enter the 6-digit code displayed in the banner above.
                    </p>
                  </div>

                  {/* Timers & Resend */}
                  <div className="flex items-center justify-between text-xs text-[#7A6250] dark:text-[#A89685] pt-1">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#C9650F]" />
                      <span>Expires in: <strong>{formatTimer(studentExpirySeconds)}</strong></span>
                    </div>

                    {studentResendCooldown > 0 ? (
                      <span className="font-semibold text-[#8C7A6B]">
                        Resend code in {studentResendCooldown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handleSendStudentOtp(e, true)}
                        disabled={loading}
                        className="font-bold text-[#C9650F] hover:text-[#A34C0C] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Resend OTP</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || studentOtp.length !== 6 || studentExpirySeconds <= 0}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#C9650F] to-[#A34C0C] hover:from-[#B5590B] hover:to-[#914209] text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-[#C9650F]/25 disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying Code...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>Verify & Open Student Dashboard</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* 2. TEACHER TAB (SIGN IN & REGISTRATION)                   */}
          {/* ========================================================= */}
          {activeTab === 'teacher' && (
            <div className="space-y-5">
              {/* Teacher Sub-Mode Toggle: Two clearly visible options */}
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#EDE4D8] dark:bg-[#2A1E17] border border-[#DECDBB] dark:border-[#38261A] text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setTeacherMode('signin');
                    clearMessages();
                  }}
                  className={`py-2 px-3 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    teacherMode === 'signin'
                      ? 'bg-white dark:bg-[#1F1712] text-[#C9650F] dark:text-[#F5A623] shadow-xs'
                      : 'text-[#6D5543] dark:text-[#D8C7B5] hover:text-[#2E1E14]'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Teacher Sign In</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTeacherMode('register');
                    clearMessages();
                  }}
                  className={`py-2 px-3 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    teacherMode === 'register'
                      ? 'bg-white dark:bg-[#1F1712] text-[#C9650F] dark:text-[#F5A623] shadow-xs'
                      : 'text-[#6D5543] dark:text-[#D8C7B5] hover:text-[#2E1E14]'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>New Faculty Registration</span>
                </button>
              </div>

              {/* -------------------------------------------------- */}
              {/* SUB-VIEW A: TEACHER SIGN IN                        */}
              {/* -------------------------------------------------- */}
              {teacherMode === 'signin' && (
                <div className="space-y-4">
                  {/* Login Method Toggle */}
                  <div className="flex items-center justify-between text-xs pb-1 border-b border-[#DECDBB] dark:border-[#38261A]">
                    <span className="font-bold text-[#5A4030] dark:text-[#D8C7B5]">Sign In Method</span>
                    <button
                      type="button"
                      onClick={() => {
                        setTeacherLoginMethod(prev => (prev === 'otp' ? 'password' : 'otp'));
                        clearMessages();
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
                          <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] uppercase tracking-wider mb-1.5">
                            Teacher Mobile Number *
                          </label>
                          <div className="relative">
                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs font-bold text-[#5A4030] dark:text-[#D8C7B5] border-r border-[#DECDBB] dark:border-[#38261A] pr-2.5">
                              <span className="text-sm">🇮🇳</span>
                              <span>+91</span>
                            </div>
                            <input
                              type="tel"
                              value={teacherMobile}
                              onChange={(e) => {
                                setTeacherMobile(e.target.value);
                                clearMessages();
                              }}
                              placeholder="Enter 10-digit mobile number"
                              className="w-full pl-20 pr-4 py-3 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] text-sm font-semibold tracking-wide placeholder:font-normal placeholder:text-xs placeholder:text-[#8C7A6B] focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                              autoFocus
                              required
                            />
                          </div>
                          <p className="text-[11px] text-[#7A6250] dark:text-[#A89685] mt-1.5">
                            Enter any valid 10-digit Indian mobile number. Pre-registration is not required. Admin approval is required for teacher dashboard access.
                          </p>
                        </div>

                        <button
                          type="submit"
                          disabled={loading || !teacherMobile.trim()}
                          className="w-full py-3 rounded-xl bg-gradient-to-r from-[#C9650F] to-[#A34C0C] hover:from-[#B5590B] hover:to-[#914209] text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-[#C9650F]/25 disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2"
                        >
                          {loading ? (
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
                                onClick={() => handleCopyOtp(teacherGeneratedOtp)}
                                className="px-3 py-1.5 rounded-lg bg-[#EDE4D8] hover:bg-[#DECDBB] dark:bg-[#2A1E17] dark:hover:bg-[#38261A] text-[#2E1E14] dark:text-[#FAF5EE] text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
                                title="Copy OTP"
                              >
                                {copied ? (
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
                              clearMessages();
                            }}
                            className="text-xs font-bold text-[#C9650F] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Change</span>
                          </button>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] uppercase tracking-wider mb-1.5">
                            Enter 6-Digit OTP *
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={teacherOtp}
                            onChange={(e) => {
                              setTeacherOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                              clearMessages();
                            }}
                            placeholder="• • • • • •"
                            className="w-full text-center tracking-[0.4em] py-3 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] text-lg font-mono font-extrabold focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                            autoFocus
                            required
                          />
                          <p className="text-[11px] text-[#7A6250] dark:text-[#A89685] mt-1.5">
                            Enter the 6-digit code displayed in the banner above.
                          </p>
                        </div>

                        {/* Timers & Resend */}
                        <div className="flex items-center justify-between text-xs text-[#7A6250] dark:text-[#A89685] pt-1">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-[#C9650F]" />
                            <span>Expires in: <strong>{formatTimer(teacherExpirySeconds)}</strong></span>
                          </div>

                          {teacherResendCooldown > 0 ? (
                            <span className="font-semibold text-[#8C7A6B]">
                              Resend code in {teacherResendCooldown}s
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => handleSendTeacherOtp(e, true)}
                              disabled={loading}
                              className="font-bold text-[#C9650F] hover:text-[#A34C0C] hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Resend OTP</span>
                            </button>
                          )}
                        </div>

                        <button
                          type="submit"
                          disabled={loading || teacherOtp.length !== 6 || teacherExpirySeconds <= 0}
                          className="w-full py-3 rounded-xl bg-gradient-to-r from-[#C9650F] to-[#A34C0C] hover:from-[#B5590B] hover:to-[#914209] text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-[#C9650F]/25 disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2"
                        >
                          {loading ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Verifying Code...</span>
                            </>
                          ) : (
                            <>
                              <KeyRound className="w-4 h-4" />
                              <span>Verify & Open Teacher Dashboard</span>
                            </>
                          )}
                        </button>
                      </form>
                    )
                  ) : (
                    <form onSubmit={handleTeacherPasswordLogin} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] uppercase tracking-wider mb-1.5">
                          Teacher ID or Registered Mobile *
                        </label>
                        <input
                          type="text"
                          value={teacherIdentifier}
                          onChange={(e) => {
                            setTeacherIdentifier(e.target.value);
                            clearMessages();
                          }}
                          placeholder="e.g. 5555-T100 or 9822334455"
                          className="w-full px-4 py-3 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] text-sm font-semibold placeholder:font-normal placeholder:text-xs placeholder:text-[#8C7A6B] focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                          autoFocus
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] uppercase tracking-wider mb-1.5">
                          Password *
                        </label>
                        <input
                          type="password"
                          value={teacherPassword}
                          onChange={(e) => {
                            setTeacherPassword(e.target.value);
                            clearMessages();
                          }}
                          placeholder="Enter account password"
                          className="w-full px-4 py-3 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] text-sm focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading || !teacherIdentifier.trim() || !teacherPassword.trim()}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-[#C9650F] to-[#A34C0C] hover:from-[#B5590B] hover:to-[#914209] text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-[#C9650F]/25 disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Signing In...</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4" />
                            <span>Log In with Password</span>
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* -------------------------------------------------- */}
              {/* SUB-VIEW B: NEW FACULTY REGISTRATION               */}
              {/* -------------------------------------------------- */}
              {teacherMode === 'register' && (
                <div className="space-y-4">
                  {teacherRegStep === 'form' && (
                    <form onSubmit={handleStartTeacherRegistration} className="space-y-3.5">
                      <div className="p-3 rounded-xl bg-[#F4ECE2] dark:bg-[#2A1E17] border border-[#DECDBB] dark:border-[#38261A] text-xs text-[#5A4030] dark:text-[#D8C7B5] leading-relaxed">
                        Fill in your faculty credentials. A demonstration verification code will be generated to authenticate your mobile number before submitting for Admin approval.
                      </div>

                      {/* Full Name */}
                      <div>
                        <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] mb-1">
                          Teacher Full Name *
                        </label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C7A6B]" />
                          <input
                            type="text"
                            required
                            value={teacherRegName}
                            onChange={(e) => {
                              setTeacherRegName(e.target.value);
                              clearMessages();
                            }}
                            placeholder="e.g. Dr. Rajesh Sharma"
                            className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] text-xs font-medium focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Mobile & Email Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] mb-1">
                            Registered Mobile *
                          </label>
                          <div className="relative">
                            <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C7A6B]" />
                            <input
                              type="tel"
                              required
                              value={teacherRegMobile}
                              onChange={(e) => {
                                setTeacherRegMobile(e.target.value);
                                clearMessages();
                              }}
                              placeholder="10-digit mobile"
                              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] text-xs font-medium focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] mb-1">
                            Email Address <span className="text-[#8C7A6B] font-normal">(Optional)</span>
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C7A6B]" />
                            <input
                              type="email"
                              value={teacherRegEmail}
                              onChange={(e) => {
                                setTeacherRegEmail(e.target.value);
                                clearMessages();
                              }}
                              placeholder="e.g. rajesh@college.edu"
                              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] text-xs font-medium focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* College Selection & Teacher/Employee ID Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] mb-1">
                            College Selection *
                          </label>
                          <select
                            required
                            value={teacherRegCollegeId}
                            onChange={(e) => {
                              setTeacherRegCollegeId(e.target.value);
                              clearMessages();
                            }}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] text-xs font-medium focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                          >
                            <option value="">-- Choose College --</option>
                            {colleges.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.name} (ID: {c.id})
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
                            value={teacherRegEmployeeId}
                            onChange={(e) => {
                              setTeacherRegEmployeeId(e.target.value);
                              clearMessages();
                            }}
                            placeholder="e.g. EMP-9081 or T-101"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] text-xs font-medium focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Department & Designation Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] mb-1">
                            Department *
                          </label>
                          <input
                            type="text"
                            required
                            value={teacherRegDepartment}
                            onChange={(e) => {
                              setTeacherRegDepartment(e.target.value);
                              clearMessages();
                            }}
                            placeholder="e.g. Computer Science"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] text-xs font-medium focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] mb-1">
                            Designation *
                          </label>
                          <select
                            required
                            value={teacherRegDesignation}
                            onChange={(e) => {
                              setTeacherRegDesignation(e.target.value);
                              clearMessages();
                            }}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] text-xs font-medium focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                          >
                            <option value="Assistant Professor">Assistant Professor</option>
                            <option value="Associate Professor">Associate Professor</option>
                            <option value="Professor">Professor</option>
                            <option value="Head of Department (HOD)">Head of Department (HOD)</option>
                            <option value="Dean / Principal">Dean / Principal</option>
                            <option value="Senior Lecturer">Senior Lecturer</option>
                            <option value="Lecturer">Lecturer</option>
                          </select>
                        </div>
                      </div>

                      {/* Password & Confirm Password */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] mb-1">
                            Password *
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C7A6B]" />
                            <input
                              type="password"
                              required
                              value={teacherRegPassword}
                              onChange={(e) => {
                                setTeacherRegPassword(e.target.value);
                                clearMessages();
                              }}
                              placeholder="Minimum 6 characters"
                              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] text-xs font-medium focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] mb-1">
                            Confirm Password *
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C7A6B]" />
                            <input
                              type="password"
                              required
                              value={teacherRegConfirmPassword}
                              onChange={(e) => {
                                setTeacherRegConfirmPassword(e.target.value);
                                clearMessages();
                              }}
                              placeholder="Re-enter password"
                              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] text-xs font-medium focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-[#C9650F] to-[#A34C0C] hover:from-[#B5590B] hover:to-[#914209] text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-[#C9650F]/25 disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Validating & Generating OTP...</span>
                          </>
                        ) : (
                          <>
                            <KeyRound className="w-4 h-4" />
                            <span>Verify Mobile Number & Continue</span>
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
                              onClick={() => handleCopyOtp(teacherRegGeneratedOtp)}
                              className="px-3 py-1.5 rounded-lg bg-[#EDE4D8] hover:bg-[#DECDBB] dark:bg-[#2A1E17] dark:hover:bg-[#38261A] text-[#2E1E14] dark:text-[#FAF5EE] text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
                              title="Copy OTP"
                            >
                              {copied ? (
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

                      {/* Registration Profile Summary */}
                      <div className="p-3.5 rounded-xl bg-[#EDE4D8] dark:bg-[#2A1E17] border border-[#DECDBB] dark:border-[#38261A] text-xs flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-[#7A6250] dark:text-[#A89685] uppercase font-bold">Registering Faculty</div>
                          <div className="font-extrabold text-[#2E1E14] dark:text-[#FAF5EE] text-sm">
                            {teacherRegName} ({teacherRegEmployeeId})
                          </div>
                          <div className="text-[11px] text-[#7A6250] dark:text-[#C5B3A2]">
                            Mobile: +91 {normalizeIndianMobile(teacherRegMobile)} • {teacherRegDesignation}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setTeacherRegStep('form');
                            clearMessages();
                          }}
                          className="text-xs font-bold text-[#C9650F] hover:underline flex items-center gap-1 cursor-pointer shrink-0 ml-2"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>Edit Details</span>
                        </button>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] uppercase tracking-wider mb-1.5">
                          Enter 6-Digit OTP *
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={teacherRegOtp}
                          onChange={(e) => {
                            setTeacherRegOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                            clearMessages();
                          }}
                          placeholder="• • • • • •"
                          className="w-full text-center tracking-[0.4em] py-3 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] text-lg font-mono font-extrabold focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                          autoFocus
                          required
                        />
                        <p className="text-[11px] text-[#7A6250] dark:text-[#A89685] mt-1.5">
                          Enter the 6-digit code displayed in the banner above to submit your registration.
                        </p>
                      </div>

                      {/* Timers & Resend */}
                      <div className="flex items-center justify-between text-xs text-[#7A6250] dark:text-[#A89685] pt-1">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[#C9650F]" />
                          <span>Expires in: <strong>{formatTimer(teacherRegExpirySeconds)}</strong></span>
                        </div>

                        {teacherRegResendCooldown > 0 ? (
                          <span className="font-semibold text-[#8C7A6B]">
                            Resend code in {teacherRegResendCooldown}s
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => handleStartTeacherRegistration(e)}
                            disabled={loading}
                            className="font-bold text-[#C9650F] hover:text-[#A34C0C] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Resend OTP</span>
                          </button>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={loading || teacherRegOtp.length !== 6 || teacherRegExpirySeconds <= 0}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-[#C9650F] to-[#A34C0C] hover:from-[#B5590B] hover:to-[#914209] text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-[#C9650F]/25 disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Submitting Registration...</span>
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
                          <strong className="text-[#2E1E14] dark:text-[#FAF5EE]">{teacherRegSuccessData?.teacherId || teacherRegEmployeeId}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#8C7A6B]">Registered Name:</span>
                          <span className="text-[#2E1E14] dark:text-[#FAF5EE]">{teacherRegName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#8C7A6B]">Mobile Number:</span>
                          <span className="text-[#2E1E14] dark:text-[#FAF5EE]">+91 {normalizeIndianMobile(teacherRegMobile)}</span>
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
                            setTeacherMode('signin');
                            setTeacherMobile(teacherRegMobile);
                          }}
                          className="px-5 py-2.5 rounded-xl bg-[#C9650F] hover:bg-[#A34C0C] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
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

          {/* ========================================================= */}
          {/* 3. ADMIN LOGIN TAB                                        */}
          {/* ========================================================= */}
          {activeTab === 'admin' && (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] uppercase tracking-wider mb-1.5">
                  Super Administrator Email *
                </label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => {
                    setAdminEmail(e.target.value);
                    clearMessages();
                  }}
                  placeholder="admin@institution.edu"
                  className="w-full px-4 py-3 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] text-sm font-semibold placeholder:font-normal placeholder:text-xs placeholder:text-[#8C7A6B] focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A3525] dark:text-[#D8C7B5] uppercase tracking-wider mb-1.5">
                  Master Security Password *
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => {
                    setAdminPassword(e.target.value);
                    clearMessages();
                  }}
                  placeholder="Enter administrator password"
                  className="w-full px-4 py-3 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] text-sm focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || !adminEmail.trim() || !adminPassword.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#2E1E14] via-[#4A3525] to-[#2E1E14] dark:from-[#DECDBB] dark:to-[#FAF5EE] hover:opacity-95 text-white dark:text-[#2E1E14] font-bold text-xs uppercase tracking-wider shadow-md disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Admin Authorization...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    <span>Log In to Admin Console</span>
                  </>
                )}
              </button>
            </form>
          )}

        </div>

        {/* Footer Notice */}
        <div className="text-center text-xs text-[#7A6250] dark:text-[#A89685] space-y-1">
          <div>Protected by Student Complaint Box Institutional Verification System</div>
          <div className="text-[11px] text-[#8C7A6B]">
            All mobile numbers and permissions are securely checked against the Supabase database.
          </div>
        </div>

      </div>
    </div>
  );
}
