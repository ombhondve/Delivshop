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

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Modals & Actions
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
  const [maintVehicle, setMaintVehicle] = useState<Vehicle | null>(null);
  const [statusConfirmVehicle, setStatusConfirmVehicle] = useState<Vehicle | null>(null);
  const [deleteVehicle, setDeleteVehicle] = useState<Vehicle | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };


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

  const clearAllFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('ALL');
    setTypeFilter('ALL');
    setDepotFilter('ALL');
    setPage(1);
  };

  const isFiltered = useMemo(() => {
    return (
      debouncedSearch.trim() !== '' ||
      statusFilter !== 'ALL' ||
      typeFilter !== 'ALL' ||
      depotFilter !== 'ALL'
    );
  }, [debouncedSearch, statusFilter, typeFilter, depotFilter]);

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
  }, [debouncedSearch, statusFilter, typeFilter, depotFilter, page, pageSize]);

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
          <h1 className="page-title">Vehicles</h1>
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
            Add Vehicle
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
            setPage(1);
          }}
          style={{
            cursor: 'pointer',
            borderColor: statusFilter === 'ALL' ? 'var(--color-primary)' : undefined,
            backgroundColor: statusFilter === 'ALL' ? 'var(--color-primary-subtle)' : undefined,
          }}
          title="Click to view all registered fleet vehicles"
        >
          <div className="metric-icon" style={{ backgroundColor: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
            <Truck size={18} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Total</span>
            <span className="metric-value">{summary.totalVehicles || 0}</span>
            <span className="metric-trend" style={{ color: 'var(--color-success)' }}>
              {summary.activeVehicles || 0} active
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
              Ready
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
            <span className="metric-title">Maintenance</span>
            <span className="metric-value">{summary.underMaintenanceVehicles || 0}</span>
            <span className="metric-trend" style={{ color: '#B45309' }}>
              In workshop
            </span>
          </div>
        </div>

        {/* 4. Decommissioned / Inactive */}
        <div
          className="metric-card"
          onClick={() => handleStatusFilterChange('INACTIVE')}
          style={{
            cursor: 'pointer',
            borderColor: statusFilter === 'INACTIVE' ? 'var(--color-danger)' : undefined,
            backgroundColor: statusFilter === 'INACTIVE' ? 'var(--color-danger-bg)' : undefined,
          }}
          title="Click to filter decommissioned or inactive vehicles"
        >
          <div className="metric-icon" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
            <Power size={18} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Inactive</span>
            <span className="metric-value">{summary.inactiveVehicles || 0}</span>
            <span className="metric-trend" style={{ color: '#DC2626' }}>
              Off duty
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
              placeholder="Search vehicles..."
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

      {/* 4. Vehicles Table Card */}
      <Card
        title="Vehicles"
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
                Add Vehicle
              </Button>
            )}
          </div>
        ) : (
          <div className="business-table-container">
            <table className="business-table">
              <thead>
                <tr>
                  <th style={{ width: '240px', minWidth: '220px' }}>Vehicle</th>
                  <th style={{ width: '200px', minWidth: '180px' }}>Type</th>
                  <th style={{ width: '190px', minWidth: '170px' }}>Location</th>
                  <th style={{ width: '130px', minWidth: '120px' }}>Payload</th>
                  <th style={{ width: '150px', minWidth: '140px' }}>Status</th>
                  <th style={{ width: '160px', minWidth: '150px', textAlign: 'right' }}>Actions</th>
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
                          {Number(v.capacity_kg).toLocaleString('en-IN')} KG
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748B' }}>
                          Payload limit
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

                    {/* 6. Actions: [Details] [Power Icon] [Trash Icon] in exact required order */}
                    <td style={{ width: '160px', minWidth: '150px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px' }}>
                        {/* A. Details Button */}
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
                            whiteSpace: 'nowrap',
                          }}
                          title={`View full details for ${v.registration_number}`}
                          aria-label={`View full details for ${v.registration_number}`}
                        >
                          <Eye size={13} />
                          <span>Details</span>
                        </button>

                        {/* B. Activate / Deactivate Power Icon Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(v)}
                          disabled={statusUpdating && statusConfirmVehicle?.id === v.id}
                          style={{
                            height: '28px',
                            width: '28px',
                            minWidth: '28px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                            backgroundColor: '#FFFFFF',
                            border: `1px solid ${v.is_active ? '#FECACA' : '#BBF7D0'}`,
                            borderRadius: '6px',
                            cursor: statusUpdating && statusConfirmVehicle?.id === v.id ? 'not-allowed' : 'pointer',
                            transition: 'all 0.15s ease',
                            color: v.is_active ? '#DC2626' : '#16A34A',
                          }}
                          className={v.is_active ? 'hover:bg-red-50 hover:border-red-400' : 'hover:bg-green-50 hover:border-green-400'}
                          title={v.is_active ? 'Deactivate vehicle' : 'Activate vehicle'}
                          aria-label={v.is_active ? `Deactivate vehicle ${v.registration_number}` : `Activate vehicle ${v.registration_number}`}
                        >
                          {statusUpdating && statusConfirmVehicle?.id === v.id ? (
                            <RefreshCw size={13} className="spin-icon" />
                          ) : (
                            <Power size={13} strokeWidth={2.2} />
                          )}
                        </button>

                        {/* C. Delete Trash Icon Button */}
                        <button
                          type="button"
                          onClick={() => setDeleteVehicle(v)}
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
                          title="Delete vehicle"
                          aria-label={`Delete vehicle ${v.registration_number}`}
                        >
                          <Trash2 size={13} />
                        </button>
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
          title={statusConfirmVehicle.is_active ? 'Deactivate Vehicle?' : 'Activate Vehicle?'}
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
                {statusConfirmVehicle.is_active ? 'Deactivate' : 'Activate'}
              </Button>
            </div>
          }
        >
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <p style={{ margin: 0 }}>
              {statusConfirmVehicle.is_active ? 'Deactivate this vehicle?' : 'Activate this vehicle?'}
            </p>
          </div>
        </Modal>
      )}

      {/* Delete Vehicle Confirmation Modal */}
      {deleteVehicle && (
        <DeleteConfirmModal
          isOpen={Boolean(deleteVehicle)}
          onClose={() => setDeleteVehicle(null)}
          title="Delete Vehicle"
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

