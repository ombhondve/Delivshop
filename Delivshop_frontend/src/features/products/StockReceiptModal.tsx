import React, { useState, useEffect } from 'react';
import {
  X,
  PackagePlus,
  Building2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileText,
} from 'lucide-react';
import { api } from '../../services/api/endpoints';
import { Product, StockReceiptPayload, Company } from '../../types';

interface StockReceiptModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onStockReceived: () => void;
}

export const StockReceiptModal: React.FC<StockReceiptModalProps> = ({
  product,
  isOpen,
  onClose,
  onStockReceived,
}) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [quantity, setQuantity] = useState<number>(100);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [batchNumber, setBatchNumber] = useState('');
  const [manufacturingDate, setManufacturingDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [notes, setNotes] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && product) {
      setCompanyId(product.companyId || (product.company?.id as string) || '');
      setUnitCost(Number(product.purchaseCost || 0));
      setQuantity(100);

      // Default batch format BATCH-YYYYMMDD-SKU
      const today = new Date().toISOString().slice(0, 10);
      setBatchNumber(`BATCH-${today.replace(/-/g, '')}-${product.sku.slice(0, 6)}`);
      setManufacturingDate(today);

      // Default expiry date based on shelf life
      const shelfDays = product.shelfLifeDays || 7;
      const defaultExp = new Date(Date.now() + shelfDays * 86400000).toISOString().slice(0, 10);
      setExpiryDate(defaultExp);

      setReferenceId('');
      setNotes('');
      setErrors({});
      setServerError(null);
      setSuccessMessage(null);

      // Fetch active companies
      api.companies
        .list({ status: 'ACTIVE', limit: 100 })
        .then((res) => setCompanies(res.items || []))
        .catch((err) => console.warn(err.message));
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!companyId) errs.companyId = 'Please select a supplier company';
    if (!quantity || quantity <= 0) errs.quantity = 'Quantity received must be greater than zero';
    if (!expiryDate) errs.expiryDate = 'Expiry date is required for dairy products';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setServerError(null);

    try {
      const payload: StockReceiptPayload = {
        productId: product.id,
        companyId,
        quantity: Math.floor(quantity),
        unitCost: unitCost >= 0 ? unitCost : undefined,
        batchNumber: batchNumber.trim() || undefined,
        manufacturingDate: manufacturingDate || undefined,
        expiryDate,
        referenceId: referenceId.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      await api.inventory.receiveStock(payload);
      setSuccessMessage(`Successfully received ${quantity} ${product.baseUnit}s into inventory.`);
      onStockReceived();

      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to process inward stock receipt';
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
          maxWidth: '620px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
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
            backgroundColor: '#F0FDF4',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: 'var(--color-primary-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-primary)',
              }}
            >
              <PackagePlus size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1F2937', margin: 0 }}>
                Receive Inward Stock
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

          {/* Supplier Company */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Supplier Company <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: `1px solid ${errors.companyId ? '#EF4444' : '#CBD5E1'}`,
                fontSize: '13.5px',
                backgroundColor: '#FFFFFF',
                boxSizing: 'border-box',
              }}
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.companyCode})
                </option>
              ))}
            </select>
          </div>

          {/* Quantity & Unit Cost */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Quantity Received ({product.baseUnit}s) <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${errors.quantity ? '#EF4444' : '#CBD5E1'}`,
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
              {errors.quantity && <span style={{ color: '#EF4444', fontSize: '11px', marginTop: '2px', display: 'block' }}>{errors.quantity}</span>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Unit Purchase Cost (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={unitCost}
                onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Batch Number & Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Batch / Lot Number
              </label>
              <input
                type="text"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13.5px',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Expiry Date <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${errors.expiryDate ? '#EF4444' : '#CBD5E1'}`,
                  fontSize: '13.5px',
                  boxSizing: 'border-box',
                }}
              />
              {errors.expiryDate && <span style={{ color: '#EF4444', fontSize: '11px', marginTop: '2px', display: 'block' }}>{errors.expiryDate}</span>}
            </div>
          </div>

          {/* Reference & Notes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Challan / Inward Ref. No.
              </label>
              <input
                type="text"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                placeholder="e.g. DC-2026-0045"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13.5px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Mfg. Date (Optional)
              </label>
              <input
                type="date"
                value={manufacturingDate}
                onChange={(e) => setManufacturingDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13.5px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Inspection Notes / Quality Remarks
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Milk temperature at arrival: 3.2°C, acidity standard"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
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
              borderTop: '1px solid #E2E8F0',
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
              type="submit"
              disabled={isSubmitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 22px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isSubmitting ? '#94A3B8' : 'var(--color-primary)',
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
                  Receiving Stock...
                </>
              ) : (
                'Confirm Stock Receipt'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
