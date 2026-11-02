import React, { useState, useEffect } from 'react';
import { 
  X, Smartphone, KeyRound, Building2, User, 
  ShieldCheck, ArrowRight, Lock, Briefcase, GraduationCap,
  Clock, RefreshCw, CheckCircle2, Copy, Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { getApiUrl } from '../services/api';

export default function AuthModal({ isOpen, onClose }) {
  const { setAuthSession } = useAuth();
  const { showToast } = useNotifications();

  // Active Role Tab: 'student' | 'teacher' | 'admin'
  const [activeTab, setActiveTab] = useState('student');

  // Student flow state
  const [studentStep, setStudentStep] = useState('mobile'); // 'mobile' | 'otp' | 'register'
  const [studentMobile, setStudentMobile] = useState('');
  const [studentOtp, setStudentOtp] = useState('');
  const [studentGeneratedOtp, setStudentGeneratedOtp] = useState('');
  const [studentResendCooldown, setStudentResendCooldown] = useState(0);
  const [studentExpirySeconds, setStudentExpirySeconds] = useState(300);
  const [studentName, setStudentName] = useState('');
  const [studentCollegeId, setStudentCollegeId] = useState('');
  const [studentEmail, setStudentEmail] = useState('');

  // Teacher flow state
  const [teacherLoginMethod, setTeacherLoginMethod] = useState('otp'); // 'otp' | 'password'
  const [teacherStep, setTeacherStep] = useState('mobile'); // 'mobile' | 'otp'
  const [teacherMobile, setTeacherMobile] = useState('');
  const [teacherOtp, setTeacherOtp] = useState('');
  const [teacherGeneratedOtp, setTeacherGeneratedOtp] = useState('');
  const [teacherResendCooldown, setTeacherResendCooldown] = useState(0);
  const [teacherExpirySeconds, setTeacherExpirySeconds] = useState(300);

  const [copied, setCopied] = useState(false);

  const [teacherIsRegister, setTeacherIsRegister] = useState(false);
  const [teacherIdentifier, setTeacherIdentifier] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [teacherRegName, setTeacherRegName] = useState('');
  const [teacherRegMobile, setTeacherRegMobile] = useState('');
  const [teacherRegEmail, setTeacherRegEmail] = useState('');
  const [teacherRegCollegeId, setTeacherRegCollegeId] = useState('5555');
  const [teacherRegDepartment, setTeacherRegDepartment] = useState('');
  const [teacherRegEmployeeId, setTeacherRegEmployeeId] = useState('');
  const [teacherRegDesignation, setTeacherRegDesignation] = useState('Assistant Professor');
  const [teacherRegConfirmPassword, setTeacherRegConfirmPassword] = useState('');
  const [teacherRegStep, setTeacherRegStep] = useState('form'); // 'form' | 'otp' | 'success'
  const [teacherRegOtp, setTeacherRegOtp] = useState('');
  const [teacherRegGeneratedOtp, setTeacherRegGeneratedOtp] = useState('');
  const [teacherRegResendCooldown, setTeacherRegResendCooldown] = useState(0);
  const [teacherRegExpirySeconds, setTeacherRegExpirySeconds] = useState(300);

  // Admin flow state
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Timers for student OTP
  useEffect(() => {
    let timer;
    if (studentStep === 'otp') {
      timer = setInterval(() => {
        setStudentResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
        setStudentExpirySeconds(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [studentStep]);

  // Timers for teacher OTP
  useEffect(() => {
    let timer;
    if (teacherStep === 'otp' && activeTab === 'teacher') {
      timer = setInterval(() => {
        setTeacherResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
        setTeacherExpirySeconds(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [teacherStep, activeTab]);

  useEffect(() => {
    fetch(getApiUrl('/api/colleges'))
      .then(res => res.json())
      .then(data => {
        if (data.colleges) {
          setColleges(data.colleges);
          if (data.colleges.length > 0) {
            setStudentCollegeId(data.colleges[0].id);
            setTeacherRegCollegeId(data.colleges[0].id);
          }
        }
      })
      .catch(() => {});
  }, []);

  if (!isOpen) return null;

  const resetMessages = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

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

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopyOtp = (codeToCopy) => {
    if (!codeToCopy) return;
    try {
      navigator.clipboard.writeText(codeToCopy);
    } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (activeTab === 'student') {
      setStudentOtp(codeToCopy);
    } else if (activeTab === 'teacher') {
      if (teacherIsRegister) {
        setTeacherRegOtp(codeToCopy);
      } else {
        setTeacherOtp(codeToCopy);
      }
    }
  };

  useEffect(() => {
    let timer;
    if (teacherRegStep === 'otp' && activeTab === 'teacher' && teacherIsRegister) {
      timer = setInterval(() => {
        setTeacherRegResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
        setTeacherRegExpirySeconds(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [teacherRegStep, activeTab, teacherIsRegister]);

  // --- Student Handlers ---
  const handleSendStudentOtp = async (e, isResend = false) => {
    if (e && e.preventDefault) e.preventDefault();
    resetMessages();

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
    resetMessages();
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
        onClose();
      } else {
        setErrorMsg(data.error || 'Incorrect OTP. Please try again.');
      }
    } catch {
      setErrorMsg('Network error verifying OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterStudent = async (e) => {
    e.preventDefault();
    resetMessages();
    if (!studentName.trim() || !studentCollegeId) {
      setErrorMsg('Please provide your Full Name and select your College.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/auth/register-student'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: studentMobile.trim(),
          name: studentName.trim(),
          collegeId: studentCollegeId.trim(),
          email: studentEmail.trim() || undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        setAuthSession(data.user, data.token);
        showToast('Login successful. Welcome!', 'success');
        onClose();
      } else {
        setErrorMsg(data.error || 'Registration failed. Please contact your college.');
      }
    } catch {
      setErrorMsg('Network error during student registration.');
    } finally {
      setLoading(false);
    }
  };

  // --- Teacher Handlers ---
  const handleSendTeacherOtp = async (e, isResend = false) => {
    if (e && e.preventDefault) e.preventDefault();
    resetMessages();

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
    resetMessages();
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
        onClose();
      } else {
        setErrorMsg(data.error || 'Incorrect OTP. Please try again.');
      }
    } catch {
      setErrorMsg('Network error verifying OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherPasswordLogin = async (e) => {
    e.preventDefault();
    resetMessages();
    if (!teacherIdentifier.trim() || !teacherPassword) {
      setErrorMsg('Please enter Teacher ID or Mobile and Password.');
      return;
    }

    setLoading(true);
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
        showToast('Login successful. Welcome!', 'success');
        onClose();
      } else {
        setErrorMsg(data.error || 'Incorrect credentials. Please try again.');
      }
    } catch {
      setErrorMsg('Network error during login.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTeacherRegister = async (e) => {
    e.preventDefault();
    resetMessages();
    if (!teacherRegName.trim()) {
      setErrorMsg('Full Name is required.');
      return;
    }
    if (!isValidIndianMobile(teacherRegMobile)) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (!teacherRegCollegeId) {
      setErrorMsg('College selection is required.');
      return;
    }
    if (!teacherRegEmployeeId.trim()) {
      setErrorMsg('Teacher ID / Employee ID is required.');
      return;
    }
    if (!teacherRegDepartment.trim()) {
      setErrorMsg('Department is required.');
      return;
    }
    if (!teacherPassword || teacherPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (teacherPassword !== teacherRegConfirmPassword) {
      setErrorMsg('Passwords do not match.');
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
        setErrorMsg(data.error || 'Failed to send OTP.');
        if (data.cooldownRemaining) {
          setTeacherRegResendCooldown(data.cooldownRemaining);
        }
      }
    } catch {
      setErrorMsg('Network error sending verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegisterTeacher = async (e) => {
    e.preventDefault();
    resetMessages();
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
          department: teacherRegDepartment.trim() || 'General Department',
          designation: teacherRegDesignation.trim(),
          password: teacherPassword,
          otp: teacherRegOtp.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Your registration has been submitted successfully. Please wait for Admin approval.', 'success');
        setTeacherRegStep('success');
        setSuccessMsg('Your registration has been submitted successfully. Please wait for Admin approval.');
      } else {
        setErrorMsg(data.error || 'Registration failed.');
      }
    } catch {
      setErrorMsg('Network error during registration.');
    } finally {
      setLoading(false);
    }
  };

  // --- Admin Handlers ---
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    resetMessages();
    if (!adminEmail.trim() || !adminPassword) {
      setErrorMsg('Please enter Admin Email and Password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/auth/login-admin'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: adminEmail.trim(),
          password: adminPassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        setAuthSession(data.user, data.token);
        showToast('Login successful. Welcome!', 'success');
        onClose();
      } else {
        setErrorMsg(data.error || 'Incorrect administrator email or password.');
      }
    } catch {
      setErrorMsg('Network error during admin login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#FBF9F5] dark:bg-[#1F1712] w-full max-w-md rounded-3xl shadow-2xl border border-[#E3D3C2] dark:border-[#38261A] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E3D3C2] dark:border-[#38261A] bg-[#F2ECE4] dark:bg-[#2A1E17]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-[#C9650F] to-[#A34C0C] text-white shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-[#2E1E14] dark:text-[#FAF5EE] text-base">Login Verification</h3>
              <p className="text-[11px] text-[#7A6250] dark:text-[#A89685]">College Complaint Box</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-[#8C7A6B] hover:text-[#2E1E14] dark:hover:text-[#FAF5EE] hover:bg-[#E2D6C6] dark:hover:bg-[#34261D] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Selection Tabs */}
        <div className="grid grid-cols-3 p-1.5 bg-[#EDE4D8] dark:bg-[#2A1E17] m-4 rounded-xl text-xs font-bold gap-1 border border-[#DECDBB] dark:border-[#38261A]">
          <button
            onClick={() => { setActiveTab('student'); resetMessages(); }}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'student'
                ? 'bg-gradient-to-r from-[#C9650F] to-[#A34C0C] text-white shadow-xs'
                : 'text-[#5A4030] dark:text-[#D8C7B5] hover:text-[#2E1E14]'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Student</span>
          </button>

          <button
            onClick={() => { setActiveTab('teacher'); resetMessages(); }}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'teacher'
                ? 'bg-gradient-to-r from-[#C9650F] to-[#A34C0C] text-white shadow-xs'
                : 'text-[#5A4030] dark:text-[#D8C7B5] hover:text-[#2E1E14]'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Teacher</span>
          </button>

          <button
            onClick={() => { setActiveTab('admin'); resetMessages(); }}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'admin'
                ? 'bg-gradient-to-r from-[#C9650F] to-[#A34C0C] text-white shadow-xs'
                : 'text-[#5A4030] dark:text-[#D8C7B5] hover:text-[#2E1E14]'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Admin</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="px-6 pb-6 pt-1 text-xs space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
              {successMsg}
            </div>
          )}

          {/* ================= STUDENT ACCESS FLOW ================= */}
          {activeTab === 'student' && (
            <div className="space-y-4">
              {studentStep === 'mobile' && (
                <form onSubmit={handleSendStudentOtp} className="space-y-4">
                  <div className="p-3 rounded-xl bg-[#F2ECE4] dark:bg-[#2A1E17] border border-[#DECDBB] dark:border-[#38261A] text-[#4A3525] dark:text-[#D8C7B5] text-[11px] leading-relaxed">
                    Enter your registered 10-digit mobile number. We will send a secure verification code to your phone.
                  </div>

                  <div>
                    <label className="block font-bold text-[#4A3525] dark:text-[#D8C7B5] uppercase tracking-wider mb-1.5">
                      Registered Mobile Number *
                    </label>
                    <div className="relative">
                      <Smartphone className="w-4 h-4 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={studentMobile}
                        onChange={(e) => setStudentMobile(e.target.value)}
                        placeholder="e.g. 9899123456"
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#C9650F]"
                        maxLength={14}
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#C9650F] to-[#A34C0C] hover:from-[#B5590B] hover:to-[#914209] text-white font-bold text-xs shadow-md shadow-[#C9650F]/20 transition flex items-center justify-center gap-2"
                  >
                    <span>{loading ? 'Sending OTP...' : 'Send OTP'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}

              {studentStep === 'otp' && (
                <form onSubmit={handleVerifyStudentOtp} className="space-y-4">
                  {/* TOP OTP BANNER */}
                  {studentGeneratedOtp && (
                    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#FFF9F3] via-[#FEF3E4] to-[#FCEAD2] dark:from-[#2A1D13] dark:via-[#22160E] dark:to-[#191009] border-2 border-[#C9650F] dark:border-[#F5A623] shadow-md shadow-[#C9650F]/15 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-lg bg-[#C9650F] text-white flex items-center justify-center">
                            <KeyRound className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-extrabold text-[#2E1E14] dark:text-[#FAF5EE] flex items-center gap-1.5">
                              <span>Your OTP is ready</span>
                              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            </h4>
                            <p className="text-[10px] text-[#7A6250] dark:text-[#C5B3A2]">
                              Enter the code displayed below to continue
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/90 dark:bg-[#18120E] border border-[#DECDBB] dark:border-[#38261A] text-[10px] font-bold text-[#A34C0C] dark:text-[#F5A623]">
                          <Clock className="w-3 h-3" />
                          <span>{Math.floor(studentExpirySeconds / 60)}:{String(studentExpirySeconds % 60).padStart(2, '0')}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-[#18120E] border border-[#DECDBB] dark:border-[#38261A]">
                        <div className="font-mono text-xl sm:text-2xl font-black tracking-[0.25em] text-[#C9650F] dark:text-[#F5A623] pl-2 select-all">
                          {studentGeneratedOtp}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCopyOtp(studentGeneratedOtp)}
                          className="px-2.5 py-1 rounded-lg bg-[#EDE4D8] hover:bg-[#DECDBB] dark:bg-[#2A1E17] dark:hover:bg-[#38261A] text-[#2E1E14] dark:text-[#FAF5EE] text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
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

                  <div className="p-3 rounded-xl bg-[#F2ECE4] dark:bg-[#2A1E17] border border-[#DECDBB] dark:border-[#38261A] text-[#4A3525] dark:text-[#D8C7B5] text-[11px]">
                    Enter the 6-digit verification code sent to <strong>+91 {normalizeIndianMobile(studentMobile)}</strong>.
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block font-bold text-[#4A3525] dark:text-[#D8C7B5] uppercase tracking-wider">
                        Enter 6-Digit OTP *
                      </label>
                      <div className="text-[11px] text-[#A34C0C] dark:text-[#FDBA74] flex items-center gap-1 font-semibold">
                        <Clock className="w-3 h-3" />
                        <span>Expires in {Math.floor(studentExpirySeconds / 60)}:{String(studentExpirySeconds % 60).padStart(2, '0')}</span>
                      </div>
                    </div>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={studentOtp}
                        onChange={(e) => setStudentOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] font-mono font-bold text-base tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-[#C9650F]"
                        maxLength={6}
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <button
                      type="button"
                      onClick={() => { setStudentStep('mobile'); setStudentOtp(''); resetMessages(); }}
                      className="text-[#8C7A6B] hover:text-[#2E1E14] dark:hover:text-[#FAF5EE] underline"
                    >
                      Change Number
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleSendStudentOtp(e, true)}
                      disabled={studentResendCooldown > 0 || loading}
                      className="text-[#C9650F] dark:text-[#E88C30] font-semibold hover:underline disabled:opacity-50 disabled:no-underline"
                    >
                      {studentResendCooldown > 0 ? `Resend in ${studentResendCooldown}s` : 'Resend OTP'}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || studentOtp.length < 6}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#C9650F] to-[#A34C0C] hover:from-[#B5590B] hover:to-[#914209] text-white font-bold text-xs shadow-md shadow-[#C9650F]/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Verify & Login</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {studentStep === 'register' && (
                <form onSubmit={handleRegisterStudent} className="space-y-3">
                  <div className="p-2.5 bg-[#F2ECE4] dark:bg-[#2A1E17] border border-[#DECDBB] dark:border-[#38261A] rounded-xl text-[#4A3525] dark:text-[#D8C7B5] text-[11px]">
                    Mobile verified! Please link your College ID to complete student registration.
                  </div>

                  <div>
                    <label className="block font-bold text-[#4A3525] dark:text-[#D8C7B5] uppercase tracking-wider mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="Your official student name"
                      className="w-full px-3 py-2 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#4A3525] dark:text-[#D8C7B5] uppercase tracking-wider mb-1">
                      College *
                    </label>
                    <select
                      value={studentCollegeId}
                      onChange={(e) => setStudentCollegeId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] font-medium"
                      required
                    >
                      {colleges.map(c => (
                        <option key={c.id} value={c.id} disabled={c.status !== 'active'}>
                          {c.name} (ID: {c.id}) {c.status !== 'active' ? `[${c.status}]` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-[#4A3525] dark:text-[#D8C7B5] uppercase tracking-wider mb-1">
                      Email (Optional)
                    </label>
                    <input
                      type="email"
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                      placeholder="student@example.edu"
                      className="w-full px-3 py-2 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#C9650F] to-[#A34C0C] hover:from-[#B5590B] hover:to-[#914209] text-white font-bold text-xs shadow-md shadow-[#C9650F]/20 transition"
                  >
                    {loading ? 'Completing...' : 'Complete Registration'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ================= TEACHER FLOW ================= */}
          {activeTab === 'teacher' && (
            <div className="space-y-4">
              {!teacherIsRegister ? (
                <>
                  {/* Toggle between OTP and Password login for teachers */}
                  <div className="flex border border-[#DECDBB] dark:border-[#38261A] rounded-xl overflow-hidden text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => { setTeacherLoginMethod('otp'); resetMessages(); }}
                      className={`flex-1 py-1.5 transition ${
                        teacherLoginMethod === 'otp'
                          ? 'bg-[#C9650F] text-white'
                          : 'bg-[#F2ECE4] dark:bg-[#2A1E17] text-[#6E5848] dark:text-[#DDD0C3]'
                      }`}
                    >
                      Mobile OTP Login
                    </button>
                    <button
                      type="button"
                      onClick={() => { setTeacherLoginMethod('password'); resetMessages(); }}
                      className={`flex-1 py-1.5 transition ${
                        teacherLoginMethod === 'password'
                          ? 'bg-[#C9650F] text-white'
                          : 'bg-[#F2ECE4] dark:bg-[#2A1E17] text-[#6E5848] dark:text-[#DDD0C3]'
                      }`}
                    >
                      Password Login
                    </button>
                  </div>

                  {/* Teacher OTP Method */}
                  {teacherLoginMethod === 'otp' && (
                    <>
                      {teacherStep === 'mobile' && (
                        <form onSubmit={handleSendTeacherOtp} className="space-y-4">
                          <div className="p-3 rounded-xl bg-[#F2ECE4] dark:bg-[#2A1E17] border border-[#DECDBB] dark:border-[#38261A] text-[#4A3525] dark:text-[#D8C7B5] text-[11px] leading-relaxed">
                            Enter your approved teacher mobile number to receive a verification OTP.
                          </div>

                          <div>
                            <label className="block font-bold text-[#4A3525] dark:text-[#D8C7B5] uppercase tracking-wider mb-1.5">
                              Registered Teacher Mobile *
                            </label>
                            <div className="relative">
                              <Smartphone className="w-4 h-4 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2" />
                              <input
                                type="tel"
                                value={teacherMobile}
                                onChange={(e) => setTeacherMobile(e.target.value)}
                                placeholder="e.g. 9811122233"
                                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#C9650F]"
                                maxLength={14}
                                required
                              />
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#C9650F] to-[#A34C0C] hover:from-[#B5590B] hover:to-[#914209] text-white font-bold text-xs shadow-md shadow-[#C9650F]/20 transition flex items-center justify-center gap-2"
                          >
                            <span>{loading ? 'Sending OTP...' : 'Send OTP'}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      )}

                      {teacherStep === 'otp' && (
                        <form onSubmit={handleVerifyTeacherOtp} className="space-y-4">
                          {/* TOP OTP BANNER */}
                          {teacherGeneratedOtp && (
                            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#FFF9F3] via-[#FEF3E4] to-[#FCEAD2] dark:from-[#2A1D13] dark:via-[#22160E] dark:to-[#191009] border-2 border-[#C9650F] dark:border-[#F5A623] shadow-md shadow-[#C9650F]/15 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-6 h-6 rounded-lg bg-[#C9650F] text-white flex items-center justify-center">
                                    <KeyRound className="w-3.5 h-3.5" />
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-extrabold text-[#2E1E14] dark:text-[#FAF5EE] flex items-center gap-1.5">
                                      <span>Your OTP is ready</span>
                                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    </h4>
                                    <p className="text-[10px] text-[#7A6250] dark:text-[#C5B3A2]">
                                      Enter the code displayed below to continue
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/90 dark:bg-[#18120E] border border-[#DECDBB] dark:border-[#38261A] text-[10px] font-bold text-[#A34C0C] dark:text-[#F5A623]">
                                  <Clock className="w-3 h-3" />
                                  <span>{Math.floor(teacherExpirySeconds / 60)}:{String(teacherExpirySeconds % 60).padStart(2, '0')}</span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-[#18120E] border border-[#DECDBB] dark:border-[#38261A]">
                                <div className="font-mono text-xl sm:text-2xl font-black tracking-[0.25em] text-[#C9650F] dark:text-[#F5A623] pl-2 select-all">
                                  {teacherGeneratedOtp}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleCopyOtp(teacherGeneratedOtp)}
                                  className="px-2.5 py-1 rounded-lg bg-[#EDE4D8] hover:bg-[#DECDBB] dark:bg-[#2A1E17] dark:hover:bg-[#38261A] text-[#2E1E14] dark:text-[#FAF5EE] text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
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

                          <div className="p-3 rounded-xl bg-[#F2ECE4] dark:bg-[#2A1E17] border border-[#DECDBB] dark:border-[#38261A] text-[#4A3525] dark:text-[#D8C7B5] text-[11px]">
                            Enter the 6-digit OTP code sent to <strong>+91 {normalizeIndianMobile(teacherMobile)}</strong>.
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="block font-bold text-[#4A3525] dark:text-[#D8C7B5] uppercase tracking-wider">
                                Enter 6-Digit OTP *
                              </label>
                              <div className="text-[11px] text-[#A34C0C] dark:text-[#FDBA74] flex items-center gap-1 font-semibold">
                                <Clock className="w-3 h-3" />
                                <span>Expires in {Math.floor(teacherExpirySeconds / 60)}:{String(teacherExpirySeconds % 60).padStart(2, '0')}</span>
                              </div>
                            </div>
                            <div className="relative">
                              <KeyRound className="w-4 h-4 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                value={teacherOtp}
                                onChange={(e) => setTeacherOtp(e.target.value.replace(/\D/g, ''))}
                                placeholder="000000"
                                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] font-mono font-bold text-base tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-[#C9650F]"
                                maxLength={6}
                                required
                                autoFocus
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px]">
                            <button
                              type="button"
                              onClick={() => { setTeacherStep('mobile'); setTeacherOtp(''); resetMessages(); }}
                              className="text-[#8C7A6B] hover:text-[#2E1E14] dark:hover:text-[#FAF5EE] underline"
                            >
                              Change Number
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleSendTeacherOtp(e, true)}
                              disabled={teacherResendCooldown > 0 || loading}
                              className="text-[#C9650F] dark:text-[#E88C30] font-semibold hover:underline disabled:opacity-50 disabled:no-underline"
                            >
                              {teacherResendCooldown > 0 ? `Resend in ${teacherResendCooldown}s` : 'Resend OTP'}
                            </button>
                          </div>

                          <button
                            type="submit"
                            disabled={loading || teacherOtp.length < 6}
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#C9650F] to-[#A34C0C] hover:from-[#B5590B] hover:to-[#914209] text-white font-bold text-xs shadow-md shadow-[#C9650F]/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {loading ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Verifying...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Verify & Login</span>
                              </>
                            )}
                          </button>
                        </form>
                      )}
                    </>
                  )}

                  {/* Teacher Password Method */}
                  {teacherLoginMethod === 'password' && (
                    <form onSubmit={handleTeacherPasswordLogin} className="space-y-3.5">
                      <div>
                        <label className="block font-bold text-[#4A3525] dark:text-[#D8C7B5] uppercase tracking-wider mb-1">
                          Teacher ID, Email, or Mobile *
                        </label>
                        <input
                          type="text"
                          value={teacherIdentifier}
                          onChange={(e) => setTeacherIdentifier(e.target.value)}
                          placeholder="e.g. 5555-T100 or 9811122233"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] font-medium"
                          required
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-[#4A3525] dark:text-[#D8C7B5] uppercase tracking-wider mb-1">
                          Password *
                        </label>
                        <input
                          type="password"
                          value={teacherPassword}
                          onChange={(e) => setTeacherPassword(e.target.value)}
                          placeholder="Enter password"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE]"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#C9650F] to-[#A34C0C] hover:from-[#B5590B] hover:to-[#914209] text-white font-bold text-xs shadow-md shadow-[#C9650F]/20 transition"
                      >
                        {loading ? 'Logging In...' : 'Teacher Login'}
                      </button>
                    </form>
                  )}

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => { setTeacherIsRegister(true); resetMessages(); }}
                      className="text-xs text-[#C9650F] dark:text-[#F5A623] font-semibold hover:underline"
                    >
                      New Teacher? Register Here
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  {teacherRegStep === 'form' && (
                    <form onSubmit={handleStartTeacherRegister} className="space-y-3">
                      <div className="p-2.5 bg-[#F2ECE4] dark:bg-[#2A1E17] border border-[#DECDBB] dark:border-[#38261A] rounded-xl text-[#4A3525] dark:text-[#D8C7B5] text-[11px]">
                        Register under your college. Your registration will be submitted for Administrator verification and approval.
                      </div>

                      <div>
                        <label className="block font-bold text-[#4A3525] dark:text-[#D8C7B5] uppercase tracking-wider mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          value={teacherRegName}
                          onChange={(e) => setTeacherRegName(e.target.value)}
                          placeholder="e.g. Prof. Rajesh Verma"
                          className="w-full px-3 py-2 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE]"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-bold text-[#4A3525] dark:text-[#D8C7B5] uppercase tracking-wider mb-1">College *</label>
                          <select
                            value={teacherRegCollegeId}
                            onChange={(e) => setTeacherRegCollegeId(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] font-medium"
                            required
                          >
                            {colleges.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.name} ({c.id})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block font-bold text-[#4A3525] dark:text-[#D8C7B5] uppercase tracking-wider mb-1">Teacher / Employee ID *</label>
                          <input
                            type="text"
                            value={teacherRegEmployeeId}
                            onChange={(e) => setTeacherRegEmployeeId(e.target.value)}
                            placeholder="e.g. EMP-9081"
                            className="w-full px-3 py-2 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE]"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-bold text-[#4A3525] dark:text-[#D8C7B5] uppercase tracking-wider mb-1">Mobile *</label>
                          <input
                            type="tel"
                            value={teacherRegMobile}
                            onChange={(e) => setTeacherRegMobile(e.target.value)}
                            placeholder="10-digit mobile"
                            className="w-full px-3 py-2 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] font-mono"
                            maxLength={14}
                            required
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-[#4A3525] dark:text-[#D8C7B5] uppercase tracking-wider mb-1">Department *</label>
                          <input
                            type="text"
                            value={teacherRegDepartment}
                            onChange={(e) => setTeacherRegDepartment(e.target.value)}
                            placeholder="e.g. Computer Science"
                            className="w-full px-3 py-2 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE]"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-[#4A3525] dark:text-[#D8C7B5] uppercase tracking-wider mb-1">Designation *</label>
                        <select
                          value={teacherRegDesignation}
                          onChange={(e) => setTeacherRegDesignation(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE]"
                          required
                        >
                          <option value="Assistant Professor">Assistant Professor</option>
                          <option value="Associate Professor">Associate Professor</option>
                          <option value="Professor">Professor</option>
                          <option value="Head of Department (HOD)">Head of Department (HOD)</option>
                          <option value="Dean / Principal">Dean / Principal</option>
                          <option value="Lecturer">Lecturer</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-bold text-[#4A3525] dark:text-[#D8C7B5] uppercase tracking-wider mb-1">Password *</label>
                          <input
                            type="password"
                            value={teacherPassword}
                            onChange={(e) => setTeacherPassword(e.target.value)}
                            placeholder="Min 6 characters"
                            className="w-full px-3 py-2 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE]"
                            required
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-[#4A3525] dark:text-[#D8C7B5] uppercase tracking-wider mb-1">Confirm Password *</label>
                          <input
                            type="password"
                            value={teacherRegConfirmPassword}
                            onChange={(e) => setTeacherRegConfirmPassword(e.target.value)}
                            placeholder="Confirm password"
                            className="w-full px-3 py-2 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE]"
                            required
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#C9650F] to-[#A34C0C] hover:from-[#B5590B] hover:to-[#914209] text-white font-bold text-xs shadow-md shadow-[#C9650F]/20 transition cursor-pointer"
                      >
                        {loading ? 'Validating...' : 'Verify Mobile & Continue'}
                      </button>

                      <div className="text-center pt-1">
                        <button
                          type="button"
                          onClick={() => setTeacherIsRegister(false)}
                          className="text-xs text-[#8C7A6B] hover:underline cursor-pointer"
                        >
                          Already have an account? Sign In
                        </button>
                      </div>
                    </form>
                  )}

                  {teacherRegStep === 'otp' && (
                    <form onSubmit={handleVerifyAndRegisterTeacher} className="space-y-3">
                      {/* TOP OTP BANNER */}
                      {teacherRegGeneratedOtp && (
                        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#FFF9F3] via-[#FEF3E4] to-[#FCEAD2] dark:from-[#2A1D13] dark:via-[#22160E] dark:to-[#191009] border-2 border-[#C9650F] dark:border-[#F5A623] shadow-md shadow-[#C9650F]/15 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded-md bg-[#C9650F] text-white flex items-center justify-center">
                                <KeyRound className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-[#2E1E14] dark:text-[#FAF5EE]">
                                  Your OTP is ready
                                </h4>
                                <p className="text-[10px] text-[#7A6250] dark:text-[#C5B3A2]">
                                  Enter the code displayed below to complete registration
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/90 dark:bg-[#18120E] border border-[#DECDBB] dark:border-[#38261A] text-[10px] font-bold text-[#A34C0C] dark:text-[#F5A623]">
                              <Clock className="w-3 h-3" />
                              <span>{formatTimer(teacherRegExpirySeconds)}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-[#18120E] border border-[#DECDBB] dark:border-[#38261A]">
                            <div className="font-mono text-2xl font-black tracking-[0.25em] text-[#C9650F] dark:text-[#F5A623] pl-2 select-all">
                              {teacherRegGeneratedOtp}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyOtp(teacherRegGeneratedOtp)}
                              className="px-2.5 py-1 rounded-lg bg-[#EDE4D8] hover:bg-[#DECDBB] dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] text-[11px] font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                            >
                              {copied ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                  <span className="text-emerald-700 dark:text-emerald-300">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 text-[#C9650F]" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="p-3 rounded-xl bg-[#EDE4D8] dark:bg-[#2A1E17] border border-[#DECDBB] dark:border-[#38261A] text-xs flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-[#7A6250] dark:text-[#A89685] uppercase font-bold">Registering Faculty</div>
                          <div className="font-extrabold text-[#2E1E14] dark:text-[#FAF5EE]">
                            {teacherRegName} ({teacherRegEmployeeId})
                          </div>
                          <div className="text-[11px] text-[#7A6250]">
                            Mobile: +91 {normalizeIndianMobile(teacherRegMobile)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setTeacherRegStep('form');
                            resetMessages();
                          }}
                          className="text-xs font-bold text-[#C9650F] hover:underline cursor-pointer"
                        >
                          Edit Details
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
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={teacherRegOtp}
                          onChange={(e) => setTeacherRegOtp(e.target.value.replace(/\D/g, ''))}
                          placeholder="000000"
                          className="w-full text-center tracking-[0.4em] py-2.5 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] text-lg font-mono font-extrabold focus:ring-2 focus:ring-[#C9650F] focus:outline-none"
                          required
                          autoFocus
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <button
                          type="button"
                          onClick={() => { setTeacherRegStep('form'); resetMessages(); }}
                          className="text-[#8C7A6B] hover:text-[#2E1E14] dark:hover:text-[#FAF5EE] underline cursor-pointer"
                        >
                          Back to Form
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleStartTeacherRegister(e)}
                          disabled={teacherRegResendCooldown > 0 || loading}
                          className="text-[#C9650F] dark:text-[#E88C30] font-semibold hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
                        >
                          {teacherRegResendCooldown > 0 ? `Resend in ${teacherRegResendCooldown}s` : 'Resend OTP'}
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={loading || teacherRegOtp.length < 6}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#C9650F] to-[#A34C0C] hover:from-[#B5590B] hover:to-[#914209] text-white font-bold text-xs shadow-md shadow-[#C9650F]/20 transition cursor-pointer"
                      >
                        {loading ? 'Submitting...' : 'Verify OTP & Submit Registration'}
                      </button>
                    </form>
                  )}

                  {teacherRegStep === 'success' && (
                    <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-center space-y-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300 mx-auto flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                        Your registration has been submitted successfully. Please wait for Admin approval.
                      </div>
                      <div className="text-[11px] text-[#7A6250]">
                        Account status: <span className="font-bold text-amber-700 dark:text-amber-300">Waiting for Approval</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTeacherIsRegister(false);
                          setTeacherRegStep('form');
                          setTeacherLoginMethod('otp');
                          setTeacherMobile(teacherRegMobile);
                        }}
                        className="px-4 py-2 rounded-xl bg-[#C9650F] text-white text-xs font-bold hover:bg-[#A34C0C] cursor-pointer"
                      >
                        Go to Teacher Sign In
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ================= ADMIN FLOW ================= */}
          {activeTab === 'admin' && (
            <form onSubmit={handleAdminLogin} className="space-y-3.5">
              <div className="p-3 rounded-xl bg-[#F2ECE4] dark:bg-[#2A1E17] border border-[#DECDBB] dark:border-[#38261A] text-[#4A3525] dark:text-[#D8C7B5] text-[11px] leading-relaxed">
                College Administrator login using your administrator email and password.
              </div>

              <div>
                <label className="block font-bold text-[#4A3525] dark:text-[#D8C7B5] uppercase tracking-wider mb-1">
                  Administrator Email *
                </label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@college.edu"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE] font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-[#4A3525] dark:text-[#D8C7B5] uppercase tracking-wider mb-1">
                  Administrator Password *
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DECDBB] dark:border-[#38261A] bg-white dark:bg-[#2A1E17] text-[#2E1E14] dark:text-[#FAF5EE]"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#C9650F] to-[#A34C0C] hover:from-[#B5590B] hover:to-[#914209] text-white font-bold text-xs shadow-md shadow-[#C9650F]/20 transition"
              >
                {loading ? 'Logging In...' : 'Login as Admin'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
