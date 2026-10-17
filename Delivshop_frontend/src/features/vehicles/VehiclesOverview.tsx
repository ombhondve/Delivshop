import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  RefreshCw,
  Eye,
  ShieldAlert,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Filter,
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
  Package,
} from 'lucide-react';
import { api } from '../../services/api/endpoints';
import { Vehicle, VehicleSummary } from '../../types';
import { Badge } from '../../components/common/Badge';
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
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
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
    } catch (err: any) {
      setError(err?.message || 'Failed to load fleet vehicles');
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
      a.download = `delivshop_fleet_export_${new Date().toISOString().split('T')[0]}.csv`;
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

  // Quick status toggle
  const handleToggleStatus = async (v: Vehicle) => {
    const nextStatus = v.is_active ? 'INACTIVE' : 'AVAILABLE';
    try {
      await api.vehicles.updateStatus(v.id, nextStatus);
      showToast(`Vehicle ${v.registration_number} status changed to ${nextStatus === 'AVAILABLE' ? 'Active' : 'Inactive'}`);
      fetchVehicles();
    } catch (err: any) {
      showToast(err?.message || 'Failed to change vehicle status', 'error');
    } finally {
      setActionMenuOpenId(null);
    }
  };

  // Status Badge Component
  const renderStatusBadge = (v: Vehicle) => {
    if (!v.is_active || v.status === 'INACTIVE') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '9999px',
            fontSize: '11.5px',
            fontWeight: 600,
            backgroundColor: '#F1F5F9',
            color: '#64748B',
            border: '1px solid #E2E8F0',
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#94A3B8' }} />
          Inactive
        </span>
      );
    }

    if (v.status === 'UNDER_MAINTENANCE') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '9999px',
            fontSize: '11.5px',
            fontWeight: 600,
            backgroundColor: '#FEF3C7',
            color: '#92400E',
            border: '1px solid #FDE68A',
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#D97706' }} />
          Maintenance
        </span>
      );
    }

    if (v.status === 'ASSIGNED' || v.active_run_code) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '9999px',
            fontSize: '11.5px',
            fontWeight: 600,
            backgroundColor: '#EFF6FF',
            color: '#1E40AF',
            border: '1px solid #BFDBFE',
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2563EB' }} />
          Assigned
        </span>
      );
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 8px',
          borderRadius: '9999px',
          fontSize: '11.5px',
          fontWeight: 600,
          backgroundColor: '#DCFCE7',
          color: '#166534',
          border: '1px solid #BBF7D0',
        }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16A34A' }} />
        Available
      </span>
    );
  };

  // Compliance Badge Component
  const renderComplianceBadge = (v: Vehicle) => {
    const expiredCount = v.expired_documents_count || 0;
    const expiringCount = v.expiring_documents_count || 0;
    const totalDocs = v.total_documents_count || 0;

    if (expiredCount > 0) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: '#FEE2E2',
              color: '#B91C1C',
              border: '1px solid #FECACA',
              width: 'fit-content',
            }}
          >
            <AlertTriangle size={11} /> Expired ({expiredCount})
          </span>
          <span style={{ fontSize: '10.5px', color: '#DC2626', fontWeight: 500 }}>
            Mandatory renewal needed
          </span>
        </div>
      );
    }

    if (expiringCount > 0) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: '#FEF3C7',
              color: '#B45309',
              border: '1px solid #FDE68A',
              width: 'fit-content',
            }}
          >
            <Clock size={11} /> Expiring Soon ({expiringCount})
          </span>
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
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 600,
            backgroundColor: '#F8FAFC',
            color: '#64748B',
            border: '1px solid #CBD5E1',
          }}
        >
          Missing Docs ({totalDocs}/4)
        </span>
      );
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 8px',
          borderRadius: '9999px',
          fontSize: '11px',
          fontWeight: 600,
          backgroundColor: '#F0FDF4',
          color: '#15803D',
          border: '1px solid #DCFCE7',
        }}
      >
        <ShieldCheck size={12} /> Compliant
      </span>
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
              color: '#059669',
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
              backgroundColor: '#EFF6FF',
              color: '#2563EB',
              border: '1px solid #BFDBFE',
            }}
          >
            <Fuel size={10} /> CNG
          </span>
        );
      case 'PETROL':
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
              border: '1px solid #E2E8F0',
            }}
          >
            Petrol
          </span>
        );
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
              border: '1px solid #CBD5E1',
            }}
          >
            Diesel
          </span>
        );
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="page-container" style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Toast Alert */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 1200,
            padding: '12px 18px',
            borderRadius: '8px',
            backgroundColor: toastMessage.type === 'error' ? '#FEF2F2' : '#F0FDF4',
            border: `1px solid ${toastMessage.type === 'error' ? '#FECACA' : '#BBF7D0'}`,
            color: toastMessage.type === 'error' ? '#DC2626' : '#15803D',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {toastMessage.type === 'error' ? <ShieldAlert size={16} /> : <CheckCircle2 size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Breadcrumb & Section Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748B', marginBottom: '8px' }}>
        <span>Logistics Asset Management</span>
        <span>/</span>
        <span style={{ color: '#111F33', fontWeight: 600 }}>Fleet & Vehicles</span>
      </div>

      {/* Page Header Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111F33', margin: 0, letterSpacing: '-0.02em' }}>
            Fleet & Vehicles Management
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13.5px', color: '#64748B' }}>
            Manage commercial vehicles, compliance documents, dispatch availability, and fleet maintenance
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchVehicles}
            disabled={loading}
            title="Refresh fleet assets"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportCsv}
            disabled={exporting}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            title="Export full fleet CSV table"
          >
            <Download size={14} className={exporting ? 'animate-spin' : ''} />
            <span>{exporting ? 'Exporting...' : 'Export Vehicles'}</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsAddModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#1976D2',
              borderColor: '#1976D2',
            }}
          >
            <Plus size={16} /> Register Vehicle
          </button>
        </div>
      </div>

      {/* Section B: Fleet Overview Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Card 1: Total Vehicles */}
        <div
          onClick={() => {
            setStatusFilter('ALL');
            setComplianceFilter('ALL');
            setPage(1);
          }}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: `1px solid ${statusFilter === 'ALL' && complianceFilter === 'ALL' ? '#1976D2' : '#E2E8F0'}`,
            padding: '18px 20px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow:
              statusFilter === 'ALL' && complianceFilter === 'ALL'
                ? '0 0 0 2px rgba(25, 118, 210, 0.2)'
                : '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Vehicles
              </span>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#111F33', marginTop: '4px', letterSpacing: '-0.02em' }}>
                {summary.totalVehicles || 0}
              </div>
            </div>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#F1F5F9',
                color: '#111F33',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Truck size={20} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px', fontSize: '12px', color: '#64748B' }}>
            <span style={{ color: '#16A34A', fontWeight: 600 }}>
              ● {summary.activeVehicles || 0} Active
            </span>
            <span style={{ color: '#94A3B8' }}>•</span>
            <span style={{ color: '#64748B' }}>
              {summary.inactiveVehicles || 0} Inactive
            </span>
          </div>
        </div>

        {/* Card 2: Available */}
        <div
          onClick={() => handleStatusFilterChange('AVAILABLE')}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: `1px solid ${statusFilter === 'AVAILABLE' ? '#16A34A' : '#E2E8F0'}`,
            padding: '18px 20px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow:
              statusFilter === 'AVAILABLE'
                ? '0 0 0 2px rgba(22, 163, 74, 0.2)'
                : '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Available
              </span>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#15803D', marginTop: '4px', letterSpacing: '-0.02em' }}>
                {summary.availableVehicles || 0}
              </div>
            </div>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#DCFCE7',
                color: '#15803D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div style={{ marginTop: '12px', fontSize: '12px', color: '#64748B' }}>
            Ready for dispatch allocation
          </div>
        </div>

        {/* Card 3: In Maintenance */}
        <div
          onClick={() => handleStatusFilterChange('UNDER_MAINTENANCE')}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: `1px solid ${statusFilter === 'UNDER_MAINTENANCE' ? '#D97706' : '#E2E8F0'}`,
            padding: '18px 20px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow:
              statusFilter === 'UNDER_MAINTENANCE'
                ? '0 0 0 2px rgba(217, 119, 6, 0.2)'
                : '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                In Maintenance
              </span>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#B45309', marginTop: '4px', letterSpacing: '-0.02em' }}>
                {summary.underMaintenanceVehicles || 0}
              </div>
            </div>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#FEF3C7',
                color: '#B45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Wrench size={20} />
            </div>
          </div>
          <div style={{ marginTop: '12px', fontSize: '12px', color: '#64748B' }}>
            Under inspection or repairs
          </div>
        </div>

        {/* Card 4: Attention Required */}
        <div
          onClick={() => handleComplianceFilterChange('ATTENTION_REQUIRED')}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: `1px solid ${complianceFilter === 'ATTENTION_REQUIRED' ? '#DC2626' : '#E2E8F0'}`,
            padding: '18px 20px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow:
              complianceFilter === 'ATTENTION_REQUIRED'
                ? '0 0 0 2px rgba(220, 38, 38, 0.2)'
                : '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Attention Required
              </span>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#DC2626', marginTop: '4px', letterSpacing: '-0.02em' }}>
                {summary.attentionRequired || 0}
              </div>
            </div>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#FEE2E2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={20} />
            </div>
          </div>
          <div style={{ marginTop: '12px', fontSize: '12px', color: '#DC2626', fontWeight: 600 }}>
            Expired docs or upcoming renewals
          </div>
        </div>
      </div>

      {/* Section C: Search and Filters Toolbar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          padding: '16px 20px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 280px', minWidth: '240px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94A3B8',
              }}
            />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '38px', paddingRight: search ? '32px' : '12px', height: '40px', fontSize: '13px' }}
              placeholder="Search registration, vehicle ID, make/model, driver, depot..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '2px',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div style={{ minWidth: '160px' }}>
            <select
              className="form-control"
              style={{ height: '40px', fontSize: '13px' }}
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
            >
              <option value="ALL">All Operational Statuses</option>
              <option value="AVAILABLE">Available for Dispatch</option>
              <option value="ASSIGNED">Assigned to Run</option>
              <option value="UNDER_MAINTENANCE">In Maintenance</option>
              <option value="INACTIVE">Inactive / Decommissioned</option>
            </select>
          </div>

          {/* Vehicle Type Filter */}
          <div style={{ minWidth: '180px' }}>
            <select
              className="form-control"
              style={{ height: '40px', fontSize: '13px' }}
              value={typeFilter}
              onChange={(e) => handleTypeFilterChange(e.target.value)}
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
          <div style={{ minWidth: '180px' }}>
            <select
              className="form-control"
              style={{ height: '40px', fontSize: '13px' }}
              value={depotFilter}
              onChange={(e) => handleDepotFilterChange(e.target.value)}
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
          <div style={{ minWidth: '170px' }}>
            <select
              className="form-control"
              style={{ height: '40px', fontSize: '13px' }}
              value={complianceFilter}
              onChange={(e) => handleComplianceFilterChange(e.target.value)}
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
              className="btn btn-secondary btn-sm"
              onClick={clearAllFilters}
              style={{ height: '40px', display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#DC2626' }}
            >
              <X size={14} /> Clear Filters
            </button>
          )}
        </div>

        {/* Active Filter Chips & Match Count Header */}
        <div
          style={{
            marginTop: '12px',
            paddingTop: '10px',
            borderTop: '1px solid #F1F5F9',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            fontSize: '12.5px',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#64748B', fontWeight: 600 }}>Active Filters:</span>
            {!isFiltered ? (
              <span style={{ color: '#94A3B8' }}>None (showing full fleet)</span>
            ) : (
              <>
                {debouncedSearch && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: '#EFF6FF',
                      color: '#1E40AF',
                      border: '1px solid #BFDBFE',
                      fontSize: '11.5px',
                    }}
                  >
                    Search: "{debouncedSearch}"
                    <X size={11} style={{ cursor: 'pointer' }} onClick={() => setSearch('')} />
                  </span>
                )}
                {statusFilter !== 'ALL' && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: '#EFF6FF',
                      color: '#1E40AF',
                      border: '1px solid #BFDBFE',
                      fontSize: '11.5px',
                    }}
                  >
                    Status: {statusFilter}
                    <X size={11} style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('ALL')} />
                  </span>
                )}
                {typeFilter !== 'ALL' && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: '#EFF6FF',
                      color: '#1E40AF',
                      border: '1px solid #BFDBFE',
                      fontSize: '11.5px',
                    }}
                  >
                    Type: {typeFilter}
                    <X size={11} style={{ cursor: 'pointer' }} onClick={() => setTypeFilter('ALL')} />
                  </span>
                )}
                {depotFilter !== 'ALL' && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: '#EFF6FF',
                      color: '#1E40AF',
                      border: '1px solid #BFDBFE',
                      fontSize: '11.5px',
                    }}
                  >
                    Depot: {depotFilter}
                    <X size={11} style={{ cursor: 'pointer' }} onClick={() => setDepotFilter('ALL')} />
                  </span>
                )}
                {complianceFilter !== 'ALL' && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: '#FEF2F2',
                      color: '#991B1B',
                      border: '1px solid #FECACA',
                      fontSize: '11.5px',
                    }}
                  >
                    Compliance: {complianceFilter}
                    <X size={11} style={{ cursor: 'pointer' }} onClick={() => setComplianceFilter('ALL')} />
                  </span>
                )}
              </>
            )}
          </div>

          <div style={{ color: '#64748B', fontWeight: 600 }}>
            Showing <strong style={{ color: '#111F33' }}>{vehicles.length}</strong> of{' '}
            <strong style={{ color: '#111F33' }}>{totalCount}</strong> matching vehicle records
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#DC2626',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <ShieldAlert size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Section D: Redesigned Vehicle Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div className="table-responsive">
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>
                <th style={{ padding: '14px 18px', color: '#475569', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Vehicle Asset
                </th>
                <th style={{ padding: '14px 18px', color: '#475569', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Type & Specifications
                </th>
                <th style={{ padding: '14px 18px', color: '#475569', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Depot / Location
                </th>
                <th style={{ padding: '14px 18px', color: '#475569', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Capacity
                </th>
                <th style={{ padding: '14px 18px', color: '#475569', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Operational Status
                </th>
                <th style={{ padding: '14px 18px', color: '#475569', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Compliance
                </th>
                <th style={{ padding: '14px 18px', color: '#475569', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && vehicles.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
                    <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px auto', color: '#1976D2' }} />
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#111F33' }}>
                      Loading fleet assets & compliance metrics...
                    </div>
                  </td>
                </tr>
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
                    <div
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        backgroundColor: '#F1F5F9',
                        color: '#94A3B8',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '12px',
                      }}
                    >
                      <Truck size={28} />
                    </div>
                    <div style={{ fontWeight: 700, color: '#111F33', fontSize: '16px' }}>
                      No vehicles found matching current criteria
                    </div>
                    <p style={{ margin: '6px 0 16px 0', fontSize: '13px', color: '#64748B' }}>
                      {isFiltered
                        ? 'Try clearing active filters or adjusting your search keyword.'
                        : 'No vehicles are registered in the fleet registry yet.'}
                    </p>
                    {isFiltered ? (
                      <button type="button" className="btn btn-secondary btn-sm" onClick={clearAllFilters}>
                        Clear All Filters
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => setIsAddModalOpen(true)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Plus size={14} /> Register First Vehicle
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                vehicles.map((v) => (
                  <tr
                    key={v.id}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      transition: 'background-color 0.15s ease',
                      backgroundColor: actionMenuOpenId === v.id ? '#F8FAFC' : 'transparent',
                    }}
                    className="hover:bg-slate-50"
                  >
                    {/* 1. Vehicle */}
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            backgroundColor: v.is_refrigerated ? '#E0F2FE' : v.fuel_type === 'ELECTRIC' ? '#DCFCE7' : '#F1F5F9',
                            color: v.is_refrigerated ? '#0284C7' : v.fuel_type === 'ELECTRIC' ? '#15803D' : '#475569',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Truck size={20} />
                        </div>
                        <div>
                          <div
                            onClick={() => navigate(`/admin/vehicles/${v.id}`)}
                            style={{
                              fontSize: '13.5px',
                              fontWeight: 700,
                              color: '#1976D2',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                            title="Click to view full vehicle details"
                          >
                            <span>{v.registration_number}</span>
                            {v.is_dispatch_eligible && (
                              <span title="Eligible for Dispatch" style={{ display: 'inline-flex', alignItems: 'center' }}>
                                <CheckCircle2 size={13} style={{ color: '#16A34A' }} />
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                            <code
                              style={{
                                fontFamily: 'monospace',
                                fontSize: '11px',
                                fontWeight: 600,
                                color: '#0369A1',
                                backgroundColor: '#E0F2FE',
                                padding: '1px 5px',
                                borderRadius: '4px',
                              }}
                            >
                              {v.vehicle_code}
                            </code>
                            <span style={{ fontSize: '11px', color: '#64748B' }}>
                              {v.make_model} {v.nickname && `• "${v.nickname}"`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 2. Type & Specifications */}
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                      <div>
                        <span style={{ color: '#111F33', fontWeight: 600, fontSize: '13px' }}>
                          {v.vehicle_type}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                          {renderFuelBadge(v.fuel_type)}
                          {v.is_refrigerated ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '10.5px',
                                fontWeight: 700,
                                backgroundColor: '#E0F2FE',
                                color: '#0284C7',
                                border: '1px solid #BAE6FD',
                              }}
                              title={
                                v.temperature_min_c !== undefined && v.temperature_max_c !== undefined
                                  ? `Target Range: ${v.temperature_min_c}°C to ${v.temperature_max_c}°C`
                                  : 'Chiller Unit'
                              }
                            >
                              <Thermometer size={10} /> Chiller Active
                            </span>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#64748B' }}>Ambient Cargo</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 3. Depot / Location */}
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                      <div>
                        <span style={{ color: '#111F33', fontWeight: 600, fontSize: '13px' }}>
                          {v.depot}
                        </span>
                        <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={11} />
                          <span>{v.city ? `${v.city}, ${v.state || 'Maharashtra'}` : 'Central Facility'}</span>
                        </div>
                      </div>
                    </td>

                    {/* 4. Capacity */}
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                      <div>
                        <strong style={{ color: '#111F33', fontSize: '13px' }}>
                          {v.capacity_crates} crates
                        </strong>
                        <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                          {Number(v.capacity_kg).toLocaleString('en-IN')} KG payload
                        </div>
                      </div>
                    </td>

                    {/* 5. Operational Status */}
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div>{renderStatusBadge(v)}</div>
                        {v.active_run_code && (
                          <div
                            onClick={() => navigate('/admin/assignments')}
                            style={{
                              fontSize: '11px',
                              color: '#1D4ED8',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title="View Active Delivery Run Assignment"
                          >
                            <span>Run: {v.active_run_code}</span>
                          </div>
                        )}
                        {v.active_driver_name && (
                          <span style={{ fontSize: '10.5px', color: '#64748B' }}>
                            Driver: {v.active_driver_name}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 6. Compliance */}
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                      {renderComplianceBadge(v)}
                    </td>

                    {/* 7. Actions */}
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => navigate(`/admin/vehicles/${v.id}`)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', height: '32px' }}
                        >
                          <Eye size={13} /> Details
                        </button>

                        {/* Overflow menu toggle */}
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setActionMenuOpenId(actionMenuOpenId === v.id ? null : v.id)}
                          style={{ padding: '6px', height: '32px' }}
                          title="Quick actions"
                        >
                          <MoreVertical size={14} />
                        </button>

                        {/* Contextual dropdown menu */}
                        {actionMenuOpenId === v.id && (
                          <div
                            style={{
                              position: 'absolute',
                              right: 0,
                              top: '36px',
                              zIndex: 100,
                              backgroundColor: '#FFFFFF',
                              borderRadius: '8px',
                              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                              border: '1px solid #E2E8F0',
                              minWidth: '190px',
                              padding: '4px 0',
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
                                fontSize: '12.5px',
                                color: '#1E293B',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                              }}
                              className="hover:bg-slate-50"
                            >
                              <Eye size={14} style={{ color: '#1976D2' }} /> View Asset Details
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
                                fontSize: '12.5px',
                                color: '#1E293B',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                              }}
                              className="hover:bg-slate-50"
                            >
                              <Pencil size={14} style={{ color: '#0284C7' }} /> Edit Specifications
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
                                fontSize: '12.5px',
                                color: '#1E293B',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                              }}
                              className="hover:bg-slate-50"
                            >
                              <FileText size={14} style={{ color: '#16A34A' }} /> Upload Document
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
                                fontSize: '12.5px',
                                color: '#1E293B',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                              }}
                              className="hover:bg-slate-50"
                            >
                              <Wrench size={14} style={{ color: '#D97706' }} /> Log Service Record
                            </button>

                            <div style={{ height: '1px', backgroundColor: '#E2E8F0', margin: '4px 0' }} />

                            <button
                              type="button"
                              onClick={() => handleToggleStatus(v)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                width: '100%',
                                padding: '8px 14px',
                                fontSize: '12.5px',
                                color: v.is_active ? '#DC2626' : '#16A34A',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                              }}
                              className="hover:bg-slate-50"
                            >
                              <Power size={14} />
                              {v.is_active ? 'Deactivate Vehicle' : 'Activate Vehicle'}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Toolbar */}
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            fontSize: '12.5px',
            color: '#64748B',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Rows per page:</span>
            <select
              className="form-control form-control-sm"
              style={{ width: '70px', height: '30px' }}
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span>
              Page <strong style={{ color: '#111F33' }}>{page}</strong> of{' '}
              <strong style={{ color: '#111F33' }}>{totalPages}</strong>
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                style={{ padding: '4px 8px', height: '30px' }}
                title="Previous page"
              >
                <ChevronLeft size={15} />
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                style={{ padding: '4px 8px', height: '30px' }}
                title="Next page"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>

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
    </div>
  );
};
