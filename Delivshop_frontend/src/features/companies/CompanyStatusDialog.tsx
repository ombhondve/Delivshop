import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  X,
  Loader2,
  Building2,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { Company, CompanyStatus } from '../../types';
import { api } from '../../services/api/endpoints';

interface CompanyStatusDialogProps {
  company: Company | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChanged: (updatedCompany: Company) => void;
}

export const CompanyStatusDialog: React.FC<CompanyStatusDialogProps> = ({
  company,
  isOpen,
  onClose,
  onStatusChanged,
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !company) return null;

  const isCurrentlyActive = company.status === 'ACTIVE';
  const targetStatus: CompanyStatus = isCurrentlyActive ? 'INACTIVE' : 'ACTIVE';

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await api.companies.updateStatus(company.id, targetStatus, reason.trim() || undefined);
      if (res) {
        onStatusChanged(res);
        onClose();
        setReason('');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to update company status';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 60,
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '520px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          animation: 'fadeInScale 0.2s ease-out',
        }}
      >
        {/* Header with status-specific iconography */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: isCurrentlyActive ? '#FFFBEB' : '#F0FDF4',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: isCurrentlyActive ? 'rgba(217, 119, 6, 0.15)' : 'var(--color-primary-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isCurrentlyActive ? '#D97706' : 'var(--color-primary)',
              }}
            >
              {isCurrentlyActive ? <AlertTriangle size={22} /> : <CheckCircle size={22} />}
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1F2937', margin: 0 }}>
                {isCurrentlyActive ? 'Deactivate Company' : 'Reactivate Company'}
              </h3>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0 0' }}>
                {company.name} ({company.companyCode})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: '6px',
              borderRadius: '6px',
              border: 'none',
              background: 'transparent',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              color: '#64748B',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {error && (
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '8px',
                color: '#991B1B',
                fontSize: '13px',
              }}
            >
              {error}
            </div>
          )}

          {/* Explanation Banner */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: '10px',
              backgroundColor: isCurrentlyActive ? '#FEF3C7' : '#DCFCE7',
              border: `1px solid ${isCurrentlyActive ? '#FDE68A' : '#BBF7D0'}`,
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
            }}
          >
            {isCurrentlyActive ? (
              <ShieldAlert size={20} color="#B45309" style={{ flexShrink: 0, marginTop: '2px' }} />
            ) : (
              <Info size={20} color="#15803D" style={{ flexShrink: 0, marginTop: '2px' }} />
            )}
            <div style={{ fontSize: '13px', color: isCurrentlyActive ? '#92400E' : '#166534', lineHeight: '1.5' }}>
              {isCurrentlyActive ? (
                <>
                  <strong>Deactivation Policy:</strong> Deactivating this company prevents it from being chosen for new orders, inventory dispatches, or active supply contracts. 
                  <br />
                  <span style={{ display: 'block', marginTop: '6px' }}>
                    <strong>Notice:</strong> Historical orders, delivery logs, ledgers, and audit trails remain permanently preserved. No database records are deleted.
                  </span>
                </>
              ) : (
                <>
                  <strong>Reactivation Policy:</strong> Activating this company will immediately restore it to the active supplier directory, allowing product assignment and inclusion in dispatch planning.
                </>
              )}
            </div>
          </div>

          {/* Reason Input */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Reason for Status Change (Recorded in Audit Trail)
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isCurrentlyActive
                  ? 'e.g. Seasonal shutdown, license renewal pending, or contractual change...'
                  : 'e.g. Supplier compliance renewed, new production facility operational...'
              }
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'none',
              }}
            />
          </div>

          {/* Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '8px',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#475569',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isCurrentlyActive ? '#D97706' : 'var(--color-primary)',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Updating...
                </>
              ) : isCurrentlyActive ? (
                'Confirm Deactivation'
              ) : (
                'Confirm Reactivation'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
