import React, { useState, useEffect, useCallback } from 'react';
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
import { EditDriverModal } from './EditDriverModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import { DriverSalaryModal } from './DriverSalaryModal';
import { DriverDocumentModal } from './DriverDocumentModal';
import { AssignVehicleModal } from './AssignVehicleModal';

interface DriverDetailPageProps {
  driverId: string;
}

type TabType =
  | 'overview'
  | 'personal'
  | 'employment'
  | 'documents'
  | 'deliveries'
  | 'attendance'
  | 'salary'
  | 'audit';

export const DriverDetailPage: React.FC<DriverDetailPageProps> = ({ driverId }) => {
  const { user } = useAuth();
  const { navigate, goBack } = useNavigation();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);

  // Status toggle confirmation
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

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
    }
  };



  if (loading) {
    return (
      <div style={{ padding: '32px 24px', maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{ width: '80px', height: '28px', backgroundColor: '#E2E8F0', borderRadius: '6px' }} />
          <div style={{ width: '200px', height: '28px', backgroundColor: '#E2E8F0', borderRadius: '6px' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: '100px', backgroundColor: '#F1F5F9', borderRadius: '10px' }} />
          ))}
        </div>
        <div style={{ height: '400px', backgroundColor: '#F8FAFC', borderRadius: '12px' }} />
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
    return daysUntil <= 30;
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
  const attendanceSummary = profile?.attendanceSummary || {
    daysPresentMonth: 0,
    daysAbsentMonth: 0,
    daysOnLeave: 0,
    currentShift: 'Standard Shift',
  };
  const recentAttendance: any[] = profile?.recentAttendance || [];

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto' }}>
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

      {/* Top Breadcrumb Navigation & Actions Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <button
            type="button"
            onClick={() => navigate('/admin/drivers')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              color: '#16805D',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              padding: 0,
              marginBottom: '8px',
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to Drivers</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#123D32', margin: 0, letterSpacing: '-0.02em' }}>
              {driver.name}
            </h1>
            <code
              style={{
                fontFamily: 'monospace',
                fontSize: '13px',
                fontWeight: 700,
                color: '#16805D',
                backgroundColor: '#F0FDF4',
                padding: '3px 8px',
                borderRadius: '6px',
                border: '1px solid #BBF7D0',
              }}
            >
              {driver.employee_id || 'N/A'}
            </code>

            <Badge variant={driver.is_active ? 'success' : 'danger'}>
              {driver.is_active ? 'Active' : 'Inactive'}
            </Badge>

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
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
            Driver Personnel Record • Joined {driver.joining_date ? formatDate(driver.joining_date) : 'N/A'} • Assigned Depot: Pune Central
          </p>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <Button variant="secondary" onClick={() => setIsEditModalOpen(true)}>
            <Pencil size={14} style={{ marginRight: '6px' }} />
            Edit Profile
          </Button>

          <Button variant="secondary" onClick={() => setIsVehicleModalOpen(true)}>
            <Truck size={14} style={{ marginRight: '6px' }} />
            Assign Vehicle
          </Button>

          <Button variant="secondary" onClick={() => setIsSalaryModalOpen(true)}>
            <DollarSign size={14} style={{ marginRight: '6px' }} />
            Configure Salary
          </Button>

          <Button variant="secondary" onClick={() => setIsDocModalOpen(true)}>
            <Plus size={14} style={{ marginRight: '6px' }} />
            Upload Document
          </Button>

          <Button variant="secondary" onClick={() => setIsPasswordModalOpen(true)}>
            <Key size={14} style={{ marginRight: '6px' }} />
            Reset Password
          </Button>

          <Button
            variant="secondary"
            onClick={handleToggleStatus}
            disabled={isTogglingStatus}
            style={{
              borderColor: driver.is_active ? '#FDE68A' : '#BBF7D0',
              backgroundColor: driver.is_active ? '#FFFBEB' : '#F0FDF4',
              color: driver.is_active ? '#B45309' : '#15803D',
            }}
          >
            <Power size={14} style={{ marginRight: '6px' }} />
            {driver.is_active ? 'Deactivate Driver' : 'Reactivate Driver'}
          </Button>
        </div>
      </div>

      {/* Expiry Warning Banner if License Expiring */}
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
              {driver.license_expiry ? formatDate(driver.license_expiry) : 'N/A'}. Drivers with expired licences cannot be dispatched on delivery assignments.
            </div>
          </div>
        </div>
      )}

      {/* Top 4 KPI Metrics Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <Card style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
            Today's Drops
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#16805D', marginTop: '6px' }}>
            {driver.today_deliveries || 0}
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
            Scheduled for current shift
          </div>
        </Card>

        <Card style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
            Active Deliveries
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0369A1', marginTop: '6px' }}>
            {driver.active_deliveries || 0}
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
            In progress / En route
          </div>
        </Card>

        <Card style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
            Completed Drops
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#123D32', marginTop: '6px' }}>
            {driver.completed_deliveries || 0}
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
            Lifetime verified deliveries
          </div>
        </Card>

        <Card style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
            Attendance This Month
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#123D32', marginTop: '6px' }}>
            {attendanceSummary.daysPresentMonth}{' '}
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748B' }}>days</span>
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
            {attendanceSummary.daysAbsentMonth} absent • {attendanceSummary.daysOnLeave} leave
          </div>
        </Card>
      </div>

      {/* Tabs Navigation Bar */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #E2E8F0',
          marginBottom: '24px',
          gap: '8px',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
        }}
      >
        {[
          { key: 'overview', label: 'Overview', icon: User },
          { key: 'personal', label: 'Personal & KYC', icon: Phone },
          { key: 'employment', label: 'Employment', icon: Shield },
          { key: 'documents', label: 'Licence & Documents', icon: FileText, count: documents.length },
          { key: 'deliveries', label: 'Deliveries & Runs', icon: Package, count: deliveries.length },
          { key: 'attendance', label: 'Attendance', icon: Clock, count: recentAttendance.length },
          { key: 'salary', label: 'Salary & Compensation', icon: DollarSign },
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
                borderBottom: isActive ? '2px solid #16805D' : '2px solid transparent',
                color: isActive ? '#16805D' : '#64748B',
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
                    backgroundColor: isActive ? '#DCFCE7' : '#F1F5F9',
                    color: isActive ? '#16805D' : '#64748B',
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

      {/* TAB CONTENT SECTIONS */}

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Driver Identity Card */}
          <Card style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#123D32', margin: '0 0 16px 0' }}>
              Driver Identification & Contacts
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '12px',
                  backgroundColor: '#123D32',
                  color: '#C7A75A',
                  fontSize: '20px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {initials}
              </div>
              <div>
                <div style={{ fontSize: '17px', fontWeight: 700, color: '#1E293B' }}>{driver.name}</div>
                <div style={{ fontSize: '13px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                  <span>{driver.email}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
                  Primary Phone
                </div>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#1E293B', marginTop: '2px' }}>
                  {driver.phone || '—'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
                  Alternate Phone
                </div>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#1E293B', marginTop: '2px' }}>
                  {driver.alternate_phone || '—'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
                  Licence Number
                </div>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#1E293B', marginTop: '2px' }}>
                  {driver.license_number || '—'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
                  Licence Class
                </div>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#1E293B', marginTop: '2px' }}>
                  {driver.license_class || 'LMV-COMMERCIAL'}
                </div>
              </div>
            </div>
          </Card>

          {/* Operational Status & Assignment Overview */}
          <Card style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#123D32', margin: '0 0 16px 0' }}>
              Current Assignment & Schedule
            </h3>

            {driver.current_order_number ? (
              <div
                style={{
                  backgroundColor: '#F0F9FF',
                  border: '1px solid #BAE6FD',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '16px',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#0369A1', textTransform: 'uppercase' }}>
                  Currently In Progress
                </div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#0C4A6E', marginTop: '4px' }}>
                  Order #{driver.current_order_number}
                </div>
                <div style={{ fontSize: '13px', color: '#0369A1', marginTop: '2px' }}>
                  Shop: {driver.current_shop_name || 'En Route'}
                </div>
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px dashed #CBD5E1',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '16px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>
                  No active delivery order at this moment
                </div>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
                  Driver is on standby for scheduled run assignments
                </div>
              </div>
            )}

            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '8px' }}>
                Vehicle Allocation Notice
              </div>
              <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                Driver creation is independent of fleet vehicle assignment. Vehicles are scheduled dynamically through the{' '}
                <strong style={{ color: '#16805D', cursor: 'pointer' }} onClick={() => navigate('/admin/assignments')}>
                  Assignments Module
                </strong>
                .
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* 2. PERSONAL & KYC TAB */}
      {activeTab === 'personal' && (
        <Card style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#123D32', marginBottom: '16px' }}>
            Personal Demographics & Residential Information
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
                Full Legal Name
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B', marginTop: '4px' }}>
                {driver.name}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
                Date of Birth
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B', marginTop: '4px' }}>
                {driver.date_of_birth ? formatDate(driver.date_of_birth) : '—'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
                Gender
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B', marginTop: '4px' }}>
                {driver.gender || '—'}
              </div>
            </div>
          </div>

          <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#123D32', margin: '24px 0 12px 0', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
            Residential Address
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '24px' }}>
            <div style={{ gridColumn: 'span 3' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
                Street Address
              </div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: '#1E293B', marginTop: '4px' }}>
                {driver.address || '—'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
                City
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B', marginTop: '4px' }}>
                {driver.city || 'Pune'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
                State
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B', marginTop: '4px' }}>
                {driver.state || 'Maharashtra'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
                PIN / Postal Code
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B', marginTop: '4px' }}>
                {driver.pincode || '—'}
              </div>
            </div>
          </div>

          <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#123D32', margin: '24px 0 12px 0', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
            Emergency Contact Details
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
                Emergency Contact Name
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B', marginTop: '4px' }}>
                {driver.emergency_contact_name || driver.emergency_contact || '—'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
                Emergency Phone Number
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B', marginTop: '4px' }}>
                {driver.emergency_contact_phone || '—'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
                Relationship
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B', marginTop: '4px' }}>
                {driver.emergency_contact_relation || '—'}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 3. EMPLOYMENT TAB */}
      {activeTab === 'employment' && (
        <Card style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#123D32', marginBottom: '16px' }}>
            Employment Profile & Internal Governance
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
                Employee ID (Unique)
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'monospace', color: '#16805D', marginTop: '4px' }}>
                {driver.employee_id || 'N/A'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
                Joining / Induction Date
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B', marginTop: '4px' }}>
                {driver.joining_date ? formatDate(driver.joining_date) : 'N/A'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
                Employment Status
              </div>
              <div style={{ marginTop: '4px' }}>
                <Badge variant={driver.employment_status === 'ACTIVE' || driver.is_active ? 'success' : 'danger'}>
                  {driver.employment_status || (driver.is_active ? 'ACTIVE' : 'INACTIVE')}
                </Badge>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
                Mobile App Login Status
              </div>
              <div style={{ marginTop: '4px' }}>
                <Badge variant={driver.account_status === 'ACTIVE' || driver.is_active ? 'success' : 'neutral'}>
                  {driver.account_status || (driver.is_active ? 'ACTIVE' : 'DEACTIVATED')}
                </Badge>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
                Assigned Logistics Depot
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B', marginTop: '4px' }}>
                Pune Central Facility
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
                Password Reset Requirement
              </div>
              <div style={{ fontSize: '13px', color: driver.must_change_password ? '#D97706' : '#15803D', marginTop: '4px', fontWeight: 600 }}>
                {driver.must_change_password ? 'Required on next login' : 'Password verified'}
              </div>
            </div>
          </div>

          {driver.notes && (
            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
                Internal Notes & Observations
              </div>
              <p style={{ fontSize: '13px', color: '#475569', marginTop: '4px', backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '6px' }}>
                {driver.notes}
              </p>
            </div>
          )}
        </Card>
      )}

      {/* 4. LICENCE & DOCUMENTS TAB */}
      {activeTab === 'documents' && (
        <div>
          {/* Licence summary card */}
          <Card style={{ padding: '24px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#123D32', margin: '0 0 16px 0' }}>
                  Commercial Driving Licence
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
                      Licence Number
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B', marginTop: '2px' }}>
                      {driver.license_number || '—'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
                      Licence Category / Class
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B', marginTop: '2px' }}>
                      {driver.license_class || 'LMV-COMMERCIAL'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
                      Expiry Date
                    </div>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 700,
                        color: isLicenseExpired() ? '#DC2626' : isLicenseExpiringSoon() ? '#D97706' : '#15803D',
                        marginTop: '2px',
                      }}
                    >
                      {driver.license_expiry ? formatDate(driver.license_expiry) : '—'}
                    </div>
                  </div>
                </div>
              </div>

              <Button variant="secondary" onClick={() => setIsDocModalOpen(true)}>
                <Plus size={14} style={{ marginRight: '6px' }} />
                Upload / Verify Document
              </Button>
            </div>
          </Card>

          {/* Compliance Documents Table */}
          <Card style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#123D32', margin: 0 }}>
                Compliance & KYC Document Records
              </h4>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                {documents.length} document(s) registered
              </span>
            </div>

            {documents.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#94A3B8' }}>
                <FileText size={32} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                <p style={{ fontSize: '13px', margin: 0 }}>No compliance documents registered yet.</p>
              </div>
            ) : (
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Document Type</th>
                    <th>Document Reference</th>
                    <th>Issue Date</th>
                    <th>Expiry Date</th>
                    <th>Verification Status</th>
                    <th>Verified By</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id}>
                      <td style={{ fontWeight: 600, color: '#1E293B' }}>{doc.document_type}</td>
                      <td><code>{doc.document_number || '—'}</code></td>
                      <td>{doc.issue_date ? formatDate(doc.issue_date) : '—'}</td>
                      <td>{doc.expiry_date ? formatDate(doc.expiry_date) : '—'}</td>
                      <td>
                        <Badge variant={doc.verification_status === 'VERIFIED' ? 'success' : 'warning'}>
                          {doc.verification_status}
                        </Badge>
                      </td>
                      <td style={{ fontSize: '12px', color: '#64748B' }}>{doc.verified_by_name || 'System'}</td>
                      <td style={{ textAlign: 'right' }}>
                        {doc.file_url ? (
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={doc.file_name || undefined}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              color: '#16805D',
                              backgroundColor: '#F0FDF4',
                              border: '1px solid #BBF7D0',
                              borderRadius: '6px',
                              textDecoration: 'none',
                            }}
                            title={`Download ${doc.file_name || 'document'}`}
                          >
                            <Download size={12} />
                            <span>Download</span>
                          </a>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#94A3B8' }}>No file</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}

      {/* 5. DELIVERIES & RUNS TAB */}
      {activeTab === 'deliveries' && (
        <div>
          {/* Scheduled Runs Section */}
          <Card style={{ padding: '0', overflow: 'hidden', marginBottom: '24px' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#123D32', margin: 0 }}>
                Assigned Delivery Runs History
              </h4>
            </div>

            {runs.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#94A3B8' }}>
                <Truck size={32} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                <p style={{ fontSize: '13px', margin: 0 }}>No scheduled delivery runs assigned to this driver yet.</p>
              </div>
            ) : (
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Run Code</th>
                    <th>Delivery Date</th>
                    <th>Route</th>
                    <th>Vehicle</th>
                    <th>Stops Completed</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r.id}>
                      <td><code style={{ fontWeight: 700 }}>{r.run_code}</code></td>
                      <td>{formatDate(r.delivery_date)}</td>
                      <td>{r.route_name || 'Route'}</td>
                      <td>{r.vehicle_registration || '—'}</td>
                      <td>{r.completed_stops_count || 0} / {r.total_stops_count || 0}</td>
                      <td>
                        <Badge variant={r.status === 'COMPLETED' ? 'success' : r.status === 'IN_PROGRESS' ? 'info' : 'neutral'}>
                          {r.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          {/* Individual Delivery Drops Table */}
          <Card style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#123D32', margin: 0 }}>
                Individual Delivery Drops ({deliveries.length})
              </h4>
            </div>

            {deliveries.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#94A3B8' }}>
                <Package size={32} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                <p style={{ fontSize: '13px', margin: 0 }}>No completed or active deliveries recorded.</p>
              </div>
            ) : (
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Shop / Drop Location</th>
                    <th>Total Value</th>
                    <th>Delivery Status</th>
                    <th>Delivered Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map((del) => (
                    <tr key={del.id}>
                      <td><code style={{ fontWeight: 700 }}>{del.order_number}</code></td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#1E293B' }}>{del.shop_name}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{del.shop_address}</div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(del.total || 0)}</td>
                      <td>
                        <Badge variant={del.status === 'DELIVERED' ? 'success' : del.status === 'FAILED' ? 'danger' : 'info'}>
                          {del.status}
                        </Badge>
                      </td>
                      <td style={{ fontSize: '12px', color: '#64748B' }}>
                        {del.delivered_at ? formatDate(del.delivered_at) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}

      {/* 6. ATTENDANCE TAB */}
      {activeTab === 'attendance' && (
        <div>
          {/* Monthly Attendance Summary Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <Card style={{ padding: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                Days Present (This Month)
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#15803D', marginTop: '4px' }}>
                {attendanceSummary.daysPresentMonth}
              </div>
            </Card>

            <Card style={{ padding: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                Days Absent
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#DC2626', marginTop: '4px' }}>
                {attendanceSummary.daysAbsentMonth}
              </div>
            </Card>

            <Card style={{ padding: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                Approved Leave Days
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#D97706', marginTop: '4px' }}>
                {attendanceSummary.daysOnLeave}
              </div>
            </Card>

            <Card style={{ padding: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                Current Roster Shift
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#123D32', marginTop: '8px' }}>
                {attendanceSummary.currentShift || 'MORNING'}
              </div>
            </Card>
          </div>

          {/* Attendance Log Table */}
          <Card style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#123D32', margin: 0 }}>
                Attendance & GPS Check-In Log
              </h4>
            </div>

            {recentAttendance.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#94A3B8' }}>
                <Clock size={32} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                <p style={{ fontSize: '13px', margin: 0 }}>No attendance records recorded yet.</p>
              </div>
            ) : (
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Status</th>
                    <th>Punctuality</th>
                    <th>GPS Coordinates</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAttendance.map((att) => (
                    <tr key={att.id}>
                      <td style={{ fontWeight: 600 }}>{formatDate(att.attendance_date)}</td>
                      <td>{att.check_in_time ? new Date(att.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      <td>{att.check_out_time ? new Date(att.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      <td>
                        <Badge variant={att.status === 'PRESENT' ? 'success' : att.status === 'ON_LEAVE' ? 'warning' : 'danger'}>
                          {att.status}
                        </Badge>
                      </td>
                      <td>
                        {att.is_late ? (
                          <Badge variant="warning">Late Arrival</Badge>
                        ) : (
                          <Badge variant="success">On Time</Badge>
                        )}
                      </td>
                      <td style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                        {att.check_in_latitude && att.check_in_longitude
                          ? `${Number(att.check_in_latitude).toFixed(4)}, ${Number(att.check_in_longitude).toFixed(4)}`
                          : 'Recorded at depot'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}

      {/* 7. SALARY & COMPENSATION TAB */}
      {activeTab === 'salary' && (
        <div>
          {/* Compensation Structure Overview */}
          <Card style={{ padding: '24px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#123D32', margin: 0 }}>
                  Compensation & Remuneration Structure
                </h3>
                <p style={{ fontSize: '12.5px', color: '#64748B', margin: '4px 0 0 0' }}>
                  Permission-governed salary structure for certified fleet personnel
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="secondary" onClick={() => setIsSalaryModalOpen(true)}>
                  <Pencil size={14} style={{ marginRight: '6px' }} />
                  Configure Salary
                </Button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
                  Base Monthly Salary
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#16805D', marginTop: '4px' }}>
                  {salaryConfig ? formatCurrency(salaryConfig.base_monthly_salary || 0) : '₹18,000'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
                  Daily Food & Transit Allowance
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#1E293B', marginTop: '4px' }}>
                  {salaryConfig ? formatCurrency(salaryConfig.daily_allowance || 0) : '₹150 / day'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
                  Per-Delivery Incentive
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#1E293B', marginTop: '4px' }}>
                  {salaryConfig ? formatCurrency(salaryConfig.per_delivery_incentive || 0) : '₹25 / drop'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
                  Effective Since
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B', marginTop: '8px' }}>
                  {salaryConfig?.effective_from ? formatDate(salaryConfig.effective_from) : 'Current Fiscal Year'}
                </div>
              </div>
            </div>
          </Card>

          {/* Payroll Disbursements Ledger */}
          <Card style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#123D32', margin: 0 }}>
                Disbursed Payroll Ledger
              </h4>
            </div>

            {payrollRecords.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#94A3B8' }}>
                <DollarSign size={32} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                <p style={{ fontSize: '13px', margin: 0 }}>No payroll disbursement entries recorded yet.</p>
              </div>
            ) : (
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Payment Period</th>
                    <th>Base Salary</th>
                    <th>Allowances & Incentives</th>
                    <th>Deductions</th>
                    <th>Net Disbursed</th>
                    <th>Payment Date</th>
                    <th>Reference</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollRecords.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 700 }}>{p.payment_period}</td>
                      <td>{formatCurrency(p.base_salary)}</td>
                      <td>{formatCurrency(Number(p.allowances || 0) + Number(p.incentives || 0))}</td>
                      <td>{formatCurrency(p.deductions || 0)}</td>
                      <td style={{ fontWeight: 800, color: '#16805D' }}>{formatCurrency(p.net_amount)}</td>
                      <td>{p.payment_date ? formatDate(p.payment_date) : '—'}</td>
                      <td><code>{p.payment_reference || '—'}</code></td>
                      <td>
                        <Badge variant={p.status === 'PAID' ? 'success' : 'warning'}>
                          {p.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}

      {/* 8. AUDIT & ACTIVITY HISTORY TAB */}
      {activeTab === 'audit' && (
        <Card style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#123D32', margin: 0 }}>
              Audit Trail & Operational Security Log ({auditHistory.length})
            </h4>
          </div>

          {auditHistory.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#94A3B8' }}>
              <History size={32} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
              <p style={{ fontSize: '13px', margin: 0 }}>No audit events logged for this driver record.</p>
            </div>
          ) : (
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Entity</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditHistory.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontSize: '12px', color: '#64748B' }}>
                      {new Date(a.created_at).toLocaleString()}
                    </td>
                    <td>
                      <Badge variant="neutral">{a.action}</Badge>
                    </td>
                    <td style={{ fontSize: '12.5px', fontWeight: 600, color: '#1E293B' }}>
                      {a.actor_name || 'Admin'}
                    </td>
                    <td style={{ fontSize: '12px', color: '#64748B' }}>
                      {a.entity_type}
                    </td>
                    <td style={{ fontSize: '11px', color: '#475569', fontFamily: 'monospace' }}>
                      {a.details ? JSON.stringify(a.details) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* REUSABLE SUB-MODALS */}
      <EditDriverModal
        isOpen={isEditModalOpen}
        driver={driver}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={(updated) => {
          showToast(`Driver ${updated.name} updated successfully`);
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

      <AssignVehicleModal
        isOpen={isVehicleModalOpen}
        driver={driver}
        onClose={() => setIsVehicleModalOpen(false)}
        onSuccess={(updated) => {
          showToast(`Vehicle allocation updated for ${updated.name}`);
          fetchDriverProfile();
        }}
      />
    </div>
  );
};
