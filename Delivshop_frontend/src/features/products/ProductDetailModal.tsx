import React, { useState, useEffect } from 'react';
import {
  X,
  Package,
  Building2,
  Boxes,
  DollarSign,
  Pencil,
  Power,
  Loader2,
  ShieldCheck,
  Tag,
  Truck,
} from 'lucide-react';
import { api } from '../../services/api/endpoints';
import { Product } from '../../types';

interface ProductDetailModalProps {
  productId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (product: Product) => void;
  onToggleStatus: (product: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  productId,
  isOpen,
  onClose,
  onEdit,
  onToggleStatus,
}) => {
  const [product, setProduct] = useState<Product | null>(null);
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
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '820px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid #D6D3C8',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
              <Package size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {product?.name || 'Product Details'}
              </h2>
              <span style={{ fontSize: '12px', color: '#64748B', fontFamily: 'monospace' }}>
                SKU: {product?.sku || '—'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>
              <Loader2 size={32} className="spin-icon" style={{ margin: '0 auto 12px auto', color: 'var(--color-primary)' }} />
              <div>Loading product specifications...</div>
            </div>
          ) : error ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#DC2626' }}>
              <div>{error}</div>
            </div>
          ) : !product ? null : (
            <>
              {/* Product Header Row & Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                      backgroundColor: '#EFF6FF',
                      color: '#1D4ED8',
                    }}
                  >
                    <Truck size={13} />
                    Direct Supplier-to-Shop
                  </span>
                </div>

                {/* Action Buttons Toolbar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => onEdit(product)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 14px',
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
                    Edit Product
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleStatus(product)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: product.isActive ? '#FDE68A' : '#BBF7D0',
                      backgroundColor: product.isActive ? '#FFFBEB' : '#F0FDF4',
                      color: product.isActive ? '#B45309' : '#15803D',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Power size={14} />
                    {product.isActive ? 'Deactivate' : 'Reactivate'}
                  </button>
                </div>
              </div>

              {/* 3 Metric Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                {/* Packaging & Unit */}
                <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #D6D3C8', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                      Packaging & Unit
                    </span>
                    <Boxes size={18} color="var(--color-primary)" />
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-navy)', marginTop: '6px' }}>
                    {product.packSize}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                    Base Unit: {product.baseUnit} • Units/Pack: {product.unitsPerPack}
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
                  <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-primary)', marginTop: '6px' }}>
                    ₹{product.price.toFixed(2)}{' '}
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748B' }}>selling</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                    Agreed Cost: ₹{(product.purchaseCost ?? 0).toFixed(2)} {margin ? `• ${margin}% margin` : ''} • {product.taxRate ?? 0}% GST
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

              {/* Direct Supplier-to-Shop Distribution Overview */}
              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Truck size={16} color="var(--color-primary)" />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Direct Distribution Workflow
                  </span>
                </div>
                <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.5 }}>
                  This product is obtained directly from <strong>{product.company?.name || 'the assigned supplier company'}</strong> upon shop order placement. Drivers collect the required quantities during assigned delivery runs and transport them directly to shop premises without warehouse staging.
                </div>
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
