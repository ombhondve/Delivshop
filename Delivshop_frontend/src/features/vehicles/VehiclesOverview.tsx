import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  RefreshCw,
  Eye,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ListFilter,
  Download,
  X,
  Thermometer,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Pencil,
  FileText,
  Power,
  Zap,
  Fuel,
  MapPin,
  Radio,
  AlertCircle,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { DeleteConfirmModal } from '../../components/common/DeleteConfirmModal';
import { api } from '../../services/api/endpoints';
import { Vehicle, VehicleSummary } from '../../types';
import { AddVehicleModal } from './AddVehicleModal';
import { EditVehicleModal } from './EditVehicleModal';
import { AddVehicleDocumentModal } from './AddVehicleDocumentModal';
import { AddMaintenanceModal } from './AddMaintenanceModal';
import { useNavigation } from '../../context/NavigationContext';

export const VehiclesOverview: React.FC = () => {
  const { navigate } = useNavigation();

  // Fleet state
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [summary, setSummary] = useState<VehicleSummary>({
    totalVehicles: 0,
    activeVehicles: 0,
    availableVehicles: 0,
    assignedVehicles: 0,
    underMaintenanceVehicles: 0,
    inactiveVehicles: 0,
    attentionRequired: 0,
    depots: [],
    vehicleTypes: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');

  // Filters & Search
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [depotFilter, setDepotFilter] = useState('ALL');
  const [complianceFilter, setComplianceFilter] = useState('ALL');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Modals & Action Menus
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
  const [docVehicle, setDocVehicle] = useState<Vehicle | null>(null);
  const [maintVehicle, setMaintVehicle] = useState<Vehicle | null>(null);
  const [statusConfirmVehicle, setStatusConfirmVehicle] = useState<Vehicle | null>(null);
  const [deleteVehicle, setDeleteVehicle] = useState<Vehicle | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Close action menus when clicking outside
  useEffect(() => {
    if (!actionMenuOpenId) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.vehicle-action-menu-container')) {
        setActionMenuOpenId(null);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [actionMenuOpenId]);

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Reset page when filters change
  const handleStatusFilterChange = (val: string) => {
    setStatusFilter(val);
    setPage(1);
  };

  const handleTypeFilterChange = (val: string) => {
    setTypeFilter(val);
    setPage(1);
  };

  const handleDepotFilterChange = (val: string) => {
    setDepotFilter(val);
    setPage(1);
  };

  const handleComplianceFilterChange = (val: string) => {
    setComplianceFilter(val);
    setPage(1);
  };

  const clearAllFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('ALL');
    setTypeFilter('ALL');
    setDepotFilter('ALL');
    setComplianceFilter('ALL');
    setPage(1);
  };

  const isFiltered = useMemo(() => {
    return (
      debouncedSearch.trim() !== '' ||
      statusFilter !== 'ALL' ||
      typeFilter !== 'ALL' ||
      depotFilter !== 'ALL' ||
      complianceFilter !== 'ALL'
    );
  }, [debouncedSearch, statusFilter, typeFilter, depotFilter, complianceFilter]);

  // Fetch summary and vehicle list
  const fetchVehicles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [listRes, summaryRes] = await Promise.all([
        api.vehicles.list({
          search: debouncedSearch.trim() || undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          vehicleType: typeFilter !== 'ALL' ? typeFilter : undefined,
          depot: depotFilter !== 'ALL' ? depotFilter : undefined,
          compliance: complianceFilter !== 'ALL' ? complianceFilter : undefined,
          page,
          limit: pageSize,
        }),
        api.vehicles.getSummary(),
      ]);

      const rawList: any = listRes;
      const rawSummary: any = summaryRes;

      if (rawList?.data && Array.isArray(rawList.data)) {
        setVehicles(rawList.data);
        setTotalCount(rawList.pagination?.total || rawList.data.length);
      } else if (Array.isArray(rawList)) {
        setVehicles(rawList);
        setTotalCount(rawList.length);
      } else {
        setVehicles([]);
        setTotalCount(0);
      }

      setSummary(rawSummary?.data || rawSummary || {});
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err: any) {
      setError(err?.message || 'Failed to load fleet vehicles from server');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, typeFilter, depotFilter, complianceFilter, page, pageSize]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  // Export CSV handler
  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/vehicles/export', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        throw new Error('Failed to generate fleet CSV export');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Delivshop_Fleet_Export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast('Fleet registry successfully exported to CSV');
    } catch (err: any) {
      showToast(err?.message || 'Failed to export vehicles', 'error');
    } finally {
      setExporting(false);
    }
  };

  // Quick status toggle with confirmation
  const handleToggleStatus = (v: Vehicle) => {
    setActionMenuOpenId(null);
    setStatusConfirmVehicle(v);
  };

  const handleConfirmStatusChange = async () => {
    if (!statusConfirmVehicle) return;
    const nextStatus = statusConfirmVehicle.is_active ? 'INACTIVE' : 'AVAILABLE';
    try {
      setStatusUpdating(true);
      await api.vehicles.updateStatus(statusConfirmVehicle.id, nextStatus);
      showToast(
        `Vehicle ${statusConfirmVehicle.registration_number} status changed to ${
          nextStatus === 'AVAILABLE' ? 'Active' : 'Inactive'
        }`
      );
      setStatusConfirmVehicle(null);
      fetchVehicles();
    } catch (err: any) {
      showToast(err?.message || 'Failed to change vehicle status', 'error');
    } finally {
      setStatusUpdating(false);
    }
  };

  // Status Badge Component
  const renderStatusBadge = (v: Vehicle) => {
    if (!v.is_active || v.status === 'INACTIVE') {
      return <Badge variant="neutral">INACTIVE</Badge>;
    }
    if (v.status === 'UNDER_MAINTENANCE') {
      return <Badge variant="warning">MAINTENANCE</Badge>;
    }
    if (v.status === 'ASSIGNED' || v.active_run_code) {
      return <Badge variant="info">ASSIGNED</Badge>;
    }
    return <Badge variant="success">AVAILABLE</Badge>;
  };

  // Compliance Badge Component
  const renderComplianceBadge = (v: Vehicle) => {
    const expiredCount = v.expired_documents_count || 0;
    const expiringCount = v.expiring_documents_count || 0;
    const totalDocs = v.total_documents_count || 0;

    if (expiredCount > 0) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <Badge variant="danger" icon={<AlertTriangle size={11} />}>
            Expired ({expiredCount})
          </Badge>
          <span style={{ fontSize: '10.5px', color: 'var(--color-danger)', fontWeight: 500 }}>
            Mandatory renewal needed
          </span>
        </div>
      );
    }

    if (expiringCount > 0) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <Badge variant="warning" icon={<Clock size={11} />}>
            Expiring ({expiringCount})
          </Badge>
          {v.nearest_expiry_date && (
            <span style={{ fontSize: '10.5px', color: '#B45309' }}>
              Due: {v.nearest_expiry_date}
            </span>
          )}
        </div>
      );
    }

    if (totalDocs < 2) {
      return (
        <Badge variant="neutral">
          Missing Docs ({totalDocs}/4)
        </Badge>
      );
    }

    return (
      <Badge variant="success" icon={<ShieldCheck size={11} />}>
        Compliant
      </Badge>
    );
  };

  // Fuel Type Badge
  const renderFuelBadge = (fuelType: string) => {
    switch (fuelType) {
      case 'ELECTRIC':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '10.5px',
              fontWeight: 700,
              backgroundColor: '#ECFDF5',
              color: 'var(--color-success)',
              border: '1px solid #A7F3D0',
            }}
          >
            <Zap size={10} /> EV
          </span>
        );
      case 'CNG':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '10.5px',
              fontWeight: 700,
              backgroundColor: 'var(--color-primary-subtle)',
              color: 'var(--color-primary)',
              border: '1px solid #6EE7B7',
            }}
          >
            <Fuel size={10} /> CNG
          </span>
        );
      case 'PETROL':
      case 'DIESEL':
      default:
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '10.5px',
              fontWeight: 600,
              backgroundColor: '#F8FAFC',
              color: '#475569',
              border: '1px solid var(--border-color)',
            }}
          >
            {fuelType || 'Diesel'}
          </span>
        );
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

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
            <h1 className="page-title">Fleet & Vehicles Management</h1>
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
            Manage commercial vehicles, compliance documents, dispatch availability, and fleet maintenance.
            <span style={{ marginLeft: '10px', color: '#94A3B8', fontSize: '11.5px' }}>
              Last synchronized: {lastSyncTime}
            </span>
          </p>
        </div>

        <div className="page-header-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={handleExportCsv}
            disabled={exporting || vehicles.length === 0}
            icon={<Download size={15} className={exporting ? 'spin-icon' : ''} />}
          >
            {exporting ? 'Exporting...' : 'Export'}
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={fetchVehicles}
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
            Register Vehicle
          </Button>
        </div>
      </div>

      {/* 2. Compact Clickable 4-Card KPI Summary Strip */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {/* 1. Total Vehicles */}
        <div
          className="metric-card"
          onClick={() => {
            setStatusFilter('ALL');
            setComplianceFilter('ALL');
            setPage(1);
          }}
          style={{
            cursor: 'pointer',
            borderColor: statusFilter === 'ALL' && complianceFilter === 'ALL' ? 'var(--color-primary)' : undefined,
            backgroundColor: statusFilter === 'ALL' && complianceFilter === 'ALL' ? 'var(--color-primary-subtle)' : undefined,
          }}
          title="Click to view all registered fleet vehicles"
        >
          <div className="metric-icon" style={{ backgroundColor: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
            <Truck size={18} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Total Vehicles</span>
            <span className="metric-value">{summary.totalVehicles || 0}</span>
            <span className="metric-trend" style={{ color: 'var(--color-success)' }}>
              {summary.activeVehicles || 0} active in fleet
            </span>
          </div>
        </div>

        {/* 2. Available for Dispatch */}
        <div
          className="metric-card"
          onClick={() => handleStatusFilterChange('AVAILABLE')}
          style={{
            cursor: 'pointer',
            borderColor: statusFilter === 'AVAILABLE' ? 'var(--color-primary)' : undefined,
            backgroundColor: statusFilter === 'AVAILABLE' ? 'var(--color-primary-subtle)' : undefined,
          }}
          title="Click to filter available fleet vehicles ready for dispatch"
        >
          <div className="metric-icon" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
            <CheckCircle2 size={18} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Available</span>
            <span className="metric-value">{summary.availableVehicles || 0}</span>
            <span className="metric-trend" style={{ color: 'var(--color-success)' }}>
              Ready for dispatch
            </span>
          </div>
        </div>

        {/* 3. In Maintenance */}
        <div
          className="metric-card"
          onClick={() => handleStatusFilterChange('UNDER_MAINTENANCE')}
          style={{
            cursor: 'pointer',
            borderColor: statusFilter === 'UNDER_MAINTENANCE' ? 'var(--color-primary)' : undefined,
            backgroundColor: statusFilter === 'UNDER_MAINTENANCE' ? 'var(--color-primary-subtle)' : undefined,
          }}
          title="Click to filter vehicles under maintenance or workshop repair"
        >
          <div className="metric-icon" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>
            <Wrench size={18} />
          </div>
          <div className="metric-info">
            <span className="metric-title">In Maintenance</span>
            <span className="metric-value">{summary.underMaintenanceVehicles || 0}</span>
            <span className="metric-trend" style={{ color: '#B45309' }}>
              Under inspection / repairs
            </span>
          </div>
        </div>

        {/* 4. Attention Required */}
        <div
          className="metric-card"
          onClick={() => handleComplianceFilterChange('ATTENTION_REQUIRED')}
          style={{
            cursor: 'pointer',
            borderColor: complianceFilter === 'ATTENTION_REQUIRED' ? 'var(--color-danger)' : undefined,
            backgroundColor: complianceFilter === 'ATTENTION_REQUIRED' ? 'var(--color-danger-bg)' : undefined,
          }}
          title="Vehicles with expired or expiring compliance documents"
        >
          <div className="metric-icon" style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
            <AlertTriangle size={18} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Attention Req.</span>
            <span className="metric-value">{summary.attentionRequired || 0}</span>
            <span className="metric-trend" style={{ color: 'var(--color-danger)' }}>
              Expired / Expiring docs
            </span>
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
              placeholder="Search registration, vehicle ID, make/model, driver, depot..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search vehicles"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '2px',
                }}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="toolbar-filters-group">
          {/* Status Filter */}
          <div className="filter-select-wrapper">
            <ListFilter size={16} className="filter-leading-icon" />
            <select
              className="toolbar-select-field"
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              aria-label="Filter by operational status"
            >
              <option value="ALL">All Operational Statuses</option>
              <option value="AVAILABLE">Available for Dispatch</option>
              <option value="ASSIGNED">Assigned to Run</option>
              <option value="UNDER_MAINTENANCE">In Maintenance</option>
              <option value="INACTIVE">Inactive / Decommissioned</option>
            </select>
          </div>

          {/* Vehicle Type Filter */}
          <div className="filter-select-wrapper">
            <Truck size={16} className="filter-leading-icon" />
            <select
              className="toolbar-select-field"
              value={typeFilter}
              onChange={(e) => handleTypeFilterChange(e.target.value)}
              aria-label="Filter by vehicle type"
            >
              <option value="ALL">All Vehicle Types</option>
              {summary.vehicleTypes && summary.vehicleTypes.length > 0 ? (
                summary.vehicleTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))
              ) : (
                <>
                  <option value="Refrigerated Van (1.5 Ton)">Refrigerated Van (1.5 Ton)</option>
                  <option value="Insulated Delivery Van">Insulated Delivery Van</option>
                  <option value="Electric Cargo Van">Electric Cargo Van</option>
                  <option value="Refrigerated Milk Tanker">Refrigerated Milk Tanker</option>
                </>
              )}
            </select>
          </div>

          {/* Depot Filter */}
          <div className="filter-select-wrapper">
            <MapPin size={16} className="filter-leading-icon" />
            <select
              className="toolbar-select-field"
              value={depotFilter}
              onChange={(e) => handleDepotFilterChange(e.target.value)}
              aria-label="Filter by depot or hub"
            >
              <option value="ALL">All Depots & Hubs</option>
              {summary.depots && summary.depots.length > 0 ? (
                summary.depots.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))
              ) : (
                <>
                  <option value="Pune Central Cold Depot">Pune Central Cold Depot</option>
                  <option value="Kothrud Regional Distribution Point">Kothrud Regional Point</option>
                  <option value="Hadapsar Bulk Wholesale Facility">Hadapsar Wholesale Facility</option>
                  <option value="Viman Nagar Hub">Viman Nagar Hub</option>
                  <option value="Aundh Regional Center">Aundh Regional Center</option>
                </>
              )}
            </select>
          </div>

          {/* Document Compliance Filter */}
          <div className="filter-select-wrapper">
            <ShieldCheck size={16} className="filter-leading-icon" />
            <select
              className="toolbar-select-field"
              value={complianceFilter}
              onChange={(e) => handleComplianceFilterChange(e.target.value)}
              aria-label="Filter by document compliance"
            >
              <option value="ALL">All Compliance</option>
              <option value="COMPLIANT">Fully Compliant</option>
              <option value="EXPIRING_SOON">Expiring Soon (≤ 30d)</option>
              <option value="EXPIRED">Expired Documents</option>
              <option value="MISSING_DOCS">Missing Required Docs</option>
              <option value="ATTENTION_REQUIRED">Attention Required</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {isFiltered && (
            <button
              type="button"
              className="btn btn-secondary toolbar-sort-btn"
              onClick={clearAllFilters}
              title="Reset all active filters"
              style={{ color: 'var(--color-danger)' }}
            >
              <X size={14} />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Commercial Fleet Registry Table Card */}
      <Card
        title="Commercial Fleet Registry"
        subtitle={`Showing ${vehicles.length} of ${totalCount} fleet vehicles retrieved from central PostgreSQL database`}
        noPadding
      >
        {loading && vehicles.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
            <RefreshCw size={24} className="spin-icon text-muted" style={{ margin: '0 auto 8px auto' }} />
            <p style={{ fontSize: '13px' }}>Retrieving live vehicle registry from database...</p>
          </div>
        ) : error ? (
          <div style={{ padding: '30px', textAlign: 'center' }}>
            <p style={{ color: '#B91C1C', fontSize: '13.5px', marginBottom: '12px' }}>{error}</p>
            <Button variant="secondary" size="sm" onClick={fetchVehicles}>
              Retry Connection
            </Button>
          </div>
        ) : vehicles.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748B' }}>
            <Truck size={36} style={{ margin: '0 auto 10px auto', opacity: 0.4 }} />
            <h4 style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
              No matching vehicles found
            </h4>
            <p style={{ fontSize: '12.5px', marginTop: '4px', maxWidth: '420px', margin: '4px auto 16px auto' }}>
              {isFiltered
                ? 'No vehicle records match your active search and filter criteria.'
                : 'No vehicles are registered in the commercial fleet registry yet.'}
            </p>
            {isFiltered ? (
              <Button variant="secondary" size="sm" onClick={clearAllFilters}>
                Clear All Filters
              </Button>
            ) : (
              <Button variant="primary" onClick={() => setIsAddModalOpen(true)} icon={<Plus size={15} />}>
                Register Vehicle
              </Button>
            )}
          </div>
        ) : (
          <div className="business-table-container">
            <table className="business-table">
              <thead>
                <tr>
                  <th style={{ width: '220px', minWidth: '200px' }}>Vehicle Asset</th>
                  <th style={{ width: '190px', minWidth: '175px' }}>Type & Specifications</th>
                  <th style={{ width: '170px', minWidth: '155px' }}>Depot / Location</th>
                  <th style={{ width: '120px', minWidth: '110px' }}>Capacity</th>
                  <th style={{ width: '135px', minWidth: '125px' }}>Operational Status</th>
                  <th style={{ width: '160px', minWidth: '145px' }}>Compliance</th>
                  <th style={{ width: '140px', minWidth: '130px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => (
                  <tr key={v.id}>
                    {/* 1. Vehicle Asset (Reg, Code, Make/Model) */}
                    <td style={{ width: '220px', minWidth: '200px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            backgroundColor: 'var(--color-navy)',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Truck size={14} />
                        </div>
                        <div style={{ minWidth: 0, overflow: 'hidden' }}>
                          <div
                            onClick={() => navigate(`/admin/vehicles/${v.id}`)}
                            style={{
                              fontWeight: 600,
                              fontSize: '12.5px',
                              color: 'var(--color-primary)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                            title={`View asset details for ${v.registration_number}`}
                          >
                            <span>{v.registration_number}</span>
                            {v.is_dispatch_eligible && (
                              <span title="Eligible for Dispatch" style={{ display: 'inline-flex', alignItems: 'center' }}>
                                <CheckCircle2 size={12} color="var(--color-success)" />
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '1px' }}>
                            <code
                              style={{
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                fontSize: '11px',
                                color: 'var(--color-primary)',
                                backgroundColor: 'var(--color-primary-subtle)',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                border: '1px solid #6EE7B7',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {v.vehicle_code}
                            </code>
                            <span
                              style={{
                                fontSize: '11px',
                                color: '#64748B',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                              title={v.make_model || ''}
                            >
                              {v.make_model}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 2. Type & Specifications */}
                    <td style={{ width: '190px', minWidth: '175px' }}>
                      <div style={{ minWidth: 0 }}>
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: '12px',
                            color: 'var(--text-primary)',
                            display: 'block',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={v.vehicle_type}
                        >
                          {v.vehicle_type}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', flexWrap: 'wrap' }}>
                          {renderFuelBadge(v.fuel_type)}
                          {v.is_refrigerated ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '2px 5px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: 700,
                                backgroundColor: '#E0F2FE',
                                color: '#0284C7',
                                border: '1px solid #BAE6FD',
                              }}
                              title={
                                v.temperature_min_c !== undefined && v.temperature_max_c !== undefined
                                  ? `Target Range: ${v.temperature_min_c}°C to ${v.temperature_max_c}°C`
                                  : 'Refrigerated Chiller Unit'
                              }
                            >
                              <Thermometer size={10} /> Chiller
                            </span>
                          ) : (
                            <span style={{ fontSize: '10.5px', color: '#64748B' }}>Ambient</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 3. Depot / Location */}
                    <td style={{ width: '170px', minWidth: '155px' }}>
                      <div style={{ minWidth: 0 }}>
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: '12px',
                            color: 'var(--text-primary)',
                            display: 'block',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={v.depot}
                        >
                          {v.depot}
                        </span>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <MapPin size={11} color="#64748B" />
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {v.city ? `${v.city}, ${v.state || 'Maharashtra'}` : 'Central Facility'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 4. Capacity */}
                    <td style={{ width: '120px', minWidth: '110px' }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--text-primary)', display: 'block' }}>
                          {v.capacity_crates} crates
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748B' }}>
                          {Number(v.capacity_kg).toLocaleString('en-IN')} KG
                        </span>
                      </div>
                    </td>

                    {/* 5. Operational Status */}
                    <td style={{ width: '135px', minWidth: '125px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div>{renderStatusBadge(v)}</div>
                        {v.active_run_code && (
                          <div
                            onClick={() => navigate('/admin/assignments')}
                            style={{
                              fontSize: '11px',
                              color: 'var(--color-primary)',
                              fontWeight: 600,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                            title="View Active Delivery Run Assignment"
                          >
                            Run: {v.active_run_code}
                          </div>
                        )}
                        {v.active_driver_name && (
                          <span
                            style={{
                              fontSize: '10.5px',
                              color: '#64748B',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                            title={`Assigned Driver: ${v.active_driver_name}`}
                          >
                            Driver: {v.active_driver_name}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 6. Compliance */}
                    <td style={{ width: '160px', minWidth: '145px' }}>
                      {renderComplianceBadge(v)}
                    </td>

                    {/* 7. Actions */}
                    <td style={{ width: '150px', minWidth: '140px', textAlign: 'right' }}>
                      <div className="vehicle-action-menu-container" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/vehicles/${v.id}`)}
                          className="btn btn-secondary btn-table-action"
                          style={{
                            height: '28px',
                            padding: '0 10px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--color-primary)',
                            backgroundColor: 'var(--color-primary-subtle)',
                            border: '1px solid #6EE7B7',
                            borderRadius: '6px',
                            cursor: 'pointer',
                          }}
                          title={`View full details for ${v.registration_number}`}
                          aria-label={`View full details for ${v.registration_number}`}
                        >
                          <Eye size={13} />
                          <span>Details</span>
                        </button>

                        {/* Overflow contextual menu toggle */}
                        <button
                          type="button"
                          className="btn-icon-square"
                          style={{ width: '28px', height: '28px' }}
                          onClick={() => setActionMenuOpenId(actionMenuOpenId === v.id ? null : v.id)}
                          title="More actions"
                          aria-label="More actions"
                        >
                          <MoreVertical size={13} />
                        </button>

                        {/* Standardized Dropdown Menu */}
                        {actionMenuOpenId === v.id && (
                          <div
                            style={{
                              position: 'absolute',
                              right: 0,
                              top: '32px',
                              zIndex: 1050,
                              backgroundColor: '#FFFFFF',
                              borderRadius: '8px',
                              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1)',
                              border: '1px solid var(--border-color)',
                              minWidth: '200px',
                              padding: '6px 0',
                              textAlign: 'left',
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setActionMenuOpenId(null);
                                navigate(`/admin/vehicles/${v.id}`);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                width: '100%',
                                padding: '8px 14px',
                                fontSize: '12px',
                                color: 'var(--text-primary)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                              }}
                              className="hover:bg-slate-50"
                            >
                              <Eye size={13} style={{ color: 'var(--color-primary)' }} /> View Vehicle Details
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setActionMenuOpenId(null);
                                setEditVehicle(v);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                width: '100%',
                                padding: '8px 14px',
                                fontSize: '12px',
                                color: 'var(--text-primary)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                              }}
                              className="hover:bg-slate-50"
                            >
                              <Pencil size={13} style={{ color: 'var(--color-primary)' }} /> Edit Specifications
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setActionMenuOpenId(null);
                                setDocVehicle(v);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                width: '100%',
                                padding: '8px 14px',
                                fontSize: '12px',
                                color: 'var(--text-primary)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                              }}
                              className="hover:bg-slate-50"
                            >
                              <FileText size={13} style={{ color: 'var(--color-success)' }} /> Upload Document
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setActionMenuOpenId(null);
                                setMaintVehicle(v);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                width: '100%',
                                padding: '8px 14px',
                                fontSize: '12px',
                                color: 'var(--text-primary)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                              }}
                              className="hover:bg-slate-50"
                            >
                              <Wrench size={13} style={{ color: '#D97706' }} /> Log Service Record
                            </button>

                            <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0' }} />

                            <button
                              type="button"
                              onClick={() => handleToggleStatus(v)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                width: '100%',
                                padding: '8px 14px',
                                fontSize: '12px',
                                color: v.is_active ? 'var(--color-danger)' : 'var(--color-success)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                              }}
                              className="hover:bg-slate-50"
                            >
                              <Power size={13} />
                              {v.is_active ? 'Deactivate Vehicle...' : 'Activate Vehicle...'}
                            </button>

                            <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0' }} />

                            <button
                              type="button"
                              onClick={() => {
                                setActionMenuOpenId(null);
                                setDeleteVehicle(v);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                width: '100%',
                                padding: '8px 14px',
                                fontSize: '12px',
                                color: 'var(--color-danger, #DC2626)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                              }}
                              className="hover:bg-slate-50"
                            >
                              <Trash2 size={13} />
                              Delete Vehicle...
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Pagination Footer */}
        <div className="table-pagination-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="pagination-info">
              Showing <strong>{vehicles.length > 0 ? (page - 1) * pageSize + 1 : 0}</strong> -{' '}
              <strong>{Math.min(page * pageSize, totalCount)}</strong> of <strong>{totalCount}</strong> vehicles
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Per page:</span>
              <select
                className="toolbar-select-field"
                style={{ height: '28px', padding: '0 6px', fontSize: '11.5px' }}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
              Page {page} of {totalPages}
            </span>
            <div className="pagination-buttons">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                title="Previous page"
              >
                <ChevronLeft size={14} />
                <span>Prev</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                title="Next page"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Register Vehicle Modal */}
      <AddVehicleModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onVehicleCreated={() => {
          showToast('Vehicle asset registered to fleet registry');
          fetchVehicles();
        }}
        onUploadDocumentForVehicle={(v) => {
          setDocVehicle(v);
        }}
      />

      {/* Edit Vehicle Modal */}
      {editVehicle && (
        <EditVehicleModal
          isOpen={Boolean(editVehicle)}
          vehicle={editVehicle}
          onClose={() => setEditVehicle(null)}
          onVehicleUpdated={() => {
            showToast('Vehicle asset specifications updated');
            setEditVehicle(null);
            fetchVehicles();
          }}
        />
      )}

      {/* Add Document Modal */}
      {docVehicle && (
        <AddVehicleDocumentModal
          isOpen={Boolean(docVehicle)}
          vehicleId={docVehicle.id}
          registrationNumber={docVehicle.registration_number}
          onClose={() => setDocVehicle(null)}
          onDocumentAdded={() => {
            showToast('Compliance document uploaded & verified');
            setDocVehicle(null);
            fetchVehicles();
          }}
        />
      )}

      {/* Add Maintenance Modal */}
      {maintVehicle && (
        <AddMaintenanceModal
          isOpen={Boolean(maintVehicle)}
          vehicleId={maintVehicle.id}
          registrationNumber={maintVehicle.registration_number}
          currentOdometerKm={maintVehicle.current_odometer_km || 0}
          onClose={() => setMaintVehicle(null)}
          onMaintenanceAdded={() => {
            showToast('Maintenance service entry recorded');
            setMaintVehicle(null);
            fetchVehicles();
          }}
        />
      )}

      {/* Deactivate / Activate Confirmation Modal */}
      {statusConfirmVehicle && (
        <Modal
          isOpen={Boolean(statusConfirmVehicle)}
          onClose={() => setStatusConfirmVehicle(null)}
          title={statusConfirmVehicle.is_active ? 'Deactivate Vehicle Asset?' : 'Activate Vehicle Asset?'}
          subtitle={`Operational status confirmation for ${statusConfirmVehicle.registration_number} (${statusConfirmVehicle.vehicle_code})`}
          icon={<Power size={20} />}
          size="sm"
          footer={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setStatusConfirmVehicle(null)}
                disabled={statusUpdating}
              >
                Cancel
              </Button>
              <Button
                variant={statusConfirmVehicle.is_active ? 'danger' : 'primary'}
                size="md"
                onClick={handleConfirmStatusChange}
                loading={statusUpdating}
              >
                {statusConfirmVehicle.is_active ? 'Confirm Deactivation' : 'Confirm Activation'}
              </Button>
            </div>
          }
        >
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {statusConfirmVehicle.is_active ? (
              <p style={{ margin: 0 }}>
                Deactivating <strong style={{ color: 'var(--text-primary)' }}>{statusConfirmVehicle.registration_number}</strong> will mark it as unavailable and immediately prevent new delivery runs from being dispatched with it.
              </p>
            ) : (
              <p style={{ margin: 0 }}>
                Activating <strong style={{ color: 'var(--text-primary)' }}>{statusConfirmVehicle.registration_number}</strong> will restore its active fleet standing, making it eligible for route allocation once mandatory compliance documents are verified.
              </p>
            )}
          </div>
        </Modal>
      )}

      {/* Delete Vehicle Confirmation Modal */}
      {deleteVehicle && (
        <DeleteConfirmModal
          isOpen={Boolean(deleteVehicle)}
          onClose={() => setDeleteVehicle(null)}
          title="Delete Vehicle Asset"
          entityType="Vehicle"
          entityName={deleteVehicle.registration_number}
          entityIdentifier={deleteVehicle.vehicle_code}
          isActive={Boolean(deleteVehicle.is_active)}
          details={[
            { label: 'Registration Number', value: deleteVehicle.registration_number },
            { label: 'Asset Code', value: deleteVehicle.vehicle_code },
            { label: 'Vehicle Type', value: deleteVehicle.vehicle_type },
            { label: 'Operational Status', value: deleteVehicle.status },
          ]}
          blockingReason={
            deleteVehicle.status === 'ASSIGNED' || Boolean(deleteVehicle.active_run_id)
              ? `Vehicle is currently assigned to an active delivery run (${deleteVehicle.active_run_code || 'In Progress'}). You must reassign or complete all active dispatches before deleting.`
              : null
          }
          customWarning="Vehicles with historical runs, inspections, or maintenance logs will be securely archived and deactivated to retain complete compliance records. Unused vehicle assets without historical records will be permanently purged."
          onDeactivateRequested={() => {
            if (deleteVehicle) {
              const target = deleteVehicle;
              setDeleteVehicle(null);
              handleToggleStatus(target);
            }
          }}
          onConfirm={async (reason) => {
            if (deleteVehicle) {
              const res = await api.vehicles.delete(deleteVehicle.id, reason);
              showToast(res?.message || 'Vehicle deleted / archived successfully');
              setDeleteVehicle(null);
              fetchVehicles();
            }
          }}
        />
      )}
    </div>
  );
};

