import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import {
  Search,
  Phone,
  Truck,
  Plus,
  ShieldCheck,
  UserCheck,
  Users,
  ListFilter,
  Power,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Eye,
  Pencil,
  Key,
  Download,
  Clock,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
  Radio,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { api } from '../../services/api/endpoints';
import { DriverUser, DriverRosterSummary } from '../../types';
import { AddDriverModal } from './AddDriverModal';
import { DeleteConfirmModal } from '../../components/common/DeleteConfirmModal';
import { formatDate } from '../../utils/formatters';
import { useNavigation } from '../../context/NavigationContext';

export const DriversRoster: React.FC = () => {
  const [drivers, setDrivers] = useState<DriverUser[]>([]);
  const [summary, setSummary] = useState<DriverRosterSummary>({
    totalDrivers: 0,
    activeDrivers: 0,
    availableDrivers: 0,
    onDeliveryDrivers: 0,
    inactiveDrivers: 0,
    attentionRequired: 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  // Configurable Pagination States (Default: 7 per page)
  const [pageSize, setPageSize] = useState<number>(7);
  const [page, setPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Status Modal States
  const [statusModalDriver, setStatusModalDriver] = useState<DriverUser | null>(null);
  const [statusModalLoading, setStatusModalLoading] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  // Modals state
  const { navigate } = useNavigation();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteDriver, setDeleteDriver] = useState<DriverUser | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Reset page to 1 whenever filters, search, or sorting changes
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, sortBy, sortOrder]);

  const fetchRoster = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [driverRes, summaryData] = await Promise.all([
        api.deliveries.listAllDrivers({
          search: search.trim() || undefined,
          status: statusFilter,
          sortBy,
          sortOrder,
          page,
          limit: pageSize,
        }),
        api.deliveries.getRosterSummary(),
      ]);

      if (driverRes && Array.isArray(driverRes.drivers)) {
        setDrivers(driverRes.drivers);
        const total = typeof driverRes.total === 'number' ? driverRes.total : driverRes.drivers.length;
        setTotalCount(total);
        setTotalPages(typeof driverRes.totalPages === 'number' ? driverRes.totalPages : Math.max(1, Math.ceil(total / pageSize)));
      } else if (driverRes && Array.isArray(driverRes.items)) {
        setDrivers(driverRes.items);
        const total = typeof driverRes.total === 'number' ? driverRes.total : driverRes.items.length;
        setTotalCount(total);
        setTotalPages(typeof driverRes.totalPages === 'number' ? driverRes.totalPages : Math.max(1, Math.ceil(total / pageSize)));
      } else if (Array.isArray(driverRes)) {
        const start = (page - 1) * pageSize;
        setDrivers(driverRes.slice(start, start + pageSize));
        setTotalCount(driverRes.length);
        setTotalPages(Math.max(1, Math.ceil(driverRes.length / pageSize)));
      } else {
        setDrivers([]);
        setTotalCount(0);
        setTotalPages(1);
      }

      setSummary(summaryData);
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err: any) {
      setError(err.message || 'Failed to load driver roster from server');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, sortBy, sortOrder, page, pageSize]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  // Handle page size change with reset to page 1
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  // Handle driver status update confirmation
  const handleConfirmStatusChange = async () => {
    if (!statusModalDriver) return;
    const targetDriver = statusModalDriver;
    const nextStatus = !targetDriver.is_active;
    const actionLabel = nextStatus ? 'activate' : 'deactivate';

    try {
      setStatusModalLoading(true);
      setStatusUpdatingId(targetDriver.id);

      const reason = nextStatus
        ? 'Employee reactivated by admin'
        : 'Employee deactivated by admin';

      await api.deliveries.updateDriverStatus(targetDriver.id, nextStatus, reason);

      showToast(
        `Driver ${targetDriver.name} successfully ${nextStatus ? 'activated' : 'deactivated'}`
      );
      setStatusModalDriver(null);
      await fetchRoster();
    } catch (err: any) {
      showToast(err?.message || `Failed to ${actionLabel} driver`, 'error');
    } finally {
      setStatusModalLoading(false);
      setStatusUpdatingId(null);
    }
  };



  const handleExportRoster = () => {
    try {
      const headers = ['Driver Name', 'Employee ID', 'Phone', 'Email', 'Assigned Route', 'Status', 'Active Deliveries', 'Completed Deliveries'];
      const rows = drivers.map((d) => [
        `"${d.name}"`,
        `"${d.employee_id || ''}"`,
        `"${d.phone || ''}"`,
        `"${d.email}"`,
        `"${d.assigned_route || ''}"`,
        `"${d.status || (d.is_active ? 'ACTIVE' : 'INACTIVE')}"`,
        d.active_deliveries || 0,
        d.completed_deliveries || 0,
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Delivshop_Drivers_Roster_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Drivers roster exported successfully');
    } catch (err: any) {
      showToast('Failed to export roster', 'error');
    }
  };

  const getOperationalStatusBadge = (d: DriverUser) => {
    if (!d.is_active) {
      return <Badge variant="neutral">OFF DUTY</Badge>;
    }
    if ((d.active_deliveries || 0) > 0 || d.status === 'ON_DELIVERY') {
      return <Badge variant="info">ON DELIVERY</Badge>;
    }
    return <Badge variant="success">AVAILABLE</Badge>;
  };

  return (
    <div className="page-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 1200,
            padding: '10px 16px',
            borderRadius: '8px',
            backgroundColor: toastMessage.type === 'success' ? 'var(--color-navy)' : 'var(--color-danger)',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.2s ease-in-out',
          }}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 size={16} color="var(--color-success)" /> : <AlertCircle size={16} color="#FECACA" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 1. Page Header */}
      <div className="page-header" style={{ marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 className="page-title">Drivers Roster</h1>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '2px 8px',
                backgroundColor: 'var(--color-success-bg)',
                border: '1px solid #BBF7D0',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--color-success)',
              }}
            >
              <Radio size={11} className="spin-icon" />
              <span>Live Database</span>
            </div>
          </div>
          <p className="page-desc">
            Manage driver accounts, availability, assignments, and delivery performance.
            <span style={{ marginLeft: '10px', color: '#94A3B8', fontSize: '11.5px' }}>
              Last synchronized: {lastSyncTime}
            </span>
          </p>
        </div>

        <div className="page-header-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={handleExportRoster}
            disabled={drivers.length === 0}
            icon={<Download size={15} />}
          >
            Export
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={fetchRoster}
            disabled={loading}
            icon={<RefreshCw size={15} className={loading ? 'spin-icon' : ''} />}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={() => setIsAddModalOpen(true)}
            icon={<Plus size={16} />}
          >
            Add Driver
          </Button>
        </div>
      </div>

      {/* 2. Compact Clickable 6-Card KPI Summary Strip */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
        {/* 1. Total Drivers */}
        <div
          className="metric-card"
          onClick={() => setStatusFilter('ALL')}
          style={{
            cursor: 'pointer',
            borderColor: statusFilter === 'ALL' ? 'var(--color-primary)' : undefined,
            backgroundColor: statusFilter === 'ALL' ? 'var(--color-primary-subtle)' : undefined,
          }}
          title="Click to view all registered drivers"
        >
          <div className="metric-icon" style={{ backgroundColor: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
            <Users size={18} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Total Drivers</span>
            <span className="metric-value">{summary.totalDrivers}</span>
            <span className="metric-trend" style={{ color: 'var(--color-success)' }}>100% verified</span>
          </div>
        </div>

        {/* 2. Active Drivers */}
        <div
          className="metric-card"
          onClick={() => setStatusFilter('ACTIVE')}
          style={{
            cursor: 'pointer',
            borderColor: statusFilter === 'ACTIVE' ? 'var(--color-primary)' : undefined,
            backgroundColor: statusFilter === 'ACTIVE' ? 'var(--color-primary-subtle)' : undefined,
          }}
          title="Click to filter active accounts"
        >
          <div className="metric-icon" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
            <ShieldCheck size={18} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Active Drivers</span>
            <span className="metric-value">{summary.activeDrivers}</span>
            <span className="metric-trend" style={{ color: 'var(--color-success)' }}>Authorized fleet</span>
          </div>
        </div>

        {/* 3. Available Drivers */}
        <div
          className="metric-card"
          onClick={() => setStatusFilter('AVAILABLE')}
          style={{
            cursor: 'pointer',
            borderColor: statusFilter === 'AVAILABLE' ? 'var(--color-primary)' : undefined,
            backgroundColor: statusFilter === 'AVAILABLE' ? 'var(--color-primary-subtle)' : undefined,
          }}
          title="Click to filter available drivers for order dispatch"
        >
          <div className="metric-icon" style={{ backgroundColor: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
            <UserCheck size={18} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Available Drivers</span>
            <span className="metric-value">{summary.availableDrivers}</span>
            <span className="metric-trend" style={{ color: 'var(--color-primary)' }}>Ready for dispatch</span>
          </div>
        </div>

        {/* 4. Drivers on Delivery */}
        <div
          className="metric-card"
          onClick={() => setStatusFilter('ON_DELIVERY')}
          style={{
            cursor: 'pointer',
            borderColor: statusFilter === 'ON_DELIVERY' ? 'var(--color-primary)' : undefined,
            backgroundColor: statusFilter === 'ON_DELIVERY' ? 'var(--color-primary-subtle)' : undefined,
          }}
          title="Click to filter drivers currently on delivery"
        >
          <div className="metric-icon" style={{ backgroundColor: '#EDE9FE', color: '#6D28D9' }}>
            <Truck size={18} />
          </div>
          <div className="metric-info">
            <span className="metric-title">On Delivery</span>
            <span className="metric-value">{summary.onDeliveryDrivers}</span>
            <span className="metric-trend" style={{ color: '#6D28D9' }}>Active drop-offs</span>
          </div>
        </div>

        {/* 5. Inactive Drivers */}
        <div
          className="metric-card"
          onClick={() => setStatusFilter('INACTIVE')}
          style={{
            cursor: 'pointer',
            borderColor: statusFilter === 'INACTIVE' ? 'var(--color-primary)' : undefined,
            backgroundColor: statusFilter === 'INACTIVE' ? 'var(--color-primary-subtle)' : undefined,
          }}
          title="Click to filter inactive or deactivated drivers"
        >
          <div className="metric-icon" style={{ backgroundColor: '#F1F5F9', color: '#64748B' }}>
            <Power size={18} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Inactive Drivers</span>
            <span className="metric-value">{summary.inactiveDrivers}</span>
            <span className="metric-trend" style={{ color: '#64748B' }}>Deactivated accounts</span>
          </div>
        </div>

        {/* 6. Drivers Requiring Attention */}
        <div
          className="metric-card"
          onClick={() => setStatusFilter('INACTIVE')}
          style={{
            cursor: 'pointer',
            borderColor: '#FDE68A',
          }}
          title="Deactivated accounts or expiring licenses"
        >
          <div className="metric-icon" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>
            <AlertTriangle size={18} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Attention Req.</span>
            <span className="metric-value">{summary.attentionRequired}</span>
            <span className="metric-trend" style={{ color: '#B45309' }}>License/KYC review</span>
          </div>
        </div>
      </div>

      {/* 3. Search and Filter Toolbar */}
      <div className="search-filter-toolbar">
        <div className="toolbar-search-form">
          <div className="search-input-wrapper">
            <Search size={18} className="search-input-icon" />
            <input
              type="text"
              className="toolbar-search-input"
              placeholder="Search driver by name, Employee ID, phone, vehicle, or route..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search drivers"
            />
          </div>
        </div>

        <div className="toolbar-filters-group">
          {/* Status Filter */}
          <div className="filter-select-wrapper">
            <ListFilter size={16} className="filter-leading-icon" />
            <select
              className="toolbar-select-field"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by driver status"
            >
              <option value="ALL">All Driver Statuses</option>
              <option value="AVAILABLE">Available / Standby</option>
              <option value="ON_DELIVERY">On Delivery Run</option>
              <option value="ACTIVE">All Active Accounts</option>
              <option value="INACTIVE">Deactivated Accounts</option>
            </select>
          </div>

          {/* Sort By Field */}
          <select
            className="toolbar-select-field"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort drivers"
          >
            <option value="name">Sort by: Driver Name</option>
            <option value="employee_id">Sort by: Employee ID</option>
            <option value="created_at">Sort by: Induction Date</option>
          </select>

          {/* Sort Order Toggle */}
          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')}
            className="btn btn-secondary toolbar-sort-btn"
            title="Toggle sort direction"
          >
            <ArrowUpDown size={14} />
            <span>{sortOrder === 'ASC' ? 'Ascending' : 'Descending'}</span>
          </button>
        </div>
      </div>

      {/* 4. Drivers Table Card */}
      <Card
        title="Fleet Personnel Roster"
        subtitle={`Showing ${totalCount > 0 ? (page - 1) * pageSize + 1 : 0}–${totalCount > 0 ? Math.min(page * pageSize, totalCount) : 0} of ${totalCount} fleet personnel records`}
        noPadding
      >
        {loading && drivers.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
            <RefreshCw size={24} className="spin-icon text-muted" style={{ margin: '0 auto 8px auto' }} />
            <p style={{ fontSize: '13px' }}>Retrieving live drivers roster from database...</p>
          </div>
        ) : error ? (
          <div style={{ padding: '30px', textAlign: 'center' }}>
            <p style={{ color: '#B91C1C', fontSize: '13.5px', marginBottom: '12px' }}>{error}</p>
            <Button variant="secondary" size="sm" onClick={fetchRoster}>
              Retry Connection
            </Button>
          </div>
        ) : drivers.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748B' }}>
            <Users size={36} style={{ margin: '0 auto 10px auto', opacity: 0.4 }} />
            <h4 style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
              No matching drivers found
            </h4>
            <p style={{ fontSize: '12.5px', marginTop: '4px', maxWidth: '420px', margin: '4px auto 16px auto' }}>
              No driver records match your current filters. Clear the search or onboard a new fleet personnel.
            </p>
            <Button variant="primary" onClick={() => setIsAddModalOpen(true)} icon={<Plus size={15} />}>
              Onboard Driver
            </Button>
          </div>
        ) : (
          <div
            className="business-table-container"
            tabIndex={0}
            role="region"
            aria-label="Fleet personnel table"
            style={{
              maxHeight: pageSize > 7 ? '540px' : 'none',
              overflowY: pageSize > 7 ? 'auto' : 'visible',
              overflowX: 'auto',
              position: 'relative',
            }}
          >
            <table className="business-table">
              <thead
                style={{
                  position: pageSize > 7 ? 'sticky' : 'static',
                  top: 0,
                  zIndex: 10,
                  backgroundColor: '#F8FAFC',
                }}
              >
                <tr>
                  <th style={{ width: '240px', minWidth: '220px' }}>Driver</th>
                  <th style={{ width: '140px', minWidth: '130px', maxWidth: '150px' }}>Employee ID</th>
                  <th style={{ width: '160px', minWidth: '145px' }}>Phone</th>
                  <th style={{ width: '140px', minWidth: '130px', maxWidth: '150px' }}>Current Status</th>
                  <th style={{ width: '210px', minWidth: '180px' }}>Current Assignment</th>
                  <th style={{ width: '110px', minWidth: '100px', maxWidth: '120px', textAlign: 'center' }}>Today's Drops</th>
                  <th style={{ width: '110px', minWidth: '100px', maxWidth: '120px' }}>Account</th>
                  <th style={{ width: '160px', minWidth: '150px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((drv) => {
                  const initials = drv.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('');

                  return (
                    <tr key={drv.id}>
                      {/* 1. Driver Name, Avatar & Email */}
                      <td style={{ width: '240px', minWidth: '220px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              backgroundColor: 'var(--color-navy)',
                              color: '#FFFFFF',
                              fontWeight: 700,
                              fontSize: '11px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {initials}
                          </div>
                          <div style={{ minWidth: 0, overflow: 'hidden' }}>
                            <div
                              onClick={() => navigate(`/admin/drivers/${drv.id}`)}
                              style={{
                                fontWeight: 600,
                                fontSize: '12.5px',
                                color: 'var(--color-primary)',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                              title={drv.name}
                            >
                              {drv.name}
                            </div>
                            <div
                              style={{
                                fontSize: '11px',
                                color: '#64748B',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                              title={drv.email}
                            >
                              {drv.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Employee ID */}
                      <td style={{ width: '140px', minWidth: '130px', maxWidth: '150px' }}>
                        <code
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            fontSize: '11.5px',
                            color: 'var(--color-primary)',
                            backgroundColor: 'var(--color-primary-subtle)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            border: '1px solid #6EE7B7',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {drv.employee_id || 'N/A'}
                        </code>
                      </td>

                      {/* 3. Phone */}
                      <td style={{ width: '160px', minWidth: '145px' }}>
                        <div
                          style={{
                            fontSize: '12px',
                            color: '#334155',
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={drv.phone || 'No phone number'}
                        >
                          {drv.phone || '—'}
                        </div>
                      </td>

                      {/* 4. Current Status */}
                      <td style={{ width: '140px', minWidth: '130px', maxWidth: '150px' }}>
                        {getOperationalStatusBadge(drv)}
                      </td>

                      {/* 5. Current Assignment */}
                      <td style={{ width: '210px', minWidth: '180px' }}>
                        {drv.current_order_number ? (
                          <div style={{ minWidth: 0, overflow: 'hidden' }}>
                            <div
                              style={{
                                fontWeight: 600,
                                fontSize: '12px',
                                color: '#0369A1',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {drv.current_order_number}
                            </div>
                            <div
                              style={{
                                fontSize: '11px',
                                color: '#64748B',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {drv.current_shop_name || 'En Route'}
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '11.5px', color: '#94A3B8', whiteSpace: 'nowrap' }}>
                            {drv.is_active ? 'Unassigned • Standby' : 'Inactive • Off Duty'}
                          </span>
                        )}
                      </td>

                      {/* 6. Today's Drops */}
                      <td style={{ width: '110px', minWidth: '100px', maxWidth: '120px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '3px' }}>
                          <span
                            style={{
                              fontVariantNumeric: 'tabular-nums',
                              fontWeight: 700,
                              fontSize: '13.5px',
                              color: (drv.today_deliveries || 0) > 0 ? 'var(--color-navy)' : '#64748B',
                            }}
                          >
                            {drv.today_deliveries || 0}
                          </span>
                          <span style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 500 }}>drops</span>
                        </div>
                      </td>

                      {/* 7. Account */}
                      <td style={{ width: '110px', minWidth: '100px', maxWidth: '120px' }}>
                        <Badge variant={drv.is_active ? 'success' : 'danger'}>
                          {drv.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>

                      {/* 8. Actions: [Details] [Power Icon] [Trash Icon] in exact required order */}
                      <td style={{ width: '160px', minWidth: '150px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px' }}>
                          {/* A. Details Button */}
                          <button
                            type="button"
                            onClick={() => {
                              navigate(`/admin/drivers/${drv.id}`);
                            }}
                            className="btn btn-secondary btn-table-action"
                            style={{
                              height: '28px',
                              padding: '0 10px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: 'var(--color-primary, #16805D)',
                              backgroundColor: 'var(--color-primary-subtle, #E6F4EA)',
                              border: '1px solid #6EE7B7',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                            title={`View full details for ${drv.name}`}
                            aria-label={`View full details for ${drv.name}`}
                          >
                            <Eye size={13} />
                            <span>Details</span>
                          </button>

                          {/* B. Activate / Deactivate Power Icon Button */}
                          <button
                            type="button"
                            onClick={() => setStatusModalDriver(drv)}
                            disabled={statusUpdatingId === drv.id}
                            style={{
                              height: '28px',
                              width: '28px',
                              minWidth: '28px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 0,
                              backgroundColor: '#FFFFFF',
                              border: `1px solid ${drv.is_active ? '#FECACA' : '#BBF7D0'}`,
                              borderRadius: '6px',
                              cursor: statusUpdatingId === drv.id ? 'not-allowed' : 'pointer',
                              transition: 'all 0.15s ease',
                              color: drv.is_active ? '#DC2626' : '#16A34A',
                            }}
                            className={drv.is_active ? 'hover:bg-red-50 hover:border-red-400' : 'hover:bg-green-50 hover:border-green-400'}
                            title={drv.is_active ? 'Deactivate driver' : 'Activate driver'}
                            aria-label={drv.is_active ? `Deactivate driver ${drv.name}` : `Activate driver ${drv.name}`}
                          >
                            {statusUpdatingId === drv.id ? (
                              <RefreshCw size={13} className="spin-icon" />
                            ) : (
                              <Power size={13} strokeWidth={2.2} />
                            )}
                          </button>

                          {/* D. Delete Trash Icon Button */}
                          <button
                            type="button"
                            onClick={() => setDeleteDriver(drv)}
                            style={{
                              height: '28px',
                              width: '28px',
                              minWidth: '28px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 0,
                              color: '#94A3B8',
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #E2E8F0',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            className="hover:text-red-600 hover:border-red-300 hover:bg-red-50"
                            title="Delete driver"
                            aria-label={`Delete driver ${drv.name}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Pagination Footer */}
        <div className="table-pagination-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <span className="pagination-info">
              Showing <strong>{totalCount > 0 ? (page - 1) * pageSize + 1 : 0}</strong>–<strong>{totalCount > 0 ? Math.min(page * pageSize, totalCount) : 0}</strong> of <strong>{totalCount}</strong> drivers
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label htmlFor="rows-per-page-select" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Rows per page:
              </label>
              <select
                id="rows-per-page-select"
                className="toolbar-select-field"
                style={{ height: '28px', padding: '0 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #CBD5E1' }}
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              >
                <option value={7}>7</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Page <strong>{page}</strong> of <strong>{totalPages}</strong>
            </span>
            <div className="pagination-buttons" style={{ display: 'flex', gap: '6px' }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                title="Previous page"
                aria-label="Previous page"
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                title="Next page"
                aria-label="Next page"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Modals & Drawers */}
      <AddDriverModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={(created) => {
          showToast(`Driver ${created.name} onboarded successfully!`);
          fetchRoster();
        }}
      />

      {/* Driver Status Activation / Deactivation Confirmation Modal */}
      {statusModalDriver && (
        <Modal
          isOpen={Boolean(statusModalDriver)}
          onClose={() => {
            if (!statusModalLoading) setStatusModalDriver(null);
          }}
          title={
            statusModalDriver.is_active
              ? 'Deactivate Driver Account'
              : 'Activate Driver Account'
          }
          subtitle={`Employment status update for ${statusModalDriver.name} (${statusModalDriver.employee_id || 'ID N/A'})`}
          icon={
            statusModalDriver.is_active ? (
              <Power size={20} color="#DC2626" />
            ) : (
              <Power size={20} color="#16A34A" />
            )
          }
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setStatusModalDriver(null)}
                disabled={statusModalLoading}
              >
                Cancel
              </Button>
              <Button
                variant={statusModalDriver.is_active ? 'danger' : 'primary'}
                size="md"
                onClick={handleConfirmStatusChange}
                loading={statusModalLoading}
              >
                {statusModalDriver.is_active ? 'Confirm Deactivation' : 'Confirm Activation'}
              </Button>
            </div>
          }
        >
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {statusModalDriver.is_active ? (
              <>
                <p style={{ margin: '0 0 10px 0' }}>
                  Are you sure you want to deactivate <strong style={{ color: 'var(--text-primary)' }}>{statusModalDriver.name}</strong>?
                </p>
                <div
                  style={{
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    color: '#991B1B',
                    fontSize: '12.5px',
                  }}
                >
                  <strong>Impact on operations:</strong> Deactivating marks this driver as off-duty and prevents future delivery dispatches or route assignments.
                </div>
                <p style={{ margin: '10px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                  Statutory audit safety: All historical dispatches, completed delivery records, salary configurations, payment records, and employee profiles remain strictly preserved.
                </p>
              </>
            ) : (
              <>
                <p style={{ margin: '0 0 10px 0' }}>
                  Are you sure you want to activate <strong style={{ color: 'var(--text-primary)' }}>{statusModalDriver.name}</strong>?
                </p>
                <div
                  style={{
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    color: '#166534',
                    fontSize: '12.5px',
                  }}
                >
                  <strong>Impact on operations:</strong> Activating restores this driver's active fleet standing, making them immediately eligible for route assignments and order fulfillment dispatches.
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Delete Driver Confirmation Modal */}
      {deleteDriver && (
        <DeleteConfirmModal
          isOpen={Boolean(deleteDriver)}
          onClose={() => setDeleteDriver(null)}
          title="Delete Driver Record"
          entityType="Driver"
          entityName={deleteDriver.name}
          entityIdentifier={deleteDriver.employee_id}
          isActive={Boolean(deleteDriver.is_active)}
          details={[
            { label: 'Driver Name', value: deleteDriver.name },
            { label: 'Employee ID', value: deleteDriver.employee_id || 'N/A' },
            { label: 'Current Account Status', value: deleteDriver.is_active ? 'Active' : 'Inactive' },
            {
              label: 'Active Assignments',
              value: (deleteDriver.active_deliveries || 0) > 0 ? `${deleteDriver.active_deliveries} active deliveries` : 'None (Available)',
            },
          ]}
          blockingReason={
            (deleteDriver.active_deliveries || 0) > 0
              ? `Driver currently has ${deleteDriver.active_deliveries} active deliveries assigned. Deliveries must be completed or reassigned before deleting.`
              : null
          }
          customWarning="Drivers with historical dispatches, completed deliveries, payment collections, or payroll records will be safely archived and deactivated to maintain statutory audit and compliance records. Drivers with zero historical records will be permanently purged."
          onDeactivateRequested={async () => {
            if (deleteDriver) {
              await api.deliveries.updateDriverStatus(deleteDriver.id, false, 'Deactivated prior to deletion');
              setDeleteDriver(null);
              fetchRoster();
            }
          }}
          onConfirm={async (reason) => {
            if (deleteDriver) {
              const res = await api.deliveries.deleteDriver(deleteDriver.id, reason);
              showToast(res?.message || 'Driver deleted / archived successfully');
              setDeleteDriver(null);
              fetchRoster();
            }
          }}
        />
      )}

    </div>
  );
};

