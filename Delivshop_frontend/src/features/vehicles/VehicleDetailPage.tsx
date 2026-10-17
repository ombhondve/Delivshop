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
} from 'lucide-react';
import { api } from '../../services/api/endpoints';
import { Vehicle } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useNavigation } from '../../context/NavigationContext';
import { AddVehicleDocumentModal } from './AddVehicleDocumentModal';
import { AddMaintenanceModal } from './AddMaintenanceModal';
import { EditVehicleModal } from './EditVehicleModal';
import { formatDate, formatCurrency } from '../../utils/formatters';

interface VehicleDetailPageProps {
  vehicleId: string;
}

type TabType = 'overview' | 'documents' | 'maintenance' | 'assignments';

export const VehicleDetailPage: React.FC<VehicleDetailPageProps> = ({ vehicleId }) => {
  const { navigate, goBack } = useNavigation();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isMaintModalOpen, setIsMaintModalOpen] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

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
      showToast(`Vehicle ${vehicle.registration_number} marked as ${nextStatus === 'AVAILABLE' ? 'Active' : 'Decommissioned'}`);
      await fetchVehicleDetails();
    } catch (err: any) {
      showToast(err?.message || 'Failed to update vehicle status', 'error');
    } finally {
      setStatusUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return <Badge variant="success">Available</Badge>;
      case 'ASSIGNED':
        return <Badge variant="navy">Assigned to Run</Badge>;
      case 'UNDER_MAINTENANCE':
        return <Badge variant="warning">In Workshop</Badge>;
      case 'INACTIVE':
      default:
        return <Badge variant="neutral">Inactive</Badge>;
    }
  };

  const getDocBadge = (status: string) => {
    switch (status) {
      case 'VALID':
        return <Badge variant="success">Valid & Verified</Badge>;
      case 'EXPIRING':
        return <Badge variant="warning">Expiring Soon</Badge>;
      case 'EXPIRED':
        return <Badge variant="danger">Expired</Badge>;
      default:
        return <Badge variant="neutral">Pending Verification</Badge>;
    }
  };

  // Loading skeleton state
  if (loading && !vehicle) {
    return (
      <div className="page-container" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{ width: '120px', height: '36px', background: '#E2E8F0', borderRadius: '6px' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <div style={{ width: '220px', height: '30px', background: '#E2E8F0', borderRadius: '6px', marginBottom: '8px' }} />
            <div style={{ width: '160px', height: '18px', background: '#F1F5F9', borderRadius: '4px' }} />
          </div>
          <div style={{ width: '140px', height: '36px', background: '#E2E8F0', borderRadius: '6px' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: '90px', background: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '16px' }} />
          ))}
        </div>
      </div>
    );
  }

  // Not Found state
  if (notFound || (!vehicle && !loading)) {
    return (
      <div className="page-container" style={{ padding: '40px 24px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
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
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px 0' }}>
          Vehicle Asset Not Found
        </h2>
        <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '24px' }}>
          The requested vehicle identifier does not exist or has been permanently removed from the central fleet registry.
        </p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigate('/admin/vehicles')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <ArrowLeft size={16} /> Return to Fleet Vehicles
        </button>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Toast banner */}
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
          }}
        >
          {toastMessage.text}
        </div>
      )}

      {/* Back button & Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => navigate('/admin/vehicles')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={14} /> Back to Vehicles
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={fetchVehicleDetails}
            title="Refresh asset profile"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span style={{ marginLeft: '4px' }}>Refresh</span>
          </button>
        </div>
      </div>

      {/* Page Header Bar */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          padding: '20px 24px',
          marginBottom: '20px',
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
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              backgroundColor: vehicle?.is_refrigerated ? '#E0F2FE' : '#F1F5F9',
              color: vehicle?.is_refrigerated ? '#0284C7' : '#0F172A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Truck size={24} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                {vehicle?.registration_number}
              </h1>
              {vehicle && getStatusBadge(vehicle.status)}
              <Badge variant={vehicle?.is_active ? 'success' : 'neutral'}>
                {vehicle?.is_active ? 'Active Resource' : 'Decommissioned'}
              </Badge>
            </div>
            <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Internal Asset Code:</span>
              <code
                style={{
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  fontSize: '13px',
                  color: '#0369A1',
                  backgroundColor: '#E0F2FE',
                  padding: '2px 8px',
                  borderRadius: '4px',
                }}
              >
                {vehicle?.vehicle_code}
              </code>
              <span>•</span>
              <span style={{ fontWeight: 600, color: '#334155' }}>{vehicle?.make_model}</span>
              <span>•</span>
              <span>{vehicle?.vehicle_type}</span>
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
            <Pencil size={15} /> Edit Vehicle
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

      {/* KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <Card style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                Payload Capacity
              </span>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                {vehicle?.capacity_crates} crates
              </div>
            </div>
            <div style={{ background: '#F1F5F9', color: '#0F172A', padding: '8px', borderRadius: '6px' }}>
              <Package size={18} />
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px' }}>
            {vehicle?.capacity_kg} KG payload limit
          </div>
        </Card>

        <Card style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                Current Odometer
              </span>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                {(vehicle?.current_odometer_km || 0).toLocaleString('en-IN')} KM
              </div>
            </div>
            <div style={{ background: '#F1F5F9', color: '#0F172A', padding: '8px', borderRadius: '6px' }}>
              <Gauge size={18} />
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px' }}>
            Fuel: {vehicle?.fuel_type}
          </div>
        </Card>

        <Card style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                Refrigeration Unit
              </span>
              <div style={{ fontSize: '20px', fontWeight: 800, color: vehicle?.is_refrigerated ? '#0284C7' : '#64748B', marginTop: '4px' }}>
                {vehicle?.is_refrigerated ? 'Chiller Installed' : 'Non-Refrigerated'}
              </div>
            </div>
            <div style={{ background: vehicle?.is_refrigerated ? '#E0F2FE' : '#F1F5F9', color: vehicle?.is_refrigerated ? '#0284C7' : '#64748B', padding: '8px', borderRadius: '6px' }}>
              <Thermometer size={18} />
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px' }}>
            {vehicle?.is_refrigerated ? 'Dairy & Cold Chain Ready' : 'Dry Cargo Transport'}
          </div>
        </Card>

        <Card style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                Active Allocation
              </span>
              <div style={{ fontSize: '16px', fontWeight: 800, color: vehicle?.active_run_code ? '#2563EB' : '#15803D', marginTop: '4px' }}>
                {vehicle?.active_run_code ? vehicle.active_run_code : 'Available / Standby'}
              </div>
            </div>
            <div style={{ background: vehicle?.active_run_code ? '#EFF6FF' : '#DCFCE7', color: vehicle?.active_run_code ? '#2563EB' : '#15803D', padding: '8px', borderRadius: '6px' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px' }}>
            {vehicle?.active_driver_name ? `Driver: ${vehicle.active_driver_name}` : 'No active run dispatched'}
          </div>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div style={{ borderBottom: '1px solid #E2E8F0', marginBottom: '20px', display: 'flex', gap: '8px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: 600,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'overview' ? '2px solid #0369A1' : '2px solid transparent',
            color: activeTab === 'overview' ? '#0369A1' : '#64748B',
          }}
        >
          Overview & Specifications
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('documents')}
          style={{
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: 600,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'documents' ? '2px solid #0369A1' : '2px solid transparent',
            color: activeTab === 'documents' ? '#0369A1' : '#64748B',
          }}
        >
          Compliance & Documents ({vehicle?.documents?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('maintenance')}
          style={{
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: 600,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'maintenance' ? '2px solid #0369A1' : '2px solid transparent',
            color: activeTab === 'maintenance' ? '#0369A1' : '#64748B',
          }}
        >
          Maintenance & Service ({vehicle?.maintenance?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('assignments')}
          style={{
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: 600,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'assignments' ? '2px solid #0369A1' : '2px solid transparent',
            color: activeTab === 'assignments' ? '#0369A1' : '#64748B',
          }}
        >
          Assignment History ({vehicle?.assignments?.length || 0})
        </button>
      </div>

      {/* Tab 1: Overview & Specs */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          <Card title="Vehicle Specifications" noPadding>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Registration Number:</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>{vehicle?.registration_number}</span>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Vehicle Identifier:</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#0369A1', fontFamily: 'monospace' }}>{vehicle?.vehicle_code}</span>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Make & Model:</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>{vehicle?.make_model}</span>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Classification:</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>{vehicle?.vehicle_type}</span>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Fuel / Propulsion Type:</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>{vehicle?.fuel_type}</span>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Cold-Chain Chiller:</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: vehicle?.is_refrigerated ? '#0284C7' : '#64748B' }}>
                    {vehicle?.is_refrigerated ? 'Yes (Chilled Dairy Unit)' : 'No (Standard Ambient)'}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Payload Capacity:</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>{vehicle?.capacity_kg} KG ({vehicle?.capacity_crates} crates)</span>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Current Odometer:</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>{(vehicle?.current_odometer_km || 0).toLocaleString('en-IN')} KM</span>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Home Base Depot:</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>{vehicle?.depot || 'Central Cold Depot'}</span>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Asset Registered On:</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>{formatDate(vehicle?.created_at || '')}</span>
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

          <Card title="Current Run Status" noPadding>
            <div style={{ padding: '20px' }}>
              {vehicle?.active_run_code ? (
                <div>
                  <div style={{ padding: '12px', backgroundColor: '#EFF6FF', borderRadius: '8px', border: '1px solid #BFDBFE', marginBottom: '14px' }}>
                    <div style={{ fontSize: '12px', color: '#1E40AF', fontWeight: 600 }}>Active Dispatch Code:</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#1D4ED8', marginTop: '2px' }}>
                      {vehicle.active_run_code}
                    </div>
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <span style={{ fontSize: '12px', color: '#64748B' }}>Assigned Driver:</span>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                      {vehicle.active_driver_name || 'Driver Assigned'}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '12px', color: '#64748B' }}>Operational Status:</span>
                    <div style={{ marginTop: '4px' }}>
                      {getStatusBadge(vehicle.status)}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#64748B' }}>
                  <CheckCircle2 size={32} style={{ color: '#16A34A', margin: '0 auto 8px auto' }} />
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>Available on Standby</div>
                  <p style={{ fontSize: '12px', margin: '4px 0 16px 0' }}>
                    This vehicle is currently unallocated and eligible for assignment to scheduled delivery runs.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => navigate('/admin/assignments')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <ExternalLink size={14} /> Open Assignments
                  </button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Compliance & Documents */}
      {activeTab === 'documents' && (
        <Card
          title="Vehicle Compliance Documents & Certifications"
          subtitle="Mandatory RTO commercial registrations, fitness, insurance policies, and PUC certificates"
          noPadding
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#F8FAFC' }}>
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
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
              <FileText size={36} style={{ margin: '0 auto 10px auto', opacity: 0.4 }} />
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: '0 0 4px 0' }}>
                No compliance documents uploaded
              </h4>
              <p style={{ fontSize: '12.5px', margin: '0 0 16px 0' }}>
                Upload RC book, insurance policy, and PUC certificates to ensure assignment dispatch compliance.
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
                    <th style={{ padding: '12px 18px', color: '#475569' }}>Document Number</th>
                    <th style={{ padding: '12px 18px', color: '#475569' }}>Issue Date</th>
                    <th style={{ padding: '12px 18px', color: '#475569' }}>Expiry Date</th>
                    <th style={{ padding: '12px 18px', color: '#475569' }}>Verification</th>
                    <th style={{ padding: '12px 18px', color: '#475569' }}>File</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicle.documents.map((doc: any) => (
                    <tr key={doc.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 18px', fontWeight: 600, color: '#0F172A' }}>
                        {doc.document_type}
                      </td>
                      <td style={{ padding: '12px 18px', fontFamily: 'monospace', fontWeight: 600 }}>
                        {doc.document_number}
                      </td>
                      <td style={{ padding: '12px 18px', color: '#64748B' }}>
                        {doc.issue_date ? formatDate(doc.issue_date) : '—'}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <span style={{ fontWeight: 600, color: doc.expiry_date && new Date(doc.expiry_date) < new Date() ? '#DC2626' : '#0F172A' }}>
                          {doc.expiry_date ? formatDate(doc.expiry_date) : 'Permanent'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        {getDocBadge(doc.verification_status)}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        {doc.file_url ? (
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#0284C7', textDecoration: 'underline', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <FileText size={13} /> View File
                          </a>
                        ) : (
                          <span style={{ color: '#94A3B8', fontSize: '12px' }}>No attachment</span>
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

      {/* Tab 3: Maintenance & Service History */}
      {activeTab === 'maintenance' && (
        <Card
          title="Maintenance & Fleet Service Logbook"
          subtitle="Routine oil changes, brake inspections, refrigeration unit maintenance, and emergency repairs"
          noPadding
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#F8FAFC' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setIsMaintModalOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={14} /> Add Service Record
            </button>
          </div>

          {!vehicle?.maintenance || vehicle.maintenance.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
              <Wrench size={36} style={{ margin: '0 auto 10px auto', opacity: 0.4 }} />
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: '0 0 4px 0' }}>
                No maintenance records logged
              </h4>
              <p style={{ fontSize: '12.5px', margin: '0 0 16px 0' }}>
                Keep track of garage servicing, parts replacement, and preventive maintenance.
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsMaintModalOpen(true)}
              >
                Log Maintenance
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
                    <th style={{ padding: '12px 18px', color: '#475569' }}>Cost</th>
                    <th style={{ padding: '12px 18px', color: '#475569' }}>Service Center</th>
                    <th style={{ padding: '12px 18px', color: '#475569' }}>Next Due</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicle.maintenance.map((m: any) => (
                    <tr key={m.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 18px', fontWeight: 600, color: '#0F172A' }}>
                        {formatDate(m.service_date)}
                      </td>
                      <td style={{ padding: '12px 18px', fontWeight: 600, color: '#334155' }}>
                        {m.service_type}
                      </td>
                      <td style={{ padding: '12px 18px', color: '#64748B' }}>
                        {(m.odometer_km || 0).toLocaleString('en-IN')} KM
                      </td>
                      <td style={{ padding: '12px 18px', fontWeight: 600, color: '#16A34A' }}>
                        {formatCurrency(Number(m.cost) || 0)}
                      </td>
                      <td style={{ padding: '12px 18px', color: '#64748B' }}>
                        {m.service_center || 'Central Maintenance Depot'}
                      </td>
                      <td style={{ padding: '12px 18px', color: '#B45309', fontWeight: 500 }}>
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

      {/* Tab 4: Assignment History */}
      {activeTab === 'assignments' && (
        <Card
          title="Delivery Run Dispatches & Assignment History"
          subtitle="Scheduled route runs and drivers assigned to this vehicle"
          noPadding
        >
          {!vehicle?.assignments || vehicle.assignments.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
              <Clock size={36} style={{ margin: '0 auto 10px auto', opacity: 0.4 }} />
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: '0 0 4px 0' }}>
                No historical run dispatches found
              </h4>
              <p style={{ fontSize: '12.5px', margin: 0 }}>
                This vehicle has not yet executed delivery runs in the dispatch system.
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table" style={{ width: '100%', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>
                    <th style={{ padding: '12px 18px', color: '#475569' }}>Run Code</th>
                    <th style={{ padding: '12px 18px', color: '#475569' }}>Route</th>
                    <th style={{ padding: '12px 18px', color: '#475569' }}>Assigned Driver</th>
                    <th style={{ padding: '12px 18px', color: '#475569' }}>Delivery Date</th>
                    <th style={{ padding: '12px 18px', color: '#475569' }}>Run Status</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicle.assignments.map((run: any) => (
                    <tr key={run.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 18px', fontFamily: 'monospace', fontWeight: 700, color: '#2563EB' }}>
                        {run.run_code}
                      </td>
                      <td style={{ padding: '12px 18px', fontWeight: 600, color: '#0F172A' }}>
                        {run.route_name || run.route_code}
                      </td>
                      <td style={{ padding: '12px 18px', color: '#334155' }}>
                        {run.driver_name} ({run.driver_employee_id || 'ID N/A'})
                      </td>
                      <td style={{ padding: '12px 18px', color: '#64748B' }}>
                        {formatDate(run.delivery_date)}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <Badge variant={run.status === 'COMPLETED' ? 'success' : run.status === 'IN_PROGRESS' ? 'navy' : 'neutral'}>
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
              showToast('Compliance document added successfully');
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
              showToast('Maintenance record logged');
              fetchVehicleDetails();
            }}
          />
        </>
      )}
    </div>
  );
};
