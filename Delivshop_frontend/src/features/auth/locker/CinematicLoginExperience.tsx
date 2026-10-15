import React, { useState, useRef } from 'react';
import {
  Milk,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../../../services/api/endpoints';
import { useAuth } from '../AuthContext';

interface CinematicLoginExperienceProps {
  onAuthenticated?: () => void;
}

export const CinematicLoginExperience: React.FC<CinematicLoginExperienceProps> = ({ onAuthenticated }) => {
  const { setAuthenticatedUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authStatus !== 'idle') return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Please enter your operator email address.');
      emailInputRef.current?.focus();
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid operator email address.');
      emailInputRef.current?.focus();
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your security access password.');
      passwordInputRef.current?.focus();
      return;
    }

    setAuthStatus('loading');
    setErrorMessage(null);

    try {
      // 1. Authenticate with real backend endpoint
      const res = await api.auth.login({ email: trimmedEmail, password });

      // 2. Trigger brief emerald success confirmation
      setAuthStatus('success');

      // 3. Smooth transition to dashboard after brief visual feedback (380ms)
      setTimeout(() => {
        setAuthenticatedUser(res.user);
        onAuthenticated?.();
      }, 380);
    } catch (err: any) {
      const rawMsg = err?.message || '';
      if (err?.status === 0 || rawMsg.includes('Unable to connect') || rawMsg.includes('Failed to fetch')) {
        setErrorMessage('Unable to reach Delivshop API. Please ensure the backend server is online.');
      } else if (
        rawMsg.includes('relation') ||
        rawMsg.includes('SQL') ||
        rawMsg.includes('database')
      ) {
        setErrorMessage('Security database service temporarily unreachable.');
      } else if (err?.status === 503) {
        setErrorMessage(rawMsg || 'Backend service is currently initializing or undergoing maintenance.');
      } else if (err?.status === 401 || rawMsg.includes('Invalid') || rawMsg.includes('credentials')) {
        setErrorMessage('Invalid operator credentials or unauthorized access.');
      } else {
        setErrorMessage(rawMsg || 'Authentication failed. Please verify your credentials and try again.');
      }
      setAuthStatus('idle');
      setPassword('');
      setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 150);
    }
  };

  return (
    <div className="login-screen-wrapper">
      <div
        className={`login-card-container ${authStatus === 'success' ? 'login-card-success-fade' : ''}`}
        role="main"
      >
        {/* Brand Header */}
        <div className="login-brand-header">
          <div className="login-brand-logo-box">
            <Milk size={24} className="text-white" />
          </div>
          <div className="login-brand-text">
            <span className="login-brand-title">DELIVSHOP</span>
            <span className="login-brand-subtitle">DAIRY DISTRIBUTION MANAGEMENT</span>
          </div>
        </div>

        {/* Security Badge Pill */}
        <div className="login-security-pill">
          <ShieldCheck size={14} className="text-emerald" />
          <span>PORTAL AUTHENTICATION GATEWAY</span>
        </div>

        {/* Welcome Title */}
        <div className="login-title-group">
          <h1 className="login-heading">Sign In to Dashboard</h1>
          <p className="login-subheading">
            Enter your operator credentials to access dispatch, fleet routes, and shop management
          </p>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="login-alert-box" role="alert" aria-live="assertive">
            <AlertCircle size={16} className="login-alert-icon" />
            <span className="login-alert-text">{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form-body" noValidate>
          {/* Email / Operator Identifier */}
          <div className="login-field-group">
            <label htmlFor="operator-email" className="login-field-label">
              OPERATOR EMAIL
            </label>
            <div className="login-input-wrapper">
              <Mail size={16} className="login-field-icon" aria-hidden="true" />
              <input
                id="operator-email"
                ref={emailInputRef}
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                disabled={authStatus !== 'idle'}
                placeholder="admin@gmail.com"
                autoComplete="email"
                required
                className="login-input-control"
              />
            </div>
          </div>

          {/* Password / Access Key */}
          <div className="login-field-group">
            <label htmlFor="security-key" className="login-field-label">
              SECURITY PASSWORD
            </label>
            <div className="login-input-wrapper">
              <Lock size={16} className="login-field-icon" aria-hidden="true" />
              <input
                id="security-key"
                ref={passwordInputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                disabled={authStatus !== 'idle'}
                placeholder="••••••••••••"
                autoComplete="current-password"
                required
                className="login-input-control"
              />
              <button
                type="button"
                className="login-eye-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={0}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={authStatus !== 'idle'}
            className={`login-action-btn ${
              authStatus === 'loading'
                ? 'is-loading'
                : authStatus === 'success'
                ? 'is-success'
                : ''
            }`}
          >
            {authStatus === 'loading' ? (
              <>
                <Loader2 size={16} className="spin-icon" />
                <span>Verifying Credentials...</span>
              </>
            ) : authStatus === 'success' ? (
              <>
                <CheckCircle2 size={16} className="login-check-icon" />
                <span>Access Granted • Entering Dashboard</span>
              </>
            ) : (
              <>
                <span>Sign In to Portal</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Security Footer */}
        <div className="login-card-footer">
          <span>TLS 1.3 ENCRYPTED • VERIFIED OPERATOR SESSION</span>
        </div>
      </div>
    </div>
  );
};
