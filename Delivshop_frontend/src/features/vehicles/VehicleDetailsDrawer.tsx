import React, { useState, useEffect } from 'react';
import {
  X,
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
} from 'lucide-react';
import { api } from '../../services/api/endpoints';
import { Vehicle } from '../../types';
import { Badge } from '../../components/common/Badge';
import { AddVehicleDocumentModal } from './AddVehicleDocumentModal';
import { AddMaintenanceModal } from './AddMaintenanceModal';
import { formatDate, formatCurrency } from '../../utils/formatters';

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
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'maintenance' | 'assignments'>('overview');

  // Sub-modals
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isMaintModalOpen, setIsMaintModalOpen] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const fetchVehicleDetails = async () => {
    if (!vehicleId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.vehicles.get(vehicleId);
      setVehicle(res.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load vehicle details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (vehicleId) {
      fetchVehicleDetails();
    } else {
      setVehicle(null);
    }
  }, [vehicleId]);

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
      alert(err?.message || 'Failed to update vehicle status');
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

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer-panel" style={{ width: '680px', maxWidth: '90vw' }}>
        {/* Header */}
        <div className="drawer-header" style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="modal-icon-badge" style={{ background: '#F1F5F9', color: '#0F172A', padding: '10px', borderRadius: '8px' }}>
                <Truck size={24} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                    {vehicle?.registration_number || 'Loading Vehicle...'}
                  </h2>
                  {vehicle && getStatusBadge(vehicle.status)}
                </div>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                  Asset ID: <strong>{vehicle?.vehicle_code}</strong> • {vehicle?.make_model}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={fetchVehicleDetails}
                title="Refresh details"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
              <button type="button" className="btn-close" onClick={onClose}>
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Quick Action Sub-bar */}
          {vehicle && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed #E2E8F0' }}>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                Operational State:{' '}
                <strong style={{ color: vehicle.is_active ? '#15803D' : '#94A3B8' }}>
                  {vehicle.is_active ? 'Active Fleet Resource' : 'Decommissioned / Inactive'}
                </strong>
              </div>
              <button
                type="button"
                className={`btn btn-xs ${vehicle.is_active ? 'btn-outline-danger' : 'btn-outline-success'}`}
                onClick={handleStatusToggle}
                disabled={statusUpdating}
              >
                {statusUpdating ? 'Updating...' : vehicle.is_active ? 'Deactivate Vehicle' : 'Activate Vehicle'}
              </button>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="tab-nav" style={{ display: 'flex', gap: '8px', marginTop: '16px', borderBottom: 'none' }}>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview & Specs
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'documents' ? 'active' : ''}`}
              onClick={() => setActiveTab('documents')}
            >
              Documents ({vehicle?.documents?.length || 0})
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'maintenance' ? 'active' : ''}`}
              onClick={() => setActiveTab('maintenance')}
            >
              Maintenance ({vehicle?.maintenance?.length || 0})
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'assignments' ? 'active' : ''}`}
              onClick={() => setActiveTab('assignments')}
            >
              Assignments History
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="drawer-body" style={{ padding: '24px', overflowY: 'auto', maxHeight: 'calc(100vh - 180px)' }}>
          {error && (
            <div className="form-error-banner" style={{ marginBottom: '16px' }}>
              <ShieldAlert size={16} />
              <span>{error}</span>
            </div>
          )}

          {loading && !vehicle ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
              <p>Loading vehicle profile & telemetry...</p>
            </div>
          ) : vehicle ? (
            <>
              {/* TAB 1: OVERVIEW & SPECS */}
              {activeTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Active Delivery Run Banner if currently dispatched */}
                  {vehicle.active_run_id && (
                    <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Clock size={18} style={{ color: '#2563EB' }} />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E3A8A' }}>
                            Currently Assigned to Run {vehicle.active_run_code}
                          </div>
                          <div style={{ fontSize: '12px', color: '#3B82F6' }}>
                            Assigned Driver: {vehicle.active_driver_name || 'Designated Fleet Personnel'}
                          </div>
                        </div>
                      </div>
                      <Badge variant="navy">Dispatched</Badge>
                    </div>
                  )}

                  {/* Specifications Card */}
                  <div className="card" style={{ padding: '18px', background: '#F8FAFC' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 14px 0', color: '#0F172A' }}>
                      Technical Specifications & Load Rating
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', fontSize: '13px' }}>
                      <div>
                        <span style={{ color: '#64748B', display: 'block' }}>Vehicle Classification</span>
                        <strong style={{ color: '#0F172A' }}>{vehicle.vehicle_type}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748B', display: 'block' }}>Propulsion / Fuel Type</span>
                        <strong style={{ color: '#0F172A' }}>{vehicle.fuel_type}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748B', display: 'block' }}>Payload Capacity (Gross)</span>
                        <strong style={{ color: '#0F172A' }}>{vehicle.capacity_kg.toLocaleString()} KG</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748B', display: 'block' }}>Dairy Crates Capacity</span>
                        <strong style={{ color: '#0F172A' }}>{vehicle.capacity_crates} standard crates</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748B', display: 'block' }}>Refrigeration Unit</span>
                        <strong style={{ color: vehicle.is_refrigerated ? '#0284C7' : '#64748B' }}>
                          {vehicle.is_refrigerated ? 'Active Temperature Controlled (Chiller)' : 'Ambient / Insulated Cargo'}
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748B', display: 'block' }}>Current Odometer Reading</span>
                        <strong style={{ color: '#0F172A' }}>{vehicle.current_odometer_km?.toLocaleString()} KM</strong>
                      </div>
                    </div>
                  </div>

                  {/* Logistics Base */}
                  <div className="card" style={{ padding: '18px', background: '#F8FAFC' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 14px 0', color: '#0F172A' }}>
                      Operational Location & Home Depot
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', fontSize: '13px' }}>
                      <div>
                        <span style={{ color: '#64748B', display: 'block' }}>Home Distribution Base</span>
                        <strong style={{ color: '#0F172A' }}>{vehicle.depot}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748B', display: 'block' }}>Operational City / State</span>
                        <strong style={{ color: '#0F172A' }}>{vehicle.city}, {vehicle.state}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {vehicle.notes && (
                    <div className="card" style={{ padding: '16px', background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '6px' }}>
                        Asset Equipment Notes
                      </span>
                      <p style={{ margin: 0, fontSize: '13px', color: '#334155' }}>{vehicle.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: DOCUMENTS */}
              {activeTab === 'documents' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Statutory Commercial Documents</h4>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => setIsDocModalOpen(true)}
                    >
                      <Plus size={14} /> Add Document
                    </button>
                  </div>

                  {(!vehicle.documents || vehicle.documents.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '30px', background: '#F8FAFC', borderRadius: '8px', color: '#64748B' }}>
                      <FileText size={32} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                      <p style={{ margin: 0, fontSize: '13px' }}>No documents uploaded yet for this vehicle asset.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {vehicle.documents.map((doc) => (
                        <div
                          key={doc.id}
                          style={{
                            padding: '14px 16px',
                            background: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <strong style={{ fontSize: '13px', color: '#0F172A' }}>
                                {doc.document_type === 'RC'
                                  ? 'Registration Certificate (RC)'
                                  : doc.document_type === 'INSURANCE'
                                  ? 'Motor Insurance Policy'
                                  : doc.document_type === 'PUC'
                                  ? 'Pollution Under Control (PUC)'
                                  : doc.document_type === 'FITNESS'
                                  ? 'Commercial Fitness Certificate'
                                  : 'Carrier Permit'}
                              </strong>
                              {getDocBadge(doc.verification_status)}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                              Doc No: <strong>{doc.document_number}</strong>
                              {doc.expiry_date && (
                                <span style={{ marginLeft: '12px' }}>
                                  Expires: <strong style={{ color: doc.verification_status === 'EXPIRED' ? '#DC2626' : '#0F172A' }}>{formatDate(doc.expiry_date)}</strong>
                                </span>
                              )}
                              {doc.verifier_name && (
                                <span style={{ marginLeft: '12px' }}>
                                  Verified by: {doc.verifier_name}
                                </span>
                              )}
                            </div>
                            {doc.notes && (
                              <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748B' }}>
                                Notes: {doc.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: MAINTENANCE */}
              {activeTab === 'maintenance' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Fleet Maintenance Logs</h4>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => setIsMaintModalOpen(true)}
                    >
                      <Plus size={14} /> Record Service
                    </button>
                  </div>

                  {(!vehicle.maintenance || vehicle.maintenance.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '30px', background: '#F8FAFC', borderRadius: '8px', color: '#64748B' }}>
                      <Wrench size={32} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                      <p style={{ margin: 0, fontSize: '13px' }}>No maintenance records logged for this vehicle.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {vehicle.maintenance.map((m) => (
                        <div
                          key={m.id}
                          style={{
                            padding: '14px 16px',
                            background: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            borderRadius: '8px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <strong style={{ fontSize: '13px', color: '#0F172A' }}>{m.service_type}</strong>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#15803D' }}>
                              {formatCurrency(m.cost)}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                            Service Date: <strong>{formatDate(m.service_date)}</strong> • Odometer:{' '}
                            <strong>{m.odometer_km?.toLocaleString()} KM</strong>
                            {m.service_center && <span> • Workshop: {m.service_center}</span>}
                          </div>
                          {m.description && (
                            <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#334155' }}>
                              {m.description}
                            </p>
                          )}
                          {m.next_service_date && (
                            <div style={{ marginTop: '6px', fontSize: '11px', color: '#0369A1' }}>
                              Next Service Scheduled: <strong>{formatDate(m.next_service_date)}</strong>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: ASSIGNMENTS HISTORY */}
              {activeTab === 'assignments' && (
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 16px 0' }}>
                    Historical Delivery Runs Dispatched
                  </h4>
                  {(!vehicle.assignments || vehicle.assignments.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '30px', background: '#F8FAFC', borderRadius: '8px', color: '#64748B' }}>
                      <Calendar size={32} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                      <p style={{ margin: 0, fontSize: '13px' }}>No operational delivery runs recorded yet.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {vehicle.assignments.map((run: any) => (
                        <div
                          key={run.id}
                          style={{
                            padding: '12px 16px',
                            background: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <strong style={{ fontSize: '13px', color: '#0F172A' }}>{run.run_code}</strong>
                              <Badge variant={run.status === 'COMPLETED' ? 'success' : run.status === 'IN_PROGRESS' ? 'navy' : 'neutral'}>
                                {run.status}
                              </Badge>
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                              Route: <strong>{run.route_name}</strong> • Driver: <strong>{run.driver_name}</strong> ({run.driver_employee_id})
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', fontSize: '12px', color: '#64748B' }}>
                            <div>Date: <strong>{formatDate(run.delivery_date)}</strong></div>
                            <div style={{ fontSize: '11px' }}>{run.completed_stops_count}/{run.planned_stops_count} stops</div>
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

      {/* Sub Modals */}
      {vehicle && (
        <>
          <AddVehicleDocumentModal
            isOpen={isDocModalOpen}
            vehicleId={vehicle.id}
            registrationNumber={vehicle.registration_number}
            onClose={() => setIsDocModalOpen(false)}
            onDocumentAdded={fetchVehicleDetails}
          />
          <AddMaintenanceModal
            isOpen={isMaintModalOpen}
            vehicleId={vehicle.id}
            registrationNumber={vehicle.registration_number}
            currentOdometerKm={vehicle.current_odometer_km}
            onClose={() => setIsMaintModalOpen(false)}
            onMaintenanceAdded={fetchVehicleDetails}
          />
        </>
      )}
    </>
  );
};
