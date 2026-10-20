import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Truck,
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
  Trash2,
  User as UserIcon,
  ChevronDown,
  Eye,
} from 'lucide-react';
import { api } from '../../services/api/endpoints';
import { Vehicle } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { DeleteConfirmModal } from '../../components/common/DeleteConfirmModal';
import { useNavigation } from '../../context/NavigationContext';
import { AddMaintenanceModal } from './AddMaintenanceModal';
import { EditVehicleModal } from './EditVehicleModal';
import { formatDate, formatCurrency } from '../../utils/formatters';

interface VehicleDetailPageProps {
  vehicleId: string;
}

type TabType = 'overview' | 'maintenance' | 'assignments';

export const VehicleDetailPage: React.FC<VehicleDetailPageProps> = ({ vehicleId }) => {
  const { navigate } = useNavigation();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Modals & Action States
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMaintModalOpen, setIsMaintModalOpen] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [selectedMaintenance, setSelectedMaintenance] = useState<any | null>(null);
  const [confirmStatusToggleOpen, setConfirmStatusToggleOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Close Actions menu on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node)) {
        setIsActionsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsActionsOpen(false);
      }
    };
    if (isActionsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActionsOpen]);

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
      setConfirmStatusToggleOpen(false);
      await fetchVehicleDetails();
    } catch (err: any) {
      showToast(err?.message || 'Failed to update vehicle status', 'error');
    } finally {
      setStatusUpdating(false);
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
            backgroundColor: '#F0FDF4',
            color: '#64748B',
            border: '1px solid #A7AE9F',
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
              backgroundColor: '#D1FAE5',
              color: '#1E40AF',
              border: '1px solid #6EE7B7',
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

  if (loading && !vehicle) {
    return (
      <div className="page-container" style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{ width: '120px', height: '36px', background: '#D6D3C8', borderRadius: '6px' }} />
        </div>
        <div style={{ height: '140px', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #D6D3C8', marginBottom: '20px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: '90px', background: '#FFFFFF', borderRadius: '10px', border: '1px solid #D6D3C8' }} />
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
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1F2937', margin: '0 0 8px 0' }}>
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
    <div className="page-container" style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '48px' }}>
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

      {/* Top Header Row (matching Driver Details layout) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => navigate('/admin/vehicles')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              {vehicle?.registration_number}
            </h1>
            {vehicle && getStatusBadge(vehicle.status, vehicle.is_active)}
          </div>
        </div>

        {/* Action Controls: Edit and Actions Dropdown (OUTSIDE the bordered card) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={fetchVehicleDetails}
            title="Refresh asset profile"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <Button
            variant="secondary"
            onClick={() => setIsEditModalOpen(true)}
            icon={<Pencil size={14} />}
          >
            Edit
          </Button>

          {/* Context Menu Dropdown */}
          <div style={{ position: 'relative' }} ref={actionsMenuRef}>
            <button
              type="button"
              onClick={() => setIsActionsOpen(!isActionsOpen)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
              aria-haspopup="true"
              aria-expanded={isActionsOpen}
            >
              <span>Actions</span>
              <ChevronDown size={14} />
            </button>

            {isActionsOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  marginTop: '6px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '10px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
                  width: '210px',
                  zIndex: 50,
                  padding: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsActionsOpen(false);
                    setConfirmStatusToggleOpen(true);
                  }}
                  disabled={statusUpdating}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: vehicle?.is_active ? '#B45309' : '#15803D',
                    background: 'none',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = vehicle?.is_active ? '#FFFBEB' : '#F0FDF4')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Power size={14} />
                  <span>{vehicle?.is_active ? 'Deactivate' : 'Activate'}</span>
                </button>

                <div style={{ height: '1px', backgroundColor: '#E2E8F0', margin: '4px 0' }} />

                <button
                  type="button"
                  onClick={() => {
                    setIsActionsOpen(false);
                    setIsDeleteModalOpen(true);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#DC2626',
                    background: 'none',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Vehicle Information Card (Separate bordered card below header, matching Driver Details layout) */}
      <Card style={{ padding: '20px 24px', marginBottom: '22px', border: '1px solid #CBD5E1' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '22px', alignItems: 'center' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '12px',
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Truck size={30} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Asset ID
              </div>
              <div style={{ marginTop: '2px' }}>
                <code
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: '13px',
                    color: 'var(--color-primary, #16805D)',
                    backgroundColor: 'var(--color-primary-subtle, #E6F4EA)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid #6EE7B7',
                  }}
                >
                  {vehicle?.vehicle_code}
                </code>
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '3px' }}>
                Reg: {vehicle?.registration_number}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Make & Model
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                {vehicle?.make_model}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                {vehicle?.fuel_type}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Classification
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                {vehicle?.vehicle_type}
              </div>
              <div style={{ fontSize: '12px', color: vehicle?.is_refrigerated ? '#0284C7' : '#64748B' }}>
                {vehicle?.is_refrigerated ? 'Refrigerated' : 'Ambient'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Home Location
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                {vehicle?.depot || 'Not specified'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Status
              </div>
              <div style={{ marginTop: '4px' }}>
                {vehicle && getStatusBadge(vehicle.status, vehicle.is_active)}
              </div>
            </div>
          </div>
        </div>

        {/* Dispatch Eligibility Banner */}
        {eligibility && (
          <div
            style={{
              marginTop: '18px',
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: isEligible ? '#F0FDF4' : '#FEF2F2',
              border: `1px solid ${isEligible ? '#BBF7D0' : '#FECACA'}`,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            {isEligible ? (
              <CheckCircle2 size={18} style={{ color: '#16A34A', flexShrink: 0, marginTop: '2px' }} />
            ) : (
              <AlertTriangle size={18} style={{ color: '#DC2626', flexShrink: 0, marginTop: '2px' }} />
            )}
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: '13px',
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
                <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px', fontSize: '12px', color: '#B91C1C' }}>
                  {eligibility.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#15803D' }}>
                  Vehicle meets active operational criteria and has no conflicting assignment.
                </p>
              )}

              {eligibility.warnings && eligibility.warnings.length > 0 && (
                <div style={{ marginTop: '4px', fontSize: '12px', color: '#B45309' }}>
                  <strong>Operational Warnings:</strong> {eligibility.warnings.join(' • ')}
                </div>
              )}
            </div>
          </div>
        )}
      </Card>


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
                Payload Capacity
              </span>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#1F2937', marginTop: '4px' }}>
                {Number(vehicle?.capacity_kg || 0).toLocaleString('en-IN')} KG
              </div>
            </div>
            <div style={{ background: '#F0FDF4', color: '#1F2937', padding: '8px', borderRadius: '6px' }}>
              <Package size={18} />
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px' }}>
            Maximum gross payload capacity
          </div>
        </Card>

        <Card style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                Odometer Reading
              </span>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#1F2937', marginTop: '4px' }}>
                {Number(vehicle?.current_odometer_km || 0).toLocaleString('en-IN')} KM
              </div>
            </div>
            <div style={{ background: '#F0FDF4', color: '#1F2937', padding: '8px', borderRadius: '6px' }}>
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
                background: vehicle?.is_refrigerated ? '#E0F2FE' : '#F0FDF4',
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
                background: vehicle?.active_run_code ? '#D1FAE5' : '#DCFCE7',
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
          borderBottom: '1px solid #D6D3C8',
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
            borderBottom: activeTab === 'overview' ? '2px solid #047857' : '2px solid transparent',
            color: activeTab === 'overview' ? '#047857' : '#64748B',
            whiteSpace: 'nowrap',
          }}
        >
          Overview & Specs
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
            borderBottom: activeTab === 'maintenance' ? '2px solid #047857' : '2px solid transparent',
            color: activeTab === 'maintenance' ? '#047857' : '#64748B',
            whiteSpace: 'nowrap',
          }}
        >
          Maintenance ({vehicle?.maintenance?.length || 0})
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
            borderBottom: activeTab === 'assignments' ? '2px solid #047857' : '2px solid transparent',
            color: activeTab === 'assignments' ? '#047857' : '#64748B',
            whiteSpace: 'nowrap',
          }}
        >
          Runs ({vehicle?.assignments?.length || 0})
        </button>
      </div>

      {/* Tab 1: Overview & Specs */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          <Card title="Specifications" noPadding>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '18px' }}>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Registration:</span>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#1F2937' }}>
                    {vehicle?.registration_number}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Asset ID:</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#0369A1', fontFamily: 'monospace' }}>
                    {vehicle?.vehicle_code}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Make & Model:</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937' }}>
                    {vehicle?.make_model}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Classification:</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937' }}>
                    {vehicle?.vehicle_type}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Fuel Type:</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937' }}>
                    {vehicle?.fuel_type}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Refrigeration:</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: vehicle?.is_refrigerated ? '#0284C7' : '#64748B' }}>
                    {vehicle?.is_refrigerated
                      ? `Active Chiller (${vehicle.temperature_min_c ?? -18}°C to ${vehicle.temperature_max_c ?? 4}°C)`
                      : 'Ambient'}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Payload:</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937' }}>
                    {Number(vehicle?.capacity_kg || 0).toLocaleString('en-IN')} KG
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Odometer:</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937' }}>
                    {Number(vehicle?.current_odometer_km || 0).toLocaleString('en-IN')} KM
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Home Location:</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937' }}>
                    {vehicle?.depot || 'Not specified'}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Registered:</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937' }}>
                    {formatDate(vehicle?.created_at || '')}
                  </span>
                </div>
              </div>

              {vehicle?.notes && (
                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #D6D3C8' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '4px' }}>
                    Notes:
                  </span>
                  <p style={{ fontSize: '13px', color: '#334155', margin: 0, backgroundColor: '#F8FAFC', padding: '10px 14px', borderRadius: '6px' }}>
                    {vehicle.notes}
                  </p>
                </div>
              )}
            </div>
          </Card>

          <Card title="Status" noPadding>
            <div style={{ padding: '20px' }}>
              {vehicle?.active_run_code ? (
                <div>
                  <div style={{ padding: '12px', backgroundColor: '#D1FAE5', borderRadius: '8px', border: '1px solid #6EE7B7', marginBottom: '14px' }}>
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
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#1F2937', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <UserIcon size={14} style={{ color: '#047857' }} />
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
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#1F2937' }}>Available on Standby</div>
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

      {/* Tab 2: Maintenance */}
      {activeTab === 'maintenance' && (
        <Card
          title="Maintenance & Fleet Service Logbook"
          subtitle="Routine oil changes, brake inspections, refrigeration unit maintenance, and emergency repairs"
          noPadding
        >
          <div
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid #D6D3C8',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#F8FAFC',
            }}
          >
            <div style={{ fontSize: '12.5px', color: '#64748B' }}>
              Logged Service Entries: <strong style={{ color: '#1F2937' }}>{vehicle?.maintenance?.length || 0}</strong>
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
              <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#1F2937', margin: '0 0 6px 0' }}>
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
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #D6D3C8', textAlign: 'left' }}>
                    <th style={{ padding: '12px 18px', color: '#475569' }}>Service Date</th>
                    <th style={{ padding: '12px 18px', color: '#475569' }}>Service Type</th>
                    <th style={{ padding: '12px 18px', color: '#475569' }}>Odometer</th>
                    <th style={{ padding: '12px 18px', color: '#475569' }}>Service Center</th>
                    <th style={{ padding: '12px 18px', color: '#475569' }}>Cost</th>
                    <th style={{ padding: '12px 18px', color: '#475569' }}>Next Due</th>
                    <th style={{ padding: '12px 18px', color: '#475569', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicle.maintenance.map((m: any) => (
                    <tr key={m.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 18px', fontWeight: 700, color: '#1F2937' }}>
                        {formatDate(m.service_date)}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ fontWeight: 600, color: '#1F2937' }}>{m.service_type}</div>
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
                      <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedMaintenance(m)}
                          className="btn btn-secondary btn-xs"
                          style={{ height: '26px', padding: '0 8px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          title="View service record details"
                        >
                          <Eye size={12} /> Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Tab 4: Runs History */}
      {activeTab === 'assignments' && (
        <Card
          title="Delivery Run Dispatches & Assignment History"
          subtitle="Complete chronological record of delivery runs dispatched with this vehicle"
          noPadding
        >
          {!vehicle?.assignments || vehicle.assignments.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
              <Clock size={40} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
              <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#1F2937', margin: '0 0 6px 0' }}>
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
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #D6D3C8', textAlign: 'left' }}>
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
                      <td style={{ padding: '12px 18px', fontFamily: 'monospace', fontWeight: 700, color: '#047857' }}>
                        {run.run_code}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ fontWeight: 600, color: '#1F2937' }}>
                          {run.route_name || run.route_code}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>
                          {run.route_city || 'Pune'} • {run.route_depot || 'Central Depot'}
                        </div>
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ fontWeight: 600, color: '#1F2937' }}>{run.driver_name}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>
                          Emp ID: {run.driver_employee_id || 'N/A'} • {run.driver_phone || ''}
                        </div>
                      </td>
                      <td style={{ padding: '12px 18px', color: '#64748B' }}>
                        {formatDate(run.delivery_date)}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <span style={{ fontWeight: 600, color: '#1F2937' }}>
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

          {/* Maintenance Entry Details Modal */}
          {selectedMaintenance && (
            <Modal
              isOpen={Boolean(selectedMaintenance)}
              onClose={() => setSelectedMaintenance(null)}
              title="Fleet Maintenance Inspection"
              subtitle={`Service log from ${formatDate(selectedMaintenance.service_date)} • ${vehicle.registration_number}`}
              icon={<Wrench size={20} />}
              size="md"
              footer={
                <Button variant="secondary" size="md" onClick={() => setSelectedMaintenance(null)}>
                  Close Log
                </Button>
              }
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '14px',
                    padding: '14px',
                    backgroundColor: 'var(--bg-hover)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    fontSize: '13px',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '11.5px', display: 'block' }}>Service Type</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{selectedMaintenance.service_type}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '11.5px', display: 'block' }}>Service Cost</span>
                    <strong style={{ color: 'var(--color-primary)', fontSize: '15px' }}>
                      {formatCurrency(Number(selectedMaintenance.cost) || 0)}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '11.5px', display: 'block' }}>Odometer Reading</span>
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {Number(selectedMaintenance.odometer_km || 0).toLocaleString('en-IN')} KM
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '11.5px', display: 'block' }}>Next Due Date</span>
                    <strong style={{ color: selectedMaintenance.next_service_date ? '#B45309' : 'var(--text-secondary)' }}>
                      {selectedMaintenance.next_service_date ? formatDate(selectedMaintenance.next_service_date) : 'None scheduled'}
                    </strong>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Service Center / Garage
                  </span>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {selectedMaintenance.service_center || 'Authorized Commercial Facility'}
                  </div>
                </div>

                {selectedMaintenance.description && (
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Replaced Parts & Work Details:
                    </span>
                    <p style={{ fontSize: '13px', margin: 0, padding: '10px 14px', backgroundColor: 'var(--bg-muted)', borderRadius: '6px', lineHeight: 1.5 }}>
                      {selectedMaintenance.description}
                    </p>
                  </div>
                )}
              </div>
            </Modal>
          )}

          {/* Status Change Confirmation Modal */}
          {confirmStatusToggleOpen && (
            <Modal
              isOpen={confirmStatusToggleOpen}
              onClose={() => setConfirmStatusToggleOpen(false)}
              title={vehicle.is_active ? 'Deactivate Vehicle?' : 'Activate Vehicle?'}
              icon={<Power size={20} />}
              size="sm"
              footer={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => setConfirmStatusToggleOpen(false)}
                    disabled={statusUpdating}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant={vehicle.is_active ? 'danger' : 'primary'}
                    size="md"
                    onClick={handleStatusToggle}
                    loading={statusUpdating}
                  >
                    {vehicle.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              }
            >
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {vehicle.is_active ? 'Deactivate this vehicle?' : 'Activate this vehicle?'}
              </p>
            </Modal>
          )}

          {/* Delete Vehicle Confirmation Modal */}
          {isDeleteModalOpen && (
            <DeleteConfirmModal
              isOpen={isDeleteModalOpen}
              onClose={() => setIsDeleteModalOpen(false)}
              title="Delete Vehicle"
              entityType="Vehicle"
              entityName={vehicle.registration_number}
              entityIdentifier={vehicle.vehicle_code}
              isActive={Boolean(vehicle.is_active)}
              details={[
                { label: 'Registration Number', value: vehicle.registration_number },
                { label: 'Asset Code', value: vehicle.vehicle_code },
                { label: 'Vehicle Type', value: vehicle.vehicle_type },
                { label: 'Operational Status', value: vehicle.status },
              ]}
              blockingReason={
                vehicle.status === 'ASSIGNED' || Boolean(vehicle.active_run_id)
                  ? `Vehicle is currently assigned to an active delivery run (${vehicle.active_run_code || 'In Progress'}). You must reassign or complete all active dispatches before deleting.`
                  : null
              }
              customWarning="Vehicles with historical runs, inspections, or maintenance logs will be securely archived and deactivated to retain complete compliance records. Unused vehicle assets without historical records will be permanently purged."
              onDeactivateRequested={() => {
                setConfirmStatusToggleOpen(true);
              }}
              onConfirm={async (reason) => {
                await api.vehicles.delete(vehicle.id, reason);
                showToast('Vehicle deleted / archived successfully');
                setIsDeleteModalOpen(false);
                navigate('/admin/vehicles');
              }}
            />
          )}
        </>
      )}
    </div>
  );
};

