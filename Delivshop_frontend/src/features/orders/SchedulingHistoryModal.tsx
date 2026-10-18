import React, { useState, useEffect } from 'react';
import { History, X, Clock, User, ArrowRight, Calendar, AlertCircle } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { formatDate } from '../../utils/formatters';
import { api } from '../../services/api/endpoints';
import { OrderSchedulingAuditRecord } from '../../types';

interface SchedulingHistoryModalProps {
  orderId: string | null;
  orderNumber: string;
  isOpen: boolean;
  onClose: () => void;
}

export const SchedulingHistoryModal: React.FC<SchedulingHistoryModalProps> = ({
  orderId,
  orderNumber,
  isOpen,
  onClose,
}) => {
  const [history, setHistory] = useState<OrderSchedulingAuditRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !orderId) return;

    let isMounted = true;
    async function fetchAudit() {
      setLoading(true);
      setError(null);
      try {
        const records = await api.orders.getSchedulingHistory(orderId!);
        if (isMounted) setHistory(Array.isArray(records) ? records : []);
      } catch (err: any) {
        if (isMounted) setError(err?.message || 'Failed to retrieve scheduling audit history.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchAudit();
    return () => { isMounted = false; };
  }, [isOpen, orderId]);

  if (!isOpen) return null;

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
          maxWidth: '640px',
          maxHeight: '85vh',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={18} color="#047857" />
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Scheduling Audit Trail: {orderNumber}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748B' }}>
              Loading chronological audit records...
            </div>
          ) : error ? (
            <div
              style={{
                backgroundColor: '#FEF2F2',
                padding: '12px',
                borderRadius: '8px',
                color: '#991B1B',
                fontSize: '13px',
              }}
            >
              {error}
            </div>
          ) : history.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748B' }}>
              No scheduling transitions recorded yet for this order.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {history.map((rec) => (
                <div
                  key={rec.id}
                  style={{
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    backgroundColor: '#FAFAFA',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: '#E2E8F0',
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        {rec.previous_status || 'INITIAL'}
                      </span>
                      <ArrowRight size={12} color="#64748B" />
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: '#DCFCE7',
                          color: '#166534',
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        {rec.new_status}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>
                      {formatDate(rec.created_at)}
                    </span>
                  </div>

                  {(rec.previous_delivery_date || rec.new_delivery_date) && (
                    <div style={{ fontSize: '12px', color: '#334155', marginBottom: '4px' }}>
                      <strong>Delivery Date:</strong>{' '}
                      {rec.previous_delivery_date ? formatDate(rec.previous_delivery_date) : 'Unscheduled'}
                      {' → '}
                      <span style={{ color: '#047857', fontWeight: 700 }}>
                        {rec.new_delivery_date ? formatDate(rec.new_delivery_date) : 'Unassigned'}
                      </span>
                    </div>
                  )}

                  {rec.reason && (
                    <div style={{ fontSize: '12px', color: '#475569', fontStyle: 'italic', marginBottom: '4px' }}>
                      Reason: "{rec.reason}"
                    </div>
                  )}

                  <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <User size={11} />
                    <span>Logged by: {rec.performed_by_name || 'Admin Officer'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'flex-end',
            backgroundColor: '#F8FAFC',
          }}
        >
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
