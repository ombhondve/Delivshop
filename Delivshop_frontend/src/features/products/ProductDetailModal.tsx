import React, { useState, useEffect } from 'react';
import {
  X,
  Package,
  Building2,
  Calendar,
  Thermometer,
  Boxes,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Sliders,
  History,
  Pencil,
  Power,
  Loader2,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import { api } from '../../services/api/endpoints';
import { Product, InventoryBatch } from '../../types';

interface ProductDetailModalProps {
  productId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (product: Product) => void;
  onReceiveStock: (product: Product) => void;
  onAdjustStock: (product: Product) => void;
  onViewLedger: (product: Product) => void;
  onToggleStatus: (product: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  productId,
  isOpen,
  onClose,
  onEdit,
  onReceiveStock,
  onAdjustStock,
  onViewLedger,
  onToggleStatus,
}) => {
  const [product, setProduct] = useState<(Product & { batches: InventoryBatch[] }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && productId) {
      setLoading(true);
      setError(null);
      api.products
        .get(productId)
        .then((data) => {
          setProduct(data);
        })
        .catch((err) => {
          setError(err.message || 'Failed to load product details');
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, productId]);

  if (!isOpen) return null;

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getDaysUntilExpiry = (expiryDateStr: string) => {
    try {
      const exp = new Date(expiryDateStr);
      const now = new Date();
      return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 3600 * 24));
    } catch {
      return 0;
    }
  };

  const margin =
    product && product.price > 0 && (product.purchaseCost ?? 0) > 0
      ? (((product.price - (product.purchaseCost ?? 0)) / product.price) * 100).toFixed(1)
      : null;

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
        zIndex: 50,
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '880px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #D6D3C8',
          overflow: 'hidden',
          animation: 'fadeInScale 0.2s ease-out',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #D6D3C8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FAFAF9',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: 'var(--color-primary-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-primary)',
                overflow: 'hidden',
              }}
            >
              {product?.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Package size={22} />
              )}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1F2937', margin: 0 }}>
                  {product ? product.name : 'Product Details'}
                </h2>
                {product && (
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      backgroundColor: '#F1F5F9',
                      color: '#475569',
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    {product.sku}
                  </span>
                )}
              </div>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0 0' }}>
                {product ? `${product.category} • ${product.packSize}` : 'Loading profile...'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#64748B',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {loading ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748B' }}>
              <Loader2 size={30} className="animate-spin" style={{ margin: '0 auto 12px auto', color: 'var(--color-primary)' }} />
              <div style={{ fontSize: '14px', fontWeight: 600 }}>Loading product metrics...</div>
            </div>
          ) : error || !product ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#991B1B' }}>
              <AlertTriangle size={32} style={{ margin: '0 auto 12px auto', color: '#EF4444' }} />
              <div style={{ fontSize: '15px', fontWeight: 700 }}>Unable to load product profile</div>
              <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>{error}</p>
            </div>
          ) : (
            <>
              {/* Quick Status Bar */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '12px',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '10px',
                  border: '1px solid #D6D3C8',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      backgroundColor: product.isActive ? '#DCFCE7' : '#FEF3C7',
                      color: product.isActive ? '#166534' : '#92400E',
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: product.isActive ? '#16A34A' : '#D97706' }} />
                    {product.isActive ? 'Active for Orders' : 'Inactive'}
                  </span>

                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      backgroundColor:
                        product.stockQuantity === 0
                          ? '#FEE2E2'
                          : product.stockQuantity <= (product.minStockThreshold ?? 10)
                          ? '#FEF3C7'
                          : '#DCFCE7',
                      color:
                        product.stockQuantity === 0
                          ? '#991B1B'
                          : product.stockQuantity <= (product.minStockThreshold ?? 10)
                          ? '#92400E'
                          : '#166534',
                    }}
                  >
                    {product.stockQuantity === 0
                      ? 'Out of Stock'
                      : product.stockQuantity <= (product.minStockThreshold ?? 10)
                      ? 'Low Stock Warning'
                      : 'In Stock'}
                  </span>
                </div>

                {/* Action Buttons Toolbar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => onReceiveStock(product)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-primary)',
                      backgroundColor: 'var(--color-primary)',
                      color: '#FFFFFF',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={14} />
                    Receive Stock
                  </button>

                  <button
                    type="button"
                    onClick={() => onAdjustStock(product)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid #A7AE9F',
                      backgroundColor: '#FFFFFF',
                      color: '#334155',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Sliders size={14} />
                    Adjust Stock
                  </button>

                  <button
                    type="button"
                    onClick={() => onViewLedger(product)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid #A7AE9F',
                      backgroundColor: '#FFFFFF',
                      color: '#334155',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <History size={14} />
                    Ledger
                  </button>

                  <button
                    type="button"
                    onClick={() => onEdit(product)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid #A7AE9F',
                      backgroundColor: '#FFFFFF',
                      color: '#334155',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Pencil size={14} />
                    Edit
                  </button>
                </div>
              </div>

              {/* 3 Metric Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                {/* Available Stock */}
                <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #D6D3C8', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                      On-Hand Stock
                    </span>
                    <Boxes size={18} color="var(--color-primary)" />
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-navy)', marginTop: '6px' }}>
                    {product.stockQuantity.toLocaleString()}{' '}
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748B' }}>{product.baseUnit}s</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                    Min. threshold: {product.minStockThreshold} • Reorder level: {product.reorderQuantity}
                  </div>
                </div>

                {/* Selling & Purchase Price */}
                <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #D6D3C8', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                      Pricing & Margin
                    </span>
                    <DollarSign size={18} color="var(--color-primary)" />
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-primary)', marginTop: '6px' }}>
                    ₹{product.price.toFixed(2)}{' '}
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748B' }}>selling</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                    Cost: ₹{(product.purchaseCost ?? 0).toFixed(2)} {margin ? `• ${margin}% margin` : ''} • {product.taxRate ?? 0}% GST
                  </div>
                </div>

                {/* Supplier Company */}
                <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #D6D3C8', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                      Supplying Company
                    </span>
                    <Building2 size={18} color="var(--color-primary)" />
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '6px' }}>
                    {product.company?.name || 'Assigned Supplier'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                    Code: {product.company?.code || 'N/A'} • Status: {product.company?.status || 'ACTIVE'}
                  </div>
                </div>
              </div>

              {/* Active Batches (FEFO Tracking) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Active Product Batches ({product.batches?.length || 0}) — First Expired, First Out (FEFO)
                  </h3>
                  <button
                    type="button"
                    onClick={() => onReceiveStock(product)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--color-primary)',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Plus size={14} />
                    Receive New Batch
                  </button>
                </div>

                {(!product.batches || product.batches.length === 0) ? (
                  <div style={{ padding: '24px', backgroundColor: '#F8FAFC', borderRadius: '10px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                    No active batches recorded. Receive stock to add your first lot.
                  </div>
                ) : (
                  <div style={{ border: '1px solid #D6D3C8', borderRadius: '10px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #D6D3C8', color: '#64748B', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          <th style={{ padding: '10px 14px' }}>Batch Number</th>
                          <th style={{ padding: '10px 14px' }}>Remaining</th>
                          <th style={{ padding: '10px 14px' }}>Expiry Date</th>
                          <th style={{ padding: '10px 14px' }}>Days Left</th>
                          <th style={{ padding: '10px 14px' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {product.batches.map((batch) => {
                          const daysLeft = getDaysUntilExpiry(batch.expiryDate);
                          const isExpired = daysLeft <= 0;
                          const isUrgent = daysLeft <= 3 && !isExpired;

                          return (
                            <tr key={batch.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>
                                {batch.batchNumber}
                              </td>
                              <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                                {batch.quantityRemaining} / {batch.quantityReceived} {product.baseUnit}s
                              </td>
                              <td style={{ padding: '10px 14px', color: '#64748B' }}>
                                {formatDate(batch.expiryDate)}
                              </td>
                              <td style={{ padding: '10px 14px' }}>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    fontSize: '11.5px',
                                    fontWeight: 700,
                                    backgroundColor: isExpired ? '#FEE2E2' : isUrgent ? '#FEF3C7' : '#DCFCE7',
                                    color: isExpired ? '#991B1B' : isUrgent ? '#92400E' : '#166534',
                                  }}
                                >
                                  {isExpired ? 'EXPIRED' : `${daysLeft} days`}
                                </span>
                              </td>
                              <td style={{ padding: '10px 14px' }}>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    backgroundColor: '#F1F5F9',
                                    color: '#475569',
                                  }}
                                >
                                  {batch.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Dairy Quality Specs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Dairy Specifications & Storage Guidelines
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #D6D3C8' }}>
                    <div style={{ fontSize: '11.5px', color: '#64748B', textTransform: 'uppercase' }}>Fat Content</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#1F2937', marginTop: '2px' }}>
                      {product.fatPercentage ? `${product.fatPercentage}%` : 'Standard'}
                    </div>
                  </div>

                  <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #D6D3C8' }}>
                    <div style={{ fontSize: '11.5px', color: '#64748B', textTransform: 'uppercase' }}>SNF Content</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#1F2937', marginTop: '2px' }}>
                      {product.snfPercentage ? `${product.snfPercentage}%` : 'Standard'}
                    </div>
                  </div>

                  <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #D6D3C8' }}>
                    <div style={{ fontSize: '11.5px', color: '#64748B', textTransform: 'uppercase' }}>Storage Temp</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#1F2937', marginTop: '2px' }}>
                      {product.storageTemperature || '2°C to 4°C Refrigerated'}
                    </div>
                  </div>

                  <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #D6D3C8' }}>
                    <div style={{ fontSize: '11.5px', color: '#64748B', textTransform: 'uppercase' }}>FSSAI License</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1F2937', marginTop: '2px', fontFamily: 'monospace' }}>
                      {product.fssaiLicense || 'FSSAI Verified'}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

