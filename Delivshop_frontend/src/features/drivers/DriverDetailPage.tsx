import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Shield,
  FileText,
  Truck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Pencil,
  Key,
  Power,
  Trash2,
  DollarSign,
  History,
  Activity,
  Package,
  ExternalLink,
  Plus,
  RefreshCw,
  Copy,
  Check,
  Download,
  ChevronDown,
  MoreVertical,
} from 'lucide-react';
import { api } from '../../services/api/endpoints';
import {
  DriverUser,
  DriverDeliveryRecord,
  DriverAuditRecord,
} from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useNavigation } from '../../context/NavigationContext';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { DeleteConfirmModal } from '../../components/common/DeleteConfirmModal';
import { EditDriverModal } from './EditDriverModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import { AssignVehicleModal } from './AssignVehicleModal';
import { DriverSalaryModal } from './DriverSalaryModal';
import { DriverDocumentModal } from './DriverDocumentModal';

interface DriverDetailPageProps {
  driverId: string;
}

type TabType = 'profile' | 'operations' | 'compensation' | 'audit';

export const DriverDetailPage: React.FC<DriverDetailPageProps> = ({ driverId }) => {
  const { user } = useAuth();
  const { navigate } = useNavigation();

  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Actions Dropdown Menu state
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isAssignVehicleOpen, setIsAssignVehicleOpen] = useState(false);
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Status toggle confirmation
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Close Actions menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node)) {
        setIsActionsOpen(false);
      }
    };
    if (isActionsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isActionsOpen]);

  const fetchDriverProfile = useCallback(async () => {
    if (!driverId) return;
    try {
      setLoading(true);
      setError(null);
      setNotFound(false);
      const data = await api.deliveries.getFullProfile(driverId);
      if (!data || !data.driver) {
        setNotFound(true);
        return;
      }
      setProfile(data);
    } catch (err: any) {
      if (err?.status === 404) {
        setNotFound(true);
      } else {
        setError(err?.message || 'Failed to retrieve driver profile from server');
      }
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  useEffect(() => {
    fetchDriverProfile();
  }, [fetchDriverProfile]);

  const driver: DriverUser | undefined = profile?.driver;

  const handleToggleStatus = async () => {
    if (!driver) return;
    const nextIsActive = !driver.is_active;

    if (!nextIsActive && (driver.active_deliveries || 0) > 0) {
      showToast(
        `Cannot deactivate driver while ${driver.active_deliveries} active deliveries are assigned.`,
        'error'
      );
      return;
    }

    try {
      setIsTogglingStatus(true);
      await api.deliveries.updateDriverStatus(
        driver.id,
        nextIsActive,
        nextIsActive ? 'Driver activated by admin' : 'Driver deactivated by admin'
      );
      showToast(`Driver ${driver.name} is now ${nextIsActive ? 'Active' : 'Inactive'}`);
      fetchDriverProfile();
    } catch (err: any) {
      showToast(err?.message || 'Failed to update driver status', 'error');
    } finally {
      setIsTogglingStatus(false);
      setIsActionsOpen(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '32px 24px', maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{ width: '80px', height: '28px', backgroundColor: '#E2E8F0', borderRadius: '6px' }} />
          <div style={{ width: '200px', height: '28px', backgroundColor: '#E2E8F0', borderRadius: '6px' }} />
        </div>
        <div style={{ height: '140px', backgroundColor: '#F8FAFC', borderRadius: '12px', marginBottom: '24px', border: '1px solid #E2E8F0' }} />
        <div style={{ height: '400px', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0' }} />
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#FEE2E2',
            color: '#DC2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
          }}
        >
          <AlertCircle size={32} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1E293B', marginBottom: '8px' }}>
          Driver Not Found
        </h2>
        <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '24px' }}>
          The driver record you requested ({driverId}) does not exist or may have been permanently archived.
        </p>
        <Button variant="primary" onClick={() => navigate('/admin/drivers')}>
          <ArrowLeft size={16} style={{ marginRight: '8px' }} />
          Back to Drivers Roster
        </Button>
      </div>
    );
  }

  if (error || !driver) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#FEF3C7',
            color: '#D97706',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
          }}
        >
          <AlertTriangle size={32} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1E293B', marginBottom: '8px' }}>
          Unable to Load Driver Profile
        </h2>
        <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '24px' }}>
          {error || 'An unexpected error occurred while loading driver information.'}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Button variant="secondary" onClick={() => navigate('/admin/drivers')}>
            Back to Drivers
          </Button>
          <Button variant="primary" onClick={fetchDriverProfile}>
            <RefreshCw size={14} style={{ marginRight: '6px' }} />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const initials = driver.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const isLicenseExpiringSoon = () => {
    if (!driver.license_expiry) return false;
    const expiry = new Date(driver.license_expiry);
    const now = new Date();
    const daysUntil = (expiry.getTime() - now.getTime()) / (1000 * 3600 * 24);
    return daysUntil <= 30 && daysUntil > 0;
  };

  const isLicenseExpired = () => {
    if (!driver.license_expiry) return false;
    return new Date(driver.license_expiry) < new Date();
  };

  const deliveries: DriverDeliveryRecord[] = profile?.deliveries || [];
  const runs: any[] = profile?.runs || [];
  const documents: any[] = profile?.documents || [];
  const salaryConfig = profile?.salaryConfig || null;
  const payrollRecords: any[] = profile?.payrollRecords || [];
  const auditHistory: DriverAuditRecord[] = profile?.auditHistory || [];

  return (
    <div className="page-container" style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            backgroundColor: toastMessage.type === 'success' ? '#064E3B' : '#7F1D1D',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500,
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toastMessage.text}
        </div>
      )}

      {/* 2.A Page Header (Simple, clean, back navigation, prominent Employee ID, compact Actions menu) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          {/* Back to Drivers Navigation */}
          <button
            type="button"
            onClick={() => navigate('/admin/drivers')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              color: 'var(--color-primary, #16805D)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              padding: 0,
              marginBottom: '6px',
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to Drivers</span>
          </button>

          {/* Driver Name, Employee ID, and Status Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
              {driver.name}
            </h1>

            {/* Prominent Employee ID */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 10px',
                backgroundColor: 'var(--color-primary-subtle, #E6F4EA)',
                border: '1px solid #A7F3D0',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontFamily: 'monospace',
                fontWeight: 700,
                color: 'var(--color-primary, #16805D)',
              }}
              title="Official Driver Employee ID"
            >
              <span>{driver.employee_id || 'N/A'}</span>
            </div>

            {/* Employment Status Badge */}
            <Badge variant={driver.is_active ? 'success' : 'danger'}>
              {driver.is_active ? 'Active' : 'Inactive'}
            </Badge>

            {/* Operational Duty Badge */}
            {driver.status && (
              <Badge
                variant={
                  driver.status === 'ON_DELIVERY'
                    ? 'info'
                    : driver.status === 'AVAILABLE'
                    ? 'success'
                    : 'neutral'
                }
              >
                {driver.status === 'ON_DELIVERY'
                  ? 'On Delivery'
                  : driver.status === 'AVAILABLE'
                  ? 'Available'
                  : 'Off Duty'}
              </Badge>
            )}
          </div>
        </div>

        {/* Compact Actions Menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }} ref={actionsMenuRef}>
          <Button
            variant="secondary"
            onClick={() => setIsEditModalOpen(true)}
            icon={<Pencil size={14} />}
          >
            Edit Profile
          </Button>

          {/* Dropdown Toggle Button */}
          <div style={{ position: 'relative' }}>
            <Button
              variant="primary"
              onClick={() => setIsActionsOpen(!isActionsOpen)}
              icon={<ChevronDown size={15} style={{ transform: isActionsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />}
            >
              Actions
            </Button>

            {/* Contextual Actions Dropdown */}
            {isActionsOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '6px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '10px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                  minWidth: '220px',
                  zIndex: 200,
                  padding: '6px',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsActionsOpen(false);
                    setIsAssignVehicleOpen(true);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 12px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#1E293B',
                    background: 'none',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Truck size={15} color="#0284C7" />
                  <span>Assign / Change Vehicle</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsActionsOpen(false);
                    setIsSalaryModalOpen(true);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 12px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#1E293B',
                    background: 'none',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <DollarSign size={15} color="#16805D" />
                  <span>Configure Salary</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsActionsOpen(false);
                    setIsDocModalOpen(true);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 12px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#1E293B',
                    background: 'none',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Plus size={15} color="#6366F1" />
                  <span>Upload Document</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsActionsOpen(false);
                    setIsPasswordModalOpen(true);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 12px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#1E293B',
                    background: 'none',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Key size={15} color="#D97706" />
                  <span>Reset Password</span>
                </button>

                <div style={{ height: '1px', backgroundColor: '#E2E8F0', margin: '4px 0' }} />

                <button
                  type="button"
                  onClick={handleToggleStatus}
                  disabled={isTogglingStatus}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 12px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: driver.is_active ? '#B45309' : '#15803D',
                    background: 'none',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = driver.is_active ? '#FFFBEB' : '#F0FDF4')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Power size={15} />
                  <span>{driver.is_active ? 'Deactivate Driver' : 'Reactivate Driver'}</span>
                </button>

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
                    padding: '9px 12px',
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
                  <Trash2 size={15} />
                  <span>Delete Driver</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* License Warning Banner if Expired or Expiring */}
      {(isLicenseExpired() || isLicenseExpiringSoon()) && (
        <div
          style={{
            backgroundColor: isLicenseExpired() ? '#FEF2F2' : '#FFFBEB',
            border: `1px solid ${isLicenseExpired() ? '#FCA5A5' : '#FCD34D'}`,
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <AlertTriangle color={isLicenseExpired() ? '#DC2626' : '#D97706'} size={20} />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: isLicenseExpired() ? '#991B1B' : '#92400E' }}>
              {isLicenseExpired() ? 'Commercial Driving Licence Has Expired' : 'Licence Renewal Required Soon'}
            </div>
            <div style={{ fontSize: '12px', color: isLicenseExpired() ? '#B91C1C' : '#B45309' }}>
              Licence No. {driver.license_number || 'N/A'} was valid until{' '}
              {driver.license_expiry ? formatDate(driver.license_expiry) : 'N/A'}.
            </div>
          </div>
        </div>
      )}

      {/* 2.B Driver Overview Card (Unified, clean summary without duplicate cards) */}
      <Card style={{ padding: '20px 24px', marginBottom: '20px', border: '1px solid #CBD5E1' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '20px', alignItems: 'center' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '12px',
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              fontSize: '22px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              letterSpacing: '0.05em',
            }}
          >
            {initials}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Driver Name
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                {driver.name}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                {driver.email || 'No email registered'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Employee ID
              </div>
              <div style={{ fontSize: '14.5px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-primary, #16805D)', marginTop: '2px' }}>
                {driver.employee_id || 'N/A'}
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                Joined {driver.joining_date ? formatDate(driver.joining_date) : 'N/A'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Phone Number
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                {driver.phone || '—'}
              </div>
              {driver.alternate_phone && (
                <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                  Alt: {driver.alternate_phone}
                </div>
              )}
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                City & State
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                {driver.city ? `${driver.city}, ${driver.state || ''}` : driver.state || 'N/A'}
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                {driver.pincode ? `PIN: ${driver.pincode}` : 'Operational Base'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Assigned Vehicle
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: driver.vehicle_number ? '#0F172A' : '#D97706', marginTop: '2px' }}>
                {driver.vehicle_number ? (
                  <span>{driver.vehicle_number} <span style={{ fontSize: '11.5px', color: '#64748B' }}>({driver.vehicle_type || 'Fleet'})</span></span>
                ) : (
                  'Unassigned'
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsAssignVehicleOpen(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: '11.5px',
                  fontWeight: 600,
                  color: 'var(--color-primary, #16805D)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                {driver.vehicle_number ? 'Change Vehicle' : 'Assign Vehicle'}
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* 2.E Tabs Navigation: Clean 4 Groups */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #CBD5E1',
          marginBottom: '20px',
          gap: '8px',
          overflowX: 'auto',
        }}
      >
        {[
          { key: 'profile', label: 'Profile & Information', icon: User },
          { key: 'operations', label: 'Vehicle & Operations', icon: Truck, count: deliveries.length },
          { key: 'compensation', label: 'Compensation & Documents', icon: FileText, count: documents.length },
          { key: 'audit', label: 'Activity History', icon: History, count: auditHistory.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as TabType)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                border: 'none',
                background: 'none',
                borderBottom: isActive ? '2px solid var(--color-primary, #16805D)' : '2px solid transparent',
                color: isActive ? 'var(--color-primary, #16805D)' : '#64748B',
                fontWeight: isActive ? 700 : 500,
                fontSize: '13.5px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && tab.count > 0 && (
                <span
                  style={{
                    backgroundColor: isActive ? 'var(--color-primary-subtle, #E6F4EA)' : '#F1F5F9',
                    color: isActive ? 'var(--color-primary, #16805D)' : '#64748B',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '999px',
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: PROFILE & INFORMATION */}
      {activeTab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Section 1: Personal and Contact Information */}
          <Card style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={18} color="var(--color-primary, #16805D)" />
                1. Personal and Contact Information
              </h3>
              <Button variant="secondary" onClick={() => setIsEditModalOpen(true)} icon={<Pencil size={13} />}>
                Edit
              </Button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Full Legal Name
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                  {driver.name}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Primary Phone
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                  {driver.phone || '—'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Alternate Phone
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                  {driver.alternate_phone || '—'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Email Address
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                  {driver.email || '—'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Gender
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                  {driver.gender || '—'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Emergency Contact
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                  {driver.emergency_contact_name ? (
                    <span>
                      {driver.emergency_contact_name} {driver.emergency_contact_phone ? `(${driver.emergency_contact_phone})` : ''}
                      {driver.emergency_contact_relation ? ` • ${driver.emergency_contact_relation}` : ''}
                    </span>
                  ) : driver.emergency_contact ? (
                    driver.emergency_contact
                  ) : (
                    '—'
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Section 2: Address and Location */}
          <Card style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={18} color="var(--color-primary, #16805D)" />
                2. Address and Location
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Street Address
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                  {driver.address || '—'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  City or Village
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                  {driver.city || '—'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  State
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                  {driver.state || '—'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Postal / PIN Code
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                  {driver.pincode || '—'}
                </div>
              </div>
            </div>
          </Card>

          {/* Section 3: Employment Information & Driving License */}
          <Card style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={18} color="var(--color-primary, #16805D)" />
                3. Employment Information & Licence Verification
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Employee ID
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-primary, #16805D)', marginTop: '2px' }}>
                  {driver.employee_id || 'N/A'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Joining Date
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                  {driver.joining_date ? formatDate(driver.joining_date) : '—'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Employment Status
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                  {driver.employment_status || (driver.is_active ? 'Active' : 'Inactive')}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Commercial DL Number
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                  {driver.license_number || '—'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Licence Expiry
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: isLicenseExpired() ? '#DC2626' : '#0F172A', marginTop: '2px' }}>
                  {driver.license_expiry ? formatDate(driver.license_expiry) : '—'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Licence Class
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                  {driver.license_class || 'LMV-TR'}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: VEHICLE & OPERATIONS */}
      {activeTab === 'operations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Operational Metrics Cards (Separated from personal profile) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <Card style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                Today's Deliveries
              </div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                {driver.today_deliveries || 0}
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                Scheduled for today
              </div>
            </Card>

            <Card style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                Active Deliveries
              </div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#0284C7', marginTop: '4px' }}>
                {driver.active_deliveries || 0}
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                In progress / En route
              </div>
            </Card>

            <Card style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                Completed Deliveries
              </div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-primary, #16805D)', marginTop: '4px' }}>
                {driver.completed_deliveries || 0}
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                Lifetime completed
              </div>
            </Card>

            <Card style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                Delivery Status
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginTop: '8px' }}>
                {driver.status || 'AVAILABLE'}
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                {driver.current_delivery_status || 'Ready for dispatches'}
              </div>
            </Card>
          </div>

          {/* Vehicle Assignment Card */}
          <Card style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Truck size={18} color="#0284C7" />
                  Vehicle Assignment
                </h3>
                <p style={{ fontSize: '12.5px', color: '#64748B', margin: '2px 0 0 0' }}>
                  Fleet allocation and vehicle registration for delivery runs
                </p>
              </div>
              <Button
                variant="primary"
                onClick={() => setIsAssignVehicleOpen(true)}
                icon={<Truck size={14} />}
              >
                {driver.vehicle_number ? 'Change Vehicle' : 'Assign Vehicle'}
              </Button>
            </div>

            {driver.vehicle_number ? (
              <div
                style={{
                  backgroundColor: '#F0F9FF',
                  border: '1px solid #BAE6FD',
                  borderRadius: '10px',
                  padding: '18px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#0369A1', textTransform: 'uppercase' }}>
                    Assigned Vehicle Registration
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#0C4A6E', fontFamily: 'monospace', marginTop: '2px' }}>
                    {driver.vehicle_number}
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#0369A1', marginTop: '2px' }}>
                    Vehicle Type: {driver.vehicle_type || 'Fleet Delivery Vehicle'} • Status: Allocated
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Badge variant="info">Assigned</Badge>
                </div>
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px dashed #CBD5E1',
                  borderRadius: '10px',
                  padding: '24px',
                  textAlign: 'center',
                }}
              >
                <Truck size={32} color="#94A3B8" style={{ margin: '0 auto 8px auto' }} />
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>
                  No vehicle currently assigned to this driver
                </div>
                <p style={{ fontSize: '12.5px', color: '#64748B', maxWidth: '420px', margin: '4px auto 16px auto' }}>
                  Drivers can be onboarded independently of fleet vehicles. Assign a vehicle when ready for route dispatches.
                </p>
                <Button
                  variant="secondary"
                  onClick={() => setIsAssignVehicleOpen(true)}
                  icon={<Truck size={14} />}
                >
                  Assign Fleet Vehicle
                </Button>
              </div>
            )}
          </Card>

          {/* Current / Recent Delivery Assignments Table */}
          <Card style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={18} color="var(--color-primary, #16805D)" />
              Assigned Delivery History & Runs
            </h3>

            {deliveries.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#64748B' }}>
                <Package size={28} color="#CBD5E1" style={{ margin: '0 auto 8px auto' }} />
                <div style={{ fontSize: '13.5px', fontWeight: 500 }}>No delivery history recorded yet for this driver</div>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
                  Completed and en-route deliveries will be displayed here as orders are fulfilled.
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #CBD5E1', textAlign: 'left', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
                      <th style={{ padding: '10px 12px' }}>Order Number</th>
                      <th style={{ padding: '10px 12px' }}>Shop / Merchant</th>
                      <th style={{ padding: '10px 12px' }}>Delivery Status</th>
                      <th style={{ padding: '10px 12px' }}>Assigned Date</th>
                      <th style={{ padding: '10px 12px' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveries.slice(0, 10).map((d: any, idx: number) => (
                      <tr key={d.id || idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 600, color: '#0F172A' }}>
                          #{d.orderNumber || d.order_number || d.id?.slice(0, 8)}
                        </td>
                        <td style={{ padding: '12px', color: '#334155' }}>
                          {d.shopName || d.shop_name || 'Merchant Shop'}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <Badge
                            variant={
                              d.status === 'DELIVERED'
                                ? 'success'
                                : d.status === 'OUT_FOR_DELIVERY' || d.status === 'PICKED_UP'
                                ? 'info'
                                : d.status === 'FAILED'
                                ? 'danger'
                                : 'neutral'
                            }
                          >
                            {d.status || 'PENDING'}
                          </Badge>
                        </td>
                        <td style={{ padding: '12px', color: '#64748B', fontSize: '12px' }}>
                          {d.createdAt || d.created_at ? formatDate(d.createdAt || d.created_at) : '—'}
                        </td>
                        <td style={{ padding: '12px', fontWeight: 600, color: '#0F172A' }}>
                          {d.amount ? formatCurrency(d.amount) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 3: COMPENSATION & DOCUMENTS */}
      {activeTab === 'compensation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Section 5: Salary and Payments */}
          <Card style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <DollarSign size={18} color="var(--color-primary, #16805D)" />
                  5. Salary and Payments Configuration
                </h3>
                <p style={{ fontSize: '12.5px', color: '#64748B', margin: '2px 0 0 0' }}>
                  Driver compensation structure, per-delivery allowances, and payment frequency
                </p>
              </div>
              <Button
                variant="primary"
                onClick={() => setIsSalaryModalOpen(true)}
                icon={<DollarSign size={14} />}
              >
                Configure Salary
              </Button>
            </div>

            {salaryConfig ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div style={{ backgroundColor: '#F8FAFC', padding: '14px 16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Base Salary</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                    {formatCurrency(salaryConfig.baseSalary || 0)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                    {salaryConfig.salaryType || 'MONTHLY'}
                  </div>
                </div>

                <div style={{ backgroundColor: '#F8FAFC', padding: '14px 16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Daily Allowance</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                    {formatCurrency(salaryConfig.dailyAllowance || 0)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Per active duty day</div>
                </div>

                <div style={{ backgroundColor: '#F8FAFC', padding: '14px 16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Per Delivery Incentive</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                    {formatCurrency(salaryConfig.perDeliveryRate || 0)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Bonus per verified drop</div>
                </div>

                <div style={{ backgroundColor: '#F8FAFC', padding: '14px 16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Payment Frequency</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>
                    {salaryConfig.paymentFrequency || 'MONTHLY'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Via Bank Direct / UPI</div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px dashed #CBD5E1',
                  borderRadius: '10px',
                  padding: '20px',
                  textAlign: 'center',
                  marginBottom: '20px',
                }}
              >
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#475569' }}>
                  No salary structure configured for this driver yet
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  Configure base pay, daily allowances, and incentives to record payroll payments.
                </div>
              </div>
            )}

            {/* Payroll History Table if available */}
            {payrollRecords.length > 0 && (
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '10px' }}>
                  Recent Payment Disbursements
                </h4>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
                        <th style={{ padding: '8px 10px' }}>Period</th>
                        <th style={{ padding: '8px 10px' }}>Base Pay</th>
                        <th style={{ padding: '8px 10px' }}>Allowances</th>
                        <th style={{ padding: '8px 10px' }}>Net Paid</th>
                        <th style={{ padding: '8px 10px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payrollRecords.slice(0, 5).map((p: any, idx: number) => (
                        <tr key={p.id || idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '10px', fontWeight: 600, color: '#0F172A' }}>{p.monthYear || p.period || 'Monthly'}</td>
                          <td style={{ padding: '10px' }}>{formatCurrency(p.baseAmount || 0)}</td>
                          <td style={{ padding: '10px' }}>{formatCurrency(p.allowanceAmount || 0)}</td>
                          <td style={{ padding: '10px', fontWeight: 700, color: 'var(--color-primary, #16805D)' }}>{formatCurrency(p.netAmount || 0)}</td>
                          <td style={{ padding: '10px' }}>
                            <Badge variant={p.status === 'PAID' ? 'success' : 'neutral'}>{p.status || 'PROCESSED'}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Card>

          {/* Section 6: Documents & KYC Compliance */}
          <Card style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={18} color="var(--color-primary, #16805D)" />
                  6. Driver Documents & Compliance
                </h3>
                <p style={{ fontSize: '12.5px', color: '#64748B', margin: '2px 0 0 0' }}>
                  Verified KYC, commercial licence, and identity documentation
                </p>
              </div>
              <Button
                variant="primary"
                onClick={() => setIsDocModalOpen(true)}
                icon={<Plus size={14} />}
              >
                Upload Document
              </Button>
            </div>

            {documents.length === 0 ? (
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px dashed #CBD5E1',
                  borderRadius: '10px',
                  padding: '28px',
                  textAlign: 'center',
                }}
              >
                <FileText size={28} color="#94A3B8" style={{ margin: '0 auto 8px auto' }} />
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#475569' }}>
                  No compliance documents uploaded yet
                </div>
                <p style={{ fontSize: '12px', color: '#64748B', maxWidth: '380px', margin: '4px auto 14px auto' }}>
                  Upload Commercial Driving Licence, Aadhaar, or PAN cards for official verification.
                </p>
                <Button variant="secondary" onClick={() => setIsDocModalOpen(true)} icon={<Plus size={13} />}>
                  Upload First Document
                </Button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #CBD5E1', textAlign: 'left', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
                      <th style={{ padding: '10px 12px' }}>Document Type</th>
                      <th style={{ padding: '10px 12px' }}>Document Identifier</th>
                      <th style={{ padding: '10px 12px' }}>Expiry Date</th>
                      <th style={{ padding: '10px 12px' }}>Status</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>File</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc: any, idx: number) => (
                      <tr key={doc.id || idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px', fontWeight: 600, color: '#0F172A' }}>
                          {doc.document_type || doc.documentType || 'Driver Document'}
                        </td>
                        <td style={{ padding: '12px', fontFamily: 'monospace', color: '#334155' }}>
                          {doc.document_number || doc.documentNumber || '—'}
                        </td>
                        <td style={{ padding: '12px', color: '#64748B', fontSize: '12px' }}>
                          {doc.expiry_date || doc.expiryDate ? formatDate(doc.expiry_date || doc.expiryDate) : 'No Expiry'}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <Badge
                            variant={
                              (doc.verification_status || doc.verificationStatus) === 'VERIFIED'
                                ? 'success'
                                : (doc.verification_status || doc.verificationStatus) === 'REJECTED'
                                ? 'danger'
                                : 'neutral'
                            }
                          >
                            {doc.verification_status || doc.verificationStatus || 'PENDING'}
                          </Badge>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          {doc.file_url || doc.fileUrl ? (
                            <a
                              href={doc.file_url || doc.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                color: 'var(--color-primary, #16805D)',
                                fontSize: '12px',
                                fontWeight: 600,
                                textDecoration: 'none',
                              }}
                            >
                              <Download size={13} /> View
                            </a>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#94A3B8' }}>Recorded</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 4: AUDIT HISTORY */}
      {activeTab === 'audit' && (
        <Card style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={18} color="var(--color-primary, #16805D)" />
            Personnel Audit & Operational History
          </h3>

          {auditHistory.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#64748B' }}>
              <History size={28} color="#CBD5E1" style={{ margin: '0 auto 8px auto' }} />
              <div style={{ fontSize: '13.5px', fontWeight: 500 }}>No audit events recorded for this driver</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #CBD5E1', textAlign: 'left', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 12px' }}>Timestamp</th>
                    <th style={{ padding: '10px 12px' }}>Action</th>
                    <th style={{ padding: '10px 12px' }}>Entity</th>
                    <th style={{ padding: '10px 12px' }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditHistory.map((a: any, idx: number) => (
                    <tr key={a.id || idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px', color: '#64748B', fontSize: '12px' }}>
                        {a.createdAt || a.created_at ? formatDate(a.createdAt || a.created_at) : '—'}
                      </td>
                      <td style={{ padding: '12px', fontWeight: 600, color: '#0F172A' }}>
                        {a.action || 'ACTIVITY'}
                      </td>
                      <td style={{ padding: '12px', color: '#334155' }}>
                        {a.entityType || a.entity_type || 'driver'}
                      </td>
                      <td style={{ padding: '12px', color: '#64748B' }}>
                        {typeof a.details === 'object' ? JSON.stringify(a.details) : a.details || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* MODALS */}
      <EditDriverModal
        isOpen={isEditModalOpen}
        driver={driver}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={(updated) => {
          showToast(`Driver ${updated.name} updated successfully`);
          fetchDriverProfile();
        }}
      />

      <AssignVehicleModal
        isOpen={isAssignVehicleOpen}
        driver={driver}
        onClose={() => setIsAssignVehicleOpen(false)}
        onSuccess={() => {
          showToast(`Vehicle allocation updated for ${driver.name}`);
          fetchDriverProfile();
        }}
      />

      <ResetPasswordModal
        isOpen={isPasswordModalOpen}
        driver={driver}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccess={() => {
          showToast('Driver mobile password reset successfully');
        }}
      />

      <DriverSalaryModal
        isOpen={isSalaryModalOpen}
        driverId={driver.id}
        driverName={driver.name}
        existingSalary={salaryConfig}
        onClose={() => setIsSalaryModalOpen(false)}
        onSuccess={() => {
          showToast('Driver salary and remuneration updated');
          fetchDriverProfile();
        }}
      />

      <DriverDocumentModal
        isOpen={isDocModalOpen}
        driverId={driver.id}
        driverName={driver.name}
        onClose={() => setIsDocModalOpen(false)}
        onSuccess={() => {
          showToast('Compliance document uploaded and recorded');
          fetchDriverProfile();
        }}
      />

      {/* Delete Driver Confirmation Modal */}
      {isDeleteModalOpen && (
        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Driver Record"
          entityType="Driver"
          entityName={driver.name}
          entityIdentifier={driver.employee_id}
          isActive={Boolean(driver.is_active)}
          details={[
            { label: 'Driver Name', value: driver.name },
            { label: 'Employee ID', value: driver.employee_id || 'N/A' },
            { label: 'Current Account Status', value: driver.is_active ? 'Active' : 'Inactive' },
            {
              label: 'Active Assignments',
              value: (driver.active_deliveries || 0) > 0 ? `${driver.active_deliveries} active deliveries` : 'None (Available)',
            },
          ]}
          blockingReason={
            (driver.active_deliveries || 0) > 0
              ? `Driver currently has ${driver.active_deliveries} active deliveries assigned. Deliveries must be completed or reassigned before deleting.`
              : null
          }
          customWarning="Drivers with historical dispatches, completed deliveries, payment collections, or payroll records will be safely archived and deactivated to maintain statutory audit and compliance records. Drivers with zero historical records will be permanently purged."
          onDeactivateRequested={handleToggleStatus}
          onConfirm={async (reason) => {
            const res = await api.deliveries.deleteDriver(driver.id, reason);
            showToast(res?.message || 'Driver deleted / archived successfully');
            setIsDeleteModalOpen(false);
            navigate('/admin/drivers');
          }}
        />
      )}
    </div>
  );
};
