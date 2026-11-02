import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { DemoStore } from '../lib/demoStore';
import './LoginPage.css';

export function LoginPage({ initialTab }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const nextUrl = searchParams.get('next') || '/';

  // Determine active tab from prop, pathname, or query param
  const defaultTab = initialTab || (location.pathname === '/register' || searchParams.get('tab') === 'register' ? 'register' : 'login');
  const [activeTab, setActiveTab] = useState(defaultTab);

  const { signIn, signUp } = useAuth();

  // ── Login State ──
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [loginError, setLoginError] = useState('');

  // ── Register State ──
  const [studyType, setStudyType] = useState('college'); // 'college' | 'school'
  const isSchool = studyType === 'school';
  const [regName, setRegName] = useState('');
  const [regDept, setRegDept] = useState('CSE');
  const [regInstitutionId, setRegInstitutionId] = useState('');
  const [regYear, setRegYear] = useState('3rd Year');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regStep, setRegStep] = useState(1); // 1 = form, 2 = otp, 3 = success
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regError, setRegError] = useState('');

  // Handle switching between College and School with logical defaults
  const handleStudyTypeChange = (newType) => {
    setStudyType(newType);
    if (newType === 'school') {
      setRegDept('Science (PCM)');
      setRegYear('Class 12');
      const firstSchool = institutions.find((i) => i.institution_type === 'school');
      if (firstSchool) setRegInstitutionId(firstSchool.id);
    } else {
      setRegDept('CSE');
      setRegYear('3rd Year');
      const firstCollege = institutions.find((i) => (i.institution_type || 'college') === 'college');
      if (firstCollege) setRegInstitutionId(firstCollege.id);
    }
  };

  // OTP State
  const DEMO_OTP = '849201';
  const [otpDigits, setOtpDigits] = useState(['8', '4', '9', '2', '0', '1']);
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(599);

  // Institution List
  const [institutions, setInstitutions] = useState([]);

  useEffect(() => {
    async function loadInstitutions() {
      try {
        const { data, error } = await supabase
          .from('institutions')
          .select('id, name, city, institution_type')
          .order('name');
        if (!error && data && data.length > 0) {
          setInstitutions(data);
          const firstMatching = data.find((i) => (i.institution_type || 'college') === studyType);
          if (firstMatching) setRegInstitutionId(firstMatching.id);
        } else {
          const fallback = DemoStore.getInstitutions();
          setInstitutions(fallback);
          if (fallback.length > 0) setRegInstitutionId(fallback[0].id);
        }
      } catch (e) {
        const fallback = DemoStore.getInstitutions();
        setInstitutions(fallback);
        if (fallback.length > 0) setRegInstitutionId(fallback[0].id);
      }
    }
    loadInstitutions();
  }, [studyType]);

  // Sync tab if URL changes
  useEffect(() => {
    if (location.pathname === '/register') {
      setActiveTab('register');
    } else if (location.pathname === '/login') {
      setActiveTab('login');
    }
  }, [location.pathname]);

  // Countdown timer for OTP
  useEffect(() => {
    if (regStep === 2 && otpSecondsLeft > 0) {
      const timer = setInterval(() => setOtpSecondsLeft((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [regStep, otpSecondsLeft]);

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // ── Tab Switching ──
  const switchTab = (tab) => {
    setActiveTab(tab);
    setLoginError('');
    setRegError('');
    if (tab === 'login') {
      setRegStep(1);
    }
  };

  // ── 1-Click Demo Login ──
  const handleDemoSignIn = async (email, password) => {
    setLoginEmail(email);
    setLoginPassword(password);
    setLoginSubmitting(true);
    setLoginError('');

    try {
      const { error } = await signIn({ email, password });
      if (error) {
        setLoginError(error.message || 'Unable to sign in with demo credentials.');
        setLoginSubmitting(false);
        return;
      }
      navigate(decodeURIComponent(nextUrl), { replace: true });
    } catch (err) {
      setLoginError(err.message || 'Unexpected login error.');
      setLoginSubmitting(false);
    }
  };

  // ── Regular Login Submit ──
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');

    if (!loginEmail.trim() || !loginPassword) {
      setLoginError('Please enter both your email and password.');
      return;
    }

    setLoginSubmitting(true);
    try {
      const { error } = await signIn({
        email: loginEmail.trim(),
        password: loginPassword,
      });

      if (error) {
        setLoginError(error.message || 'Invalid campus email or password.');
        return;
      }

      navigate(decodeURIComponent(nextUrl), { replace: true });
    } catch (err) {
      setLoginError(err.message || 'An unexpected sign in error occurred.');
    } finally {
      setLoginSubmitting(false);
    }
  };

  // ── Register Step 1: Send OTP ──
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setRegError('');

    if (!regName.trim()) {
      setRegError('Please enter your full name.');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setRegError('Please enter a valid campus email address.');
      return;
    }
    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters long.');
      return;
    }
    if (!regInstitutionId) {
      setRegError('Please select your campus or school.');
      return;
    }

    setRegSubmitting(true);
    // Simulate instantaneous verification code delivery
    setTimeout(() => {
      setRegSubmitting(false);
      setRegStep(2);
      setOtpSecondsLeft(599);
    }, 400);
  };

  // ── Register Step 2: Verify OTP ──
  const handleVerifyOtp = async () => {
    setRegSubmitting(true);
    setRegError('');

    try {
      const { error } = await signUp({
        email: regEmail.trim(),
        password: regPassword,
        options: {
          data: {
            display_name: regName.trim(),
            institution_id: regInstitutionId,
            course_or_class: `${regDept}, ${regYear}`,
            whatsapp_number: regPhone.trim() ? `+91${regPhone.trim().replace(/^\+91/, '')}` : '+919826000000',
          },
        },
      });

      if (error) {
        setRegError(error.message || 'Verification failed. Please try again.');
        setRegSubmitting(false);
        return;
      }

      setRegStep(3);
    } catch (err) {
      setRegError(err.message || 'Registration verification failed.');
    } finally {
      setRegSubmitting(false);
    }
  };

  // Filter institutions based on College vs School toggle
  const filteredInstitutions = institutions.filter(
    (inst) => (inst.institution_type || 'college') === studyType
  );

  return (
    <div className="auth-page">
      {/* ── LEFT COLUMN: Navy Editorial Branding ── */}
      <div className="auth-left">
        <Link to="/" className="auth-left-top" aria-label="Return to BookLoop Home">
          <svg width="34" height="34" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="8" fill="#1B2C4B" />
            <path d="M8 10C8 8.89543 8.89543 8 10 8H15V24H10C8.89543 24 8 23.1046 8 22V10Z" fill="#FFFFFF" opacity="0.9" />
            <path d="M17 8H22C23.1046 8 24 8.89543 24 10V22C24 23.1046 23.1046 24 22 24H17V8Z" fill="#F4C95D" />
            <circle cx="16" cy="16" r="3" fill="#1B2C4B" />
          </svg>
          <div className="auth-brand-text">
            Book<span>Loop</span>
          </div>
        </Link>

        <div className="auth-left-center">
          <div className="auth-tagline">
            Your campus.<br />
            Their books.<br />
            <span>Your price.</span>
          </div>

          <p className="auth-desc">
            Join your campus marketplace. Register with your campus email, verify your student identity instantly, and buy or sell textbooks with zero middleman markups.
          </p>

          <div className="auth-campus-pill">
            <span>🎓</span> Verified for Acropolis Institute &amp; Top Indore Campuses
          </div>
        </div>

        <div className="auth-left-foot">
          © {new Date().getFullYear()} BookLoop &nbsp;·&nbsp; Made for students<br />
          Developed by <strong>Kushagra Singh Tomar</strong> &amp; <strong>Bhagyesh Jain</strong>
        </div>
      </div>

      {/* ── RIGHT COLUMN: Authentication Forms ── */}
      <div className="auth-right">
        <div className="auth-right-container">
          {/* Top navigation row */}
          <div className="auth-top-nav">
            <Link to="/" className="auth-mobile-brand">
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="#243B64" />
                <path d="M8 10C8 8.89543 8.89543 8 10 8H15V24H10C8.89543 24 8 23.1046 8 22V10Z" fill="#FFFFFF" />
                <path d="M17 8H22C23.1046 8 24 8.89543 24 10V22C24 23.1046 23.1046 24 22 24H17V8Z" fill="#F4C95D" />
              </svg>
              <span>BookLoop</span>
            </Link>
            <Link to="/" className="auth-back-link">
              ← Back to Browse
            </Link>
          </div>

          {/* Heading */}
          <h1 className="auth-heading">
            {activeTab === 'login' ? 'Welcome back.' : 'Create your account.'}
          </h1>
          <p className="auth-sub">
            {activeTab === 'login'
              ? 'Log in to your campus account or choose a 1-click test persona.'
              : 'Register and verify your campus email to get started.'}
          </p>

          {/* Tabs */}
          <div className="auth-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'login'}
              className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => switchTab('login')}
            >
              Login
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'register'}
              className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => switchTab('register')}
            >
              Register
            </button>
          </div>

          {/* ════════════ LOGIN FORM ════════════ */}
          {activeTab === 'login' && (
            <div>
              <form className="auth-form" onSubmit={handleLoginSubmit}>
                {loginError && <div className="auth-error-banner">{loginError}</div>}

                <div className="auth-group">
                  <label className="auth-label" htmlFor="loginEmail">
                    Campus Email
                  </label>
                  <input
                    id="loginEmail"
                    type="email"
                    className="auth-input"
                    placeholder="yourname@campus.edu"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="auth-group">
                  <label className="auth-label" htmlFor="loginPassword">
                    Password
                  </label>
                  <input
                    id="loginPassword"
                    type="password"
                    className="auth-input"
                    placeholder="Your account password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>

                <button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={loginSubmitting}
                >
                  {loginSubmitting ? 'Logging in…' : 'Login'}
                </button>
              </form>

              {/* In-Card One-Click Demo Logins */}
              <div className="demo-logins-box">
                <div className="demo-logins-header">
                  <span>⚡</span> One-Click Demo Logins
                </div>
                <div className="demo-logins-hint">
                  Instant sign in with verified campus test accounts:
                </div>
                <div className="demo-btn-group">
                  <button
                    type="button"
                    className="demo-user-btn"
                    onClick={() => handleDemoSignIn('kushagrasingh@gmail.com', 'Demo@1234')}
                  >
                    <span className="demo-user-name">
                      <span>👤</span> Kushagra Singh Tomar
                    </span>
                    <span className="demo-user-role buyer">Buyer</span>
                  </button>

                  <button
                    type="button"
                    className="demo-user-btn"
                    onClick={() => handleDemoSignIn('bhagyeshjain@gmail.com', 'Demo@1234')}
                  >
                    <span className="demo-user-name">
                      <span>👤</span> Bhagyesh Jain
                    </span>
                    <span className="demo-user-role seller">Seller</span>
                  </button>

                  <button
                    type="button"
                    className="demo-user-btn"
                    onClick={() => handleDemoSignIn('admin@bookloop.test', 'Demo@1234')}
                  >
                    <span className="demo-user-name">
                      <span>🛡️</span> BookLoop Admin
                    </span>
                    <span className="demo-user-role admin">Admin</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ════════════ REGISTER PANEL ════════════ */}
          {activeTab === 'register' && (
            <div>
              {/* Step 1: Registration Form */}
              {regStep === 1 && (
                <form className="auth-form" onSubmit={handleSendOtp}>
                  {regError && <div className="auth-error-banner">{regError}</div>}

                  {/* "I study at" Choice */}
                  <div className="auth-group">
                    <label className="auth-label">I study at *</label>
                    <div className="study-type-pills">
                      <button
                        type="button"
                        className={`study-type-btn ${!isSchool ? 'active' : ''}`}
                        onClick={() => handleStudyTypeChange('college')}
                      >
                        🎓 College / University
                      </button>
                      <button
                        type="button"
                        className={`study-type-btn ${isSchool ? 'active' : ''}`}
                        onClick={() => handleStudyTypeChange('school')}
                      >
                        🏫 School
                      </button>
                    </div>
                  </div>

                  {/* Name and Stream/Department */}
                  <div className="auth-grid-2">
                    <div className="auth-group">
                      <label className="auth-label" htmlFor="regName">
                        Full Name *
                      </label>
                      <input
                        id="regName"
                        type="text"
                        className="auth-input"
                        placeholder="e.g. Rahul Sharma"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="auth-group">
                      <label className="auth-label" htmlFor="regDept">
                        {isSchool ? 'Stream / Subject *' : 'Department *'}
                      </label>
                      <select
                        id="regDept"
                        className="auth-select"
                        value={regDept}
                        onChange={(e) => setRegDept(e.target.value)}
                        required
                      >
                        {isSchool ? (
                          <>
                            <option value="Science (PCM)">Science (PCM)</option>
                            <option value="Science (PCB)">Science (PCB)</option>
                            <option value="Commerce">Commerce</option>
                            <option value="Humanities / Arts">Humanities / Arts</option>
                            <option value="General (Class 6-10)">General (Class 6-10)</option>
                            <option value="Other">Other</option>
                          </>
                        ) : (
                          <>
                            <option value="CSE">CSE</option>
                            <option value="IT">IT</option>
                            <option value="ECE">ECE</option>
                            <option value="EEE">EEE</option>
                            <option value="MECH">MECH</option>
                            <option value="CIVIL">CIVIL</option>
                            <option value="Management / MBA">Management / MBA</option>
                            <option value="Other">Other</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>

                  {/* Institution Dropdown */}
                  <div className="auth-group">
                    <label className="auth-label" htmlFor="regInstitution">
                      {isSchool ? 'School Name *' : 'College / University *'}
                    </label>
                    <select
                      id="regInstitution"
                      className="auth-select"
                      value={regInstitutionId}
                      onChange={(e) => setRegInstitutionId(e.target.value)}
                      required
                    >
                      <option value="">{isSchool ? 'Select your School' : 'Select your College / University'}</option>
                      {filteredInstitutions.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.name} {inst.city ? `(${inst.city})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Year / Class & WhatsApp */}
                  <div className="auth-grid-2">
                    <div className="auth-group">
                      <label className="auth-label" htmlFor="regYear">
                        {isSchool ? 'Class / Grade *' : 'Year *'}
                      </label>
                      <select
                        id="regYear"
                        className="auth-select"
                        value={regYear}
                        onChange={(e) => setRegYear(e.target.value)}
                        required
                      >
                        {isSchool ? (
                          <>
                            <option value="Class 12">Class 12</option>
                            <option value="Class 11">Class 11</option>
                            <option value="Class 10">Class 10</option>
                            <option value="Class 9">Class 9</option>
                            <option value="Class 8 & below">Class 8 & below</option>
                          </>
                        ) : (
                          <>
                            <option value="1st Year">1st Year</option>
                            <option value="2nd Year">2nd Year</option>
                            <option value="3rd Year">3rd Year</option>
                            <option value="4th Year">4th Year</option>
                            <option value="Postgraduate">Postgraduate</option>
                          </>
                        )}
                      </select>
                    </div>
                    <div className="auth-group">
                      <label className="auth-label" htmlFor="regPhone">
                        WhatsApp Number
                      </label>
                      <input
                        id="regPhone"
                        type="tel"
                        className="auth-input"
                        placeholder="10-digit number"
                        maxLength="10"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>
                  </div>

                  {/* Email & Password */}
                  <div className="auth-group">
                    <label className="auth-label" htmlFor="regEmail">
                      {isSchool ? 'Student or Parent Email *' : 'Campus Email *'}
                    </label>
                    <input
                      id="regEmail"
                      type="email"
                      className="auth-input"
                      placeholder={isSchool ? 'student@school.edu or yourname@gmail.com' : 'yourname@campus.edu'}
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>

                  <div className="auth-group">
                    <label className="auth-label" htmlFor="regPassword">
                      Password *
                    </label>
                    <input
                      id="regPassword"
                      type="password"
                      className="auth-input"
                      placeholder="Min. 6 characters"
                      minLength="6"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                  </div>

                  <button
                    type="submit"
                    className="auth-submit-btn"
                    disabled={regSubmitting}
                  >
                    {regSubmitting ? 'Sending Verification…' : 'Send Verification Code →'}
                  </button>
                </form>
              )}

              {/* Step 2: OTP Verification */}
              {regStep === 2 && (
                <div className="otp-panel">
                  <button
                    type="button"
                    className="otp-back-btn"
                    onClick={() => setRegStep(1)}
                  >
                    ← Back to form
                  </button>

                  <p style={{ fontSize: '0.9rem', color: 'var(--color-muted)', marginBottom: '8px' }}>
                    Enter the 6-digit code sent to <strong>{regEmail}</strong>
                  </p>

                  {/* Demo Mode OTP Box */}
                  <div className="otp-demo-box">
                    <div className="otp-demo-label">Demo Mode — Your OTP</div>
                    <div className="otp-demo-code">{DEMO_OTP}</div>
                    <div className="otp-demo-note">Instant campus verification enabled — code prefilled below</div>
                  </div>

                  {/* 6 Digit Inputs */}
                  <div className="otp-inputs">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        id={`otp-${idx}`}
                        className="otp-digit"
                        maxLength="1"
                        inputMode="numeric"
                        value={digit}
                        onChange={(e) => {
                          const val = e.target.value.slice(-1);
                          const next = [...otpDigits];
                          next[idx] = val;
                          setOtpDigits(next);
                          if (val && idx < 5) {
                            document.getElementById(`otp-${idx + 1}`)?.focus();
                          }
                        }}
                      />
                    ))}
                  </div>

                  <div className="otp-timer">
                    Code expires in <span>{formatTimer(otpSecondsLeft)}</span> &nbsp;·&nbsp;
                    <button
                      type="button"
                      className="otp-resend-btn"
                      onClick={() => setOtpSecondsLeft(599)}
                    >
                      Resend
                    </button>
                  </div>

                  {regError && <div className="auth-error-banner">{regError}</div>}

                  <button
                    type="button"
                    className="auth-submit-btn"
                    onClick={handleVerifyOtp}
                    disabled={regSubmitting}
                  >
                    {regSubmitting ? 'Verifying Account…' : 'Verify & Create Account'}
                  </button>
                </div>
              )}

              {/* Step 3: Success State */}
              {regStep === 3 && (
                <div className="reg-success-panel">
                  <div className="reg-success-icon">🎉</div>
                  <div className="reg-success-title">You're in!</div>
                  <p className="reg-success-sub">
                    Your campus account has been verified and created successfully.<br />
                    Welcome to the BookLoop student community!
                  </p>
                  <button
                    type="button"
                    className="auth-submit-btn"
                    onClick={() => navigate(decodeURIComponent(nextUrl), { replace: true })}
                  >
                    Continue to Marketplace →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
