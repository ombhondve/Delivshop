import React, { useState } from 'react';
import {
  AlertTriangle,
  X,
  Trash2,
  ShieldAlert,
  CheckCircle2,
  MapPin,
  Store,
} from 'lucide-react';
import { api } from '../../services/api/endpoints';
import { Route } from '../../types';

interface DeleteRouteModalProps {
  route: Route | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleted: (routeId: string) => void;
}

export const DeleteRouteModal: React.FC<DeleteRouteModalProps> = ({
  route,
  isOpen,
  onClose,
  onDeleted,
}) => {
  const [reason, setReason] = useState('Corridor retired or consolidated');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !route) return null;

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.routes.delete(route.id, reason.trim() || undefined);
      onDeleted(route.id);
      onClose();
    } catch (err: any) {
      console.error('Failed to delete route:', err);
      setError(
        err?.message ||
          'Failed to delete route. Please ensure no active delivery runs are currently scheduled on this route.'
      );
    } finally {
      setLoading(false);
    }
  };

  const stopsCount = route.stops_count ?? route.stopsCount ?? route.stops?.length ?? 0;

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
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
        className="modal-dialog"
        style={{
          width: '100%',
          maxWidth: '520px',
          background: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #D6D3C8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#FFF5F5',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#FEE2E2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Trash2 size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#991B1B' }}>
                Delete Route
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              color: '#94A3B8',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px' }}>
          {error && (
            <div
              style={{
                padding: '12px 14px',
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '8px',
                color: '#991B1B',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                marginBottom: '16px',
              }}
            >
              <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Deletion Blocked</strong>
                <p style={{ margin: '2px 0 0 0' }}>{error}</p>
              </div>
            </div>
          )}

          <p style={{ fontSize: '13.5px', color: '#334155', marginBottom: '16px', lineHeight: 1.5 }}>
            Are you sure you want to delete route <strong>{route.name}</strong> ({route.route_code || route.code})?
          </p>

          {/* Reason Input */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label
              htmlFor="deletion-reason"
              className="form-label"
              style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px', display: 'block' }}
            >
              Reason (optional)
            </label>
            <input
              id="deletion-reason"
              type="text"
              className="form-control"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Route retired or consolidated"
              disabled={loading}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '13px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
              }}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '16px 24px',
            background: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '6px',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: '#475569',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleDelete}
            disabled={loading}
            style={{
              padding: '8px 20px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '6px',
              background: '#DC2626',
              border: 'none',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <span>Deleting...</span>
            ) : (
              <>
                <Trash2 size={14} />
                <span>Delete</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

