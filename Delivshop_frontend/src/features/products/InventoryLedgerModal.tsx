import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  History,
  Boxes,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';
import { api } from '../../services/api/endpoints';
import { Product, InventoryMovement, PaginatedResult } from '../../types';

interface InventoryLedgerModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InventoryLedgerModal: React.FC<InventoryLedgerModalProps> = ({
  product,
  isOpen,
  onClose,
}) => {
  const [data, setData] = useState<PaginatedResult<InventoryMovement>>({
    items: [],
    total: 0,
    page: 1,
    limit: 15,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [movementType, setMovementType] = useState<string>('');

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.inventory.getMovements({
        productId: product ? product.id : undefined,
        page: currentPage,
        limit: 15,
        search: search.trim() || undefined,
        movementType: movementType || undefined,
      });
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch inventory ledger');
    } finally {
      setLoading(false);
    }
  }, [product, currentPage, search, movementType]);

  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
      fetchMovements();
    }
  }, [isOpen, product, movementType]);

  if (!isOpen) return null;

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  const getMovementBadge = (type: string) => {
    switch (type) {
      case 'OPENING_STOCK':
        return { label: 'Opening Stock', bg: '#EFF6FF', color: '#1D4ED8' };
      case 'PURCHASE_RECEIPT':
        return { label: 'Receipt Inward', bg: '#ECFDF5', color: '#047857' };
      case 'STOCK_ADJUSTMENT_INCREASE':
        return { label: 'Adjustment (+)', bg: '#F0FDF4', color: '#15803D' };
      case 'STOCK_ADJUSTMENT_DECREASE':
        return { label: 'Adjustment (−)', bg: '#FEF3C7', color: '#B45309' };
      case 'ORDER_DISPATCH':
        return { label: 'Order Dispatch', bg: '#F5F3FF', color: '#6D28D9' };
      case 'DAMAGE_WRITE_OFF':
        return { label: 'Damage Disposal', bg: '#FEE2E2', color: '#B91C1C' };
      case 'EXPIRY_DISPOSAL':
        return { label: 'Expired Disposal', bg: '#FEE2E2', color: '#991B1B' };
      default:
        return { label: type, bg: '#F1F5F9', color: '#475569' };
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
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '960px',
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
            backgroundColor: '#FAFAF9',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: 'rgba(18, 61, 50, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#123D32',
              }}
            >
              <History size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1F2937', margin: 0 }}>
                Inventory Audit Ledger
              </h2>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0 0' }}>
                {product ? `Immutable audit trail for ${product.name} (${product.sku})` : 'System-wide stock transactions ledger'}
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

        {/* Toolbar */}
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 240px' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94A3B8' }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setCurrentPage(1);
                    fetchMovements();
                  }
                }}
                placeholder="Search movement #, batch, reference..."
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 32px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <select
              value={movementType}
              onChange={(e) => {
                setMovementType(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: '7px 10px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                backgroundColor: '#FFFFFF',
              }}
            >
              <option value="">All Movement Types</option>
              <option value="PURCHASE_RECEIPT">Receipt Inward</option>
              <option value="ORDER_DISPATCH">Order Dispatch</option>
              <option value="DAMAGE_WRITE_OFF">Damage Disposal</option>
              <option value="EXPIRY_DISPOSAL">Expired Disposal</option>
              <option value="STOCK_ADJUSTMENT_INCREASE">Stock Increase (+)</option>
              <option value="STOCK_ADJUSTMENT_DECREASE">Stock Decrease (−)</option>
              <option value="OPENING_STOCK">Opening Stock</option>
            </select>
          </div>

          <button
            type="button"
            onClick={fetchMovements}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FAFAF9',
              fontSize: '12.5px',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={13} className={loading ? 'spin-icon' : ''} />
            Refresh
          </button>
        </div>

        {/* Ledger Table */}
        <div style={{ overflowY: 'auto', flex: 1, padding: 0 }}>
          {loading ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748B' }}>
              <RefreshCw size={26} className="spin-icon" style={{ margin: '0 auto 10px auto', color: '#168264' }} />
              <div style={{ fontSize: '13.5px', fontWeight: 600 }}>Loading ledger records...</div>
            </div>
          ) : error ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#991B1B' }}>{error}</div>
          ) : data.items.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748B' }}>
              <Boxes size={36} style={{ margin: '0 auto 10px auto', color: '#94A3B8' }} />
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>No ledger movements found</div>
              <p style={{ fontSize: '12.5px', color: '#94A3B8', marginTop: '4px' }}>
                Inventory movements are automatically logged when stock is received, adjusted, or dispatched.
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '10px 14px' }}>Movement #</th>
                  <th style={{ padding: '10px 14px' }}>Date & Time</th>
                  <th style={{ padding: '10px 14px' }}>Product / Lot</th>
                  <th style={{ padding: '10px 14px' }}>Type</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Change</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Balance</th>
                  <th style={{ padding: '10px 14px' }}>Reference / Reason</th>
                  <th style={{ padding: '10px 14px' }}>Actor</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((m) => {
                  const badge = getMovementBadge(m.movementType);
                  const isPositive = m.quantityChange > 0;

                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#1E293B' }}>
                        {m.movementNumber}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#64748B', whiteSpace: 'nowrap' }}>
                        {formatDate(m.createdAt)}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 600, color: '#1F2937' }}>{m.productName || product?.name || 'Dairy Product'}</div>
                        <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                          {m.batchNumber ? `Batch: ${m.batchNumber}` : m.productSku}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: badge.bg,
                            color: badge.color,
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700 }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px',
                            color: isPositive ? '#16A34A' : '#DC2626',
                          }}
                        >
                          {isPositive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                          {isPositive ? `+${m.quantityChange}` : m.quantityChange}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: '#475569' }}>
                        <span style={{ color: '#94A3B8' }}>{m.previousStock}</span> →{' '}
                        <strong style={{ color: '#123D32' }}>{m.newStock}</strong>
                      </td>
                      <td style={{ padding: '10px 14px', maxWidth: '200px' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#334155' }} title={m.reason || ''}>
                          {m.reason || 'Standard operation'}
                        </div>
                        {m.referenceId && (
                          <div style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'monospace' }}>
                            Ref: {m.referenceId}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#64748B', fontSize: '12px' }}>
                        {m.actorName || 'System'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        {data.total > 0 && (
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#FAFAF9',
            }}
          >
            <div style={{ fontSize: '12.5px', color: '#64748B' }}>
              Showing {Math.min((currentPage - 1) * 15 + 1, data.total)} to {Math.min(currentPage * 15, data.total)} of{' '}
              <strong>{data.total}</strong> ledger movements
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1 || loading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: currentPage <= 1 ? '#94A3B8' : '#334155',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                }}
              >
                <ChevronLeft size={14} />
                <span>Prev</span>
              </button>

              <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155', padding: '0 4px' }}>
                {data.page} / {Math.max(1, data.totalPages)}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={currentPage >= data.totalPages || loading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: currentPage >= data.totalPages ? '#94A3B8' : '#334155',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: currentPage >= data.totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
