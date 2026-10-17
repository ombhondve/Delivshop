import React, { useState, useEffect } from 'react';
import {
  Trash2,
  AlertTriangle,
  X,
  Loader2,
  ShieldAlert,
  Calendar,
  Clock,
  User,
  Truck,
  Navigation,
  CheckCircle2,
  FileText,
  Archive,
  Ban,
} from 'lucide-react';
import { DeliveryRun } from '../../types';
import { api } from '../../services/api/endpoints';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { formatDate } from '../../utils/formatters';

export interface DeleteAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  run: DeliveryRun | null;
  onDeleted: (message: string) => void;
}

export const DeleteAssignmentModal: React.FC<DeleteAssignmentModalProps> = ({
  isOpen,
  onClose,
  run,
  onDeleted,
}) => {
  const [reason, setReason] = useState('');
  const [confirmCodeInput, setConfirmCodeInput] = useState('');
  const [confirmedCheck, setConfirmedCheck] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live dependency check
  const [depLoading, setDepLoading] = useState(false);
  const [dependencies, setDependencies] = useState<any>(null);

  const runCode = run?.run_code || run?.runCode || '';
  const status = run?.status || 'ASSIGNED';
  const isInProgress = status === 'IN_PROGRESS';
  const isCompleted = status === 'COMPLETED';
  const isCancelled = status === 'CANCELLED';

  useEffect(() => {
    if (isOpen && run?.id) {
      setReason('');
      setConfirmCodeInput('');
      setConfirmedCheck(false);
      setErrorMessage(null);
      loadDependencies(run.id);
    }
  }, [isOpen, run?.id]);

  const loadDependencies = async (runId: string) => {
    setDepLoading(true);
    try {
      const res = await api.assignments.getDependencies(runId);
      const data = res?.data || res;
      setDependencies(data);
    } catch {
      // Non-fatal fallback
      setDependencies(null);
    } finally {
      setDepLoading(false);
    }
  };

  if (!isOpen || !run) return null;

  const hasProtectedDependencies =
    dependencies?.hasProtectedDependencies ||
    (dependencies?.completedStops ?? 0) > 0 ||
    (dependencies?.collectionsCount ?? 0) > 0 ||
    (dependencies?.reconciliationsCount ?? 0) > 0;

  // Decide mode: Hard delete allowed only for DRAFT/ASSIGNED/READY with NO protected dependencies
  const isArchivalMode = isCompleted || isCancelled || hasProtectedDependencies;

  const handleClose = () => {
    if (isSubmitting) return;
    setReason('');
    setConfirmCodeInput('');
    setConfirmedCheck(false);
    setErrorMessage(null);
    onClose();
  };

  const handleExecute = async (actionType: 'DELETE' | 'ARCHIVE' | 'CANCEL') => {
    if (isInProgress && actionType === 'DELETE') {
      setErrorMessage(
        'Cannot delete an in-progress delivery run. Drivers or dispatchers must complete or cancel the dispatch first.'
      );
      return;
    }

    if (!confirmedCheck) {
      setErrorMessage('Please confirm your understanding by checking the confirmation box.');
      return;
    }

    if (!isArchivalMode && actionType === 'DELETE') {
      if (confirmCodeInput.trim().toUpperCase() !== runCode.trim().toUpperCase()) {
        setErrorMessage(`Please enter the exact Run Code "${runCode}" to authorize permanent deletion.`);
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await api.assignments.delete(run.id, {
        reason: reason.trim() || undefined,
        actionType,
      });

      const message =
        res?.message ||
        (actionType === 'CANCEL'
          ? `Assignment ${runCode} cancelled successfully.`
          : isArchivalMode
          ? `Assignment ${runCode} archived safely to preserve operational history.`
          : `Assignment ${runCode} permanently deleted.`);

      onDeleted(message);
      handleClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to process assignment deletion. Please review system restrictions.';
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
        zIndex: 1400,
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
          maxWidth: '560px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid #D6D3C8',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #D6D3C8',
            backgroundColor: isArchivalMode ? '#FFFBEB' : '#FEF2F2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: isArchivalMode ? '#FEF3C7' : '#FEE2E2',
                color: isArchivalMode ? '#B45309' : '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {isArchivalMode ? <Archive size={22} /> : <Trash2 size={22} />}
            </div>
            <div>
              <h3
                style={{
                  fontSize: '17px',
                  fontWeight: 700,
                  color: isArchivalMode ? '#92400E' : '#991B1B',
                  margin: 0,
                }}
              >
                {isArchivalMode ? 'Archive Delivery Assignment' : 'Delete Delivery Assignment'}
              </h3>
              <p style={{ fontSize: '12.5px', color: '#64748B', margin: '3px 0 0 0' }}>
                Assignment ID: <strong style={{ color: '#064E3B' }}>{runCode}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            style={{
              background: 'none',
              border: 'none',
              padding: '6px',
              cursor: 'pointer',
              color: '#64748B',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Error Banner */}
          {errorMessage && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                color: '#991B1B',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
              }}
            >
              <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Action Prohibited:</strong>
                <p style={{ margin: '4px 0 0 0' }}>{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Operational Assignment Summary Card */}
          <div
            style={{
              backgroundColor: '#F8FAFC',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              padding: '14px 16px',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.5px', marginBottom: '10px' }}>
              SCHEDULED ASSIGNMENT METADATA
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '13px' }}>
              <div>
                <span style={{ color: '#64748B', fontSize: '11.5px', display: 'block' }}>Route & Depot</span>
                <strong style={{ color: '#1F2937' }}>{run.route_name || run.routeName || 'Scheduled Route'}</strong>
                <span style={{ color: '#64748B', fontSize: '11.5px', display: 'block' }}>
                  {run.route_depot || 'Pune Central Cold Depot'}
                </span>
              </div>

              <div>
                <span style={{ color: '#64748B', fontSize: '11.5px', display: 'block' }}>Assigned Driver</span>
                <strong style={{ color: '#1F2937' }}>{run.driver_name || run.driverName || 'Assigned Driver'}</strong>
                <span style={{ color: '#64748B', fontSize: '11.5px', display: 'block' }}>
                  {run.driver_phone || run.driverPhone || 'Official Fleet Driver'}
                </span>
              </div>

              <div>
                <span style={{ color: '#64748B', fontSize: '11.5px', display: 'block' }}>Fleet Vehicle</span>
                <strong style={{ color: '#1F2937' }}>{run.vehicle_registration || run.registrationNumber || 'Vehicle'}</strong>
                <span style={{ color: '#64748B', fontSize: '11.5px', display: 'block' }}>
                  {run.vehicle_type || 'Refrigerated Transport'}
                </span>
              </div>

              <div>
                <span style={{ color: '#64748B', fontSize: '11.5px', display: 'block' }}>Scheduled Date</span>
                <strong style={{ color: '#1F2937' }}>
                  {formatDate(run.delivery_date || run.deliveryDate || new Date().toISOString())}
                </strong>
                <span style={{ display: 'block', marginTop: '2px' }}>
                  <Badge variant={status === 'COMPLETED' ? 'success' : status === 'IN_PROGRESS' ? 'info' : status === 'CANCELLED' ? 'danger' : 'navy'}>
                    {status}
                  </Badge>
                </span>
              </div>
            </div>
          </div>

          {/* Operational Dependencies & Warnings */}
          {isInProgress ? (
            <div
              style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '10px',
                padding: '14px 16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#DC2626', fontWeight: 700, fontSize: '13.5px' }}>
                <ShieldAlert size={18} />
                <span>Active Dispatch In Progress</span>
              </div>
              <p style={{ fontSize: '12.5px', color: '#7F1D1D', margin: '6px 0 0 0', lineHeight: '18px' }}>
                This run is actively being dispatched or delivered on the road. Hard deletion is strictly prohibited to
                prevent ghost routes and lost driver dispatches. You may cancel this assignment instead to recall the vehicle.
              </p>
            </div>
          ) : isArchivalMode ? (
            <div
              style={{
                backgroundColor: '#FFFBEB',
                border: '1px solid #FCD34D',
                borderRadius: '10px',
                padding: '14px 16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#B45309', fontWeight: 700, fontSize: '13.5px' }}>
                <Archive size={18} />
                <span>Historical Audit Protection</span>
              </div>
              <p style={{ fontSize: '12.5px', color: '#92400E', margin: '6px 0 0 0', lineHeight: '18px' }}>
                {dependencies?.blockReason ||
                  'This assignment contains fulfilled shop stops, payment receipts, or completed audit history. It will be safely archived and hidden from active lists while preserving complete foreign-key integrity.'}
              </p>
              {dependencies && (
                <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontSize: '11.5px', color: '#78350F' }}>
                  <span>Completed Stops: <strong>{dependencies.completedStops}</strong></span>
                  <span>Collections: <strong>{dependencies.collectionsCount}</strong></span>
                  <span>Inspections: <strong>{dependencies.inspectionsCount}</strong></span>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '10px',
                padding: '14px 16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#DC2626', fontWeight: 700, fontSize: '13.5px' }}>
                <AlertTriangle size={18} />
                <span>Permanent Deletion Warning</span>
              </div>
              <p style={{ fontSize: '12.5px', color: '#991B1B', margin: '6px 0 0 0', lineHeight: '18px' }}>
                Deleting this assignment will permanently remove run <strong>{runCode}</strong> and its {run.planned_stops_count || 0} planned stops.
                Vehicle <strong>{run.vehicle_registration}</strong> and driver <strong>{run.driver_name}</strong> will be released back to the available pool.
              </p>
            </div>
          )}

          {/* Reason Input */}
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#1F2937', marginBottom: '6px' }}>
              Reason for {isArchivalMode ? 'Archival / Cancellation' : 'Deletion'} *
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Scheduled vehicle maintenance, shop order cancelled, schedule adjustment"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          {/* Double Confirmation for Permanent Deletion */}
          {!isArchivalMode && !isInProgress && (
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#1F2937', marginBottom: '6px' }}>
                Type <code style={{ backgroundColor: '#FEE2E2', color: '#DC2626', padding: '1px 6px', borderRadius: '4px' }}>{runCode}</code> to confirm:
              </label>
              <input
                type="text"
                value={confirmCodeInput}
                onChange={(e) => setConfirmCodeInput(e.target.value)}
                placeholder={runCode}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  outline: 'none',
                }}
              />
            </div>
          )}

          {/* Checkbox confirmation */}
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              fontSize: '12.5px',
              color: '#334155',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={confirmedCheck}
              onChange={(e) => setConfirmedCheck(e.target.checked)}
              style={{ marginTop: '2px', accentColor: isArchivalMode ? '#047857' : '#DC2626' }}
            />
            <span>
              I understand this action will {isArchivalMode ? 'archive' : 'permanently remove'} this assignment and that all actions are audited under my administrator session.
            </span>
          </label>
        </div>

        {/* Modal Footer Actions */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #D6D3C8',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          {isInProgress ? (
            <Button
              type="button"
              variant="danger"
              onClick={() => handleExecute('CANCEL')}
              disabled={isSubmitting || !confirmedCheck}
              icon={isSubmitting ? <Loader2 size={15} className="spin-icon" /> : <Ban size={15} />}
            >
              {isSubmitting ? 'Cancelling...' : 'Cancel Active Run Instead'}
            </Button>
          ) : isArchivalMode ? (
            <Button
              type="button"
              variant="primary"
              onClick={() => handleExecute('ARCHIVE')}
              disabled={isSubmitting || !confirmedCheck}
              icon={isSubmitting ? <Loader2 size={15} className="spin-icon" /> : <Archive size={15} />}
            >
              {isSubmitting ? 'Archiving...' : 'Archive Assignment'}
            </Button>
          ) : (
            <Button
              type="button"
              variant="danger"
              onClick={() => handleExecute('DELETE')}
              disabled={
                isSubmitting ||
                !confirmedCheck ||
                confirmCodeInput.trim().toUpperCase() !== runCode.trim().toUpperCase()
              }
              icon={isSubmitting ? <Loader2 size={15} className="spin-icon" /> : <Trash2 size={15} />}
            >
              {isSubmitting ? 'Deleting...' : 'Delete Assignment'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
