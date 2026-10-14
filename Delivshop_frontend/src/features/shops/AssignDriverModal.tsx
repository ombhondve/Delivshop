import React, { useState, useEffect } from 'react';
import { X, Truck, Check, AlertCircle } from 'lucide-react';
import { api } from '../../services/api/endpoints';
import { DriverUser, Order } from '../../types';

interface AssignDriverModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onAssigned: () => void;
}

export const AssignDriverModal: React.FC<AssignDriverModalProps> = ({
  order,
  isOpen,
  onClose,
  onAssigned,
}) => {
  const [drivers, setDrivers] = useState<DriverUser[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(null);
      api.deliveries
        .getDrivers()
        .then((res) => {
          setDrivers(res);
          if (res.length > 0) setSelectedDriverId(res[0].id);
        })
        .catch((err) => setError(err.message || 'Failed to load active drivers'))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen || !order) return null;

  const handleAssign = async () => {
    if (!selectedDriverId) {
      setError('Please select a driver');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.deliveries.assignDriver(order.id, selectedDriverId);
      onAssigned();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to assign driver to order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 110,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Truck color="var(--color-primary)" size={20} />
            <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Assign Delivery Driver
            </h4>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ backgroundColor: 'var(--bg-primary)', padding: '12px 16px', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Target Order</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
              <code>{order.order_number || order.orderNumber || order.id}</code>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Total: ₹{Number(order.total || 0).toFixed(2)}
            </div>
          </div>

          {error && (
            <div className="alert-error" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="input-label" style={{ marginBottom: '8px', display: 'block' }}>
              Select Active Driver
            </label>
            {loading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading available drivers...
              </div>
            ) : drivers.length === 0 ? (
              <div style={{ padding: '14px', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#FBBF24', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}>
                No active drivers registered in the system yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                {drivers.map((driver) => (
                  <div
                    key={driver.id}
                    onClick={() => setSelectedDriverId(driver.id)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      border: selectedDriverId === driver.id ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                      backgroundColor: selectedDriverId === driver.id ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                        {driver.name}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {driver.phone || driver.email}
                      </div>
                    </div>
                    {selectedDriverId === driver.id && <Check size={18} color="var(--color-primary)" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} className="btn btn-outline btn-sm">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAssign}
              disabled={submitting || drivers.length === 0}
              className="btn btn-primary btn-sm"
              style={{ padding: '8px 18px' }}
            >
              {submitting ? 'Assigning...' : 'Confirm Assignment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
