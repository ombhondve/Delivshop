import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
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
} from 'lucide-react';
import { api } from '../../services/api/endpoints';
import { DriverUser, DriverRosterSummary } from '../../types';
import { DeleteConfirmModal } from '../../components/common/DeleteConfirmModal';
import { AddDriverModal } from './AddDriverModal';
import { EditDriverModal } from './EditDriverModal';
import { AssignVehicleModal } from './AssignVehicleModal';
import { ResetPasswordModal } from './ResetPasswordModal';
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

  // Modals state
  const { navigate } = useNavigation();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<DriverUser | null>(null);

  // Deletion modal state
  const [driverToDelete, setDriverToDelete] = useState<DriverUser | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchRoster = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [driverList, summaryData] = await Promise.all([
        api.deliveries.listAllDrivers({
          search: search.trim() || undefined,
          status: statusFilter,
          sortBy,
          sortOrder,
        }),
        api.deliveries.getRosterSummary(),
      ]);

      setDrivers(driverList || []);
      setSummary(summaryData);
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err: any) {
      setError(err.message || 'Failed to load driver roster from server');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  const handleToggleDriverStatus = async (driver: DriverUser) => {
    const nextIsActive = !driver.is_active;

    // Safety check: Cannot deactivate if on active delivery run
    if (!nextIsActive && (driver.active_deliveries || 0) > 0) {
      showToast(`Cannot deactivate driver while ${driver.active_deliveries} active deliveries are in progress.`, 'error');
      return;
    }

    try {
      await api.deliveries.updateDriverStatus(
        driver.id,
        nextIsActive,
        nextIsActive ? 'Driver activated by admin' : 'Driver deactivated from fleet'
      );
      showToast(`Driver ${driver.name} is now ${nextIsActive ? 'Active' : 'Inactive'}`);
      fetchRoster();
    } catch (err: any) {
      showToast(err.message || 'Failed to update driver status', 'error');
    }
  };

  const handleDeleteInitiate = (driver: DriverUser) => {
    if (driver.is_active) {
      showToast('Driver must be deactivated before they can be deleted. Please deactivate this driver first.', 'error');
      return;
    }
    setDriverToDelete(driver);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (reason?: string) => {
    if (!driverToDelete) return;
    try {
      const res = await api.deliveries.deleteDriver(driverToDelete.id, reason);
      showToast(res.message || 'Driver removed from roster');
      setIsDeleteModalOpen(false);
      setDriverToDelete(null);
      fetchRoster();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete driver', 'error');
    }
  };

  const handleExportRoster = () => {
    try {
      const headers = ['Driver Name', 'Employee ID', 'Phone', 'Email', 'Vehicle Number', 'Vehicle Type', 'Assigned Route', 'Status', 'Active Deliveries', 'Completed Deliveries'];
      const rows = drivers.map((d) => [
        `"${d.name}"`,
        `"${d.employee_id || ''}"`,
        `"${d.phone || ''}"`,
        `"${d.email}"`,
        `"${d.vehicle_number || ''}"`,
        `"${d.vehicle_type || ''}"`,
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
            backgroundColor: toastMessage.type === 'success' ? '#123D32' : '#B91C1C',
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
          {toastMessage.type === 'success' ? <CheckCircle2 size={16} color="#4ADE80" /> : <AlertCircle size={16} color="#FECACA" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 1. Page Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 className="page-title">Drivers Roster</h2>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '2px 8px',
                backgroundColor: '#DCFCE7',
                border: '1px solid #BBF7D0',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#16805D',
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
            borderColor: statusFilter === 'ALL' ? '#16805D' : undefined,
            backgroundColor: statusFilter === 'ALL' ? '#F0FDF4' : undefined,
          }}
          title="Click to view all registered drivers"
        >
          <div className="metric-icon" style={{ backgroundColor: '#FAF6ED', color: '#C7A75A' }}>
            <Users size={18} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Total Drivers</span>
            <span className="metric-value">{summary.totalDrivers}</span>
            <span className="metric-trend" style={{ color: '#16805D' }}>100% verified</span>
          </div>
        </div>

        {/* 2. Active Drivers */}
        <div
          className="metric-card"
          onClick={() => setStatusFilter('ACTIVE')}
          style={{
            cursor: 'pointer',
            borderColor: statusFilter === 'ACTIVE' ? '#16805D' : undefined,
            backgroundColor: statusFilter === 'ACTIVE' ? '#F0FDF4' : undefined,
          }}
          title="Click to filter active accounts"
        >
          <div className="metric-icon" style={{ backgroundColor: '#DCFCE7', color: '#16805D' }}>
            <ShieldCheck size={18} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Active Drivers</span>
            <span className="metric-value">{summary.activeDrivers}</span>
            <span className="metric-trend" style={{ color: '#16805D' }}>Authorized fleet</span>
          </div>
        </div>

        {/* 3. Available Drivers */}
        <div
          className="metric-card"
          onClick={() => setStatusFilter('AVAILABLE')}
          style={{
            cursor: 'pointer',
            borderColor: statusFilter === 'AVAILABLE' ? '#16805D' : undefined,
            backgroundColor: statusFilter === 'AVAILABLE' ? '#F0FDF4' : undefined,
          }}
          title="Click to filter available drivers for order dispatch"
        >
          <div className="metric-icon" style={{ backgroundColor: '#E0F2FE', color: '#0369A1' }}>
            <UserCheck size={18} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Available Drivers</span>
            <span className="metric-value">{summary.availableDrivers}</span>
            <span className="metric-trend" style={{ color: '#0369A1' }}>Ready for dispatch</span>
          </div>
        </div>

        {/* 4. Drivers on Delivery */}
        <div
          className="metric-card"
          onClick={() => setStatusFilter('ON_DELIVERY')}
          style={{
            cursor: 'pointer',
            borderColor: statusFilter === 'ON_DELIVERY' ? '#16805D' : undefined,
            backgroundColor: statusFilter === 'ON_DELIVERY' ? '#F0FDF4' : undefined,
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
            borderColor: statusFilter === 'INACTIVE' ? '#16805D' : undefined,
            backgroundColor: statusFilter === 'INACTIVE' ? '#F0FDF4' : undefined,
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
        subtitle={`Showing ${drivers.length} drivers retrieved from central PostgreSQL database`}
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
            <h4 style={{ fontSize: '14.5px', fontWeight: 600, color: '#20342C' }}>
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
          <div className="business-table-container">
            <table className="business-table">
              <thead>
                <tr>
                  <th style={{ width: '220px' }}>Driver</th>
                  <th style={{ width: '130px' }}>Employee ID</th>
                  <th style={{ width: '140px' }}>Phone</th>
                  <th style={{ minWidth: '190px' }}>Assigned Vehicle</th>
                  <th style={{ width: '120px' }}>Current Status</th>
                  <th style={{ minWidth: '170px' }}>Current Assignment</th>
                  <th style={{ width: '120px' }}>Today's Drops</th>
                  <th style={{ width: '110px' }}>Account</th>
                  <th style={{ width: '170px', textAlign: 'right' }}>Actions</th>
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
                      {/* Driver Name & Avatar */}
                      <td>
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                          onClick={() => navigate(`/admin/drivers/${drv.id}`)}
                          title={`View ${drv.name}'s dedicated profile`}
                        >
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              backgroundColor: '#123D32',
                              color: '#C7A75A',
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
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '12.5px', color: '#16805D', textDecoration: 'underline', textDecorationColor: '#A7F3D0' }}>
                              {drv.name}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748B' }}>
                              {drv.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Employee ID */}
                      <td>
                        <code
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            fontSize: '11.5px',
                            color: '#16805D',
                            backgroundColor: '#F0FDF4',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            border: '1px solid #BBF7D0',
                          }}
                        >
                          {drv.employee_id || 'N/A'}
                        </code>
                      </td>

                      {/* Phone */}
                      <td>
                        <div style={{ fontSize: '12.5px', color: '#334155', fontWeight: 500 }}>
                          {drv.phone || '—'}
                        </div>
                      </td>

                      {/* Assigned Vehicle */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Truck size={13} color="#64748B" />
                          <span style={{ fontWeight: 600, fontSize: '12px', color: '#20342C' }}>
                            {drv.vehicle_number || 'Unallocated'}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>
                          {drv.assigned_route || drv.vehicle_type || 'No route assigned'}
                        </div>
                      </td>

                      {/* Operational Status */}
                      <td>{getOperationalStatusBadge(drv)}</td>

                      {/* Current Assignment */}
                      <td>
                        {drv.current_order_number ? (
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '12px', color: '#0369A1' }}>
                              {drv.current_order_number}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748B' }}>
                              {drv.current_shop_name || 'En Route'}
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '11.5px', color: '#94A3B8' }}>
                            {drv.is_active ? 'Unassigned • Standby' : 'Inactive • Off Duty'}
                          </span>
                        )}
                      </td>

                      {/* Today's Deliveries */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              fontVariantNumeric: 'tabular-nums',
                              fontWeight: 700,
                              fontSize: '12.5px',
                              color: (drv.today_deliveries || 0) > 0 ? '#16805D' : '#64748B',
                            }}
                          >
                            {drv.today_deliveries || 0}
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748B' }}>drops</span>
                        </div>
                      </td>

                      {/* Account Status Badge */}
                      <td>
                        <Badge variant={drv.is_active ? 'success' : 'danger'}>
                          {drv.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>

                      {/* Actions Group */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          {/* View Details - Full Page Navigation */}
                          <button
                            type="button"
                            onClick={() => {
                              navigate(`/admin/drivers/${drv.id}`);
                            }}
                            className="btn btn-secondary btn-table-action"
                            style={{ height: '26px', padding: '0 6px' }}
                            title="View Full Driver Profile"
                            aria-label={`View details for ${drv.name}`}
                          >
                            <Eye size={12} />
                            <span>Details</span>
                          </button>

                          {/* Edit Driver */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDriver(drv);
                              setIsEditModalOpen(true);
                            }}
                            className="btn-icon-square"
                            style={{ width: '26px', height: '26px' }}
                            title="Edit Driver Profile"
                            aria-label={`Edit ${drv.name}`}
                          >
                            <Pencil size={12} />
                          </button>

                          {/* Assign Vehicle */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDriver(drv);
                              setIsVehicleModalOpen(true);
                            }}
                            className="btn-icon-square"
                            style={{ width: '26px', height: '26px' }}
                            title="Assign Vehicle"
                            aria-label={`Assign vehicle to ${drv.name}`}
                          >
                            <Truck size={12} />
                          </button>

                          {/* Reset Password */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDriver(drv);
                              setIsPasswordModalOpen(true);
                            }}
                            className="btn-icon-square"
                            style={{ width: '26px', height: '26px' }}
                            title="Reset Mobile Password"
                            aria-label={`Reset password for ${drv.name}`}
                          >
                            <Key size={12} />
                          </button>

                          {/* Activate / Deactivate Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleDriverStatus(drv)}
                            style={{
                              padding: '4px',
                              borderRadius: '5px',
                              border: '1px solid',
                              borderColor: drv.is_active ? '#FDE68A' : '#BBF7D0',
                              backgroundColor: drv.is_active ? '#FFFBEB' : '#F0FDF4',
                              color: drv.is_active ? '#D97706' : '#16805D',
                              cursor: 'pointer',
                              width: '26px',
                              height: '26px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title={drv.is_active ? 'Deactivate Driver' : 'Reactivate Driver'}
                            aria-label={drv.is_active ? 'Deactivate Driver' : 'Reactivate Driver'}
                          >
                            <Power size={12} />
                          </button>

                          {/* Delete / Archive (Strict Deactivation-First Rule) */}
                          {drv.is_active ? (
                            <button
                              type="button"
                              onClick={() => {
                                showToast('Driver must be deactivated before they can be deleted.', 'error');
                              }}
                              style={{
                                padding: '4px',
                                borderRadius: '5px',
                                border: '1px solid #E2E8F0',
                                backgroundColor: '#F8FAFC',
                                color: '#94A3B8',
                                cursor: 'not-allowed',
                                opacity: 0.6,
                                width: '26px',
                                height: '26px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title="Deactivate this driver before deleting"
                              aria-label="Deactivate this driver before deleting"
                            >
                              <Trash2 size={12} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleDeleteInitiate(drv)}
                              style={{
                                padding: '4px',
                                borderRadius: '5px',
                                border: '1px solid #FECACA',
                                backgroundColor: '#FEF2F2',
                                color: '#DC2626',
                                cursor: 'pointer',
                                width: '26px',
                                height: '26px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title="Delete / Archive Inactive Driver"
                              aria-label={`Delete inactive driver ${drv.name}`}
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
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
          <span className="text-secondary text-xs">
            Showing {drivers.length} of {summary.totalDrivers} fleet drivers on file
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" size="sm" disabled>
              Previous
            </Button>
            <Button variant="secondary" size="sm" disabled>
              Next
            </Button>
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

      <EditDriverModal
        isOpen={isEditModalOpen}
        driver={selectedDriver}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedDriver(null);
        }}
        onSuccess={(updated) => {
          showToast(`Driver profile updated for ${updated.name}`);
          fetchRoster();
        }}
      />

      <AssignVehicleModal
        isOpen={isVehicleModalOpen}
        driver={selectedDriver}
        onClose={() => {
          setIsVehicleModalOpen(false);
          setSelectedDriver(null);
        }}
        onSuccess={(updated) => {
          showToast(`Vehicle allocated to ${updated.name}`);
          fetchRoster();
        }}
      />

      <ResetPasswordModal
        isOpen={isPasswordModalOpen}
        driver={selectedDriver}
        onClose={() => {
          setIsPasswordModalOpen(false);
          setSelectedDriver(null);
        }}
        onSuccess={() => {
          showToast('Driver mobile password reset successfully');
        }}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        title="Delete Fleet Driver"
        entityName={driverToDelete?.name || 'Driver'}
        entityType="Driver Personnel"
        entityIdentifier={driverToDelete?.employee_id}
        isActive={Boolean(driverToDelete?.is_active)}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDriverToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
