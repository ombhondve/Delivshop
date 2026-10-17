import React, { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Boxes,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../../services/api/endpoints';
import { Product, StockAdjustmentPayload, InventoryBatch } from '../../types';

interface StockAdjustmentModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onStockAdjusted: () => void;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  product,
  isOpen,
  onClose,
  onStockAdjusted,
}) => {
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [batchId, setBatchId] = useState<string>('');
  const [adjustmentType, setAdjustmentType] = useState<
    'INCREASE' | 'DECREASE' | 'CORRECTION' | 'DAMAGE' | 'EXPIRY'
  >('DAMAGE');
  const [quantityMagnitude, setQuantityMagnitude] = useState<number>(5);
  const [reason, setReason] = useState('');
  const [referenceId, setReferenceId] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && product) {
      setAdjustmentType('DAMAGE');
      setQuantityMagnitude(5);
      setReason('');
      setReferenceId('');
      setBatchId('');
      setErrors({});
      setServerError(null);
      setSuccessMessage(null);

      // Load product batches
      api.inventory
        .getProductBatches(product.id)
        .then((b) => {
          setBatches(b || []);
          if (b && b.length > 0) {
            setBatchId(b[0].id);
          }
        })
        .catch((err) => console.warn(err.message));
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  // Determine actual sign of quantityChange
  const isDeduction = adjustmentType === 'DAMAGE' || adjustmentType === 'EXPIRY' || adjustmentType === 'DECREASE';
  const effectiveChange = isDeduction ? -Math.abs(quantityMagnitude) : Math.abs(quantityMagnitude);
  const projectedBalance = (product.stockQuantity || 0) + effectiveChange;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!quantityMagnitude || quantityMagnitude <= 0) {
      errs.quantity = 'Quantity magnitude must be greater than zero';
    }

    if (projectedBalance < 0) {
      errs.quantity = `Adjustment cannot reduce stock below zero (Projected: ${projectedBalance})`;
    }

    if (!reason.trim() || reason.trim().length < 3) {
      errs.reason = 'A clear justification is required for the audit stock ledger';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setServerError(null);

    try {
      const payload: StockAdjustmentPayload = {
        productId: product.id,
        batchId: batchId || undefined,
        adjustmentType,
        quantityChange: effectiveChange,
        reason: reason.trim(),
        referenceId: referenceId.trim() || undefined,
      };

      await api.inventory.adjustStock(payload);
      setSuccessMessage(`Stock adjusted successfully. New stock: ${projectedBalance} ${product.baseUnit}s.`);
      onStockAdjusted();

      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to adjust stock';
      setServerError(msg);
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
          maxWidth: '560px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #D6D3C8',
          overflow: 'hidden',
          animation: 'fadeInScale 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #D6D3C8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FFFBEB',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: 'rgba(217, 119, 6, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#D97706',
              }}
            >
              <Sliders size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1F2937', margin: 0 }}>
                Stock Adjustment
              </h3>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0 0' }}>
                {product.name} ({product.sku})
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

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          style={{
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          {serverError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 14px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '8px',
                color: '#991B1B',
                fontSize: '13px',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{serverError}</span>
            </div>
          )}

          {successMessage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 14px',
                backgroundColor: '#F0FDF4',
                border: '1px solid #86EFAC',
                borderRadius: '8px',
                color: '#166534',
                fontSize: '13px',
              }}
            >
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Current vs Projected Stock Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              backgroundColor: '#F8FAFC',
              borderRadius: '10px',
              border: '1px solid #D6D3C8',
            }}
          >
            <div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>Current On-Hand Stock</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {product.stockQuantity} <span style={{ fontSize: '13px', fontWeight: 500 }}>{product.baseUnit}s</span>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', color: '#64748B' }}>Projected Post-Adjustment</div>
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 800,
                  color: projectedBalance < 0 ? '#EF4444' : '#059669',
                }}
              >
                {projectedBalance} <span style={{ fontSize: '13px', fontWeight: 500 }}>{product.baseUnit}s</span>
              </div>
            </div>
          </div>

          {/* Adjustment Reason Type */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Adjustment Category / Type <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <select
              value={adjustmentType}
              onChange={(e) => setAdjustmentType(e.target.value as any)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #A7AE9F',
                fontSize: '14px',
                backgroundColor: '#FFFFFF',
                boxSizing: 'border-box',
              }}
            >
              <option value="DAMAGE">Transit Damage / Punctured Packets (Deduct)</option>
              <option value="EXPIRY">Expired Lot Disposal / Curdled (Deduct)</option>
              <option value="DECREASE">Inventory Count Shortage / Shrinkage (Deduct)</option>
              <option value="INCREASE">Physical Stock Surplus Discovered (Add)</option>
              <option value="CORRECTION">Audit Count Reconciliation</option>
            </select>
          </div>

          {/* Quantity Change */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Quantity ({product.baseUnit}s to {isDeduction ? 'Deduct' : 'Add'}) <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '11px',
                  fontSize: '16px',
                  fontWeight: 700,
                  color: isDeduction ? '#DC2626' : '#16A34A',
                }}
              >
                {isDeduction ? '−' : '+'}
              </span>
              <input
                type="number"
                min="1"
                value={quantityMagnitude}
                onChange={(e) => setQuantityMagnitude(Math.abs(parseInt(e.target.value, 10) || 0))}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 30px',
                  borderRadius: '8px',
                  border: `1px solid ${errors.quantity ? '#EF4444' : '#A7AE9F'}`,
                  fontSize: '14px',
                  fontWeight: 600,
                  boxSizing: 'border-box',
                }}
              />
            </div>
            {errors.quantity && <span style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.quantity}</span>}
          </div>

          {/* Target Batch (Optional) */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Target Batch (Optional, recommended for traceability)
            </label>
            <select
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #A7AE9F',
                fontSize: '13.5px',
                backgroundColor: '#FFFFFF',
                boxSizing: 'border-box',
              }}
            >
              <option value="">General Stock Balance (No specific batch)</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batchNumber} (Remaining: {b.quantityRemaining} {product.baseUnit}s • Exp: {b.expiryDate})
                </option>
              ))}
            </select>
          </div>

          {/* Reason */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Explanation / Justification (Logged in Audit Ledger) <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. 5 milk pouches split during transport crate handling on Route #3..."
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: `1px solid ${errors.reason ? '#EF4444' : '#A7AE9F'}`,
                fontSize: '13.5px',
                boxSizing: 'border-box',
                resize: 'none',
              }}
            />
            {errors.reason && <span style={{ color: '#EF4444', fontSize: '12px', marginTop: '2px', display: 'block' }}>{errors.reason}</span>}
          </div>

          {/* Reference ID */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Incident / Audit Ticket Reference (Optional)
            </label>
            <input
              type="text"
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              placeholder="e.g. INC-2026-0812"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #A7AE9F',
                fontSize: '13.5px',
                boxSizing: 'border-box',
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
              borderTop: '1px solid #D6D3C8',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: '1px solid #A7AE9F',
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
              type="submit"
              disabled={isSubmitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 22px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isSubmitting ? '#94A3B8' : '#D97706',
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
                  Recording Adjustment...
                </>
              ) : (
                'Confirm Adjustment'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

