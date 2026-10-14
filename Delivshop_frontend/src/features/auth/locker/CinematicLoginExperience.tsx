import React, { useState, useEffect, useRef, useCallback } from 'react';
import { IndustrialVaultScene } from './IndustrialVaultScene';
import { VaultTelemetry } from './types';
import { api } from '../../../services/api/endpoints';
import { useAuth } from '../AuthContext';
import { User } from '../../../types';
import {
  Shield,
  Eye,
  EyeOff,
  Lock,
  Mail,
  KeyRound,
  Loader2,
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
  Repeat,
  Compass,
  Sliders,
  Maximize2,
} from 'lucide-react';

interface CinematicLoginExperienceProps {
  onAuthenticated?: () => void;
}

export const CinematicLoginExperience: React.FC<CinematicLoginExperienceProps> = ({ onAuthenticated }) => {
  const { setAuthenticatedUser } = useAuth();

  // Animation timeline state
  const [currentTime, setCurrentTime] = useState(0.0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLooping, setIsLooping] = useState(false);
  const [showGuides, setShowGuides] = useState(false);
  const [cleanPlate, setCleanPlate] = useState(false);
  const [showTimelineControls, setShowTimelineControls] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hasWebGL, setHasWebGL] = useState(true);

  // Form & Auth state
  const [email, setEmail] = useState('admin@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Telemetry from 3D scene
  const [telemetry, setTelemetry] = useState<VaultTelemetry>({
    currentTime: 0.0,
    phaseLabel: 'PHASE A: INITIAL LOCKED STATE (0.0–1.5s)',
    wheelDeg: 0,
    boltRetractMm: 0,
    doorAngleDeg: 0,
    angularVelDegPerSec: 0,
    boltRetractPercent: 100,
    isUnlocked: false,
    isDoorOpen: false,
  });

  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const authedUserRef = useRef<User | null>(null);

  // Check prefers-reduced-motion and WebGL capability
  useEffect(() => {
    try {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mediaQuery.matches) {
        setReducedMotion(true);
      }
    } catch {
      // mediaQuery fallback
    }

    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setHasWebGL(false);
      }
    } catch {
      setHasWebGL(false);
    }
  }, []);

  // Keyboard shortcut: H for Clean Plate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'h' || e.key === 'H') && document.activeElement?.tagName !== 'INPUT') {
        setCleanPlate((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleContextLost = useCallback(() => {
    setHasWebGL(false);
  }, []);

  const handleTelemetryUpdate = useCallback((t: VaultTelemetry) => {
    setTelemetry(t);
    setCurrentTime(t.currentTime);
  }, []);

  const handleAnimationComplete = useCallback(() => {
    if (isSuccess && authedUserRef.current) {
      setIsFadingOut(true);
      setTimeout(() => {
        if (authedUserRef.current) {
          setAuthenticatedUser(authedUserRef.current);
          onAuthenticated?.();
        }
      }, 750);
    }
  }, [isSuccess, onAuthenticated, setAuthenticatedUser]);

  // Handle Login Submission with real authentication
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isSuccess) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Please enter your authorization email identifier.');
      emailInputRef.current?.focus();
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your cryptographic vault key.');
      passwordInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await api.auth.login({ email: trimmedEmail, password });
      authedUserRef.current = res.user;
      setIsSuccess(true);

      // Trigger the unsealing sequence starting from unlocking
      if (currentTime < 1.5) {
        setCurrentTime(1.5);
      }
      setIsPlaying(true);
      setIsLooping(false);

      // Transition smoothly into dashboard once the door has opened
      setTimeout(() => {
        setIsFadingOut(true);
        setTimeout(() => {
          if (authedUserRef.current) {
            setAuthenticatedUser(authedUserRef.current);
            onAuthenticated?.();
          }
        }, 800);
      }, 7000);
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
        setErrorMessage(rawMsg || 'Invalid email or security password.');
      }
      setIsSubmitting(false);
      setPassword('');
      setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 200);
    }
  };

  // Status pill calculation
  let statusBadge = {
    label: 'LOCKED',
    colorClass: 'vault-badge-locked',
  };
  if (isSuccess) {
    if (telemetry.currentTime < 3.5) {
      statusBadge = { label: 'DISENGAGING BOLTS', colorClass: 'vault-badge-unlocking' };
    } else if (telemetry.currentTime < 9.0) {
      statusBadge = { label: 'OPENING VAULT', colorClass: 'vault-badge-opening' };
    } else {
      statusBadge = { label: 'UNSEALED // READY', colorClass: 'vault-badge-ready' };
    }
  } else if (telemetry.isDoorOpen) {
    statusBadge = { label: 'UNSEALED // INSPECT', colorClass: 'vault-badge-ready' };
  } else if (telemetry.isUnlocked) {
    statusBadge = { label: 'BOLTS RETRACTED', colorClass: 'vault-badge-unlocking' };
  }

  return (
    <div className={`cinematic-login-wrapper ${cleanPlate ? 'clean-plate-mode' : ''}`}>
      {/* 3D WebGL Industrial Vault Canvas */}
      {hasWebGL ? (
        <IndustrialVaultScene
          currentTime={currentTime}
          isPlaying={isPlaying}
          isLooping={isLooping}
          showGuides={showGuides}
          reducedMotion={reducedMotion}
          onTelemetryUpdate={handleTelemetryUpdate}
          onAnimationComplete={handleAnimationComplete}
          onContextLost={handleContextLost}
        />
      ) : (
        <div className="webgl-fallback-container">
          <div className="fallback-card">
            <AlertCircle size={32} color="#f59e0b" style={{ margin: '0 auto 12px auto' }} />
            <h2>Industrial Vault Simulation</h2>
            <p>WebGL hardware rendering unavailable. Operating in standard security mode.</p>
          </div>
        </div>
      )}

      {/* Top Technical Header Bar (UI Layer) */}
      <div className="vault-top-header ui-layer">
        <div className="header-left">
          <div className="status-dot-idle" />
          <span className="mono text-title">DELIVSHOP // ARCH-SEC VAULT 04 — RIGID KINEMATICS ENGINE</span>
          <span className="phase-pill mono">{telemetry.phaseLabel}</span>
        </div>

        <div className="header-right">
          {/* Toggle Guides */}
          <button
            type="button"
            className="vault-control-btn mono"
            onClick={() => setShowGuides(!showGuides)}
            title="Toggle Engineering Hinge Axis & Swing Arc Vector"
          >
            <Compass size={13} />
            <span>Hinge Axis Vector</span>
            <span className={`toggle-dot ${showGuides ? 'is-active' : ''}`} />
          </button>

          {/* Toggle Scrubber Panel */}
          <button
            type="button"
            className="vault-control-btn mono"
            onClick={() => setShowTimelineControls(!showTimelineControls)}
            title="Toggle Timeline Scrubber & Mechanical Readout"
          >
            <Sliders size={13} />
            <span>Timeline HUD</span>
            <span className={`toggle-dot ${showTimelineControls ? 'is-active' : ''}`} />
          </button>

          {/* Clean Plate Toggle */}
          <button
            type="button"
            className="vault-control-btn mono clean-plate-btn"
            onClick={() => setCleanPlate(true)}
            title="Hide all UI overlays for pure architectural plate (Shortcut: H)"
          >
            <Maximize2 size={13} />
            <span>Clean Plate [H]</span>
          </button>
        </div>
      </div>

      {/* LEFT SIDE: DELIVSHOP High-Security Logistics Login Panel */}
      <div className="vault-login-panel-container ui-layer">
        <div className="vault-glass-panel">
          {/* Header */}
          <div className="panel-header">
            <div>
              <div className="brand-group">
                <Shield size={16} className="brand-icon" />
                <span className="brand-name">DELIVSHOP</span>
              </div>
              <p className="panel-sub mono">HIGH-SECURITY LOGISTICS TERMINAL</p>
            </div>
            <span className={`status-badge mono ${statusBadge.colorClass}`}>{statusBadge.label}</span>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="vault-error-alert" role="alert">
              <AlertCircle size={15} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Real Authentication Form */}
          <form onSubmit={handleLoginSubmit} className="vault-auth-form" noValidate>
            <div className="form-group">
              <label htmlFor="locker-email" className="mono form-label">
                OPERATOR IDENTIFIER
              </label>
              <div className="input-wrapper">
                <Mail size={15} className="input-icon" />
                <input
                  id="locker-email"
                  ref={emailInputRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@gmail.com"
                  autoComplete="email"
                  required
                  disabled={isSubmitting || isSuccess}
                  className="vault-input mono"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="locker-password" className="mono form-label">
                CRYPTOGRAPHIC VAULT KEY
              </label>
              <div className="input-wrapper">
                <Lock size={15} className="input-icon" />
                <input
                  id="locker-password"
                  ref={passwordInputRef}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                  disabled={isSubmitting || isSuccess}
                  className="vault-input mono"
                />
                <button
                  type="button"
                  className="pwd-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide security key' : 'Show security key'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Live Mechanical Telemetry Sub-box */}
            <div className="telemetry-box">
              <div className="telemetry-row mono">
                <span className="telemetry-label">LEFT HINGE AXIS:</span>
                <span className="telemetry-value-green">FIXED VERTICAL (0.00mm DRIFT)</span>
              </div>
              <div className="telemetry-row mono">
                <span className="telemetry-label">RADIAL BOLTS (8x):</span>
                <span className="telemetry-value-white">
                  {telemetry.isUnlocked ? '0.0% (DISENGAGED)' : `${telemetry.boltRetractPercent.toFixed(1)}% ENGAGED`}
                </span>
              </div>
              <div className="telemetry-row mono">
                <span className="telemetry-label">DOOR SWING ARC:</span>
                <span className="telemetry-value-white">{telemetry.doorAngleDeg.toFixed(2)}° / 25.00°</span>
              </div>
            </div>

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={isSubmitting || isSuccess}
              className={`vault-submit-btn ${isSubmitting ? 'is-loading' : ''} ${isSuccess ? 'is-success' : ''}`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="spin-icon" />
                  <span>VERIFYING CLEARANCE...</span>
                </>
              ) : isSuccess ? (
                <>
                  <KeyRound size={16} />
                  <span>AUTHORIZATION GRANTED • UNSEALING</span>
                </>
              ) : (
                <>
                  <KeyRound size={16} />
                  <span>AUTHORIZE & UNSEAL VAULT</span>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="panel-footer mono">
            <span>CAM: 50MM EYE-LEVEL</span>
            <span>RIGID CAD HIERARCHY</span>
          </div>
        </div>
      </div>

      {/* Bottom 10-Second Precision Timeline Controller (UI Layer) */}
      {showTimelineControls && (
        <div className="vault-bottom-timeline ui-layer">
          <div className="timeline-container">
            {/* Phase breakdown bar */}
            <div className="phase-indicator-grid mono">
              <div className="phase-cell col-hold">
                <span className="phase-text">0.0–1.5s: HOLD</span>
                <div className={`phase-seg ${telemetry.currentTime < 1.5 ? 'is-active' : ''}`} />
              </div>
              <div className="phase-cell col-unlock">
                <span className="phase-text">1.5–3.0s: UNLOCK</span>
                <div
                  className={`phase-seg ${
                    telemetry.currentTime >= 1.5 && telemetry.currentTime < 3.0 ? 'is-active' : ''
                  }`}
                />
              </div>
              <div className="phase-cell col-pause">
                <span className="phase-text">3–3.5s</span>
                <div
                  className={`phase-seg ${
                    telemetry.currentTime >= 3.0 && telemetry.currentTime < 3.5 ? 'is-active' : ''
                  }`}
                />
              </div>
              <div className="phase-cell col-swing">
                <span className="phase-text">3.5–7.5s: CONTROLLED HINGE OPENING</span>
                <div
                  className={`phase-seg ${
                    telemetry.currentTime >= 3.5 && telemetry.currentTime < 7.5 ? 'is-active' : ''
                  }`}
                />
              </div>
              <div className="phase-cell col-stop">
                <span className="phase-text">7.5–9.0s: STOP</span>
                <div
                  className={`phase-seg ${
                    telemetry.currentTime >= 7.5 && telemetry.currentTime < 9.0 ? 'is-active' : ''
                  }`}
                />
              </div>
              <div className="phase-cell col-hold-end">
                <span className="phase-text">9.0–10.0s: HOLD</span>
                <div className={`phase-seg ${telemetry.currentTime >= 9.0 ? 'is-active' : ''}`} />
              </div>
            </div>

            {/* Scrubber Range Slider */}
            <input
              type="range"
              min="0"
              max="10"
              step="0.01"
              value={currentTime}
              onChange={(e) => {
                setIsPlaying(false);
                setCurrentTime(parseFloat(e.target.value));
              }}
              className="timeline-slider"
              aria-label="Vault animation timeline scrubber"
            />

            {/* Transport Controls & Real-Time Readout */}
            <div className="transport-row">
              <div className="transport-buttons">
                <button
                  type="button"
                  className="transport-btn play-btn mono"
                  onClick={() => {
                    if (currentTime >= 10.0) setCurrentTime(0.0);
                    setIsPlaying(!isPlaying);
                  }}
                >
                  {isPlaying ? (
                    <>
                      <Pause size={12} />
                      <span>PAUSE</span>
                    </>
                  ) : (
                    <>
                      <Play size={12} />
                      <span>PLAY</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="transport-btn sec-btn mono"
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentTime(0.0);
                  }}
                >
                  <RotateCcw size={12} />
                  <span>RESET</span>
                </button>

                <button
                  type="button"
                  className={`transport-btn sec-btn mono ${isLooping ? 'is-toggled' : ''}`}
                  onClick={() => setIsLooping(!isLooping)}
                >
                  <Repeat size={12} />
                  <span>LOOP: {isLooping ? 'ON' : 'OFF'}</span>
                </button>

                <div className="timecode-display mono">
                  <span className="time-val">{currentTime.toFixed(2)}s</span>
                  <span className="time-max"> / 10.00s</span>
                </div>
              </div>

              {/* Rigid-Body Telemetry Readouts */}
              <div className="rigid-body-readout mono">
                <div>
                  <span className="readout-label">WHEEL SHAFT: </span>
                  <span className="readout-val">{telemetry.wheelDeg.toFixed(1)}°</span>
                </div>
                <div className="readout-sep" />
                <div>
                  <span className="readout-label">BOLT RETRACT: </span>
                  <span className="readout-val">{telemetry.boltRetractMm.toFixed(1)} mm</span>
                </div>
                <div className="readout-sep" />
                <div>
                  <span className="readout-label">HINGE SWING: </span>
                  <span className="readout-val">{telemetry.doorAngleDeg.toFixed(2)}°</span>
                </div>
                <div className="readout-sep" />
                <div>
                  <span className="readout-label">ANGULAR VEL: </span>
                  <span className="readout-val">{telemetry.angularVelDegPerSec.toFixed(2)} °/s</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Restore Controls Button (Clean Plate mode) */}
      {cleanPlate && (
        <button
          type="button"
          className="clean-plate-restore-btn mono"
          onClick={() => setCleanPlate(false)}
          title="Restore UI Controls (Shortcut: H)"
        >
          <span>Restore Controls [H]</span>
        </button>
      )}

      {/* Smooth Transition Curtain into the Dashboard */}
      <div className={`dashboard-transition-curtain ${isFadingOut ? 'is-faded' : ''}`} />
    </div>
  );
};
