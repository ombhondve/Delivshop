import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  X,
  Loader2,
  Package,
  ShieldAlert,
} from 'lucide-react';
import { Product } from '../../types';
import { api } from '../../services/api/endpoints';

interface ProductStatusDialogProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChanged: (updatedProduct: Product) => void;
}

export const ProductStatusDialog: React.FC<ProductStatusDialogProps> = ({
  product,
  isOpen,
  onClose,
  onStatusChanged,
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !product) return null;

  const isCurrentlyActive = product.isActive;
  const targetStatus = !isCurrentlyActive;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await api.products.updateStatus(product.id, targetStatus, reason.trim() || undefined);
      if (res) {
        onStatusChanged(res);
        onClose();
        setReason('');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to update product status';
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
        zIndex: 80,
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
        {/* Header */}
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
                backgroundColor: isCurrentlyActive ? '#FEF3C7' : '#DCFCE7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isCurrentlyActive ? '#D97706' : '#10B981',
              }}
            >
              {isCurrentlyActive ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
            </div>
            <div>
              <h3
                style={{
                  fontSize: '17px',
                  fontWeight: 700,
                  color: isCurrentlyActive ? '#92400E' : '#14532D',
                  margin: 0,
                }}
              >
                {isCurrentlyActive ? 'Deactivate Product' : 'Reactivate Product'}
              </h3>
              <p
                style={{
                  fontSize: '12.5px',
                  color: isCurrentlyActive ? '#B45309' : '#166534',
                  margin: '2px 0 0',
                }}
              >
                {isCurrentlyActive
                  ? 'Remove from active ordering and dispatch workflows'
                  : 'Restore product to active ordering catalog'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
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

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {/* Target Product Summary */}
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: '#F8FAFC',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-primary-subtle)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Package size={18} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                {product.name}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '1px' }}>
                SKU: <code style={{ fontWeight: 600 }}>{product.sku}</code> &bull; Current Stock:{' '}
                <strong>{product.stockQuantity ?? 0} {product.baseUnit || 'Unit'}s</strong>
              </div>
            </div>
          </div>

          {/* Explanation Banner */}
          {isCurrentlyActive ? (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: '#FFFBEB',
                border: '1px solid #FDE68A',
                marginBottom: '18px',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
              }}
            >
              <ShieldAlert size={18} style={{ color: '#D97706', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '12.5px', color: '#92400E', lineHeight: 1.45 }}>
                <strong>Business Rule Enforcement:</strong> Deactivating will make this product unavailable for
                new retail and wholesale orders. Historical orders, inventory receipts, and ledger transactions
                will remain completely intact. Once inactive, authorized administrators may permanently delete
                the product if all dependencies are clear.
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: '#F0FDF4',
                border: '1px solid #BBF7D0',
                marginBottom: '18px',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
              }}
            >
              <CheckCircle size={18} style={{ color: '#16A34A', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '12.5px', color: '#166534', lineHeight: 1.45 }}>
                This product will immediately become visible to shops, dispatch staff, and procurement for orders and stock intake.
              </div>
            </div>
          )}

          {/* Reason Input */}
          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="product-status-reason"
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#334155',
                marginBottom: '6px',
              }}
            >
              Status Change Reason <span style={{ fontWeight: 400, color: '#94A3B8' }}>(optional)</span>
            </label>
            <textarea
              id="product-status-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isCurrentlyActive
                  ? 'e.g. Seasonal packaging revision, supplier stockout...'
                  : 'e.g. Stock replenished, resumption of distribution...'
              }
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                fontFamily: 'inherit',
                resize: 'none',
              }}
              disabled={isSubmitting}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                color: '#B91C1C',
                fontSize: '12.5px',
                marginBottom: '18px',
              }}
            >
              {error}
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
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
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
                padding: '8px 18px',
                fontSize: '13.5px',
                fontWeight: 600,
                borderRadius: '8px',
                border: 'none',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                backgroundColor: isCurrentlyActive ? '#D97706' : 'var(--color-primary)',
                color: '#FFFFFF',
                boxShadow: isCurrentlyActive
                  ? '0 2px 4px rgba(217, 119, 6, 0.25)'
                  : '0 2px 4px rgba(25, 118, 210, 0.25)',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="btn-spinner" />
                  <span>Processing...</span>
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
