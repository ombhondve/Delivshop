import React, { useState, useEffect } from 'react';
import { RefreshCw, X, Calendar, Truck, AlertTriangle } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { formatDate } from '../../utils/formatters';
import { api } from '../../services/api/endpoints';

interface RescheduleOrderModalProps {
  orderId: string | null;
  orderNumber: string;
  currentDate?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onRescheduled: () => void;
}

export const RescheduleOrderModal: React.FC<RescheduleOrderModalProps> = ({
  orderId,
  orderNumber,
  currentDate,
  isOpen,
  onClose,
  onRescheduled,
}) => {
  const [runs, setRuns] = useState<any[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [deliveryWindow, setDeliveryWindow] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !orderId) return;

    let isMounted = true;
    async function loadUpcomingRuns() {
      setLoading(true);
      setErrorMsg(null);
      setReason('');
      try {
        const list = await api.assignments.list({ status: 'SCHEDULED' });
        if (isMounted) {
          const validRuns = Array.isArray(list) ? list : [];
          setRuns(validRuns);
          if (validRuns[0]) {
            setSelectedRunId(validRuns[0].id);
            setDeliveryWindow(validRuns[0].delivery_window || '06:00 AM - 09:00 AM');
          }
        }
      } catch (err: any) {
        if (isMounted) setErrorMsg('Failed to load upcoming delivery runs.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadUpcomingRuns();
    return () => { isMounted = false; };
  }, [isOpen, orderId]);

  if (!isOpen || !orderId) return null;

  const handleSubmit = async () => {
    if (!selectedRunId) {
      setErrorMsg('Please select a target delivery run.');
      return;
    }
    if (!reason.trim()) {
      setErrorMsg('A valid operational reason is required for rescheduling audit history.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      await api.orders.reschedule(orderId, {
        deliveryRunId: selectedRunId,
        deliveryWindow: deliveryWindow.trim() || undefined,
        reason: reason.trim(),
      });

      onRescheduled();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to reschedule order.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '560px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC',
          }}
        >
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Reschedule Order: {orderNumber}
            </h3>
            {currentDate && (
              <p style={{ fontSize: '11px', color: '#64748B', margin: '2px 0 0 0' }}>
                Currently Scheduled For: {formatDate(currentDate)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {errorMsg && (
            <div
              style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#991B1B',
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertTriangle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
              Select New Delivery Run:
            </label>
            {loading ? (
              <div style={{ fontSize: '12px', color: '#64748B' }}>Loading available delivery runs...</div>
            ) : runs.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#991B1B' }}>No upcoming scheduled delivery runs available.</div>
            ) : (
              <select
                value={selectedRunId}
                onChange={(e) => {
                  setSelectedRunId(e.target.value);
                  const found = runs.find((r) => r.id === e.target.value);
                  if (found) setDeliveryWindow(found.delivery_window || '06:00 AM - 09:00 AM');
                }}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  backgroundColor: '#FFFFFF',
                }}
              >
                {runs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.run_code || `RUN-${r.id.slice(0, 8)}`} • {formatDate(r.delivery_date)} • {r.route_name || 'Route'} ({r.driver_name || 'Driver'})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
              Delivery Time Window:
            </label>
            <input
              type="text"
              value={deliveryWindow}
              onChange={(e) => setDeliveryWindow(e.target.value)}
              placeholder="06:00 AM - 09:00 AM"
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
              Reason for Rescheduling (Mandatory Audit Trail):
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Vehicle cold-unit maintenance required; customer shop consented to morning run next day."
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                fontFamily: 'inherit',
              }}
            />
          </div>
        </div>

        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC',
          }}
        >
          <Button variant="secondary" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={submitting || !selectedRunId || !reason.trim()}
            style={{ backgroundColor: '#047857', borderColor: '#047857', fontWeight: 700 }}
          >
            {submitting ? 'Updating Schedule...' : 'Save & Notify Shop Owner'}
          </Button>
        </div>
      </div>
    </div>
  );
};
