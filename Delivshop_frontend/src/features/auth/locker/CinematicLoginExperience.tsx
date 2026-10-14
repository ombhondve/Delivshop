import React, { useState, useRef } from 'react';
import { Eye, EyeOff, Lock, Mail, KeyRound, Loader2, ShieldAlert } from 'lucide-react';
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Please enter your operator identifier.');
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
      setErrorMessage('Please enter your security access key.');
      passwordInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await api.auth.login({ email: trimmedEmail, password });
      setAuthenticatedUser(res.user);
      onAuthenticated?.();
    } catch (err: any) {
      const rawMsg = err?.message || '';
      if (
        rawMsg.includes('relation') ||
        rawMsg.includes('SQL') ||
        rawMsg.includes('database') ||
        rawMsg.includes('connect')
      ) {
        setErrorMessage('Security database service temporarily unreachable.');
      } else {
        setErrorMessage(rawMsg || 'Invalid operator identifier or security key.');
      }
      setIsSubmitting(false);
      setPassword('');
      setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 150);
    }
  };

  return (
    <div className="secure-vault-login-screen">
      <div className="secure-vault-card" role="main">
        {/* Header */}
        <div className="vault-header">
          <div className="terminal-tag">
            <span className="cyan-status-dot" aria-hidden="true" />
            <span className="terminal-id">TERMINAL ID: DLV-SEC-01</span>
          </div>
          <div className="logistics-badge">LOGISTICS GATEWAY</div>
        </div>

        {/* Title & Subtitle */}
        <div className="vault-title-group">
          <h1 className="vault-title">DELIVSHOP SECURE VAULT</h1>
          <p className="vault-subtitle">Enter credentials to unlock facility operations</p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="vault-alert" role="alert" aria-live="assertive">
            <ShieldAlert size={16} className="alert-icon" />
            <span className="alert-text">{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="vault-login-form" noValidate>
          {/* Operator Identifier (Email) */}
          <div className="vault-input-group">
            <label htmlFor="operator-email" className="vault-label">
              OPERATOR IDENTIFIER
            </label>
            <div className="vault-input-wrapper">
              <Mail size={16} className="vault-input-icon" aria-hidden="true" />
              <input
                id="operator-email"
                ref={emailInputRef}
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                disabled={isSubmitting}
                placeholder="admin@gmail.com"
                autoComplete="email"
                required
                className="vault-input-field"
              />
            </div>
          </div>

          {/* Security Access Key (Password) */}
          <div className="vault-input-group">
            <label htmlFor="security-key" className="vault-label">
              SECURITY ACCESS KEY
            </label>
            <div className="vault-input-wrapper">
              <Lock size={16} className="vault-input-icon" aria-hidden="true" />
              <input
                id="security-key"
                ref={passwordInputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                disabled={isSubmitting}
                placeholder="••••••••••••"
                autoComplete="current-password"
                required
                className="vault-input-field"
              />
              <button
                type="button"
                className="vault-eye-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide security key' : 'Show security key'}
                tabIndex={0}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`vault-unlock-button ${isSubmitting ? 'is-loading' : ''}`}
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

        {/* Footer */}
        <div className="vault-card-footer">
          <span>ENCRYPTED HARDWARE ACCESS • TLS 1.3</span>
        </div>
      </div>
    </div>
  );
};
