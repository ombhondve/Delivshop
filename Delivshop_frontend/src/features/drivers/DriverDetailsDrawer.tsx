import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Truck,
  Shield,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Calendar,
  Phone,
  Mail,
  History,
  Activity,
  Package,
  DollarSign,
  Lock,
  AlertCircle,
  Edit,
  Plus,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { DeleteConfirmModal } from '../../components/common/DeleteConfirmModal';
import { api } from '../../services/api/endpoints';
import { DriverUser, DriverDeliveryRecord, DriverAuditRecord } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { DriverSalaryModal } from './DriverSalaryModal';
import { DriverDocumentModal } from './DriverDocumentModal';
import { useNavigation } from '../../context/NavigationContext';

interface DriverDetailsDrawerProps {
  isOpen: boolean;
  driverId: string | null;
  onClose: () => void;
  onEdit: (driver: DriverUser) => void;
  onAssignVehicle: (driver: DriverUser) => void;
  onDriverDeleted?: () => void;
}

type TabType = 'OVERVIEW' | 'OPERATIONS' | 'COMPENSATION_DOCS';

export const DriverDetailsDrawer: React.FC<DriverDetailsDrawerProps> = ({
  isOpen,
  driverId,
  onClose,
  onEdit,
  onAssignVehicle,
  onDriverDeleted,
}) => {
  const { navigate } = useNavigation();
  const [activeTab, setActiveTab] = useState<TabType>('OVERVIEW');
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Submodals
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen && driverId) {
      fetchFullProfile(driverId);
      setActiveTab('OVERVIEW');
    } else {
      setProfile(null);
    }
  }, [isOpen, driverId]);

  const fetchFullProfile = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.deliveries.getFullProfile(id);
      if (res && res.driver) {
        setProfile(res);
      } else {
        const basicRes = await api.deliveries.getDriver(id);
        setProfile({
          driver: basicRes.driver,
          deliveries: basicRes.deliveries || [],
          runs: [],
          salaryConfig: null,
          payrollRecords: [],
          documents: [],
          auditHistory: basicRes.auditHistory || [],
        });
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch driver details');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const driver: DriverUser | undefined = profile?.driver;
  const deliveries: any[] = profile?.deliveries || [];
  const documents: any[] = profile?.documents || [];
  const salaryConfig = profile?.salaryConfig || null;

  const isLicenseExpiringSoon = () => {
    if (!driver?.license_expiry) return false;
    const expiry = new Date(driver.license_expiry);
    const now = new Date();
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  };

  const isLicenseExpired = () => {
    if (!driver?.license_expiry) return false;
    return new Date(driver.license_expiry) < new Date();
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer-panel" style={{ maxWidth: '820px' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="drawer-header" style={{ padding: '18px 24px', borderBottom: '1px solid #CBD5E1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '16px',
              }}
            >
              {driver?.name ? driver.name.charAt(0).toUpperCase() : 'D'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary, #0F172A)', margin: 0 }}>
                  {driver?.name || 'Driver Profile'}
                </h2>
                <code
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--color-primary, #16805D)',
                    backgroundColor: 'var(--color-primary-subtle, #E6F4EA)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid #A7F3D0',
                  }}
                  title="Authoritative Driver Employee ID"
                >
                  {driver?.employee_id || 'N/A'}
                </code>
                <Badge variant={driver?.is_active ? 'success' : 'neutral'}>
                  {driver?.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span>{driver?.phone || 'No phone'}</span>
                <span>•</span>
                <span>{driver?.email || 'No email registered'}</span>
                <span>•</span>
                <span>{driver?.city ? `${driver.city}, ${driver.state || ''}` : driver?.state || 'Base Station'}</span>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {driver && (
              <>
                <button
                  type="button"
                  onClick={() => onEdit(driver)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#334155',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Edit size={13} />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(`/admin/drivers/${driver.id}`);
                  }}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'var(--color-primary-subtle, #E6F4EA)',
                    border: '1px solid #A7F3D0',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--color-primary, #16805D)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <ExternalLink size={13} />
                  <span>Full View</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Streamlined 3-Tab Navigation Bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', padding: '0 20px' }}>
          {[
            { id: 'OVERVIEW', label: 'Overview & Profile', icon: User },
            { id: 'OPERATIONS', label: 'Operations & Vehicle', icon: Truck, count: deliveries.length },
            { id: 'COMPENSATION_DOCS', label: 'Salary & Documents', icon: FileText, count: documents.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as TabType)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '12px 16px',
                  border: 'none',
                  background: 'none',
                  borderBottom: isActive ? '2px solid var(--color-primary, #16805D)' : '2px solid transparent',
                  color: isActive ? 'var(--color-primary, #16805D)' : '#64748B',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={15} />
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

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', backgroundColor: '#F8FAFC' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px' }}>
              <div style={{ color: 'var(--color-primary, #16805D)', fontSize: '13px', fontWeight: 600 }}>Loading driver profile...</div>
            </div>
          ) : error ? (
            <div style={{ padding: '16px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', color: '#B91C1C', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          ) : driver ? (
            <>
              {/* Expiry Warning if applicable */}
              {(isLicenseExpired() || isLicenseExpiringSoon()) && (
                <div
                  style={{
                    backgroundColor: isLicenseExpired() ? '#FEF2F2' : '#FFFBEB',
                    border: `1px solid ${isLicenseExpired() ? '#FCA5A5' : '#FCD34D'}`,
                    borderRadius: '8px',
                    padding: '12px 14px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '12.5px',
                    color: isLicenseExpired() ? '#991B1B' : '#92400E',
                  }}
                >
                  <AlertTriangle size={18} color={isLicenseExpired() ? '#DC2626' : '#D97706'} />
                  <span>
                    Licence No. {driver.license_number || 'N/A'}{' '}
                    {isLicenseExpired()
                      ? `has expired (${driver.license_expiry ? formatDate(driver.license_expiry) : ''})`
                      : `expires soon on ${driver.license_expiry ? formatDate(driver.license_expiry) : ''}`}
                    .
                  </span>
                </div>
              )}

              {/* TAB 1: OVERVIEW & PROFILE */}
              {activeTab === 'OVERVIEW' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Summary Card */}
                  <div style={{ backgroundColor: '#FFFFFF', padding: '18px 20px', borderRadius: '10px', border: '1px solid #CBD5E1' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', fontSize: '13px' }}>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Employee ID</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-primary, #16805D)', marginTop: '2px' }}>
                          {driver.employee_id || 'N/A'}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Phone</div>
                        <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                          {driver.phone || '—'}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Fleet Vehicle</div>
                        <div style={{ fontSize: '13.5px', fontWeight: 600, color: driver.vehicle_number ? '#0F172A' : '#D97706', marginTop: '2px' }}>
                          {driver.vehicle_number || 'Unassigned'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Personal & Contact */}
                  <div style={{ backgroundColor: '#FFFFFF', padding: '18px 20px', borderRadius: '10px', border: '1px solid #CBD5E1' }}>
                    <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', margin: '0 0 12px 0' }}>
                      Personal & Contact Information
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', fontSize: '12.5px' }}>
                      <div>
                        <span style={{ color: '#64748B' }}>Full Name: </span>
                        <span style={{ fontWeight: 600, color: '#0F172A' }}>{driver.name}</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748B' }}>Primary Phone: </span>
                        <span style={{ fontWeight: 600, color: '#0F172A' }}>{driver.phone || '—'}</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748B' }}>Alternate Phone: </span>
                        <span style={{ fontWeight: 600, color: '#0F172A' }}>{driver.alternate_phone || '—'}</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748B' }}>Email: </span>
                        <span style={{ fontWeight: 600, color: '#0F172A' }}>{driver.email || '—'}</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748B' }}>Gender: </span>
                        <span style={{ fontWeight: 600, color: '#0F172A' }}>{driver.gender || '—'}</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748B' }}>Emergency Contact: </span>
                        <span style={{ fontWeight: 600, color: '#0F172A' }}>
                          {driver.emergency_contact_name
                            ? `${driver.emergency_contact_name} (${driver.emergency_contact_phone || ''})`
                            : driver.emergency_contact || '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Address & Location */}
                  <div style={{ backgroundColor: '#FFFFFF', padding: '18px 20px', borderRadius: '10px', border: '1px solid #CBD5E1' }}>
                    <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', margin: '0 0 12px 0' }}>
                      Address & Location
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', fontSize: '12.5px' }}>
                      <div style={{ gridColumn: 'span 2' }}>
                        <span style={{ color: '#64748B' }}>Street Address: </span>
                        <span style={{ fontWeight: 600, color: '#0F172A' }}>{driver.address || '—'}</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748B' }}>City / Village: </span>
                        <span style={{ fontWeight: 600, color: '#0F172A' }}>{driver.city || '—'}</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748B' }}>State: </span>
                        <span style={{ fontWeight: 600, color: '#0F172A' }}>{driver.state || '—'}</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748B' }}>Pincode: </span>
                        <span style={{ fontWeight: 600, color: '#0F172A' }}>{driver.pincode || '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Employment & Driving License */}
                  <div style={{ backgroundColor: '#FFFFFF', padding: '18px 20px', borderRadius: '10px', border: '1px solid #CBD5E1' }}>
                    <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', margin: '0 0 12px 0' }}>
                      Employment & KYC Verification
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', fontSize: '12.5px' }}>
                      <div>
                        <span style={{ color: '#64748B' }}>Employee ID: </span>
                        <span style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-primary, #16805D)' }}>{driver.employee_id || 'N/A'}</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748B' }}>Joined: </span>
                        <span style={{ fontWeight: 600, color: '#0F172A' }}>{driver.joining_date ? formatDate(driver.joining_date) : '—'}</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748B' }}>Commercial DL No: </span>
                        <span style={{ fontWeight: 600, color: '#0F172A' }}>{driver.license_number || '—'}</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748B' }}>DL Expiry: </span>
                        <span style={{ fontWeight: 600, color: isLicenseExpired() ? '#DC2626' : '#0F172A' }}>
                          {driver.license_expiry ? formatDate(driver.license_expiry) : '—'}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: '#64748B' }}>License Class: </span>
                        <span style={{ fontWeight: 600, color: '#0F172A' }}>{driver.license_class || 'LMV-TR'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: OPERATIONS & VEHICLE */}
              {activeTab === 'OPERATIONS' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Vehicle Assignment Banner */}
                  <div style={{ backgroundColor: '#FFFFFF', padding: '18px 20px', borderRadius: '10px', border: '1px solid #CBD5E1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Current Vehicle Assignment</div>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: driver.vehicle_number ? '#0F172A' : '#D97706', fontFamily: 'monospace', marginTop: '2px' }}>
                          {driver.vehicle_number || 'No Vehicle Assigned'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                          {driver.vehicle_type ? `Type: ${driver.vehicle_type}` : 'Independent driver allocation'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onAssignVehicle(driver)}
                        style={{
                          padding: '8px 14px',
                          backgroundColor: 'var(--color-primary, #16805D)',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <Truck size={14} />
                        <span>{driver.vehicle_number ? 'Change Vehicle' : 'Assign Vehicle'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Delivery Metrics */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <div style={{ backgroundColor: '#FFFFFF', padding: '14px 16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Today's Drops</div>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>{driver.today_deliveries || 0}</div>
                    </div>
                    <div style={{ backgroundColor: '#FFFFFF', padding: '14px 16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Active In Progress</div>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: '#0284C7', marginTop: '2px' }}>{driver.active_deliveries || 0}</div>
                    </div>
                    <div style={{ backgroundColor: '#FFFFFF', padding: '14px 16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Completed Drops</div>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-primary, #16805D)', marginTop: '2px' }}>{driver.completed_deliveries || 0}</div>
                    </div>
                  </div>

                  {/* Run / Delivery History Table */}
                  <div style={{ backgroundColor: '#FFFFFF', padding: '18px 20px', borderRadius: '10px', border: '1px solid #CBD5E1' }}>
                    <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', margin: '0 0 12px 0' }}>
                      Delivery History
                    </h4>
                    {deliveries.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                        No delivery runs on record for this driver yet.
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#64748B', fontSize: '11px', textTransform: 'uppercase' }}>
                              <th style={{ padding: '8px 10px' }}>Order</th>
                              <th style={{ padding: '8px 10px' }}>Shop</th>
                              <th style={{ padding: '8px 10px' }}>Status</th>
                              <th style={{ padding: '8px 10px' }}>Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {deliveries.slice(0, 8).map((d: any, idx: number) => (
                              <tr key={d.id || idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                <td style={{ padding: '10px', fontFamily: 'monospace', fontWeight: 600 }}>#{d.orderNumber || d.order_number || d.id?.slice(0, 8)}</td>
                                <td style={{ padding: '10px' }}>{d.shopName || d.shop_name || 'Merchant'}</td>
                                <td style={{ padding: '10px' }}>
                                  <Badge variant={d.status === 'DELIVERED' ? 'success' : d.status === 'FAILED' ? 'danger' : 'info'}>
                                    {d.status || 'PENDING'}
                                  </Badge>
                                </td>
                                <td style={{ padding: '10px', color: '#64748B', fontSize: '11.5px' }}>
                                  {d.createdAt || d.created_at ? formatDate(d.createdAt || d.created_at) : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: COMPENSATION & DOCUMENTS */}
              {activeTab === 'COMPENSATION_DOCS' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Salary Structure */}
                  <div style={{ backgroundColor: '#FFFFFF', padding: '18px 20px', borderRadius: '10px', border: '1px solid #CBD5E1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                        Salary Structure
                      </h4>
                      <button
                        type="button"
                        onClick={() => setIsSalaryModalOpen(true)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: 'var(--color-primary-subtle, #E6F4EA)',
                          color: 'var(--color-primary, #16805D)',
                          border: '1px solid #A7F3D0',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Configure Salary
                      </button>
                    </div>

                    {salaryConfig ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', fontSize: '12.5px' }}>
                        <div style={{ backgroundColor: '#F8FAFC', padding: '10px 12px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                          <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Base Salary</div>
                          <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>{formatCurrency(salaryConfig.baseSalary || 0)}</div>
                        </div>
                        <div style={{ backgroundColor: '#F8FAFC', padding: '10px 12px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                          <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Daily Allowance</div>
                          <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>{formatCurrency(salaryConfig.dailyAllowance || 0)}</div>
                        </div>
                        <div style={{ backgroundColor: '#F8FAFC', padding: '10px 12px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                          <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Per Drop Incentive</div>
                          <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>{formatCurrency(salaryConfig.perDeliveryRate || 0)}</div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '12.5px', color: '#64748B', padding: '8px 0' }}>
                        No salary structure configured for this driver yet.
                      </div>
                    )}
                  </div>

                  {/* KYC Documents */}
                  <div style={{ backgroundColor: '#FFFFFF', padding: '18px 20px', borderRadius: '10px', border: '1px solid #CBD5E1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                        KYC Documents ({documents.length})
                      </h4>
                      <button
                        type="button"
                        onClick={() => setIsDocModalOpen(true)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: 'var(--color-primary, #16805D)',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Plus size={13} /> Upload Document
                      </button>
                    </div>

                    {documents.length === 0 ? (
                      <div style={{ fontSize: '12.5px', color: '#64748B', padding: '8px 0' }}>
                        No documents uploaded yet. Upload commercial driving licence or Aadhaar card.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {documents.map((doc: any, idx: number) => (
                          <div key={doc.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '12.5px' }}>
                            <div>
                              <span style={{ fontWeight: 600, color: '#0F172A' }}>{doc.document_type || doc.documentType}</span>
                              <span style={{ color: '#64748B', marginLeft: '8px', fontFamily: 'monospace' }}>({doc.document_number || doc.documentNumber})</span>
                            </div>
                            <Badge variant={(doc.verification_status || doc.verificationStatus) === 'VERIFIED' ? 'success' : 'neutral'}>
                              {doc.verification_status || doc.verificationStatus || 'PENDING'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Modals */}
        {isSalaryModalOpen && driver && (
          <DriverSalaryModal
            driverId={driver.id}
            driverName={driver.name}
            isOpen={isSalaryModalOpen}
            onClose={() => setIsSalaryModalOpen(false)}
            onSuccess={() => fetchFullProfile(driver.id)}
            existingSalary={profile?.salaryConfig}
          />
        )}

        {isDocModalOpen && driver && (
          <DriverDocumentModal
            driverId={driver.id}
            driverName={driver.name}
            isOpen={isDocModalOpen}
            onClose={() => setIsDocModalOpen(false)}
            onSuccess={() => fetchFullProfile(driver.id)}
          />
        )}

        {/* Delete Confirmation */}
        {isDeleteModalOpen && driver && (
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
            ]}
            customWarning="Drivers with historical dispatches will be safely archived to maintain records."
            onConfirm={async (reason) => {
              await api.deliveries.deleteDriver(driver.id, reason);
              setIsDeleteModalOpen(false);
              onClose();
              if (onDriverDeleted) onDriverDeleted();
            }}
          />
        )}
      </div>
    </div>
  );
};
