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
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Pencil,
  Key,
  Power,
  Trash2,
  DollarSign,
  History,
  Package,
  Plus,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Receipt,
  FileSpreadsheet,
} from 'lucide-react';
import { api } from '../../services/api/endpoints';
import {
  DriverUser,
  DriverDeliveryRecord,
  DriverAuditRecord,
  SalarySummaryData,
  SalaryMonthSummary,
  SalaryPaymentTransaction,
  SalaryConfigRecord,
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
import { SetSalaryModal } from './SetSalaryModal';
import { RecordPaymentModal } from './RecordPaymentModal';
import { SalaryBreakdownModal } from './SalaryBreakdownModal';

interface DriverDetailPageProps {
  driverId: string;
}

type TabType = 'profile' | 'deliveries' | 'salary' | 'audit';

export const DriverDetailPage: React.FC<DriverDetailPageProps> = ({ driverId }) => {
  const { user } = useAuth();
  const { navigate } = useNavigation();

  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Selected Month for Salary Summary & Payments (defaults to current month YYYY-MM)
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // Salary data states
  const [salarySummary, setSalarySummary] = useState<SalarySummaryData | null>(null);
  const [salaryMonthsList, setSalaryMonthsList] = useState<SalaryMonthSummary[]>([]);
  const [salaryAllConfigs, setSalaryAllConfigs] = useState<SalaryConfigRecord[]>([]);
  const [loadingSalary, setLoadingSalary] = useState(false);

  // Modals state
  const [isSetSalaryModalOpen, setIsSetSalaryModalOpen] = useState(false);
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
  const [breakdownMonth, setBreakdownMonth] = useState<SalaryMonthSummary | null>(null);
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);

  // Employee action modals
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Rate history collapsible
  const [isRevisionsExpanded, setIsRevisionsExpanded] = useState(false);

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

  // Fetch full employee profile
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
      if (data.salarySummary) {
        setSalarySummary(data.salarySummary);
        if (data.salarySummary.allConfigs) {
          setSalaryAllConfigs(data.salarySummary.allConfigs);
        }
      }
    } catch (err: any) {
      if (err?.status === 404) {
        setNotFound(true);
      } else {
        setError(err?.message || 'Failed to retrieve employee profile from server');
      }
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  // Fetch salary summary and payments list for selected month
  const fetchSalaryData = useCallback(async () => {
    if (!driverId) return;
    try {
      setLoadingSalary(true);
      const [configData, paymentsData] = await Promise.all([
        api.deliveries.getSalaryConfig(driverId, selectedMonth),
        api.deliveries.getSalaryPayments(driverId),
      ]);

      if (configData?.summary) {
        setSalarySummary(configData.summary);
      }
      if (configData?.history) {
        setSalaryAllConfigs(configData.history);
      }
      if (paymentsData?.monthsSummary) {
        setSalaryMonthsList(paymentsData.monthsSummary);
      }
    } catch {
      // non-blocking
    } finally {
      setLoadingSalary(false);
    }
  }, [driverId, selectedMonth]);

  useEffect(() => {
    fetchDriverProfile();
  }, [fetchDriverProfile]);

  useEffect(() => {
    fetchSalaryData();
  }, [fetchSalaryData]);

  const driver: DriverUser | undefined = profile?.driver;

  const handleToggleStatus = async () => {
    if (!driver) return;
    const nextIsActive = !driver.is_active;

    if (!nextIsActive && (driver.active_deliveries || 0) > 0) {
      showToast(
        `Cannot deactivate employee while ${driver.active_deliveries} active deliveries are pending.`,
        'error'
      );
      return;
    }

    try {
      setIsTogglingStatus(true);
      await api.deliveries.updateDriverStatus(
        driver.id,
        nextIsActive,
        nextIsActive ? 'Employee reactivated by admin' : 'Employee deactivated by admin'
      );
      showToast(`Employee ${driver.name} is now ${nextIsActive ? 'Active' : 'Inactive'}`);
      fetchDriverProfile();
    } catch (err: any) {
      showToast(err?.message || 'Failed to update employee status', 'error');
    } finally {
      setIsTogglingStatus(false);
      setIsActionsOpen(false);
    }
  };

  const handleOpenBreakdownForMonth = (summaryItem: SalaryMonthSummary) => {
    setBreakdownMonth(summaryItem);
    setIsBreakdownModalOpen(true);
  };

  const formatMonthTitle = (mStr: string) => {
    try {
      const [y, m] = mStr.split('-');
      const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
      return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    } catch {
      return mStr;
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '32px 24px', maxWidth: '1240px', margin: '0 auto' }}>
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
          Employee Record Not Found
        </h2>
        <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '24px' }}>
          The employee record you requested ({driverId}) does not exist or may have been permanently archived.
        </p>
        <Button variant="primary" onClick={() => navigate('/admin/drivers')}>
          <ArrowLeft size={16} style={{ marginRight: '8px' }} />
          Back
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
          Unable to Load Employee Profile
        </h2>
        <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '24px' }}>
          {error || 'An unexpected error occurred while loading employee profile.'}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Button variant="secondary" onClick={() => navigate('/admin/drivers')}>
            Back
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

  const deliveries: DriverDeliveryRecord[] = profile?.deliveries || [];
  const auditHistory: DriverAuditRecord[] = profile?.auditHistory || [];

  return (
    <div className="page-container" style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '48px' }}>
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

      {/* Top Header & Breadcrumb Bar */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={() => navigate('/admin/drivers')}
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

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              {driver.name}
            </h1>
            <span
              style={{
                fontSize: '12.5px',
                fontFamily: 'monospace',
                fontWeight: 700,
                color: 'var(--color-primary, #16805D)',
                backgroundColor: 'var(--color-primary-subtle, #E6F4EA)',
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid #6EE7B7',
              }}
            >
              {driver.employee_id || 'ID N/A'}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
              }}
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
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
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
                    setIsPasswordModalOpen(true);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#334155',
                    background: 'none',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Key size={14} color="#D97706" />
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
                    padding: '8px 12px',
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
                  <Power size={14} />
                  <span>{driver.is_active ? 'Deactivate' : 'Activate'}</span>
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

      {/* Profile Overview Card */}
      <Card style={{ padding: '20px 24px', marginBottom: '22px', border: '1px solid #CBD5E1' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '22px', alignItems: 'center' }}>
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
                Name
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
                Phone
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
                Location
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                {driver.city ? `${driver.city}, ${driver.state || ''}` : driver.state || 'N/A'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Status
              </div>
              <div style={{ marginTop: '4px' }}>
                <Badge variant={driver.is_active ? 'success' : 'danger'}>
                  {driver.employment_status || (driver.is_active ? 'Active' : 'Inactive')}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs Navigation */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #CBD5E1',
          marginBottom: '22px',
          gap: '8px',
          overflowX: 'auto',
        }}
      >
        {[
          { key: 'profile', label: 'Information', icon: User },
          { key: 'deliveries', label: 'Delivery History', icon: Package, count: deliveries.length },
          { key: 'salary', label: 'Salary', icon: DollarSign },
          { key: 'audit', label: 'Activity', icon: History, count: auditHistory.length },
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
                padding: '10px 18px',
                border: 'none',
                background: 'none',
                borderBottom: isActive ? '2px solid var(--color-primary, #16805D)' : '2px solid transparent',
                color: isActive ? 'var(--color-primary, #16805D)' : '#64748B',
                fontWeight: isActive ? 700 : 500,
                fontSize: '13.5px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
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

      {/* TAB 1: EMPLOYEE INFORMATION */}
      {activeTab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Section 1: Information */}
          <Card style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={18} color="var(--color-primary, #16805D)" />
                Information
              </h3>
              <Button variant="secondary" onClick={() => setIsEditModalOpen(true)} icon={<Pencil size={13} />}>
                Edit
              </Button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Full Name
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                  {driver.name}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Phone
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                  {driver.phone || '—'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Alt Phone
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                  {driver.alternate_phone || '—'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Email
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

          {/* Section 2: Address */}
          <Card style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={18} color="var(--color-primary, #16805D)" />
                Address
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
                  City
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
                  PIN Code
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                  {driver.pincode || '—'}
                </div>
              </div>
            </div>
          </Card>

          {/* Section 3: Employment */}
          <Card style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={18} color="var(--color-primary, #16805D)" />
                Employment
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
                  Status
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                  {driver.employment_status || (driver.is_active ? 'Active' : 'Inactive')}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Role
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                  {driver.role || 'DRIVER'}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: DELIVERIES & RUNS */}
      {activeTab === 'deliveries' && (
        <Card style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={18} color="var(--color-primary, #16805D)" />
            Assigned Delivery History & Fulfillment
          </h3>

          {deliveries.length === 0 ? (
            <div style={{ padding: '36px 16px', textAlign: 'center', color: '#64748B' }}>
              <Package size={30} color="#CBD5E1" style={{ margin: '0 auto 8px auto' }} />
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#475569' }}>
                No delivery history recorded yet for this employee
              </div>
              <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
                Completed and en-route deliveries will appear here as orders are fulfilled.
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
                  {deliveries.slice(0, 15).map((d: any, idx: number) => (
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
      )}

      {/* TAB 3: SALARY MANAGEMENT */}
      {activeTab === 'salary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* Header Action Section */}
          <Card style={{ padding: '22px 24px', border: '1px solid #CBD5E1' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: '16px',
                    fontWeight: 800,
                    color: '#0F172A',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <DollarSign size={20} color="var(--color-primary, #16805D)" />
                  Salary Management & Disbursements
                </h3>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '3px 0 0 0' }}>
                  Configure agreed compensation rates and track verified salary payment transactions.
                </p>
              </div>

              {/* Two Primary Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Button
                  variant="secondary"
                  onClick={() => setIsSetSalaryModalOpen(true)}
                  icon={<DollarSign size={15} />}
                >
                  {salarySummary?.isConfigured ? 'Revise Monthly Salary' : 'Set Monthly Salary'}
                </Button>

                <Button
                  variant="primary"
                  onClick={() => setIsRecordPaymentModalOpen(true)}
                  icon={<CreditCard size={15} />}
                >
                  Record Salary Payment
                </Button>
              </div>
            </div>

            {/* Month Filter Selector */}
            <div
              style={{
                marginTop: '18px',
                paddingTop: '16px',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label
                  htmlFor="selectedMonthPicker"
                  style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}
                >
                  Salary Month:
                </label>
                <input
                  id="selectedMonthPicker"
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#0F172A',
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: '13px', color: '#64748B' }}>
                  ({formatMonthTitle(selectedMonth)})
                </span>
              </div>

              {loadingSalary && (
                <span style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <RefreshCw size={12} className="spin" /> Updating metrics...
                </span>
              )}
            </div>
          </Card>

          {/* Salary Summary Cards */}
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              {/* Card 1: Current Monthly Salary */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  padding: '18px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  Current Monthly Salary
                </div>
                {salarySummary?.isConfigured && salarySummary.currentMonthlySalary ? (
                  <>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                      {formatCurrency(salarySummary.currentMonthlySalary)}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                      Fixed Monthly Salary
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#94A3B8', marginTop: '6px' }}>
                      Salary Not Set
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsSetSalaryModalOpen(true)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--color-primary, #16805D)',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        marginTop: '4px',
                      }}
                    >
                      Set Monthly Salary
                    </button>
                  </>
                )}
              </div>

              {/* Card 2: Salary Effective Date */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  padding: '18px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  Salary Effective Date
                </div>
                <div style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A', marginTop: '6px' }}>
                  {salarySummary?.salaryEffectiveDate ? formatDate(salarySummary.salaryEffectiveDate) : '—'}
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                  Rate applicable from
                </div>
              </div>

              {/* Card 3: Salary Obligation for Month */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  padding: '18px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  Salary Due ({selectedMonth})
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                  {salarySummary ? formatCurrency(salarySummary.salaryAmountDue) : '₹0.00'}
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                  Prorated obligation
                </div>
              </div>

              {/* Card 4: Total Salary Paid for Month */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  padding: '18px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  Total Paid
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#166534', marginTop: '4px' }}>
                  {salarySummary ? formatCurrency(salarySummary.totalPaid) : '₹0.00'}
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                  Recorded disbursements
                </div>
              </div>

              {/* Card 5: Remaining Salary Balance */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  padding: '18px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  Remaining Balance
                </div>
                <div
                  style={{
                    fontSize: '20px',
                    fontWeight: 800,
                    color: (salarySummary?.remainingBalance || 0) > 0 ? '#B45309' : '#166534',
                    marginTop: '4px',
                  }}
                >
                  {salarySummary ? formatCurrency(salarySummary.remainingBalance) : '₹0.00'}
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                  Pending to disburse
                </div>
              </div>

              {/* Card 6: Payment Status */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  padding: '18px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  Payment Status
                </div>
                <div style={{ marginTop: '8px' }}>
                  {salarySummary?.paymentStatus === 'PAID' && (
                    <Badge variant="success">Paid</Badge>
                  )}
                  {salarySummary?.paymentStatus === 'PARTIALLY_PAID' && (
                    <Badge variant="info">Partially Paid</Badge>
                  )}
                  {salarySummary?.paymentStatus === 'UNPAID' && (
                    <Badge variant="warning">Unpaid</Badge>
                  )}
                  {(!salarySummary?.paymentStatus || salarySummary?.paymentStatus === 'NOT_SET') && (
                    <Badge variant="neutral">Salary Not Set</Badge>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '6px' }}>
                  {salarySummary?.paymentStatus === 'PAID'
                    ? 'Fully settled for month'
                    : salarySummary?.paymentStatus === 'PARTIALLY_PAID'
                    ? 'Partial balance remains'
                    : salarySummary?.paymentStatus === 'UNPAID'
                    ? 'No payments recorded yet'
                    : 'Configure monthly salary'}
                </div>
              </div>
            </div>
          </div>

          {/* Section: Salary Payment History Table */}
          <Card style={{ padding: '24px', border: '1px solid #CBD5E1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Salary Payment History
                </h3>
                <p style={{ fontSize: '12.5px', color: '#64748B', margin: '2px 0 0 0' }}>
                  Monthly compensation obligations, total disbursements, and payment status
                </p>
              </div>
            </div>

            {salaryMonthsList.length === 0 ? (
              <div
                style={{
                  padding: '36px 16px',
                  textAlign: 'center',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '10px',
                  border: '1px dashed #CBD5E1',
                  color: '#64748B',
                }}
              >
                <Receipt size={32} color="#94A3B8" style={{ margin: '0 auto 8px auto' }} />
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>
                  No payment history recorded yet
                </div>
                <p style={{ fontSize: '12px', color: '#64748B', maxWidth: '420px', margin: '4px auto 14px auto' }}>
                  Configure the monthly salary and record payments to start building this employee's verified financial history.
                </p>
                <Button
                  variant="primary"
                  onClick={() => setIsRecordPaymentModalOpen(true)}
                  icon={<CreditCard size={14} />}
                >
                  Record First Payment
                </Button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr
                      style={{
                        borderBottom: '1px solid #CBD5E1',
                        textAlign: 'left',
                        color: '#64748B',
                        fontSize: '11px',
                        textTransform: 'uppercase',
                      }}
                    >
                      <th style={{ padding: '10px 14px' }}>Salary Month</th>
                      <th style={{ padding: '10px 14px' }}>Salary Amount Due</th>
                      <th style={{ padding: '10px 14px' }}>Total Paid</th>
                      <th style={{ padding: '10px 14px' }}>Remaining Balance</th>
                      <th style={{ padding: '10px 14px' }}>Latest Payment Date</th>
                      <th style={{ padding: '10px 14px' }}>Payment Status</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salaryMonthsList.map((m) => (
                      <tr
                        key={m.salaryMonth}
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          backgroundColor: m.salaryMonth === selectedMonth ? '#F8FAFC' : 'transparent',
                        }}
                      >
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0F172A' }}>
                          <div>{formatMonthTitle(m.salaryMonth)}</div>
                          <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748B' }}>
                            {m.salaryMonth}
                          </div>
                        </td>

                        <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0F172A' }}>
                          {formatCurrency(m.salaryAmountDue)}
                        </td>

                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#166534' }}>
                          {formatCurrency(m.totalPaid)}
                        </td>

                        <td
                          style={{
                            padding: '12px 14px',
                            fontWeight: 700,
                            color: m.remainingBalance > 0 ? '#B45309' : '#166534',
                          }}
                        >
                          {formatCurrency(m.remainingBalance)}
                        </td>

                        <td style={{ padding: '12px 14px', color: '#64748B' }}>
                          {m.latestPaymentDate ? formatDate(m.latestPaymentDate) : '—'}
                        </td>

                        <td style={{ padding: '12px 14px' }}>
                          <Badge
                            variant={
                              m.paymentStatus === 'PAID'
                                ? 'success'
                                : m.paymentStatus === 'PARTIALLY_PAID'
                                ? 'info'
                                : m.paymentStatus === 'UNPAID'
                                ? 'warning'
                                : 'neutral'
                            }
                          >
                            {m.paymentStatus === 'PAID'
                              ? 'Paid'
                              : m.paymentStatus === 'PARTIALLY_PAID'
                              ? 'Partially Paid'
                              : m.paymentStatus === 'UNPAID'
                              ? 'Unpaid'
                              : 'Salary Not Set'}
                          </Badge>
                        </td>

                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <Button
                            variant="secondary"
                            onClick={() => handleOpenBreakdownForMonth(m)}
                            style={{ height: '30px', padding: '0 10px', fontSize: '12px' }}
                          >
                            View Transactions ({m.paymentsCount})
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Section: Historical Salary Revisions Card */}
          <Card style={{ padding: '20px 24px', border: '1px solid #CBD5E1' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
              }}
              onClick={() => setIsRevisionsExpanded(!isRevisionsExpanded)}
            >
              <div>
                <h4 style={{ fontSize: '14.5px', fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <History size={16} color="#64748B" />
                  Historical Agreed Salary Rates ({salaryAllConfigs.length})
                </h4>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
                  Audit log of all configured base rates and their applicable date ranges
                </p>
              </div>
              <button
                type="button"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {isRevisionsExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </button>
            </div>

            {isRevisionsExpanded && (
              <div style={{ marginTop: '16px', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
                {salaryAllConfigs.length === 0 ? (
                  <div style={{ fontSize: '13px', color: '#64748B', textAlign: 'center', padding: '12px 0' }}>
                    No salary configurations recorded yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {salaryAllConfigs.map((cfg, idx) => (
                      <div
                        key={cfg.id || idx}
                        style={{
                          backgroundColor: cfg.is_current ? 'var(--color-primary-subtle, #E6F4EA)' : '#F8FAFC',
                          border: `1px solid ${cfg.is_current ? '#6EE7B7' : '#E2E8F0'}`,
                          borderRadius: '8px',
                          padding: '12px 16px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '12px',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                              {formatCurrency(parseFloat(String(cfg.base_monthly_salary)))}
                            </span>
                            <span style={{ fontSize: '12px', color: '#64748B' }}>
                              ({cfg.salary_type || 'Fixed Monthly Salary'})
                            </span>
                            {cfg.is_current && (
                              <Badge variant="success">Current Applicable Rate</Badge>
                            )}
                          </div>
                          {cfg.notes && (
                            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                              Note: {cfg.notes}
                            </div>
                          )}
                        </div>

                        <div style={{ textAlign: 'right', fontSize: '12px', color: '#64748B' }}>
                          <div>
                            Effective: <strong>{formatDate(cfg.effective_from)}</strong>
                            {cfg.effective_to ? ` to ${formatDate(cfg.effective_to)}` : ' onwards'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                            Configured {formatDate(cfg.created_at)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 4: ACTIVITY AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <Card style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={18} color="var(--color-primary, #16805D)" />
            Activity & Audit History
          </h3>

          {auditHistory.length === 0 ? (
            <div style={{ padding: '36px 16px', textAlign: 'center', color: '#64748B' }}>
              <History size={30} color="#CBD5E1" style={{ margin: '0 auto 8px auto' }} />
              <div style={{ fontSize: '13.5px', fontWeight: 500 }}>No audit activity records found yet.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {auditHistory.slice(0, 25).map((log: DriverAuditRecord) => (
                <div
                  key={log.id}
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0F172A' }}>
                      {log.action.replace(/_/g, ' ')}
                    </div>
                    {log.details && (
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                        {typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details)}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '11.5px', color: '#64748B' }}>
                    <div>{log.actor_name ? `By ${log.actor_name}` : 'By System'}</div>
                    <div style={{ color: '#94A3B8' }}>{formatDate(log.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Form One: Set Monthly Salary Modal */}
      <SetSalaryModal
        isOpen={isSetSalaryModalOpen}
        onClose={() => setIsSetSalaryModalOpen(false)}
        driver={driver}
        currentSalarySummary={salarySummary}
        onSuccess={(updated) => {
          showToast('Monthly salary configuration updated successfully.');
          fetchSalaryData();
        }}
      />

      {/* Form Two: Record Salary Payment Modal */}
      <RecordPaymentModal
        isOpen={isRecordPaymentModalOpen}
        onClose={() => setIsRecordPaymentModalOpen(false)}
        driver={driver}
        defaultMonth={selectedMonth}
        onSuccess={(res) => {
          showToast('Salary payment recorded successfully.');
          fetchSalaryData();
        }}
      />

      {/* Salary Breakdown & Reversals Modal */}
      <SalaryBreakdownModal
        isOpen={isBreakdownModalOpen}
        onClose={() => setIsBreakdownModalOpen(false)}
        driver={driver}
        monthSummary={breakdownMonth}
        onPaymentReversed={() => {
          showToast('Payment transaction reversed successfully.');
          fetchSalaryData();
          setIsBreakdownModalOpen(false);
        }}
      />

      {/* Edit Driver Details Modal */}
      <EditDriverModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        driver={driver}
        onSuccess={() => {
          showToast('Employee information updated.');
          fetchDriverProfile();
        }}
      />

      {/* Reset Password Modal */}
      <ResetPasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        driver={driver}
        onSuccess={() => {
          showToast(`Password for ${driver.name} has been reset.`);
        }}
      />

      {/* Delete Driver Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Employee"
        entityType="Employee"
        entityName={driver.name}
        entityIdentifier={driver.employee_id}
        isActive={Boolean(driver.is_active)}
        customWarning={`Delete this employee? Historical deliveries and salary records will be preserved.`}
        details={[
          { label: 'Employee Name', value: driver.name },
          { label: 'Employee ID', value: driver.employee_id || 'N/A' },
          { label: 'Phone', value: driver.phone || 'N/A' },
          { label: 'Account Status', value: driver.is_active ? 'Active' : 'Inactive' },
        ]}
        onConfirm={async () => {
          try {
            await api.deliveries.deleteDriver(driver.id, 'Employee removed by admin');
            navigate('/admin/drivers');
          } catch (err: any) {
            showToast(err?.message || 'Failed to delete employee.', 'error');
          }
        }}
      />
    </div>
  );
};
