import React, { useState } from 'react';
import { X, Key, CheckCircle2, AlertCircle, RefreshCw, Copy, Check, Shield } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { api } from '../../services/api/endpoints';
import { DriverUser } from '../../types';

interface ResetPasswordModalProps {
  isOpen: boolean;
  driver: DriverUser | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  driver,
  onClose,
  onSuccess,
}) => {
  const [password, setPassword] = useState('Driver@' + Math.floor(1000 + Math.random() * 9000));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !driver) return null;

  const handleGenerateRandom = () => {
    // Generate secure 12-char temporary password
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnopqrstuvwxyz';
    const digits = '23456789';
    const special = '!@#$%^&*';
    const all = upper + lower + digits + special;
    let pwd = [
      upper[Math.floor(Math.random() * upper.length)],
      lower[Math.floor(Math.random() * lower.length)],
      digits[Math.floor(Math.random() * digits.length)],
      special[Math.floor(Math.random() * special.length)],
    ];
    for (let i = 4; i < 12; i++) {
      pwd.push(all[Math.floor(Math.random() * all.length)]);
    }
    setPassword(pwd.sort(() => Math.random() - 0.5).join(''));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.deliveries.resetDriverPassword(driver.id, password);
      setIsSuccess(true);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsSuccess(false);
    setError(null);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(6, 78, 59, 0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) handleClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #D6D3C8',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #D6D3C8',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#FAFAF7',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: '#FEF3C7',
                color: '#B45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Key size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Reset Password
              </h3>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
                {driver.name} ({driver.employee_id || 'N/A'})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {isSuccess ? (
          /* Success Screen with Copy Password */
          <div style={{ padding: '24px 20px', textAlign: 'center' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                backgroundColor: '#D1FAE5',
                color: '#059669',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px',
              }}
            >
              <CheckCircle2 size={30} />
            </div>
            <h4 style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A', margin: '0 0 6px 0' }}>
              Password Reset
            </h4>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Share these credentials with <strong>{driver.name}</strong>.
            </p>

            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                padding: '14px',
                marginBottom: '20px',
                textAlign: 'left',
              }}
            >
              <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                Employee ID:
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '15px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '12px' }}>
                {driver.employee_id}
              </div>

              <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                Temporary Password:
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    flex: 1,
                    backgroundColor: '#FFFFFF',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontFamily: 'monospace',
                    fontSize: '15px',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    color: '#0F172A',
                  }}
                >
                  {password}
                </div>
                <Button variant="secondary" onClick={handleCopy} icon={copied ? <Check size={14} /> : <Copy size={14} />}>
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>

            <Button variant="primary" onClick={handleClose} style={{ width: '100%' }}>
              Done
            </Button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
            {error && (
              <div
                style={{
                  marginBottom: '14px',
                  padding: '10px 14px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#B91C1C',
                  fontSize: '12.5px',
                }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                  New Password
                </label>
                <button
                  type="button"
                  onClick={handleGenerateRandom}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-primary, #16805D)',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <RefreshCw size={12} />
                  Generate Random
                </button>
              </div>
              <input
                type="text"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  height: '36px',
                  padding: '0 10px',
                  fontSize: '13.5px',
                  fontFamily: 'monospace',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: '1px solid #A7AE9F',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button variant="secondary" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSubmit} disabled={loading} icon={<CheckCircle2 size={15} />}>
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
