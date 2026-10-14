import React, { useState } from 'react';
import {
  Wallet,
  Search,
  ListFilter,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  CreditCard,
  Banknote,
  Smartphone,
  Plus,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { formatCurrency, formatDateOnly } from '../../utils/formatters';

interface CollectionRecord {
  id: string;
  receiptNo: string;
  shopId: string;
  shopName: string;
  invoiceNo: string;
  amount: number;
  paidAmount: number;
  method: 'UPI' | 'CASH' | 'CHEQUE' | 'BANK_TRANSFER';
  collectedBy: string;
  date: string;
  status: 'SETTLED' | 'PARTIAL' | 'PENDING' | 'OVERDUE';
}

export const CollectionsLedger: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');

  const sampleLedger: CollectionRecord[] = [
    {
      id: 'col_101',
      receiptNo: 'RCP-2026-0891',
      shopId: 'SH-8821',
      shopName: 'Krishna Dairy & Provisions',
      invoiceNo: 'INV-2603-441',
      amount: 14850,
      paidAmount: 14850,
      method: 'UPI',
      collectedBy: 'Ramesh Powar (Driver #1)',
      date: '2026-10-14T07:15:00Z',
      status: 'SETTLED',
    },
    {
      id: 'col_102',
      receiptNo: 'RCP-2026-0892',
      shopId: 'SH-7740',
      shopName: 'Anand Supermarket & Milk Depot',
      invoiceNo: 'INV-2603-442',
      amount: 22400,
      paidAmount: 15000,
      method: 'CASH',
      collectedBy: 'Sunil Shinde (Driver #2)',
      date: '2026-10-14T07:45:00Z',
      status: 'PARTIAL',
    },
    {
      id: 'col_103',
      receiptNo: 'RCP-2026-0893',
      shopId: 'SH-9104',
      shopName: 'Shree Ganesh Dairy Farm',
      invoiceNo: 'INV-2603-443',
      amount: 8600,
      paidAmount: 8600,
      method: 'BANK_TRANSFER',
      collectedBy: 'Accounts Direct',
      date: '2026-10-14T08:30:00Z',
      status: 'SETTLED',
    },
    {
      id: 'col_104',
      receiptNo: 'RCP-2026-0894',
      shopId: 'SH-5512',
      shopName: 'Mahesh Retail Store',
      invoiceNo: 'INV-2603-444',
      amount: 19200,
      paidAmount: 0,
      method: 'CHEQUE',
      collectedBy: 'Amit Patil (Driver #3)',
      date: '2026-10-13T18:00:00Z',
      status: 'OVERDUE',
    },
    {
      id: 'col_105',
      receiptNo: 'RCP-2026-0895',
      shopId: 'SH-6320',
      shopName: 'Om Sai Dairy Corner',
      invoiceNo: 'INV-2603-445',
      amount: 6750,
      paidAmount: 6750,
      method: 'UPI',
      collectedBy: 'Ramesh Powar (Driver #1)',
      date: '2026-10-14T06:50:00Z',
      status: 'SETTLED',
    },
  ];

  const filtered = sampleLedger.filter((item) => {
    const matchSearch =
      item.shopName.toLowerCase().includes(search.toLowerCase()) ||
      item.shopId.toLowerCase().includes(search.toLowerCase()) ||
      item.receiptNo.toLowerCase().includes(search.toLowerCase()) ||
      item.invoiceNo.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || item.status === statusFilter;
    const matchMethod = !methodFilter || item.method === methodFilter;
    return matchSearch && matchStatus && matchMethod;
  });

  const totalCollectedToday = sampleLedger
    .filter((r) => r.status === 'SETTLED' || r.status === 'PARTIAL')
    .reduce((sum, r) => sum + r.paidAmount, 0);

  const totalOutstanding = sampleLedger.reduce(
    (sum, r) => sum + (r.amount - r.paidAmount),
    0
  );

  const getMethodBadge = (method: CollectionRecord['method']) => {
    switch (method) {
      case 'UPI':
        return (
          <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Smartphone size={12} /> UPI
          </span>
        );
      case 'CASH':
        return (
          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Banknote size={12} /> Cash
          </span>
        );
      case 'BANK_TRANSFER':
        return (
          <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <ArrowUpRight size={12} /> NEFT / RTGS
          </span>
        );
      case 'CHEQUE':
        return (
          <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <CreditCard size={12} /> Cheque
          </span>
        );
    }
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Payments & Accounts Ledger</h2>
          <p className="page-desc">
            Daily morning milk payment collections, driver reconciliations, and outstanding receivables
          </p>
        </div>
        <div className="page-header-actions">
          <Button variant="secondary" icon={<Download size={15} />}>
            Export Day Sheet (CSV)
          </Button>
          <Button variant="primary" icon={<Plus size={16} />}>
            Record Payment
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#DCFCE7', color: '#16805D' }}>
            <CheckCircle2 size={24} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Today's Collections (Shift 1)</span>
            <span className="metric-value">{formatCurrency(totalCollectedToday)}</span>
            <span className="metric-trend" style={{ color: '#16805D' }}>
              4 of 5 shops settled
            </span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#FEE2E2', color: '#B91C1C' }}>
            <AlertCircle size={24} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Outstanding Balance</span>
            <span className="metric-value">{formatCurrency(totalOutstanding)}</span>
            <span className="metric-trend" style={{ color: '#B91C1C' }}>
              Requires driver follow-up
            </span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>
            <Clock size={24} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Pending Driver Inflow</span>
            <span className="metric-value">{formatCurrency(7400)}</span>
            <span className="metric-trend" style={{ color: '#B45309' }}>
              En-route with Driver #2
            </span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#FAF6ED', color: '#C7A75A' }}>
            <Wallet size={24} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Reconciliation Rate</span>
            <span className="metric-value">91.4%</span>
            <span className="metric-trend" style={{ color: '#16805D' }}>
              +3.2% vs last week
            </span>
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
              placeholder="Search by shop name, Shop ID, receipt or invoice..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search payment records"
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
              aria-label="Filter by payment status"
            >
              <option value="">All Statuses</option>
              <option value="SETTLED">Settled</option>
              <option value="PARTIAL">Partial Payment</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>

          <select
            className="toolbar-select-field"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            aria-label="Filter by payment method"
          >
            <option value="">All Payment Modes</option>
            <option value="UPI">UPI / QR Code</option>
            <option value="CASH">Cash</option>
            <option value="BANK_TRANSFER">Bank Transfer (NEFT)</option>
            <option value="CHEQUE">Cheque</option>
          </select>
        </div>
      </div>

      {/* Ledger Table */}
      <Card
        title="Payment & Invoicing Ledger"
        subtitle={`Showing ${filtered.length} recorded transactions for the current billing cycle`}
        noPadding
      >
        <div className="business-table-container">
          <table className="business-table">
            <thead>
              <tr>
                <th>Receipt #</th>
                <th>Shop Detail</th>
                <th>Invoice Ref</th>
                <th>Invoice Total</th>
                <th>Paid Amount</th>
                <th>Mode</th>
                <th>Collected By</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td>
                    <code style={{ fontWeight: 700, fontSize: '12px' }}>{item.receiptNo}</code>
                  </td>
                  <td>
                    <div className="font-semibold text-primary">{item.shopName}</div>
                    <div className="text-secondary text-xs">{item.shopId}</div>
                  </td>
                  <td>
                    <span style={{ fontSize: '12.5px', fontFamily: 'monospace' }}>{item.invoiceNo}</span>
                  </td>
                  <td className="font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatCurrency(item.amount)}
                  </td>
                  <td
                    style={{
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                      color: item.paidAmount < item.amount ? '#B91C1C' : '#16805D',
                    }}
                  >
                    {formatCurrency(item.paidAmount)}
                  </td>
                  <td>{getMethodBadge(item.method)}</td>
                  <td style={{ fontSize: '13px', color: '#20342C' }}>{item.collectedBy}</td>
                  <td style={{ fontSize: '12px', color: '#64748B' }}>{formatDateOnly(item.date)}</td>
                  <td>
                    <Badge
                      variant={
                        item.status === 'SETTLED'
                          ? 'success'
                          : item.status === 'PARTIAL'
                          ? 'warning'
                          : 'danger'
                      }
                    >
                      {item.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
