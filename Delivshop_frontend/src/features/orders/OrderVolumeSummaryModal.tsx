import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  RefreshCw,
  Download,
  Package,
  Milk,
  Boxes,
  Store,
  Layers,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Truck,
  Filter,
  FileSpreadsheet,
  AlertCircle,
} from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { api } from '../../services/api/endpoints';
import {
  OrderVolumeSummaryResponse,
  PackagingProductBreakdown,
  ShopWiseOrderSummary,
} from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface OrderVolumeSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
  initialStatus?: string;
}

export const OrderVolumeSummaryModal: React.FC<OrderVolumeSummaryModalProps> = ({
  isOpen,
  onClose,
  initialDate = '',
  initialStatus = '',
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OrderVolumeSummaryResponse | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [dateFilter, setDateFilter] = useState<string>(initialDate);
  const [shopFilter, setShopFilter] = useState<string>('');
  const [productFilter, setProductFilter] = useState<string>('');
  const [packSizeFilter, setPackSizeFilter] = useState<string>('');

  // Expandable rows for shop orders
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.orders.getVolumeSummary({
        status: statusFilter || undefined,
        date: dateFilter || undefined,
        shopId: shopFilter || undefined,
        productId: productFilter || undefined,
        packagingSize: packSizeFilter || undefined,
      });
      setData(res);
    } catch (err: any) {
      console.error('[OrderVolumeSummaryModal] Fetch error:', err);
      setError(err?.message || 'Failed to load consolidated order volume summary.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFilter, shopFilter, productFilter, packSizeFilter]);

  useEffect(() => {
    if (isOpen) {
      fetchSummary();
    }
  }, [isOpen, fetchSummary]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const csvContent = await api.orders.exportVolumeSummary({
        status: statusFilter || undefined,
        date: dateFilter || undefined,
        shopId: shopFilter || undefined,
        productId: productFilter || undefined,
        packagingSize: packSizeFilter || undefined,
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `order-volume-summary-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('[OrderVolumeSummaryModal] Export error:', err);
      alert('Failed to export CSV: ' + (err?.message || 'Unknown error'));
    } finally {
      setExporting(false);
    }
  };

  const formatLitres = (litres: number | null | undefined): string => {
    if (litres == null || isNaN(litres)) return '0 L';
    const rounded = Number(litres.toFixed(2));
    return `${rounded.toLocaleString('en-IN', { maximumFractionDigits: 2 })} L`;
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'DELIVERED':
        return <Badge variant="success">Delivered</Badge>;
      case 'IN_TRANSIT':
      case 'EN_ROUTE_DROPOFF':
        return <Badge variant="info">In Transit</Badge>;
      case 'PREPARING':
      case 'DISPATCH_PREPARED':
        return <Badge variant="neutral">Bay Prepared</Badge>;
      case 'CONFIRMED':
        return <Badge variant="navy">Confirmed</Badge>;
      case 'PENDING':
      case 'PENDING_ASSIGNMENT':
        return <Badge variant="warning">Pending</Badge>;
      case 'DISPUTED':
      case 'FAILED':
        return <Badge variant="danger">Discrepancy</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  if (!isOpen) return null;

  const overview = data?.overview;
  const products = data?.packagingBreakdown || [];
  const shops = data?.shopWiseSummary || [];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(6, 78, 59, 0.45)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 110,
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-volume-summary-title"
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '1100px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(6, 78, 59, 0.25)',
          border: '1px solid #D6D3C8',
          overflow: 'hidden',
          animation: 'fadeInScale 0.2s ease-out',
        }}
      >
        {/* Modal Header — Emerald & Ivory Theme */}
        <div
          style={{
            background: 'linear-gradient(135deg, #064E3B 0%, #047857 100%)',
            padding: '20px 24px',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6EE7B7',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <Milk size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3
                  id="order-volume-summary-title"
                  style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    margin: 0,
                    letterSpacing: '-0.01em',
                  }}
                >
                  Order Volume & Packaging Consolidation Summary
                </h3>
                <span
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 600,
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    color: '#ECFDF5',
                  }}
                >
                  Live Dispatch Aggregator
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#D1FAE5' }}>
                Consolidated liquid volume (L), pouch counts, and crate requirements aggregated across all eligible shop orders
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw size={13} className={loading ? 'spin' : ''} />}
              onClick={fetchSummary}
              disabled={loading}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.25)',
              }}
            >
              Refresh
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Download size={13} />}
              onClick={handleExportCsv}
              disabled={loading || exporting || !data || data.shopWiseSummary.length === 0}
              style={{
                backgroundColor: '#FFFFFF',
                color: '#064E3B',
                border: 'none',
                fontWeight: 600,
              }}
            >
              {exporting ? 'Exporting...' : 'Export CSV'}
            </Button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#D1FAE5',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#D1FAE5';
              }}
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div
          style={{
            padding: '12px 24px',
            backgroundColor: '#FAF8F5',
            borderBottom: '1px solid #D6D3C8',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#064E3B', fontSize: '12.5px', fontWeight: 600 }}>
              <Filter size={15} />
              <span>Filter Scope:</span>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                fontSize: '12.5px',
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1px solid #A7AE9F',
                backgroundColor: '#FFFFFF',
                color: '#1F2937',
              }}
              aria-label="Filter by order status"
            >
              <option value="">Active Dispatch (Excl. Cancelled)</option>
              <option value="ALL">All Statuses (Incl. All Records)</option>
              <option value="PENDING">Pending Orders Only</option>
              <option value="CONFIRMED">Confirmed Orders Only</option>
              <option value="PREPARING">Bay Prepared Only</option>
              <option value="IN_TRANSIT">In Transit Only</option>
              <option value="DELIVERED">Delivered Orders Only</option>
              <option value="DISPUTED">Disputed Shortages Only</option>
            </select>

            {/* Date Filter */}
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{
                fontSize: '12.5px',
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid #A7AE9F',
                backgroundColor: '#FFFFFF',
                color: '#1F2937',
              }}
              aria-label="Filter by delivery date"
            />
            {dateFilter && (
              <button
                type="button"
                onClick={() => setDateFilter('')}
                style={{
                  fontSize: '11px',
                  color: '#64748B',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Clear Date
              </button>
            )}

            {/* Packaging Size Quick Filter */}
            <select
              value={packSizeFilter}
              onChange={(e) => setPackSizeFilter(e.target.value)}
              style={{
                fontSize: '12.5px',
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1px solid #A7AE9F',
                backgroundColor: '#FFFFFF',
                color: '#1F2937',
              }}
              aria-label="Filter by package size"
            >
              <option value="">All Package Sizes</option>
              <option value="500ml">500 ml Pouches</option>
              <option value="1L">1 L Pouches / Tins</option>
              <option value="200ml">200 ml Pouches</option>
              <option value="500g">500 g Cups / Blocks</option>
              <option value="200g">200 g Packs</option>
              <option value="1kg">1 kg Blocks</option>
            </select>
          </div>

          {/* Included Statuses Indicator */}
          {overview && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#475569' }}>
              <span style={{ fontWeight: 600 }}>Included Statuses:</span>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {overview.includedStatuses.length > 0 ? (
                  overview.includedStatuses.map((st) => (
                    <span
                      key={st}
                      style={{
                        backgroundColor: '#ECFDF5',
                        color: '#064E3B',
                        border: '1px solid #A7F3D0',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        fontSize: '11px',
                      }}
                    >
                      {st}
                    </span>
                  ))
                ) : (
                  <span>None matching</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', backgroundColor: '#FAF8F5' }}>
          {loading && !data ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: '#047857' }}>
              <RefreshCw size={28} className="spin" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: '14px', fontWeight: 600 }}>Calculating order volume and packaging requirements...</p>
              <p style={{ fontSize: '12px', color: '#64748B' }}>Querying live database across eligible shop orders</p>
            </div>
          ) : error ? (
            <div
              style={{
                padding: '24px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '10px',
                color: '#991B1B',
                textAlign: 'center',
              }}
            >
              <AlertCircle size={32} style={{ margin: '0 auto 8px', color: '#DC2626' }} />
              <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700 }}>Unable to Load Summary</h4>
              <p style={{ margin: '0 0 16px', fontSize: '13px' }}>{error}</p>
              <Button variant="secondary" size="sm" onClick={fetchSummary}>
                Try Again
              </Button>
            </div>
          ) : !overview || overview.totalEligibleOrders === 0 ? (
            <div
              style={{
                padding: '60px 24px',
                textAlign: 'center',
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px dashed #D6D3C8',
              }}
            >
              <Package size={42} style={{ margin: '0 auto 12px', color: '#9CA3AF' }} />
              <h4 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                No Matching Orders Found
              </h4>
              <p style={{ margin: '0 auto 16px', fontSize: '13px', color: '#64748B', maxWidth: '400px' }}>
                There are no orders matching the selected status or date filters. Adjust the filters above to inspect other dispatch runs.
              </p>
              <Button variant="secondary" size="sm" onClick={() => { setStatusFilter(''); setDateFilter(''); setPackSizeFilter(''); }}>
                Reset All Filters
              </Button>
            </div>
          ) : (
            <>
              {/* Incomplete Packaging Warning (if any product has missing crate capacity) */}
              {overview.hasIncompletePackaging && (
                <div
                  style={{
                    backgroundColor: '#FFFBEB',
                    border: '1px solid #FCD34D',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: '#92400E',
                    fontSize: '12.5px',
                  }}
                >
                  <AlertTriangle size={18} style={{ color: '#D97706', flexShrink: 0 }} />
                  <div>
                    <strong>Crate Configuration Notice:</strong> One or more products do not have crate capacity (units per crate) specified in the product catalogue. Total crate counts only include products with verified crate packaging rules.
                  </div>
                </div>
              )}

              {/* 1. Overview KPI Cards (6 Cards) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '12px',
                  marginBottom: '20px',
                }}
              >
                {/* 1. Eligible Orders */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: '14px 16px',
                    borderRadius: '10px',
                    border: '1px solid #D6D3C8',
                    borderLeft: '4px solid #047857',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748B', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                    <span>Eligible Orders</span>
                    <Clock size={14} style={{ color: '#047857' }} />
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: '#064E3B', marginTop: '4px' }}>
                    {overview.totalEligibleOrders}
                  </div>
                  <div style={{ fontSize: '11px', color: '#059669', marginTop: '2px' }}>
                    Active dispatch runs
                  </div>
                </div>

                {/* 2. Total Liquid Volume (L) */}
                <div
                  style={{
                    backgroundColor: '#ECFDF5',
                    padding: '14px 16px',
                    borderRadius: '10px',
                    border: '1px solid #A7F3D0',
                    borderLeft: '4px solid #059669',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#064E3B', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>
                    <span>Total Liquid Volume</span>
                    <Milk size={15} style={{ color: '#059669' }} />
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#064E3B', marginTop: '4px' }}>
                    {formatLitres(overview.totalLiquidVolumeLitres)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#047857', marginTop: '2px' }}>
                    Liquid dairy only (excl. solids)
                  </div>
                </div>

                {/* 3. Total Individual Packages */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: '14px 16px',
                    borderRadius: '10px',
                    border: '1px solid #D6D3C8',
                    borderLeft: '4px solid #0284C7',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748B', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                    <span>Total Packages</span>
                    <Package size={14} style={{ color: '#0284C7' }} />
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: '#0C4A6E', marginTop: '4px' }}>
                    {overview.totalPackagesRequired.toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '11px', color: '#0284C7', marginTop: '2px' }}>
                    Pouches, cups & packs
                  </div>
                </div>

                {/* 4. Total Crates Required */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: '14px 16px',
                    borderRadius: '10px',
                    border: '1px solid #D6D3C8',
                    borderLeft: '4px solid #D97706',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748B', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                    <span>Total Crates</span>
                    <Boxes size={14} style={{ color: '#D97706' }} />
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: '#78350F', marginTop: '4px' }}>
                    {overview.totalCratesRequired != null ? overview.totalCratesRequired : '—'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#B45309', marginTop: '2px' }}>
                    {overview.hasIncompletePackaging ? 'Where capacity verified' : 'Verified full crates'}
                  </div>
                </div>

                {/* 5. Distinct Products */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: '14px 16px',
                    borderRadius: '10px',
                    border: '1px solid #D6D3C8',
                    borderLeft: '4px solid #7C3AED',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748B', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                    <span>Distinct Products</span>
                    <Layers size={14} style={{ color: '#7C3AED' }} />
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: '#4C1D95', marginTop: '4px' }}>
                    {overview.distinctProductsCount}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6D28D9', marginTop: '2px' }}>
                    Catalogue items in run
                  </div>
                </div>

                {/* 6. Included Shops */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: '14px 16px',
                    borderRadius: '10px',
                    border: '1px solid #D6D3C8',
                    borderLeft: '4px solid #059669',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748B', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                    <span>Included Shops</span>
                    <Store size={14} style={{ color: '#059669' }} />
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: '#064E3B', marginTop: '4px' }}>
                    {overview.includedShopsCount}
                  </div>
                  <div style={{ fontSize: '11px', color: '#047857', marginTop: '2px' }}>
                    Receiving merchant stores
                  </div>
                </div>
              </div>

              {/* 2. Packaging Breakdown by Product Table */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid #D6D3C8',
                  overflow: 'hidden',
                  marginBottom: '20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div
                  style={{
                    padding: '14px 18px',
                    borderBottom: '1px solid #E2E8F0',
                    backgroundColor: '#F8FAFC',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                      Packaging Breakdown by Product & Size
                    </h4>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>
                      Calculated liquid volume in litres and total unit package requirements
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 600,
                      backgroundColor: '#E0F2FE',
                      color: '#0369A1',
                      padding: '3px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    {products.length} Products Grouped
                  </span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table className="business-table" style={{ fontSize: '12.5px', margin: 0 }}>
                    <thead>
                      <tr>
                        <th>Product Name</th>
                        <th>SKU</th>
                        <th>Packaging Type</th>
                        <th>Package Size</th>
                        <th style={{ textAlign: 'right' }}>Total Packages</th>
                        <th style={{ textAlign: 'right' }}>Total Volume (L)</th>
                        <th style={{ textAlign: 'right' }}>Total Crates</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p) => (
                        <tr key={`${p.productId}_${p.packageSize}`}>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.productName}</div>
                            <div style={{ fontSize: '11px', color: '#64748B' }}>{p.category}</div>
                          </td>
                          <td>
                            <code style={{ fontSize: '11.5px', fontWeight: 600 }}>{p.sku}</code>
                          </td>
                          <td>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 7px',
                                borderRadius: '4px',
                                backgroundColor: '#F1F5F9',
                                color: '#334155',
                                fontSize: '11.5px',
                                fontWeight: 500,
                              }}
                            >
                              {p.packagingType}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{p.packageSize}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                            {p.totalPackages.toLocaleString('en-IN')} pkts
                          </td>
                          <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {p.isLiquid ? (
                              <span style={{ fontWeight: 700, color: '#047857' }}>
                                {formatLitres(p.totalVolumeLitres)}
                              </span>
                            ) : (
                              <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                                Not applicable {p.totalWeightKg != null ? `(${p.totalWeightKg} kg)` : ''}
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {p.isCrateCapacityKnown && p.totalCrates != null ? (
                              <div>
                                <span style={{ fontWeight: 600 }}>{p.totalCrates}</span> crates
                                {p.crateCapacity && (
                                  <div style={{ fontSize: '10.5px', color: '#64748B' }}>
                                    ({p.crateCapacity} pkts/crate)
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  color: '#B45309',
                                  backgroundColor: '#FEF3C7',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: 500,
                                }}
                                title={p.missingConfigReason || 'Missing crate configuration'}
                              >
                                <AlertTriangle size={11} />
                                Config incomplete
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ backgroundColor: '#F8FAFC', fontWeight: 700, borderTop: '2px solid #CBD5E1' }}>
                        <td colSpan={4} style={{ textAlign: 'right' }}>
                          Consolidated Product Totals:
                        </td>
                        <td style={{ textAlign: 'right', color: '#0C4A6E' }}>
                          {overview.totalPackagesRequired.toLocaleString('en-IN')} pkts
                        </td>
                        <td style={{ textAlign: 'right', color: '#047857' }}>
                          {formatLitres(overview.totalLiquidVolumeLitres)}
                        </td>
                        <td style={{ textAlign: 'right', color: '#78350F' }}>
                          {overview.totalCratesRequired != null ? `${overview.totalCratesRequired} crates` : '—'}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* 3. Shop-Wise Order Summary Table */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid #D6D3C8',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div
                  style={{
                    padding: '14px 18px',
                    borderBottom: '1px solid #E2E8F0',
                    backgroundColor: '#F8FAFC',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                      Shop-Wise Distribution Requirements
                    </h4>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>
                      Individual shop order allocations. Click any shop order to inspect itemized package breakdown.
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 600,
                      backgroundColor: '#DCFCE7',
                      color: '#065F46',
                      padding: '3px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    {shops.length} Orders Reconciled
                  </span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table className="business-table" style={{ fontSize: '12.5px', margin: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ width: '32px' }}></th>
                        <th>Shop Name</th>
                        <th>Order Reference</th>
                        <th>Order Status</th>
                        <th>Assigned Driver & Route</th>
                        <th style={{ textAlign: 'right' }}>Total Volume (L)</th>
                        <th style={{ textAlign: 'right' }}>Total Packages</th>
                        <th style={{ textAlign: 'right' }}>Total Crates</th>
                        <th>Dispatch Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shops.map((s) => {
                        const isExpanded = expandedOrders.has(s.orderId);
                        return (
                          <React.Fragment key={s.orderId}>
                            <tr
                              style={{
                                cursor: 'pointer',
                                backgroundColor: isExpanded ? '#F0FDF4' : undefined,
                              }}
                              onClick={() => toggleOrderExpand(s.orderId)}
                            >
                              <td>
                                <button
                                  type="button"
                                  style={{
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    color: '#047857',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                  aria-label="Expand order details"
                                >
                                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                </button>
                              </td>
                              <td>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.shopName}</div>
                                <div style={{ fontSize: '11px', color: '#64748B' }}>{s.shopCode}</div>
                              </td>
                              <td>
                                <code style={{ fontSize: '12px', fontWeight: 700 }}>{s.orderNumber}</code>
                              </td>
                              <td>{getStatusBadge(s.orderStatus)}</td>
                              <td>
                                <div style={{ fontSize: '12px', color: '#1F2937' }}>{s.driverName}</div>
                                <div style={{ fontSize: '11px', color: '#64748B' }}>{s.routeName}</div>
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: '#047857', fontVariantNumeric: 'tabular-nums' }}>
                                {formatLitres(s.totalLiquidVolumeLitres)}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                                {s.totalPackages} pkts
                              </td>
                              <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                {s.isCrateCapacityKnown && s.totalCrates != null ? (
                                  <span style={{ fontWeight: 600 }}>{s.totalCrates} crates</span>
                                ) : (
                                  <span style={{ fontSize: '11px', color: '#B45309' }}>Config incomplete</span>
                                )}
                              </td>
                              <td>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: '#F1F5F9',
                                    fontSize: '11px',
                                    fontWeight: 500,
                                  }}
                                >
                                  {s.dispatchStatus}
                                </span>
                              </td>
                            </tr>

                            {/* Expanded Item-Level Packaging Breakdown */}
                            {isExpanded && (
                              <tr style={{ backgroundColor: '#F8FAFC' }}>
                                <td colSpan={9} style={{ padding: '12px 18px 16px 48px' }}>
                                  <div
                                    style={{
                                      backgroundColor: '#FFFFFF',
                                      borderRadius: '8px',
                                      border: '1px solid #E2E8F0',
                                      padding: '12px 14px',
                                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        color: '#064E3B',
                                        marginBottom: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                      }}
                                    >
                                      <Milk size={14} />
                                      <span>Order Items & Crate Allocations for {s.shopName}:</span>
                                    </div>

                                    <table style={{ width: '100%', fontSize: '11.5px', borderCollapse: 'collapse' }}>
                                      <thead>
                                        <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', textAlign: 'left' }}>
                                          <th style={{ padding: '4px 8px' }}>Product</th>
                                          <th style={{ padding: '4px 8px' }}>Size / Packaging</th>
                                          <th style={{ padding: '4px 8px', textAlign: 'right' }}>Ordered Packages</th>
                                          <th style={{ padding: '4px 8px', textAlign: 'right' }}>Liquid Volume (L)</th>
                                          <th style={{ padding: '4px 8px', textAlign: 'right' }}>Crates</th>
                                          <th style={{ padding: '4px 8px', textAlign: 'right' }}>Line Total</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {s.items.map((it) => (
                                          <tr key={it.itemId} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                            <td style={{ padding: '6px 8px', fontWeight: 600 }}>
                                              {it.productName}
                                              <span style={{ fontSize: '10.5px', color: '#64748B', marginLeft: '6px' }}>({it.sku})</span>
                                            </td>
                                            <td style={{ padding: '6px 8px' }}>
                                              {it.packageSize} {it.packagingType}
                                            </td>
                                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>
                                              {it.quantity} pkts
                                            </td>
                                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: it.isLiquid ? '#047857' : '#64748B' }}>
                                              {it.isLiquid ? formatLitres(it.volumeLitres) : (it.weightKg != null ? `${it.weightKg} kg (Solid)` : 'Solid product')}
                                            </td>
                                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                                              {it.cratesCount != null ? `${it.cratesCount} crates` : '—'}
                                            </td>
                                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>
                                              {formatCurrency(it.totalPrice)}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ backgroundColor: '#F8FAFC', fontWeight: 700, borderTop: '2px solid #CBD5E1' }}>
                        <td colSpan={5} style={{ textAlign: 'right' }}>
                          Consolidated Shop Totals:
                        </td>
                        <td style={{ textAlign: 'right', color: '#047857' }}>
                          {formatLitres(overview.totalLiquidVolumeLitres)}
                        </td>
                        <td style={{ textAlign: 'right', color: '#0C4A6E' }}>
                          {overview.totalPackagesRequired.toLocaleString('en-IN')} pkts
                        </td>
                        <td style={{ textAlign: 'right', color: '#78350F' }}>
                          {overview.totalCratesRequired != null ? `${overview.totalCratesRequired} crates` : '—'}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '14px 24px',
            backgroundColor: '#FFFFFF',
            borderTop: '1px solid #D6D3C8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '12px', color: '#64748B' }}>
            {data?.metadata?.generatedAt && (
              <span>Report generated at {new Date(data.metadata.generatedAt).toLocaleTimeString()}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Button
              variant="secondary"
              size="sm"
              icon={<FileSpreadsheet size={14} />}
              onClick={handleExportCsv}
              disabled={loading || exporting || !data || data.shopWiseSummary.length === 0}
            >
              {exporting ? 'Generating CSV...' : 'Export Complete Manifest'}
            </Button>
            <Button variant="primary" size="sm" onClick={onClose}>
              Close Summary
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
