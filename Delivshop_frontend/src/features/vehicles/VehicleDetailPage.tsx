import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Truck,
  FileText,
  Wrench,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Plus,
  RefreshCw,
  MapPin,
  Thermometer,
  Gauge,
  Package,
  Pencil,
  Power,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Download,
  Trash2,
  User as UserIcon,
  Activity,
  History,
  Info,
} from 'lucide-react';
import { api } from '../../services/api/endpoints';
import { Vehicle } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { useNavigation } from '../../context/NavigationContext';
import { AddVehicleDocumentModal } from './AddVehicleDocumentModal';
import { AddMaintenanceModal } from './AddMaintenanceModal';
import { EditVehicleModal } from './EditVehicleModal';
import { formatDate, formatCurrency } from '../../utils/formatters';

interface VehicleDetailPageProps {
  vehicleId: string;
}

type TabType = 'overview' | 'assignments' | 'documents' | 'maintenance' | 'activity';

export const VehicleDetailPage: React.FC<VehicleDetailPageProps> = ({ vehicleId }) => {
  const { navigate } = useNavigation();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Modals & Action States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isMaintModalOpen, setIsMaintModalOpen] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [confirmDeleteDocId, setConfirmDeleteDocId] = useState<string | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchVehicleDetails = useCallback(async () => {
    if (!vehicleId) return;
    try {
      setLoading(true);
      setError(null);
      setNotFound(false);
      const res = await api.vehicles.get(vehicleId);
      const data = res?.data || res;
      if (!data || !data.id) {
        setNotFound(true);
        return;
      }
      setVehicle(data);
    } catch (err: any) {
      if (err?.status === 404 || err?.statusCode === 404) {
        setNotFound(true);
      } else {
        setError(err?.message || 'Failed to retrieve vehicle details from fleet server');
      }
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    fetchVehicleDetails();
  }, [fetchVehicleDetails]);

  const handleStatusToggle = async () => {
    if (!vehicle) return;
    const nextStatus = vehicle.is_active ? 'INACTIVE' : 'AVAILABLE';
    try {
      setStatusUpdating(true);
      await api.vehicles.updateStatus(vehicle.id, nextStatus);
      showToast(
        `Vehicle ${vehicle.registration_number} status updated to ${nextStatus === 'AVAILABLE' ? 'Active' : 'Decommissioned'}`
      );
      await fetchVehicleDetails();
    } catch (err: any) {
      showToast(err?.message || 'Failed to update vehicle status', 'error');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!vehicle) return;
    try {
      await api.vehicles.deleteDocument(vehicle.id, docId);
      showToast('Compliance document removed');
      setConfirmDeleteDocId(null);
      await fetchVehicleDetails();
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete document', 'error');
    }
  };

  const handleDownloadDocument = async (docId: string, filename?: string) => {
    if (!vehicle) return;
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/vehicles/${vehicle.id}/documents/${docId}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        throw new Error('Failed to retrieve file from secure storage');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `vehicle_doc_${docId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      showToast(err?.message || 'Download failed', 'error');
    }
  };

  const getStatusBadge = (status: string, isActive: boolean) => {
    if (!isActive || status === 'INACTIVE') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor: '#F1F5F9',
            color: '#64748B',
            border: '1px solid #CBD5E1',
          }}
        >
          Inactive
        </span>
      );
    }
    switch (status) {
      case 'AVAILABLE':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: '#DCFCE7',
              color: '#166534',
              border: '1px solid #BBF7D0',
            }}
          >
            Available for Dispatch
          </span>
        );
      case 'ASSIGNED':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: '#EFF6FF',
              color: '#1E40AF',
              border: '1px solid #BFDBFE',
            }}
          >
            Assigned to Delivery Run
          </span>
        );
      case 'UNDER_MAINTENANCE':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: '#FEF3C7',
              color: '#92400E',
              border: '1px solid #FDE68A',
            }}
          >
            In Workshop / Maintenance
          </span>
        );
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const getDocBadge = (status: string) => {
    switch (status) {
      case 'VALID':
        return (
          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, backgroundColor: '#DCFCE7', color: '#166534' }}>
            Valid & Verified
          </span>
        );
      case 'EXPIRING':
        return (
          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, backgroundColor: '#FEF3C7', color: '#B45309' }}>
            Expiring Soon (&lt; 30d)
          </span>
        );
      case 'EXPIRED':
        return (
          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, backgroundColor: '#FEE2E2', color: '#B91C1C' }}>
            Expired
          </span>
        );
      default:
        return (
          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, backgroundColor: '#F1F5F9', color: '#475569' }}>
            {status}
          </span>
        );
    }
  };

  if (loading && !vehicle) {
    return (
      <div className="page-container" style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{ width: '120px', height: '36px', background: '#E2E8F0', borderRadius: '6px' }} />
        </div>
        <div style={{ height: '140px', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '20px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: '90px', background: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0' }} />
          ))}
        </div>
      </div>
    );
  }

  if (notFound || (!vehicle && !loading)) {
    return (
      <div className="page-container" style={{ padding: '60px 24px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#FEF2F2',
            color: '#DC2626',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
          }}
        >
          <Truck size={32} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#111F33', margin: '0 0 8px 0' }}>
          Vehicle Asset Not Found
        </h2>
        <p style={{ fontSize: '13.5px', color: '#64748B', marginBottom: '24px' }}>
          The requested vehicle identifier does not exist or has been removed from the fleet.
        </p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigate('/admin/vehicles')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <ArrowLeft size={16} /> Return to Fleet Registry
        </button>
      </div>
    );
  }

  const eligibility = vehicle?.eligibility;
  const isEligible = eligibility?.isEligible;

  return (
    <div className="page-container">
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

      {/* Navigation & Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => navigate('/admin/vehicles')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={14} /> Back to Fleet Vehicles
        </button>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={fetchVehicleDetails}
          title="Refresh asset profile"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Asset Hero Header Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          padding: '20px 24px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '10px',
                backgroundColor: vehicle?.is_refrigerated ? '#E0F2FE' : '#F1F5F9',
                color: vehicle?.is_refrigerated ? '#0284C7' : '#111F33',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Truck size={26} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111F33', margin: 0 }}>
                  {vehicle?.registration_number}
                </h1>
                {vehicle && getStatusBadge(vehicle.status, vehicle.is_active)}
                {vehicle?.nickname && (
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#0369A1',
                      backgroundColor: '#F0F9FF',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: '1px solid #BAE6FD',
                    }}
                  >
                    "{vehicle.nickname}"
                  </span>
                )}
              </div>

              <div
                style={{
                  fontSize: '13px',
                  color: '#64748B',
                  marginTop: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >
                <span>Internal Asset ID:</span>
                <code
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: '12.5px',
                    color: '#0369A1',
                    backgroundColor: '#E0F2FE',
                    padding: '2px 8px',
                    borderRadius: '4px',
                  }}
                >
                  {vehicle?.vehicle_code}
                </code>
                <span>•</span>
                <span style={{ fontWeight: 600, color: '#1E293B' }}>{vehicle?.make_model}</span>
                {vehicle?.manufacturing_year && <span>({vehicle.manufacturing_year})</span>}
                <span>•</span>
                <span>{vehicle?.vehicle_type}</span>
                <span>•</span>
                <span>{vehicle?.depot}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsEditModalOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Pencil size={15} /> Edit Specs
            </button>

            <button
              type="button"
              className={`btn ${vehicle?.is_active ? 'btn-outline-danger' : 'btn-outline-success'}`}
              onClick={handleStatusToggle}
              disabled={statusUpdating}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Power size={15} />
              {statusUpdating ? 'Updating...' : vehicle?.is_active ? 'Deactivate Vehicle' : 'Activate Vehicle'}
            </button>
          </div>
        </div>

        {/* Section 7: Dispatch Eligibility Banner */}
        {eligibility && (
          <div
            style={{
              marginTop: '18px',
              padding: '14px 18px',
              borderRadius: '8px',
              backgroundColor: isEligible ? '#F0FDF4' : '#FEF2F2',
              border: `1px solid ${isEligible ? '#BBF7D0' : '#FECACA'}`,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            {isEligible ? (
              <CheckCircle2 size={20} style={{ color: '#16A34A', flexShrink: 0, marginTop: '2px' }} />
            ) : (
              <AlertTriangle size={20} style={{ color: '#DC2626', flexShrink: 0, marginTop: '2px' }} />
            )}
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: '13.5px',
                  fontWeight: 700,
                  color: isEligible ? '#166534' : '#991B1B',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>{isEligible ? 'Dispatch Eligible' : 'Not Eligible for Run Dispatch'}</span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    backgroundColor: isEligible ? '#DCFCE7' : '#FEE2E2',
                    color: isEligible ? '#15803D' : '#B91C1C',
                  }}
                >
                  {isEligible ? 'All Business Rules Passed' : `${eligibility.reasons.length} Blocking Condition(s)`}
                </span>
              </div>

              {!isEligible ? (
                <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', fontSize: '12.5px', color: '#B91C1C' }}>
                  {eligibility.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#15803D' }}>
                  Vehicle meets active operational criteria, has verified mandatory documents (RC & Insurance), and has no conflicting assignment.
                </p>
              )}

              {eligibility.warnings && eligibility.warnings.length > 0 && (
                <div style={{ marginTop: '6px', fontSize: '12px', color: '#B45309' }}>
                  <strong>Operational Warnings:</strong> {eligibility.warnings.join(' • ')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* KPI Overview Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <Card style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                Payload & Crates
              </span>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#111F33', marginTop: '4px' }}>
                {vehicle?.capacity_crates} crates
              </div>
            </div>
            <div style={{ background: '#F1F5F9', color: '#111F33', padding: '8px', borderRadius: '6px' }}>
              <Package size={18} />
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px' }}>
            {Number(vehicle?.capacity_kg).toLocaleString('en-IN')} KG payload limit
          </div>
        </Card>

        <Card style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                Odometer Reading
              </span>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#111F33', marginTop: '4px' }}>
                {Number(vehicle?.current_odometer_km || 0).toLocaleString('en-IN')} KM
              </div>
            </div>
            <div style={{ background: '#F1F5F9', color: '#111F33', padding: '8px', borderRadius: '6px' }}>
              <Gauge size={18} />
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px' }}>
            Propulsion: {vehicle?.fuel_type}
          </div>
        </Card>

        <Card style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                Refrigeration Unit
              </span>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: vehicle?.is_refrigerated ? '#0284C7' : '#64748B',
                  marginTop: '4px',
                }}
              >
                {vehicle?.is_refrigerated ? 'Chiller Installed' : 'Non-Refrigerated'}
              </div>
            </div>
            <div
              style={{
                background: vehicle?.is_refrigerated ? '#E0F2FE' : '#F1F5F9',
                color: vehicle?.is_refrigerated ? '#0284C7' : '#64748B',
                padding: '8px',
                borderRadius: '6px',
              }}
            >
              <Thermometer size={18} />
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px' }}>
            {vehicle?.is_refrigerated
              ? vehicle?.temperature_min_c !== undefined && vehicle?.temperature_max_c !== undefined
                ? `Range: ${vehicle.temperature_min_c}°C to ${vehicle.temperature_max_c}°C`
                : 'Cold Chain Dairy Approved'
              : 'Ambient Dry Cargo'}
          </div>
        </Card>

        <Card style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                Active Allocation
              </span>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 800,
                  color: vehicle?.active_run_code ? '#2563EB' : '#15803D',
                  marginTop: '4px',
                }}
              >
                {vehicle?.active_run_code ? vehicle.active_run_code : 'Available / Standby'}
              </div>
            </div>
            <div
              style={{
                background: vehicle?.active_run_code ? '#EFF6FF' : '#DCFCE7',
                color: vehicle?.active_run_code ? '#2563EB' : '#15803D',
                padding: '8px',
                borderRadius: '6px',
              }}
            >
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px' }}>
            {vehicle?.active_driver_name ? `Driver: ${vehicle.active_driver_name}` : 'No active run dispatched'}
          </div>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div
        style={{
          borderBottom: '1px solid #E2E8F0',
          marginBottom: '20px',
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '12px 18px',
            fontSize: '13.5px',
            fontWeight: 600,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'overview' ? '2px solid #1976D2' : '2px solid transparent',
            color: activeTab === 'overview' ? '#1976D2' : '#64748B',
            whiteSpace: 'nowrap',
          }}
        >
          Overview & Specs
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('assignments')}
          style={{
            padding: '12px 18px',
            fontSize: '13.5px',
            fontWeight: 600,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'assignments' ? '2px solid #1976D2' : '2px solid transparent',
            color: activeTab === 'assignments' ? '#1976D2' : '#64748B',
            whiteSpace: 'nowrap',
          }}
        >
          Assignments & Runs ({vehicle?.assignments?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('documents')}
          style={{
            padding: '12px 18px',
            fontSize: '13.5px',
            fontWeight: 600,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'documents' ? '2px solid #1976D2' : '2px solid transparent',
            color: activeTab === 'documents' ? '#1976D2' : '#64748B',
            whiteSpace: 'nowrap',
          }}
        >
          Compliance & Documents ({vehicle?.documents?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('maintenance')}
          style={{
            padding: '12px 18px',
            fontSize: '13.5px',
            fontWeight: 600,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'maintenance' ? '2px solid #1976D2' : '2px solid transparent',
            color: activeTab === 'maintenance' ? '#1976D2' : '#64748B',
            whiteSpace: 'nowrap',
          }}
        >
          Maintenance & Service ({vehicle?.maintenance?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('activity')}
          style={{
            padding: '12px 18px',
            fontSize: '13.5px',
            fontWeight: 600,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'activity' ? '2px solid #1976D2' : '2px solid transparent',
            color: activeTab === 'activity' ? '#1976D2' : '#64748B',
            whiteSpace: 'nowrap',
          }}
        >
          Activity History ({vehicle?.activity?.length || 0})
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          <Card title="Vehicle Specifications & Technical Profile" noPadding>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '18px' }}>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Registration Number:</span>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#111F33' }}>
                    {vehicle?.registration_number}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Asset Identifier:</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#0369A1', fontFamily: 'monospace' }}>
                    {vehicle?.vehicle_code}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Make & Model:</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#111F33' }}>
                    {vehicle?.make_model}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Callsign / Nickname:</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: vehicle?.nickname ? '#111F33' : '#94A3B8' }}>
                    {vehicle?.nickname || 'None assigned'}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Manufacturing Year:</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#111F33' }}>
                    {vehicle?.manufacturing_year || 'Not specified'}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Vehicle Classification:</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#111F33' }}>
                    {vehicle?.vehicle_type}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Fuel / Propulsion Type:</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#111F33' }}>
                    {vehicle?.fuel_type}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Refrigeration Chiller:</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: vehicle?.is_refrigerated ? '#0284C7' : '#64748B' }}>
                    {vehicle?.is_refrigerated
                      ? `Active Chiller (${vehicle.temperature_min_c ?? -18}°C to ${vehicle.temperature_max_c ?? 4}°C)`
                      : 'No (Ambient Dry Cargo)'}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Payload & Crate Capacity:</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#111F33' }}>
                    {vehicle?.capacity_kg} KG ({vehicle?.capacity_crates} crates)
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Current Odometer:</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#111F33' }}>
                    {Number(vehicle?.current_odometer_km || 0).toLocaleString('en-IN')} KM
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Home Base Depot:</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#111F33' }}>
                    {vehicle?.depot}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Registered Timestamp:</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#111F33' }}>
                    {formatDate(vehicle?.created_at || '')}
                  </span>
                </div>
              </div>

              {vehicle?.notes && (
                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '4px' }}>
                    Operational & Maintenance Remarks:
                  </span>
                  <p style={{ fontSize: '13px', color: '#334155', margin: 0, backgroundColor: '#F8FAFC', padding: '10px 14px', borderRadius: '6px' }}>
                    {vehicle.notes}
                  </p>
                </div>
              )}
            </div>
          </Card>

          <Card title="Current Dispatch Status" noPadding>
            <div style={{ padding: '20px' }}>
              {vehicle?.active_run_code ? (
                <div>
                  <div style={{ padding: '12px', backgroundColor: '#EFF6FF', borderRadius: '8px', border: '1px solid #BFDBFE', marginBottom: '14px' }}>
                    <div style={{ fontSize: '11px', color: '#1E40AF', fontWeight: 600, textTransform: 'uppercase' }}>
                      Active Dispatch Run
                    </div>
                    <div style={{ fontSize: '17px', fontWeight: 800, color: '#1D4ED8', marginTop: '2px' }}>
                      {vehicle.active_run_code}
                    </div>
                    {vehicle.active_route_name && (
                      <div style={{ fontSize: '12px', color: '#1E3A8A', marginTop: '2px' }}>
                        Route: {vehicle.active_route_name}
                      </div>
                    )}
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <span style={{ fontSize: '12px', color: '#64748B' }}>Assigned Driver:</span>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#111F33', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <UserIcon size={14} style={{ color: '#1976D2' }} />
                      <span>{vehicle.active_driver_name || 'Driver on Duty'}</span>
                    </div>
                    {vehicle.active_driver_phone && (
                      <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                        Contact: {vehicle.active_driver_phone}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => navigate('/admin/assignments')}
                    style={{ width: '100%', marginTop: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <ExternalLink size={14} /> Open Dispatch Monitor
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '16px 0', color: '#64748B' }}>
                  <CheckCircle2 size={36} style={{ color: '#16A34A', margin: '0 auto 10px auto' }} />
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#111F33' }}>Available on Standby</div>
                  <p style={{ fontSize: '12.5px', margin: '6px 0 16px 0', lineHeight: 1.5 }}>
                    This vehicle is currently not assigned to any active delivery run and is ready for route allocation.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => navigate('/admin/assignments')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <ExternalLink size={14} /> Dispatch Run in Assignments
                  </button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Assignments & Runs */}
      {activeTab === 'assignments' && (
        <Card
          title="Delivery Run Dispatches & Assignment History"
          subtitle="Complete chronological record of delivery runs dispatched with this vehicle"
          noPadding
        >
          {!vehicle?.assignments || vehicle.assignments.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
              <Clock size={40} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
              <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#111F33', margin: '0 0 6px 0' }}>
                No historical delivery runs logged
              </h4>
              <p style={{ fontSize: '13px', margin: '0 0 16px 0' }}>
                This vehicle has not yet executed delivery runs in the dispatch system.
              </p>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => navigate('/admin/assignments')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <ExternalLink size={14} /> Open Assignments Module
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table" style={{ width: '100%', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>
                    <th style={{ padding: '12px 18px', color: '#475569' }}>Run Code</th>
                    <th style={{ padding: '12px 18px', color: '#475569' }}>Route & Hub</th>
                    <th style={{ padding: '12px 18px', color: '#475569' }}>Assigned Driver</th>
                    <th style={{ padding: '12px 18px', color: '#475569' }}>Delivery Date</th>
                    <th style={{ padding: '12px 18px', color: '#475569' }}>Stops</th>
                    <th style={{ padding: '12px 18px', color: '#475569' }}>Run Status</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicle.assignments.map((run: any) => (
                    <tr key={run.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 18px', fontFamily: 'monospace', fontWeight: 700, color: '#1976D2' }}>
                        {run.run_code}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ fontWeight: 600, color: '#111F33' }}>
                          {run.route_name || run.route_code}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>
                          {run.route_city || 'Pune'} • {run.route_depot || 'Central Depot'}
                        </div>
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ fontWeight: 600, color: '#111F33' }}>{run.driver_name}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>
                          Emp ID: {run.driver_employee_id || 'N/A'} • {run.driver_phone || ''}
                        </div>
                      </td>
                      <td style={{ padding: '12px 18px', color: '#64748B' }}>
                        {formatDate(run.delivery_date)}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <span style={{ fontWeight: 600, color: '#111F33' }}>
                          {run.completed_stops_count || 0} / {run.planned_stops_count || 0}
                        </span>
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <Badge
                          variant={
                            run.status === 'COMPLETED'
                              ? 'success'
                              : run.status === 'IN_PROGRESS'
                              ? 'navy'
                              : run.status === 'CANCELLED'
                              ? 'danger'
                              : 'neutral'
                          }
                        >
                          {run.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Tab 3: Documents & Compliance */}
      {activeTab === 'documents' && (
        <Card
          title="Vehicle Compliance Documents & Certifications"
          subtitle="Mandatory RTO commercial registrations, fitness, insurance policies, PUC, and temperature calibration certificates"
          noPadding
        >
          <div
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#F8FAFC',
            }}
          >
            <div style={{ fontSize: '12.5px', color: '#64748B' }}>
              Mandatory documents for dairy distribution: <strong style={{ color: '#111F33' }}>RC & Insurance</strong>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setIsDocModalOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={14} /> Upload Compliance Document
            </button>
          </div>

          {!vehicle?.documents || vehicle.documents.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
              <FileText size={40} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
              <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#111F33', margin: '0 0 6px 0' }}>
                No compliance documents uploaded yet
              </h4>
              <p style={{ fontSize: '13px', margin: '0 0 18px 0', maxWidth: '440px', marginInline: 'auto' }}>
                Upload RC book, commercial insurance policy, and fitness certificates to ensure assignment dispatch eligibility.
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsDocModalOpen(true)}
              >
                Upload First Document
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table" style={{ width: '100%', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>
                    <th style={{ padding: '12px 18px', color: '#475569' }}>Document Type</th>
                    <th style={{ padding: '12px 18px', color: '#475569' }}>Reference / Policy #</th>
                    <th style={{ padding: '12px 18px', color: '#475569' }}>Issue Date</th>
                    <th style={{ padding: '12px 18px', color: '#475569' }}>Expiry Date</th>
                    <th style={{ padding: '12px 18px', color: '#475569' }}>Verification</th>
                    <th style={{ padding: '12px 18px', color: '#475569' }}>File Attachment</th>
                    <th style={{ padding: '12px 18px', color: '#475569', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicle.documents.map((doc: any) => (
                    <tr key={doc.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 18px', fontWeight: 700, color: '#111F33' }}>
                        {doc.document_type}
                      </td>
                      <td style={{ padding: '12px 18px', fontFamily: 'monospace', fontWeight: 600, color: '#0369A1' }}>
                        {doc.document_number}
                      </td>
                      <td style={{ padding: '12px 18px', color: '#64748B' }}>
                        {doc.issue_date ? formatDate(doc.issue_date) : '—'}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <span
                          style={{
                            fontWeight: 600,
                            color:
                              doc.expiry_date && new Date(doc.expiry_date) < new Date()
                                ? '#DC2626'
                                : '#111F33',
                          }}
                        >
                          {doc.expiry_date ? formatDate(doc.expiry_date) : 'Permanent'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        {getDocBadge(doc.verification_status)}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        {doc.storage_path || doc.file_url ? (
                          <button
                            type="button"
                            onClick={() => handleDownloadDocument(doc.id, doc.file_name)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#1976D2',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px',
                              fontWeight: 600,
                              textDecoration: 'underline',
                              padding: 0,
                            }}
                          >
                            <Download size={13} /> {doc.file_name || 'Download File'}
                          </button>
                        ) : (
                          <span style={{ color: '#94A3B8', fontSize: '12px' }}>No file attached</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                        {confirmDeleteDocId === doc.id ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '11px', color: '#DC2626' }}>Delete?</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteDocument(doc.id)}
                              style={{
                                backgroundColor: '#DC2626',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                fontSize: '11px',
                                cursor: 'pointer',
                              }}
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteDocId(null)}
                              style={{
                                backgroundColor: '#E2E8F0',
                                color: '#475569',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                fontSize: '11px',
                                cursor: 'pointer',
                              }}
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteDocId(doc.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#94A3B8',
                              cursor: 'pointer',
                              padding: '4px',
                            }}
                            title="Delete document"
                          >
                            <Trash2 size={14} className="hover:text-red-600" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Tab 4: Maintenance & Service */}
      {activeTab === 'maintenance' && (
        <Card
          title="Maintenance & Fleet Service Logbook"
          subtitle="Routine oil changes, brake inspections, refrigeration unit maintenance, and emergency repairs"
          noPadding
        >
          <div
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#F8FAFC',
            }}
          >
            <div style={{ fontSize: '12.5px', color: '#64748B' }}>
              Logged Service Entries: <strong style={{ color: '#111F33' }}>{vehicle?.maintenance?.length || 0}</strong>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setIsMaintModalOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={14} /> Log Service Record
            </button>
          </div>

          {!vehicle?.maintenance || vehicle.maintenance.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
              <Wrench size={40} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
              <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#111F33', margin: '0 0 6px 0' }}>
                No maintenance records logged
              </h4>
              <p style={{ fontSize: '13px', margin: '0 0 18px 0' }}>
                Keep track of authorized garage servicing, parts replacement, and preventive inspections.
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsMaintModalOpen(true)}
              >
                Log First Service Record
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table" style={{ width: '100%', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>
                    <th style={{ padding: '12px 18px', color: '#475569' }}>Service Date</th>
                    <th style={{ padding: '12px 18px', color: '#475569' }}>Service Type</th>
                    <th style={{ padding: '12px 18px', color: '#475569' }}>Odometer</th>
                    <th style={{ padding: '12px 18px', color: '#475569' }}>Service Center</th>
                    <th style={{ padding: '12px 18px', color: '#475569' }}>Cost</th>
                    <th style={{ padding: '12px 18px', color: '#475569' }}>Next Due</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicle.maintenance.map((m: any) => (
                    <tr key={m.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 18px', fontWeight: 700, color: '#111F33' }}>
                        {formatDate(m.service_date)}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ fontWeight: 600, color: '#111F33' }}>{m.service_type}</div>
                        {m.description && (
                          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                            {m.description}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 18px', color: '#475569' }}>
                        {Number(m.odometer_km || 0).toLocaleString('en-IN')} KM
                      </td>
                      <td style={{ padding: '12px 18px', color: '#64748B' }}>
                        {m.service_center || 'Authorized Commercial Garage'}
                      </td>
                      <td style={{ padding: '12px 18px', fontWeight: 700, color: '#16A34A' }}>
                        {formatCurrency(Number(m.cost) || 0)}
                      </td>
                      <td style={{ padding: '12px 18px', color: '#B45309', fontWeight: 600 }}>
                        {m.next_service_date ? formatDate(m.next_service_date) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Tab 5: Activity History (Audit Log) */}
      {activeTab === 'activity' && (
        <Card
          title="Vehicle Operational Audit Trail"
          subtitle="System-generated tamper-evident event log for this vehicle asset"
          noPadding
        >
          {!vehicle?.activity || vehicle.activity.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
              <History size={40} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
              <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#111F33', margin: '0 0 6px 0' }}>
                No audit events recorded yet
              </h4>
              <p style={{ fontSize: '13px', margin: 0 }}>
                Modifications, status updates, and document verification actions will appear here automatically.
              </p>
            </div>
          ) : (
            <div style={{ padding: '18px 24px' }}>
              <div style={{ position: 'relative', paddingLeft: '24px' }}>
                {/* Timeline connector line */}
                <div
                  style={{
                    position: 'absolute',
                    left: '7px',
                    top: '8px',
                    bottom: '8px',
                    width: '2px',
                    backgroundColor: '#E2E8F0',
                  }}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {vehicle.activity.map((ev: any) => (
                    <div key={ev.id} style={{ position: 'relative' }}>
                      {/* Timeline dot */}
                      <div
                        style={{
                          position: 'absolute',
                          left: '-24px',
                          top: '4px',
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          backgroundColor: '#FFFFFF',
                          border: '3px solid #1976D2',
                        }}
                      />

                      <div
                        style={{
                          backgroundColor: '#F8FAFC',
                          borderRadius: '8px',
                          border: '1px solid #E2E8F0',
                          padding: '12px 16px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#111F33' }}>
                            {ev.action.replace(/_/g, ' ')}
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748B' }}>
                            {new Date(ev.created_at).toLocaleString()}
                          </span>
                        </div>

                        <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
                          Triggered by: <strong>{ev.actor_name || 'System Administrator'}</strong>{' '}
                          {ev.actor_role && `(${ev.actor_role})`}
                        </div>

                        {ev.details && (
                          <pre
                            style={{
                              margin: '8px 0 0 0',
                              padding: '8px 10px',
                              backgroundColor: '#FFFFFF',
                              borderRadius: '4px',
                              border: '1px solid #E2E8F0',
                              fontSize: '11px',
                              color: '#334155',
                              fontFamily: 'monospace',
                              overflowX: 'auto',
                            }}
                          >
                            {JSON.stringify(ev.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Sub-modals */}
      <EditVehicleModal
        isOpen={isEditModalOpen}
        vehicle={vehicle}
        onClose={() => setIsEditModalOpen(false)}
        onVehicleUpdated={(updated) => {
          setVehicle((prev) => (prev ? { ...prev, ...updated } : updated));
          showToast('Vehicle specifications updated successfully');
          fetchVehicleDetails();
        }}
      />

      {vehicle && (
        <>
          <AddVehicleDocumentModal
            isOpen={isDocModalOpen}
            vehicleId={vehicle.id}
            registrationNumber={vehicle.registration_number}
            onClose={() => setIsDocModalOpen(false)}
            onDocumentAdded={() => {
              showToast('Compliance document saved and verified');
              fetchVehicleDetails();
            }}
          />

          <AddMaintenanceModal
            isOpen={isMaintModalOpen}
            vehicleId={vehicle.id}
            registrationNumber={vehicle.registration_number}
            currentOdometerKm={vehicle.current_odometer_km || 0}
            onClose={() => setIsMaintModalOpen(false)}
            onMaintenanceAdded={() => {
              showToast('Maintenance service entry recorded');
              fetchVehicleDetails();
            }}
          />
        </>
      )}
    </div>
  );
};
