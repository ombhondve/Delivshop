import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LockerScene } from './LockerScene';
import { LockerLoginForm } from './LockerLoginForm';
import { LockerState } from './types';
import { api } from '../../../services/api/endpoints';
import { useAuth } from '../AuthContext';
import { User } from '../../../types';
import { Shield, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

interface CinematicLoginExperienceProps {
  onAuthenticated?: () => void;
}

export const CinematicLoginExperience: React.FC<CinematicLoginExperienceProps> = ({ onAuthenticated }) => {
  const { setAuthenticatedUser } = useAuth();
  const [lockerState, setLockerState] = useState<LockerState>('login-close-up');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hasWebGL, setHasWebGL] = useState(true);

  // Safeguard against overlapping or stale submissions
  const activeSubmissionRef = useRef(false);
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

    // WebGL availability check
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

  const handleContextLost = useCallback(() => {
    setHasWebGL(false);
  }, []);

  const handleLoginSubmit = async (credentials: { email: string; password: string }) => {
    if (activeSubmissionRef.current) return;
    activeSubmissionRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    // Transition to camera pullback immediately while request fires
    setLockerState('camera-pullback');

    const startTime = Date.now();
    const minPullbackDuration = reducedMotion ? 200 : 1200;

    let loginError: string | null = null;
    try {
      const res = await api.auth.login(credentials);
      authedUserRef.current = res.user;
    } catch (err: any) {
      loginError = err?.message || 'Access Denied: Invalid credentials or authorization token.';
    }

    // Ensure camera pullback finishes smoothly before next state
    const elapsed = Date.now() - startTime;
    if (elapsed < minPullbackDuration) {
      await new Promise((resolve) => setTimeout(resolve, minPullbackDuration - elapsed));
    }

    if (loginError) {
      // STATE D: INCORRECT PASSWORD
      setLockerState('authentication-failed');
      setErrorMessage(loginError);

      const lingerDuration = reducedMotion ? 200 : 700;
      await new Promise((resolve) => setTimeout(resolve, lingerDuration));

      // Return camera smoothly to close-up
      setLockerState('camera-return');
      const returnDuration = reducedMotion ? 200 : 1100;
      await new Promise((resolve) => setTimeout(resolve, returnDuration));

      setLockerState('login-close-up');
      setIsSubmitting(false);
      activeSubmissionRef.current = false;
      return;
    }

    // STATE E: SUCCESSFUL AUTHENTICATION
    setLockerState('authentication-success');
    await new Promise((resolve) => setTimeout(resolve, reducedMotion ? 100 : 500));

    // Retract locking bolts
    setLockerState('unlocking');
    await new Promise((resolve) => setTimeout(resolve, reducedMotion ? 200 : 800));

    // STATE F: DOOR OPENS
    setLockerState('door-opening');
    await new Promise((resolve) => setTimeout(resolve, reducedMotion ? 300 : 1200));

    // STATE G: PERSON ENTERS ROOM & CAMERA TRACKS FORWARD
    setLockerState('entering-room');
    await new Promise((resolve) => setTimeout(resolve, reducedMotion ? 300 : 1500));

    // STATE H: TRANSITION INTO REAL DASHBOARD
    setLockerState('dashboard-transition');
    await new Promise((resolve) => setTimeout(resolve, reducedMotion ? 200 : 800));

    setLockerState('dashboard-ready');
    if (authedUserRef.current) {
      setAuthenticatedUser(authedUserRef.current);
    }
    activeSubmissionRef.current = false;
    if (onAuthenticated) {
      onAuthenticated();
    }
  };

  return (
    <div className="cinematic-login-wrapper">
      {/* 3D Scene or WebGL Fallback */}
      {hasWebGL ? (
        <LockerScene
          lockerState={lockerState}
          reducedMotion={reducedMotion}
          onContextLost={handleContextLost}
        />
      ) : (
        <div className="webgl-fallback-container">
          <div className="fallback-card">
            <AlertCircle size={32} color="#f59e0b" />
            <h2>Industrial Vault Terminal</h2>
            <p>Hardware WebGL acceleration unavailable. Operating in standard security mode.</p>
          </div>
        </div>
      )}

      {/* HTML Form Overlay (positioned over close-up access panel) */}
      <LockerLoginForm
        lockerState={lockerState}
        onSubmit={handleLoginSubmit}
        errorMessage={errorMessage}
        onClearError={() => setErrorMessage(null)}
        isSubmitting={isSubmitting}
      />

      {/* Atmospheric Overlays & HUD Elements */}
      <div className="cinematic-hud-overlay" style={{ pointerEvents: 'none' }}>
        {/* Top Header */}
        <header className="cinematic-header">
          <div className="brand-pill">
            <Shield size={18} className="text-primary" />
            <span className="brand-text">DELIVSHOP SECURE FACILITY</span>
          </div>
          <div className="hud-actions" style={{ pointerEvents: 'auto' }}>
            <button
              type="button"
              className="hud-toggle-btn"
              onClick={() => setReducedMotion(!reducedMotion)}
              title="Toggle reduced motion cinematic transitions"
            >
              <Sparkles size={14} />
              <span>{reducedMotion ? 'Reduced Motion: ON' : 'Motion: FULL'}</span>
            </button>
          </div>
        </header>

        {/* State Indicators on Wide Camera Shot */}
        {lockerState === 'authenticating' || lockerState === 'camera-pullback' ? (
          <div className="cinematic-status-pill authenticating">
            <RefreshCw size={14} className="spin-icon" />
            <span>PROCESSING CLEARANCE TELEMETRY...</span>
          </div>
        ) : lockerState === 'authentication-failed' ? (
          <div className="cinematic-status-pill failed">
            <Shield size={14} />
            <span>ACCESS REJECTED • FACILITY SECURED</span>
          </div>
        ) : ['authentication-success', 'unlocking', 'door-opening', 'entering-room'].includes(lockerState) ? (
          <div className="cinematic-status-pill success">
            <Shield size={14} />
            <span>IDENTITY VERIFIED • ACCESS AUTHORIZED</span>
          </div>
        ) : null}

        {/* Cinematic Vignette */}
        <div className="cinematic-vignette" />
      </div>

      {/* Smooth Transition Curtain into the Dashboard */}
      <div
        className={`dashboard-transition-curtain ${
          ['dashboard-transition', 'dashboard-ready'].includes(lockerState) ? 'is-faded' : ''
        }`}
      />
    </div>
  );
};
