import React, { useState } from 'react';
import {
  Trash2,
  AlertTriangle,
  X,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { Button } from './Button';

export interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void>;
  title: string;
  entityType: string;
  entityName: string;
  entityIdentifier?: string;
  isActive: boolean;
  onDeactivateRequested?: () => void;
  customWarning?: string;
  details?: { label: string; value: React.ReactNode }[];
  blockingReason?: string | null;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  entityType,
  entityName,
  entityIdentifier,
  isActive,
  onDeactivateRequested,
  customWarning,
  details,
  blockingReason,
}) => {
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    if (isSubmitting) return;
    setReason('');
    setConfirmed(false);
    setErrorMessage(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (blockingReason) {
      setErrorMessage(blockingReason);
      return;
    }
    if (isActive) {
      setErrorMessage(`Deactivate this ${entityType.toLowerCase()} before deleting it.`);
      return;
    }
    if (!confirmed) {
      setErrorMessage('Please confirm your understanding by checking the confirmation box.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await onConfirm(reason.trim() || undefined);
      handleClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        `Failed to delete ${entityType.toLowerCase()}. Dependencies may prevent deletion.`;
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '520px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
          border: '1px solid #D6D3C8',
          overflow: 'hidden',
          animation: 'fadeInScale 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #FEE2E2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FEF2F2',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#FEE2E2',
                border: '1px solid #FCA5A5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#DC2626',
              }}
            >
              <Trash2 size={22} />
            </div>
            <div>
              <h3
                style={{
                  fontSize: '17px',
                  fontWeight: 700,
                  color: '#991B1B',
                  margin: 0,
                }}
              >
                {title}
              </h3>
              <p
                style={{
                  fontSize: '12.5px',
                  color: '#B91C1C',
                  margin: '2px 0 0',
                }}
              >
                Destructive record management action
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* Target Entity Summary Card */}
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: '#F8FAFC',
              borderRadius: '10px',
              border: '1px solid #D6D3C8',
              marginBottom: '18px',
            }}
          >
            <div style={{ fontSize: '11.5px', textTransform: 'uppercase', color: '#64748B', fontWeight: 600 }}>
              {entityType} Details
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
              {entityName}
            </div>
            {entityIdentifier && (
              <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '3px' }}>
                Identifier: <code style={{ fontWeight: 600, color: 'var(--color-navy)' }}>{entityIdentifier}</code>
              </div>
            )}
            {details && details.length > 0 && (
              <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', borderTop: '1px solid #E2E8F0', paddingTop: '10px' }}>
                {details.map((d, i) => (
                  <div key={i} style={{ fontSize: '12px' }}>
                    <span style={{ color: '#64748B' }}>{d.label}: </span>
                    <strong style={{ color: '#0F172A' }}>{d.value}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Blocking Dependencies Alert */}
          {blockingReason ? (
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '10px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                marginBottom: '18px',
                display: 'flex',
                gap: '12px',
              }}
            >
              <AlertTriangle size={20} style={{ color: '#DC2626', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#991B1B' }}>
                  Deletion Blocked by Dependencies
                </div>
                <div style={{ fontSize: '12.5px', color: '#B91C1C', marginTop: '4px', lineHeight: 1.45 }}>
                  {blockingReason}
                </div>
              </div>
            </div>
          ) : isActive ? (
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '10px',
                backgroundColor: '#FEF3C7',
                border: '1px solid #FCD34D',
                marginBottom: '18px',
                display: 'flex',
                gap: '12px',
              }}
            >
              <AlertTriangle size={20} style={{ color: '#D97706', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#92400E' }}>
                  Deactivation Required Before Deletion
                </div>
                <div style={{ fontSize: '12.5px', color: '#B45309', marginTop: '4px', lineHeight: 1.45 }}>
                  This {entityType.toLowerCase()} is currently <strong>Active</strong>. Business rules strictly require
                  records to be deactivated first to verify active operational workflows and dependency chains before deletion.
                </div>
                {onDeactivateRequested && (
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      onDeactivateRequested();
                    }}
                    style={{
                      marginTop: '10px',
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      backgroundColor: '#D97706',
                      color: '#FFFFFF',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Deactivate this {entityType} first
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Dependency and Data Integrity Notice */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  backgroundColor: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  marginBottom: '18px',
                  display: 'flex',
                  gap: '12px',
                }}
              >
                <ShieldAlert size={20} style={{ color: '#B45309', flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '12.5px', color: '#92400E', lineHeight: 1.5 }}>
                  {customWarning || (
                    <>
                      <strong>Data integrity protection:</strong> If this record is referenced by historical orders,
                      inventory ledger entries, or deliveries, it will be securely archived/soft-deleted rather than
                      destructively purged. Historical audit attribution is guaranteed.
                    </>
                  )}
                </div>
              </div>

              {/* Reason Input (Optional) */}
              <div style={{ marginBottom: '18px' }}>
                <label
                  htmlFor="deletion-reason"
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#334155',
                    marginBottom: '6px',
                  }}
                >
                  Reason for Deletion <span style={{ fontWeight: 400, color: '#94A3B8' }}>(recorded in audit trail)</span>
                </label>
                <textarea
                  id="deletion-reason"
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Discontinued product line, merged entity, obsolete registration..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #A7AE9F',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    resize: 'none',
                  }}
                  disabled={isSubmitting}
                />
              </div>

              {/* Confirmation Checkbox */}
              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    fontSize: '13px',
                    color: '#1E293B',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    style={{ marginTop: '3px', cursor: 'pointer' }}
                    disabled={isSubmitting}
                  />
                  <span>
                    I confirm that I want to delete <strong>{entityName}</strong>. I understand this action
                    will remove it from active catalogs and rosters.
                  </span>
                </label>
              </div>
            </>
          )}

          {/* Backend Error Banner */}
          {errorMessage && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #F87171',
                color: '#991B1B',
                fontSize: '12.5px',
                marginBottom: '18px',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start',
              }}
            >
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{errorMessage}</div>
            </div>
          )}

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              borderTop: '1px solid #F1F5F9',
              paddingTop: '16px',
            }}
          >
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <button
              type="submit"
              disabled={isActive || !confirmed || isSubmitting || Boolean(blockingReason)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                fontSize: '13.5px',
                fontWeight: 600,
                borderRadius: '8px',
                border: 'none',
                cursor: isActive || !confirmed || isSubmitting || Boolean(blockingReason) ? 'not-allowed' : 'pointer',
                backgroundColor: isActive || !confirmed || Boolean(blockingReason) ? '#A7AE9F' : '#DC2626',
                color: '#FFFFFF',
                boxShadow: isActive || !confirmed || Boolean(blockingReason) ? 'none' : '0 2px 4px rgba(220, 38, 38, 0.25)',
                transition: 'all 0.15s ease',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="btn-spinner" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  <span>Delete {entityType}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

