import React, { useState, useEffect, useCallback } from 'react';
import {
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
  Download,
} from 'lucide-react';
import { Drawer, DrawerTab } from '../../components/common/Drawer';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { api } from '../../services/api/endpoints';
import { Vehicle } from '../../types';
import { AddVehicleDocumentModal } from './AddVehicleDocumentModal';
import { AddMaintenanceModal } from './AddMaintenanceModal';
import { EditVehicleModal } from './EditVehicleModal';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { useNavigation } from '../../context/NavigationContext';

interface VehicleDetailsDrawerProps {
  vehicleId: string | null;
  onClose: () => void;
  onVehicleUpdated: () => void;
}

export const VehicleDetailsDrawer: React.FC<VehicleDetailsDrawerProps> = ({
  vehicleId,
  onClose,
  onVehicleUpdated,
}) => {
  const { navigate } = useNavigation();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Sub-modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isMaintModalOpen, setIsMaintModalOpen] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const fetchVehicleDetails = useCallback(async () => {
    if (!vehicleId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.vehicles.get(vehicleId);
      const data = res?.data || res;
      setVehicle(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load vehicle details');
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    if (vehicleId) {
      fetchVehicleDetails();
      setActiveTab('overview');
    } else {
      setVehicle(null);
    }
  }, [vehicleId, fetchVehicleDetails]);

  if (!vehicleId) return null;

  const handleStatusToggle = async () => {
    if (!vehicle) return;
    const nextStatus = vehicle.is_active ? 'INACTIVE' : 'AVAILABLE';
    try {
      setStatusUpdating(true);
      await api.vehicles.updateStatus(vehicle.id, nextStatus);
      await fetchVehicleDetails();
      onVehicleUpdated();
    } catch (err: any) {
      setError(err?.message || 'Failed to update vehicle status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return <Badge variant="success">Available for Run</Badge>;
      case 'ASSIGNED':
        return <Badge variant="navy">Dispatched on Run</Badge>;
      case 'UNDER_MAINTENANCE':
        return <Badge variant="warning">In Workshop</Badge>;
      case 'INACTIVE':
      default:
        return <Badge variant="neutral">Inactive / Decommissioned</Badge>;
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
        return <Badge variant="neutral">Pending Review</Badge>;
    }
  };

  const drawerTabs: DrawerTab[] = [
    { id: 'overview', label: 'Overview & Specs', icon: <Truck size={14} /> },
    {
      id: 'documents',
      label: 'Documents',
      icon: <FileText size={14} />,
      badge: vehicle?.documents?.length || 0,
    },
    {
      id: 'maintenance',
      label: 'Maintenance',
      icon: <Wrench size={14} />,
      badge: vehicle?.maintenance?.length || 0,
    },
    {
      id: 'assignments',
      label: 'Runs History',
      icon: <Calendar size={14} />,
      badge: vehicle?.assignments?.length || 0,
    },
  ];

  return (
    <>
      <Drawer
        isOpen={Boolean(vehicleId)}
        onClose={onClose}
        maxWidth="760px"
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{vehicle?.registration_number || 'Loading Vehicle...'}</span>
            {vehicle && getStatusBadge(vehicle.status)}
          </div>
        }
        subtitle={
          vehicle ? (
            <span>
              Asset Code: <strong>{vehicle.vehicle_code}</strong> • {vehicle.make_model} • {vehicle.depot}
            </span>
          ) : undefined
        }
        icon={<Truck size={20} />}
        tabs={drawerTabs}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        headerActions={
          vehicle && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditModalOpen(true)}
                icon={<Pencil size={13} />}
              >
                Edit Specs
              </Button>
              <Button
                variant={vehicle.is_active ? 'secondary' : 'primary'}
                size="sm"
                onClick={handleStatusToggle}
                loading={statusUpdating}
                icon={<Power size={13} />}
              >
                {vehicle.is_active ? 'Deactivate' : 'Activate'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  navigate(`/admin/vehicles/${vehicle.id}`);
                }}
                icon={<ExternalLink size={13} />}
                title="Open full page record"
              >
                Full Page
              </Button>
            </div>
          )
        }
        metrics={
          vehicle && (
            <div className="drawer-metric-grid">
              <div className="drawer-metric-card">
                <div className="drawer-metric-label">Payload Capacity</div>
                <div className="drawer-metric-value">{vehicle.capacity_kg} KG</div>
              </div>
              <div className="drawer-metric-card">
                <div className="drawer-metric-label">Crate Capacity</div>
                <div className="drawer-metric-value">{vehicle.capacity_crates} Crates</div>
              </div>
              <div className="drawer-metric-card">
                <div className="drawer-metric-label">Odometer</div>
                <div className="drawer-metric-value">
                  {Number(vehicle.current_odometer_km || 0).toLocaleString('en-IN')} KM
                </div>
              </div>
              <div className="drawer-metric-card">
                <div className="drawer-metric-label">Cold-Chain Unit</div>
                <div
                  className="drawer-metric-value"
                  style={{ color: vehicle.is_refrigerated ? 'var(--color-primary)' : 'var(--text-secondary)' }}
                >
                  {vehicle.is_refrigerated
                    ? `${vehicle.temperature_min_c ?? -18}°C to ${vehicle.temperature_max_c ?? 4}°C`
                    : 'Ambient Dry'}
                </div>
              </div>
            </div>
          )
        }
      >
        {error && (
          <div className="form-error-banner" style={{ marginBottom: '16px' }}>
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        {loading && !vehicle ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-secondary)' }}>
            <RefreshCw size={24} className="spin-icon" style={{ margin: '0 auto 12px auto' }} />
            <p style={{ margin: 0, fontSize: '13.5px' }}>Loading vehicle profile & telemetry...</p>
          </div>
        ) : vehicle ? (
          <>
            {/* TAB 1: OVERVIEW & SPECS */}
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Active Run Banner if dispatched */}
                {vehicle.active_run_id && (
                  <div
                    style={{
                      background: 'var(--color-primary-subtle)',
                      border: '1px solid #A7F3D0',
                      borderRadius: '8px',
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Clock size={18} style={{ color: 'var(--color-primary)' }} />
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          Currently Dispatched on Run {vehicle.active_run_code}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Assigned Driver: <strong>{vehicle.active_driver_name || 'Designated Driver'}</strong>
                          {vehicle.active_driver_phone && ` (${vehicle.active_driver_phone})`}
                        </div>
                      </div>
                    </div>
                    <Badge variant="navy">In Transit</Badge>
                  </div>
                )}

                {/* Specs Card */}
                <div
                  style={{
                    backgroundColor: 'var(--bg-hover)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    padding: '18px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Truck size={14} style={{ color: 'var(--color-primary)' }} />
                    Asset Specifications & Ratings
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '14px',
                      fontSize: '13px',
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '11.5px', display: 'block' }}>
                        Vehicle Classification
                      </span>
                      <strong style={{ color: 'var(--text-primary)' }}>{vehicle.vehicle_type}</strong>
                    </div>

                    <div>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '11.5px', display: 'block' }}>
                        Propulsion / Fuel Type
                      </span>
                      <strong style={{ color: 'var(--text-primary)' }}>{vehicle.fuel_type}</strong>
                    </div>

                    <div>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '11.5px', display: 'block' }}>
                        Manufacturing Year
                      </span>
                      <strong style={{ color: 'var(--text-primary)' }}>
                        {vehicle.manufacturing_year || 'Not recorded'}
                      </strong>
                    </div>

                    <div>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '11.5px', display: 'block' }}>
                        Callsign / Handle
                      </span>
                      <strong style={{ color: 'var(--text-primary)' }}>
                        {vehicle.nickname || 'None assigned'}
                      </strong>
                    </div>

                    <div>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '11.5px', display: 'block' }}>
                        Base Operations Depot
                      </span>
                      <strong style={{ color: 'var(--text-primary)' }}>{vehicle.depot}</strong>
                    </div>

                    <div>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '11.5px', display: 'block' }}>
                        Registered On
                      </span>
                      <strong style={{ color: 'var(--text-primary)' }}>
                        {formatDate(vehicle.created_at || '')}
                      </strong>
                    </div>
                  </div>

                  {vehicle.notes && (
                    <div
                      style={{
                        marginTop: '16px',
                        paddingTop: '12px',
                        borderTop: '1px solid var(--border-color)',
                      }}
                    >
                      <span style={{ color: 'var(--text-secondary)', fontSize: '11.5px', display: 'block', marginBottom: '4px' }}>
                        Operational Notes:
                      </span>
                      <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-primary)' }}>
                        {vehicle.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Quick actions row */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDocModalOpen(true)}
                    icon={<FileText size={14} />}
                    style={{ flex: 1 }}
                  >
                    Upload Document
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsMaintModalOpen(true)}
                    icon={<Wrench size={14} />}
                    style={{ flex: 1 }}
                  >
                    Log Maintenance
                  </Button>
                </div>
              </div>
            )}

            {/* TAB 2: COMPLIANCE DOCUMENTS */}
            {activeTab === 'documents' && (
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '14px',
                  }}
                >
                  <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    Regulatory compliance records for this asset
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsDocModalOpen(true)}
                    icon={<Plus size={14} />}
                  >
                    Upload Document
                  </Button>
                </div>

                {!vehicle.documents || vehicle.documents.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '36px 16px',
                      backgroundColor: 'var(--bg-hover)',
                      borderRadius: '8px',
                      border: '1px dashed var(--border-color)',
                    }}
                  >
                    <FileText size={32} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
                    <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      No compliance documents uploaded yet.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsDocModalOpen(true)}
                    >
                      Attach RC or Insurance
                    </Button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {vehicle.documents.map((doc: any) => (
                      <div
                        key={doc.id}
                        style={{
                          padding: '12px 16px',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                              {doc.document_type}
                            </strong>
                            {getDocBadge(doc.verification_status)}
                          </div>
                          <div
                            style={{
                              fontSize: '12px',
                              color: 'var(--text-secondary)',
                              marginTop: '3px',
                              fontFamily: 'monospace',
                            }}
                          >
                            Ref: {doc.document_number}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            Expires: <strong>{doc.expiry_date ? formatDate(doc.expiry_date) : 'Permanent'}</strong>
                          </div>
                        </div>

                        {doc.storage_path || doc.file_url ? (
                          <span style={{ fontSize: '11.5px', color: 'var(--color-primary)', fontWeight: 600 }}>
                            Attached
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: MAINTENANCE LOGBOOK */}
            {activeTab === 'maintenance' && (
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '14px',
                  }}
                >
                  <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    Authorized garage inspection & service history
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsMaintModalOpen(true)}
                    icon={<Plus size={14} />}
                  >
                    Log Service Entry
                  </Button>
                </div>

                {!vehicle.maintenance || vehicle.maintenance.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '36px 16px',
                      backgroundColor: 'var(--bg-hover)',
                      borderRadius: '8px',
                      border: '1px dashed var(--border-color)',
                    }}
                  >
                    <Wrench size={32} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
                    <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      No service or maintenance records on file.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsMaintModalOpen(true)}
                    >
                      Record First Service
                    </Button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {vehicle.maintenance.map((m: any) => (
                      <div
                        key={m.id}
                        style={{
                          padding: '12px 16px',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                              {m.service_type}
                            </strong>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              ({formatDate(m.service_date)})
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                            {m.service_center || 'Authorized Service Workshop'} •{' '}
                            <strong>{Number(m.odometer_km || 0).toLocaleString('en-IN')} KM</strong>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--color-primary)' }}>
                            {formatCurrency(Number(m.cost) || 0)}
                          </div>
                          {m.next_service_date && (
                            <div style={{ fontSize: '11px', color: '#B45309' }}>
                              Next due: {formatDate(m.next_service_date)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: ASSIGNMENTS HISTORY */}
            {activeTab === 'assignments' && (
              <div>
                <h4 style={{ fontSize: '13.5px', fontWeight: 700, margin: '0 0 14px 0', color: 'var(--text-primary)' }}>
                  Delivery Runs Dispatched
                </h4>
                {!vehicle.assignments || vehicle.assignments.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '36px 16px',
                      backgroundColor: 'var(--bg-hover)',
                      borderRadius: '8px',
                      border: '1px dashed var(--border-color)',
                    }}
                  >
                    <Calendar size={32} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                      No operational delivery runs recorded yet.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {vehicle.assignments.map((run: any) => (
                      <div
                        key={run.id}
                        style={{
                          padding: '12px 16px',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                              {run.run_code}
                            </strong>
                            <Badge
                              variant={
                                run.status === 'COMPLETED'
                                  ? 'success'
                                  : run.status === 'IN_PROGRESS'
                                  ? 'navy'
                                  : 'neutral'
                              }
                            >
                              {run.status}
                            </Badge>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            Route: <strong>{run.route_name}</strong> • Driver: <strong>{run.driver_name}</strong>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          <div>{formatDate(run.delivery_date)}</div>
                          <div style={{ fontSize: '11px' }}>
                            {run.completed_stops_count}/{run.planned_stops_count} stops
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : null}
      </Drawer>

      {/* Sub Modals */}
      {vehicle && (
        <>
          <EditVehicleModal
            isOpen={isEditModalOpen}
            vehicle={vehicle}
            onClose={() => setIsEditModalOpen(false)}
            onVehicleUpdated={() => {
              fetchVehicleDetails();
              onVehicleUpdated();
            }}
          />
          <AddVehicleDocumentModal
            isOpen={isDocModalOpen}
            vehicleId={vehicle.id}
            registrationNumber={vehicle.registration_number}
            onClose={() => setIsDocModalOpen(false)}
            onDocumentAdded={() => {
              fetchVehicleDetails();
              onVehicleUpdated();
            }}
          />
          <AddMaintenanceModal
            isOpen={isMaintModalOpen}
            vehicleId={vehicle.id}
            registrationNumber={vehicle.registration_number}
            currentOdometerKm={vehicle.current_odometer_km || 0}
            onClose={() => setIsMaintModalOpen(false)}
            onMaintenanceAdded={() => {
              fetchVehicleDetails();
              onVehicleUpdated();
            }}
          />
        </>
      )}
    </>
  );
};
