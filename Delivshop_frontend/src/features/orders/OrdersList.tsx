import React, { useState } from 'react';
import {
  ClipboardList,
  Search,
  ListFilter,
  Eye,
  FileCheck,
  Truck,
  CheckCircle2,
  AlertCircle,
  X,
  Download,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface OrderItem {
  sku: string;
  name: string;
  orderedCrates: number;
  deliveredCrates: number;
  unitPrice: number;
  total: number;
}

interface OrderRecord {
  id: string;
  orderNumber: string;
  shopId: string;
  shopName: string;
  route: string;
  driver: string;
  status: 'PENDING_CONFIRMATION' | 'DISPATCH_PREPARED' | 'IN_TRANSIT' | 'DELIVERED' | 'DISPUTED';
  totalAmount: number;
  paidAmount: number;
  cratesCount: number;
  createdAt: string;
  deliveredAt?: string;
  items: OrderItem[];
  notes?: string;
}

export const OrdersList: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);

  const orders: OrderRecord[] = [
    {
      id: 'ord_101',
      orderNumber: 'DS-26-8891',
      shopId: 'SH-8821',
      shopName: 'Krishna Dairy & Provisions',
      route: 'Route A (Shivajinagar)',
      driver: 'Ramesh Powar',
      status: 'DELIVERED',
      totalAmount: 14850,
      paidAmount: 14850,
      cratesCount: 18,
      createdAt: '2026-10-14T03:15:00Z',
      deliveredAt: '2026-10-14T06:45:00Z',
      items: [
        { sku: 'MLK-FCM-1L', name: 'Full Cream Milk 1L', orderedCrates: 10, deliveredCrates: 10, unitPrice: 816, total: 8160 },
        { sku: 'MLK-COW-500', name: 'Cow Fresh Milk 500ml', orderedCrates: 8, deliveredCrates: 8, unitPrice: 672, total: 5376 },
        { sku: 'DAH-CURD-400', name: 'Set Dahi 400g', orderedCrates: 2, deliveredCrates: 2, unitPrice: 720, total: 1440 },
      ],
    },
    {
      id: 'ord_102',
      orderNumber: 'DS-26-8892',
      shopId: 'SH-7740',
      shopName: 'Anand Supermarket & Milk Depot',
      route: 'Route B (Kothrud)',
      driver: 'Sunil Shinde',
      status: 'IN_TRANSIT',
      totalAmount: 22400,
      paidAmount: 15000,
      cratesCount: 26,
      createdAt: '2026-10-14T03:20:00Z',
      items: [
        { sku: 'MLK-FCM-1L', name: 'Full Cream Milk 1L', orderedCrates: 16, deliveredCrates: 16, unitPrice: 816, total: 13056 },
        { sku: 'MLK-TON-500', name: 'Toned Homogenized Milk 500ml', orderedCrates: 10, deliveredCrates: 10, unitPrice: 624, total: 6240 },
      ],
      notes: 'Driver approaching Kothrud depot. ETA 15 mins.',
    },
    {
      id: 'ord_103',
      orderNumber: 'DS-26-8893',
      shopId: 'SH-9104',
      shopName: 'Shree Ganesh Dairy Farm',
      route: 'Route C (Hadapsar)',
      driver: 'Amit Patil',
      status: 'DELIVERED',
      totalAmount: 8600,
      paidAmount: 8600,
      cratesCount: 12,
      createdAt: '2026-10-14T03:00:00Z',
      deliveredAt: '2026-10-14T06:10:00Z',
      items: [
        { sku: 'MLK-BUF-1L', name: 'Premium Buffalo Milk 1L', orderedCrates: 8, deliveredCrates: 8, unitPrice: 888, total: 7104 },
        { sku: 'PAN-MAL-200', name: 'Malai Paneer 200g', orderedCrates: 2, deliveredCrates: 2, unitPrice: 1840, total: 3680 },
      ],
    },
    {
      id: 'ord_104',
      orderNumber: 'DS-26-8894',
      shopId: 'SH-5512',
      shopName: 'Mahesh Retail Store',
      route: 'Route D (Pimpri)',
      driver: 'Ganesh Deshmukh',
      status: 'DISPUTED',
      totalAmount: 19200,
      paidAmount: 0,
      cratesCount: 22,
      createdAt: '2026-10-14T03:30:00Z',
      items: [
        { sku: 'MLK-FCM-1L', name: 'Full Cream Milk 1L', orderedCrates: 14, deliveredCrates: 12, unitPrice: 816, total: 9792 },
        { sku: 'MLK-COW-500', name: 'Cow Fresh Milk 500ml', orderedCrates: 8, deliveredCrates: 8, unitPrice: 672, total: 5376 },
      ],
      notes: 'Shop reported 2 crates leaking on arrival. Awaiting supervisor inspection.',
    },
    {
      id: 'ord_105',
      orderNumber: 'DS-26-8895',
      shopId: 'SH-6320',
      shopName: 'Om Sai Dairy Corner',
      route: 'Route A (Shivajinagar)',
      driver: 'Ramesh Powar',
      status: 'DISPATCH_PREPARED',
      totalAmount: 6750,
      paidAmount: 6750,
      cratesCount: 9,
      createdAt: '2026-10-14T04:00:00Z',
      items: [
        { sku: 'MLK-TON-500', name: 'Toned Homogenized Milk 500ml', orderedCrates: 9, deliveredCrates: 0, unitPrice: 624, total: 5616 },
      ],
      notes: 'Loaded in cold storage bay #3. Scheduled for next dispatch wave.',
    },
  ];

  const filtered = orders.filter((o) => {
    const matchSearch =
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.shopName.toLowerCase().includes(search.toLowerCase()) ||
      o.shopId.toLowerCase().includes(search.toLowerCase()) ||
      o.driver.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const getStatusBadge = (status: OrderRecord['status']) => {
    switch (status) {
      case 'DELIVERED':
        return <Badge variant="success">Delivered</Badge>;
      case 'IN_TRANSIT':
        return <Badge variant="info">In Transit</Badge>;
      case 'DISPATCH_PREPARED':
        return <Badge variant="neutral">Bay Prepared</Badge>;
      case 'PENDING_CONFIRMATION':
        return <Badge variant="warning">Pending Confirmation</Badge>;
      case 'DISPUTED':
        return <Badge variant="danger">Discrepancy Reported</Badge>;
    }
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Milk Orders & Dispatch Lifecycle</h2>
          <p className="page-desc">
            Track daily milk orders from shop placement to cold crate packing, driver transit, and shop confirmation
          </p>
        </div>
        <div className="page-header-actions">
          <Button variant="secondary" icon={<Download size={15} />}>
            Export Delivery Manifest
          </Button>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#DCFCE7', color: '#16805D' }}>
            <CheckCircle2 size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Delivered Orders</span>
            <span className="metric-value">2 Completed</span>
            <span className="metric-trend" style={{ color: '#16805D' }}>Confirmed by shop pin</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#E0F2FE', color: '#0369A1' }}>
            <Truck size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Active In Transit</span>
            <span className="metric-value">1 Vehicle Run</span>
            <span className="metric-trend" style={{ color: '#0369A1' }}>26 crates on vehicle</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#FEE2E2', color: '#B91C1C' }}>
            <AlertCircle size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Disputed / Shortage</span>
            <span className="metric-value">1 Order</span>
            <span className="metric-trend" style={{ color: '#B91C1C' }}>Leaking crates reported</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="search-filter-toolbar">
        <div className="toolbar-search-form">
          <div className="search-input-wrapper">
            <Search size={18} className="search-input-icon" />
            <input
              type="text"
              className="toolbar-search-input"
              placeholder="Search by order number, shop name, or driver..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search orders"
            />
          </div>
        </div>

        <div className="toolbar-filters-group">
          <div className="filter-select-wrapper">
            <ListFilter size={16} className="filter-leading-icon" />
            <select
              className="toolbar-select-field"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by order status"
            >
              <option value="">All Statuses</option>
              <option value="DELIVERED">Delivered</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="DISPATCH_PREPARED">Bay Prepared</option>
              <option value="DISPUTED">Disputed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <Card
        title="Live Dispatch Manifest"
        subtitle={`Showing ${filtered.length} orders for current shift`}
        noPadding
      >
        <div className="business-table-container">
          <table className="business-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Merchant Store</th>
                <th>Assigned Route & Driver</th>
                <th>Crate Volume</th>
                <th>Total Value</th>
                <th>Order Placed</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id}>
                  <td>
                    <code style={{ fontWeight: 700, fontSize: '12.5px' }}>{o.orderNumber}</code>
                  </td>
                  <td>
                    <div className="font-semibold text-primary">{o.shopName}</div>
                    <div className="text-secondary text-xs">{o.shopId}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '13px', color: '#20342C' }}>{o.driver}</div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>{o.route}</div>
                  </td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                    <span style={{ fontWeight: 600 }}>{o.cratesCount}</span> crates
                  </td>
                  <td className="font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatCurrency(o.totalAmount)}
                  </td>
                  <td style={{ fontSize: '12px', color: '#64748B' }}>
                    {formatDate(o.createdAt)}
                  </td>
                  <td>{getStatusBadge(o.status)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelectedOrder(o)}
                      icon={<Eye size={13} />}
                    >
                      View Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div
            className="modal-container"
            style={{ maxWidth: '650px', width: '92%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Order {selectedOrder.orderNumber}</span>
                  {getStatusBadge(selectedOrder.status)}
                </h3>
                <p className="modal-desc">
                  Merchant: {selectedOrder.shopName} ({selectedOrder.shopId})
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedOrder(null)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Route & Driver Details */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '12px',
                  backgroundColor: '#FFFFFF',
                  padding: '14px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                }}
              >
                <div>
                  <span style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                    Assigned Driver
                  </span>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#20342C' }}>
                    {selectedOrder.driver}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                    Delivery Route
                  </span>
                  <div style={{ fontSize: '13.5px', color: '#20342C' }}>
                    {selectedOrder.route}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                    Total Crates
                  </span>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#20342C' }}>
                    {selectedOrder.cratesCount} Crates
                  </div>
                </div>
              </div>

              {/* Items Breakdown Table */}
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#20342C', marginBottom: '8px' }}>
                  Crate Allocation Breakdown
                </h4>
                <table className="business-table" style={{ fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Ordered</th>
                      <th>Delivered</th>
                      <th>Crate Rate</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item, idx) => (
                      <tr key={idx}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{item.name}</div>
                          <code style={{ fontSize: '11px' }}>{item.sku}</code>
                        </td>
                        <td>{item.orderedCrates} crates</td>
                        <td
                          style={{
                            fontWeight: 600,
                            color: item.deliveredCrates < item.orderedCrates ? '#B91C1C' : '#16805D',
                          }}
                        >
                          {item.deliveredCrates} crates
                        </td>
                        <td>{formatCurrency(item.unitPrice)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {formatCurrency(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700, borderTop: '2px solid #E2E8F0' }}>
                        Order Total:
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, borderTop: '2px solid #E2E8F0', color: '#20342C' }}>
                        {formatCurrency(selectedOrder.totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Notes or Dispute Notice */}
              {selectedOrder.notes && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '6px',
                    backgroundColor: selectedOrder.status === 'DISPUTED' ? '#FEF2F2' : '#F1F5F9',
                    border: `1px solid ${selectedOrder.status === 'DISPUTED' ? '#FECACA' : '#E2E8F0'}`,
                    color: selectedOrder.status === 'DISPUTED' ? '#991B1B' : '#20342C',
                    fontSize: '12.5px',
                  }}
                >
                  <strong>Operational Note:</strong> {selectedOrder.notes}
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button variant="secondary" size="sm" icon={<FileCheck size={14} />}>
                Print Delivery Challan
              </Button>
              <Button variant="primary" size="sm" onClick={() => setSelectedOrder(null)}>
                Close Details
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
