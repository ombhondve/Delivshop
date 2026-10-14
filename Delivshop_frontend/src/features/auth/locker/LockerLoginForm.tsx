import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, Lock, Mail, ShieldAlert, KeyRound, Loader2 } from 'lucide-react';
import { LockerState } from './types';

interface LockerLoginFormProps {
  lockerState: LockerState;
  onSubmit: (credentials: { email: string; password: string }) => Promise<void>;
  errorMessage: string | null;
  onClearError?: () => void;
  isSubmitting: boolean;
}

export const LockerLoginForm: React.FC<LockerLoginFormProps> = ({
  lockerState,
  onSubmit,
  errorMessage,
  onClearError,
  isSubmitting,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  const passwordInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Focus management on camera return / error
  useEffect(() => {
    if (lockerState === 'login-close-up' || lockerState === 'camera-return') {
      if (errorMessage) {
        // Clear password and refocus
        setPassword('');
        setTimeout(() => {
          passwordInputRef.current?.focus();
        }, 300);
      }
    }
  }, [lockerState, errorMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!email.trim()) {
      setClientError('Please enter your authorization email.');
      emailInputRef.current?.focus();
      return;
    }
    if (!password) {
      setClientError('Please enter your access key / password.');
      passwordInputRef.current?.focus();
      return;
    }

    setClientError(null);
    if (onClearError) onClearError();

    await onSubmit({ email: email.trim(), password });
  };

  const isFormVisible = lockerState === 'login-close-up' || lockerState === 'camera-return';
  const displayError = clientError || errorMessage;

  return (
    <div
      className={`locker-form-container ${isFormVisible ? 'is-visible' : 'is-hidden'}`}
      style={{
        transition: 'opacity 0.4s ease, transform 0.4s ease',
        opacity: isFormVisible ? 1 : 0,
        pointerEvents: isFormVisible ? 'auto' : 'none',
        transform: isFormVisible ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.97)',
      }}
    >
      <div className="locker-panel-bezel">
        {/* Terminal Header */}
        <div className="locker-panel-header">
          <div className="locker-status-tag">
            <span className="status-dot-idle" />
            <span>TERMINAL ID: DLV-SEC-01</span>
          </div>
          <div className="locker-badge">LOGISTICS GATEWAY</div>
        </div>

        <div className="locker-panel-title-group">
          <h1 className="locker-panel-title">DELIVSHOP SECURE VAULT</h1>
          <p className="locker-panel-subtitle">Enter credentials to unlock facility operations</p>
        </div>

        {displayError && (
          <div className="locker-alert" role="alert" aria-live="assertive">
            <ShieldAlert size={18} className="alert-icon" />
            <span className="alert-text">{displayError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="locker-form" noValidate>
          {/* Email Field */}
          <div className="locker-input-group">
            <label htmlFor="locker-email" className="locker-label">
              OPERATOR IDENTIFIER
            </label>
            <div className="input-wrapper">
              <Mail size={16} className="input-icon" />
              <input
                id="locker-email"
                ref={emailInputRef}
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (clientError) setClientError(null);
                  if (onClearError) onClearError();
                }}
                disabled={isSubmitting}
                placeholder="operator@delivshop.com"
                autoComplete="email"
                required
                className="locker-input"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="locker-input-group">
            <label htmlFor="locker-password" className="locker-label">
              SECURITY ACCESS KEY
            </label>
            <div className="input-wrapper">
              <Lock size={16} className="input-icon" />
              <input
                id="locker-password"
                ref={passwordInputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (clientError) setClientError(null);
                  if (onClearError) onClearError();
                }}
                disabled={isSubmitting}
                placeholder="••••••••••••"
                autoComplete="current-password"
                required
                className="locker-input"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide security key' : 'Show security key'}
                tabIndex={0}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`locker-submit-btn ${isSubmitting ? 'is-authenticating' : ''}`}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="spin-icon" />
                <span>VERIFYING CLEARANCE...</span>
              </>
            ) : (
              <>
                <KeyRound size={16} />
                <span>UNLOCK VAULT PORTAL</span>
              </>
            )}
          </button>
        </form>

        <div className="locker-panel-footer">
          <span>ENCRYPTED HARDWARE ACCESS • TLS 1.3</span>
        </div>
      </div>
    </div>
  );
};
