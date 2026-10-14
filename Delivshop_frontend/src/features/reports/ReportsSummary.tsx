import React, { useState } from 'react';
import {
  FileText,
  Search,
  ListFilter,
  Download,
  ShieldCheck,
  AlertCircle,
  Database,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { formatDate } from '../../utils/formatters';

interface AuditEvent {
  id: string;
  action: string;
  category: 'AUTH' | 'SHOP_OPS' | 'DISPATCH' | 'FINANCIAL';
  actor: string;
  role: string;
  target: string;
  ipAddress: string;
  timestamp: string;
  severity: 'INFO' | 'NOTICE' | 'WARNING';
}

export const ReportsSummary: React.FC = () => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const auditEvents: AuditEvent[] = [
    {
      id: 'aud_801',
      action: 'ADMIN_PORTAL_LOGIN',
      category: 'AUTH',
      actor: 'admin@gmail.com',
      role: 'SYSTEM_ADMIN',
      target: 'Auth Gateway / Session Token Issued',
      ipAddress: '103.21.124.8',
      timestamp: '2026-10-14T03:05:12Z',
      severity: 'INFO',
    },
    {
      id: 'aud_802',
      action: 'SHOP_CREDIT_ADJUSTMENT',
      category: 'SHOP_OPS',
      actor: 'admin@gmail.com',
      role: 'SYSTEM_ADMIN',
      target: 'Shop SH-8821: Credit Limit set to ₹50,000',
      ipAddress: '103.21.124.8',
      timestamp: '2026-10-14T03:40:22Z',
      severity: 'NOTICE',
    },
    {
      id: 'aud_803',
      action: 'DISPATCH_BATCH_SEALED',
      category: 'DISPATCH',
      actor: 'dispatcher@delivshop.in',
      role: 'DISPATCH_SUPERVISOR',
      target: 'Route B (Kothrud) Manifest DS-26-8892',
      ipAddress: '192.168.10.45',
      timestamp: '2026-10-14T04:15:00Z',
      severity: 'INFO',
    },
    {
      id: 'aud_804',
      action: 'DELIVERY_DISPUTE_LOGGED',
      category: 'DISPATCH',
      actor: 'driver_ganesh@delivshop.in',
      role: 'DRIVER',
      target: 'Shop SH-5512: 2 leaking crates reported on drop',
      ipAddress: '172.56.88.19',
      timestamp: '2026-10-14T05:22:18Z',
      severity: 'WARNING',
    },
    {
      id: 'aud_805',
      action: 'PAYMENT_COLLECTION_RECORDED',
      category: 'FINANCIAL',
      actor: 'driver_ramesh@delivshop.in',
      role: 'DRIVER',
      target: 'Shop SH-8821: ₹14,850 settled via UPI (Txn: UPI/90128)',
      ipAddress: '172.56.91.4',
      timestamp: '2026-10-14T06:52:10Z',
      severity: 'INFO',
    },
  ];

  const filtered = auditEvents.filter((e) => {
    const matchSearch =
      e.action.toLowerCase().includes(search.toLowerCase()) ||
      e.actor.toLowerCase().includes(search.toLowerCase()) ||
      e.target.toLowerCase().includes(search.toLowerCase());
    const matchCat = !categoryFilter || e.category === categoryFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Compliance & Security Audit Trail</h2>
          <p className="page-desc">
            Immutable log of system logins, credit limit revisions, vehicle dispatch authorizations, and financial collections
          </p>
        </div>
        <div className="page-header-actions">
          <Button variant="secondary" icon={<Download size={14} />}>
            Export Audit Log (CSV)
          </Button>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#DCFCE7', color: '#16805D' }}>
            <Database size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Audit Trail Integrity</span>
            <span className="metric-value">Verified</span>
            <span className="metric-trend" style={{ color: '#16805D' }}>Neon PostgreSQL Ledger</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#FAF6ED', color: '#C7A75A' }}>
            <ShieldCheck size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Active Admin Sessions</span>
            <span className="metric-value">1 Active</span>
            <span className="metric-trend" style={{ color: '#16805D' }}>Bearer JWT authenticated</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>
            <AlertCircle size={22} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Compliance Exceptions</span>
            <span className="metric-value">1 Flagged</span>
            <span className="metric-trend" style={{ color: '#B45309' }}>Damage dispute under review</span>
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
              placeholder="Search audit trail by action, actor email, or target..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search audit trail"
            />
          </div>
        </div>

        <div className="toolbar-filters-group">
          <div className="filter-select-wrapper">
            <ListFilter size={16} className="filter-leading-icon" />
            <select
              className="toolbar-select-field"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by audit category"
            >
              <option value="">All Audit Categories</option>
              <option value="AUTH">Authentication & Sessions</option>
              <option value="SHOP_OPS">Shop Master & Credit</option>
              <option value="DISPATCH">Dispatch & Telematics</option>
              <option value="FINANCIAL">Collections & Invoicing</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <Card
        title="Recorded Operational Audit Events"
        subtitle={`Showing ${filtered.length} timestamped events with actor accountability`}
        noPadding
      >
        <div className="business-table-container">
          <table className="business-table">
            <thead>
              <tr>
                <th>Action Code</th>
                <th>Category</th>
                <th>Actor & Role</th>
                <th>Operation Target</th>
                <th>Origin IP</th>
                <th>Timestamp</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ev) => (
                <tr key={ev.id}>
                  <td>
                    <code style={{ fontWeight: 700, fontSize: '12px' }}>{ev.action}</code>
                  </td>
                  <td>
                    <Badge variant="neutral">{ev.category}</Badge>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#20342C', fontSize: '13px' }}>
                      {ev.actor}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>{ev.role}</div>
                  </td>
                  <td style={{ fontSize: '13px', color: '#20342C', maxWidth: '320px' }}>
                    {ev.target}
                  </td>
                  <td style={{ fontSize: '12px', fontFamily: 'monospace', color: '#64748B' }}>
                    {ev.ipAddress}
                  </td>
                  <td style={{ fontSize: '12px', color: '#64748B' }}>
                    {formatDate(ev.timestamp)}
                  </td>
                  <td>
                    <Badge
                      variant={
                        ev.severity === 'WARNING'
                          ? 'danger'
                          : ev.severity === 'NOTICE'
                          ? 'warning'
                          : 'neutral'
                      }
                    >
                      {ev.severity}
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
