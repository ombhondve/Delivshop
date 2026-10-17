import React, { useState } from 'react';
import { X, Key, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
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

  if (!isOpen || !driver) return null;

  const handleGenerateRandom = () => {
    setPassword('Driver@' + Math.floor(1000 + Math.random() * 9000));
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
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
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
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '460px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #D6D3C8',
          overflow: 'hidden',
        }}
      >
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
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
                Reset Driver App Password
              </h3>
              <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                {driver.name} ({driver.employee_id || 'Driver'})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          {error && (
            <div
              style={{
                marginBottom: '14px',
                padding: '8px 12px',
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

          <p style={{ fontSize: '12.5px', color: '#64748B', marginBottom: '14px', lineHeight: 1.4 }}>
            Set a new temporary password for the driver to sign in to the Delivshop mobile application.
          </p>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                New Access Password
              </label>
              <button
                type="button"
                onClick={handleGenerateRandom}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <RefreshCw size={12} />
                Generate Secure Random
              </button>
            </div>
            <input
              type="text"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                height: '34px',
                padding: '0 10px',
                fontSize: '13px',
                fontFamily: 'monospace',
                fontWeight: 600,
                borderRadius: '6px',
                border: '1px solid #A7AE9F',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="secondary" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={loading} icon={<CheckCircle2 size={15} />}>
              {loading ? 'Updating Password...' : 'Save & Update Password'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

