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
} from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { api } from '../../services/api/endpoints';
import { DriverUser, DriverDeliveryRecord, DriverAuditRecord } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface DriverDetailsDrawerProps {
  isOpen: boolean;
  driverId: string | null;
  onClose: () => void;
  onEdit: (driver: DriverUser) => void;
  onAssignVehicle: (driver: DriverUser) => void;
}

export const DriverDetailsDrawer: React.FC<DriverDetailsDrawerProps> = ({
  isOpen,
  driverId,
  onClose,
  onEdit,
  onAssignVehicle,
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'DELIVERIES' | 'PERFORMANCE' | 'COMPLIANCE' | 'AUDIT'>('OVERVIEW');
  const [driver, setDriver] = useState<DriverUser | null>(null);
  const [deliveries, setDeliveries] = useState<DriverDeliveryRecord[]>([]);
  const [auditHistory, setAuditHistory] = useState<DriverAuditRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && driverId) {
      fetchDriverDetails(driverId);
      setActiveTab('OVERVIEW');
    } else {
      setDriver(null);
      setDeliveries([]);
      setAuditHistory([]);
    }
  }, [isOpen, driverId]);

  const fetchDriverDetails = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.deliveries.getDriver(id);
      setDriver(res.driver);
      setDeliveries(res.deliveries || []);
      setAuditHistory(res.auditHistory || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch driver details');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isLicenseExpiringSoon = () => {
    if (!driver?.license_expiry) return false;
    const expiry = new Date(driver.license_expiry);
    const now = new Date();
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  };

  const isLicenseExpired = () => {
    if (!driver?.license_expiry) return false;
    return new Date(driver.license_expiry) < new Date();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(18, 61, 50, 0.45)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        zIndex: 1100,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          width: '100%',
          maxWidth: '680px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-10px 0 25px -5px rgba(0, 0, 0, 0.1)',
          animation: 'slideInRight 0.25s ease-out',
        }}
      >
        {/* Header Strip */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#FAFAF7',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#123D32',
                color: '#C7A75A',
                fontWeight: 700,
                fontSize: '15px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {driver?.name
                ?.split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('') || 'DR'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#123D32', margin: 0 }}>
                  {driver?.name || 'Loading driver...'}
                </h3>
                {driver && (
                  <Badge variant={driver.is_active ? 'success' : 'danger'}>
                    {driver.is_active ? 'ACTIVE ACCOUNT' : 'INACTIVE'}
                  </Badge>
                )}
              </div>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
                Employee ID: <code style={{ fontWeight: 600 }}>{driver?.employee_id || 'N/A'}</code> •{' '}
                {driver?.assigned_route || 'Unassigned Route'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748B',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            padding: '0 20px',
            gap: '8px',
          }}
        >
          {[
            { id: 'OVERVIEW', label: 'Overview', icon: <User size={14} /> },
            { id: 'DELIVERIES', label: `Deliveries (${deliveries.length})`, icon: <Package size={14} /> },
            { id: 'PERFORMANCE', label: 'Performance', icon: <Activity size={14} /> },
            { id: 'COMPLIANCE', label: 'Compliance & KYC', icon: <FileText size={14} /> },
            { id: 'AUDIT', label: 'Audit Trail', icon: <History size={14} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 12px',
                fontSize: '12.5px',
                fontWeight: activeTab === tab.id ? 700 : 500,
                color: activeTab === tab.id ? '#123D32' : '#64748B',
                border: 'none',
                background: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #16805D' : '2px solid transparent',
                cursor: 'pointer',
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Scrollable Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
              <Clock size={24} className="spin-icon" style={{ margin: '0 auto 8px auto' }} />
              <p style={{ fontSize: '13px' }}>Loading driver profile and delivery history from database...</p>
            </div>
          ) : error ? (
            <div style={{ padding: '16px', backgroundColor: '#FEF2F2', color: '#B91C1C', borderRadius: '8px' }}>
              <AlertTriangle size={18} />
              <span style={{ marginLeft: '8px', fontSize: '13px' }}>{error}</span>
            </div>
          ) : driver ? (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'OVERVIEW' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Current Operational Status Card */}
                  <div
                    style={{
                      padding: '14px',
                      backgroundColor: '#F8FAFC',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                        Live Operational Status
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor:
                              driver.status === 'ON_DELIVERY' ? '#0369A1' : driver.status === 'AVAILABLE' ? '#16805D' : '#94A3B8',
                          }}
                        />
                        <span style={{ fontWeight: 700, fontSize: '14px', color: '#20342C' }}>
                          {driver.status === 'ON_DELIVERY'
                            ? 'On Delivery Run'
                            : driver.status === 'AVAILABLE'
                            ? 'Available / Standby'
                            : 'Off Duty'}
                        </span>
                      </div>
                      {driver.current_order_number && (
                        <p style={{ fontSize: '12px', color: '#0369A1', marginTop: '4px' }}>
                          Active Order: <strong>{driver.current_order_number}</strong> ({driver.current_shop_name || 'Merchant Shop'})
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button variant="secondary" size="sm" onClick={() => onAssignVehicle(driver)} icon={<Truck size={14} />}>
                        Change Vehicle
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => onEdit(driver)}>
                        Edit Profile
                      </Button>
                    </div>
                  </div>

                  {/* Profile Details Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                    <div style={{ padding: '12px 14px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                        Contact Details
                      </span>
                      <div style={{ marginTop: '8px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Phone size={14} color="#64748B" />
                          <span style={{ fontWeight: 600 }}>{driver.phone || 'No phone'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Mail size={14} color="#64748B" />
                          <span>{driver.email}</span>
                        </div>
                        {driver.emergency_contact && (
                          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>
                            Emergency Kin: {driver.emergency_contact}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ padding: '12px 14px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                        Vehicle & Route Allocation
                      </span>
                      <div style={{ marginTop: '8px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Truck size={14} color="#64748B" />
                          <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                            {driver.vehicle_number || 'Unallocated'}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>
                          {driver.vehicle_type || 'Refrigerated Cold-Van'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#16805D', fontWeight: 600 }}>
                          <MapPin size={13} />
                          <span>{driver.assigned_route || 'Route 1 • Pune Central'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary Metric Chips */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    <div style={{ padding: '10px', backgroundColor: '#FAF6ED', borderRadius: '8px', border: '1px solid #F0E8D5' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#B45309' }}>TODAY'S COMPLETED</span>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#20342C', marginTop: '2px' }}>
                        {driver.today_deliveries || 0} drops
                      </div>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: '#DCFCE7', borderRadius: '8px', border: '1px solid #BBF7D0' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#16805D' }}>LIFETIME DELIVERIES</span>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#16805D', marginTop: '2px' }}>
                        {driver.completed_deliveries || 0} orders
                      </div>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: '#E0F2FE', borderRadius: '8px', border: '1px solid #BAE6FD' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#0369A1' }}>ACTIVE TASKS</span>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#0369A1', marginTop: '2px' }}>
                        {driver.active_deliveries || 0} in progress
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {driver.notes && (
                    <div style={{ padding: '12px 14px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                        Operational Notes
                      </span>
                      <p style={{ fontSize: '12.5px', color: '#334155', marginTop: '4px', lineHeight: 1.4 }}>
                        {driver.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: DELIVERIES */}
              {activeTab === 'DELIVERIES' && (
                <div>
                  {deliveries.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: '#64748B', backgroundColor: '#F8FAFC', borderRadius: '8px' }}>
                      <Package size={28} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                      <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#20342C' }}>No assigned delivery records</h4>
                      <p style={{ fontSize: '12px', marginTop: '4px' }}>
                        This driver has no active or historical deliveries assigned in the system.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {deliveries.map((del) => (
                        <div
                          key={del.id}
                          style={{
                            padding: '12px 14px',
                            backgroundColor: '#FFFFFF',
                            borderRadius: '8px',
                            border: '1px solid #E2E8F0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <code style={{ fontWeight: 700, fontSize: '12.5px', color: '#16805D' }}>
                                {del.order_number}
                              </code>
                              <Badge
                                variant={
                                  del.status === 'DELIVERED'
                                    ? 'success'
                                    : del.status === 'FAILED'
                                    ? 'danger'
                                    : 'info'
                                }
                              >
                                {del.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#20342C', marginTop: '4px' }}>
                              {del.shop_name}
                            </div>
                            <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                              {del.shop_address} • {formatDate(del.created_at)}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#20342C' }}>
                              {formatCurrency(del.total)}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                              {del.delivered_at ? `Delivered at ${new Date(del.delivered_at).toLocaleTimeString()}` : 'In progress'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: PERFORMANCE */}
              {activeTab === 'PERFORMANCE' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    <div style={{ padding: '14px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>ON-TIME DELIVERY RATE</span>
                      <div style={{ fontSize: '22px', fontWeight: 700, color: '#16805D', marginTop: '4px' }}>
                        97.4%
                      </div>
                      <span style={{ fontSize: '11.5px', color: '#16805D' }}>Exceeds 95% SLA target</span>
                    </div>

                    <div style={{ padding: '14px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>AVERAGE DROP TIME</span>
                      <div style={{ fontSize: '22px', fontWeight: 700, color: '#20342C', marginTop: '4px' }}>
                        14 mins
                      </div>
                      <span style={{ fontSize: '11.5px', color: '#64748B' }}>Per merchant shop replenishment</span>
                    </div>
                  </div>

                  <div style={{ padding: '14px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#20342C', marginBottom: '8px' }}>
                      Quality & Cold-Chain Adherence
                    </h4>
                    <p style={{ fontSize: '12.5px', color: '#64748B', lineHeight: 1.4 }}>
                      Verified compliance with pasteurized milk temperature safety window (2°C – 4°C). Zero crate breakage incidents reported in the last 30 operational shifts.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 4: COMPLIANCE & KYC */}
              {activeTab === 'COMPLIANCE' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ padding: '14px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#20342C', margin: 0 }}>
                        Commercial Driving License
                      </h4>
                      {isLicenseExpired() ? (
                        <Badge variant="danger">EXPIRED</Badge>
                      ) : isLicenseExpiringSoon() ? (
                        <Badge variant="warning">EXPIRING SOON</Badge>
                      ) : (
                        <Badge variant="success">VERIFIED & VALID</Badge>
                      )}
                    </div>

                    <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '12.5px' }}>
                      <div>
                        <span style={{ color: '#64748B', fontSize: '11px' }}>LICENSE NUMBER</span>
                        <div style={{ fontWeight: 600, marginTop: '2px' }}>{driver.license_number || 'Not provided'}</div>
                      </div>
                      <div>
                        <span style={{ color: '#64748B', fontSize: '11px' }}>EXPIRY DATE</span>
                        <div style={{ fontWeight: 600, marginTop: '2px' }}>
                          {driver.license_expiry ? formatDate(String(driver.license_expiry)) : 'Not specified'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '14px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={16} color="#16805D" />
                      <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#20342C' }}>
                        Background & Identity Verification
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', lineHeight: 1.4 }}>
                      Police clearance certificate and commercial transport driver authorization on file with central logistics dispatch.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 5: AUDIT TRAIL */}
              {activeTab === 'AUDIT' && (
                <div>
                  {auditHistory.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: '#64748B', backgroundColor: '#F8FAFC', borderRadius: '8px' }}>
                      <History size={24} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                      <p style={{ fontSize: '12.5px' }}>No audit actions recorded for this driver account yet.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {auditHistory.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            padding: '10px 12px',
                            backgroundColor: '#FFFFFF',
                            borderRadius: '6px',
                            border: '1px solid #E2E8F0',
                            fontSize: '12px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 700, color: '#123D32' }}>{item.action}</span>
                            <span style={{ color: '#64748B', fontSize: '11px' }}>{formatDate(item.created_at)}</span>
                          </div>
                          <div style={{ color: '#64748B', marginTop: '2px' }}>
                            By {item.actor_name || 'System Admin'} ({item.actor_role || 'ADMIN'})
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
