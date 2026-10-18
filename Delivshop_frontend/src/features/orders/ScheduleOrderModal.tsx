import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Truck,
  User,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Boxes,
  ShieldCheck,
  ChevronRight,
  Send,
  X,
  Plus,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { api } from '../../services/api/endpoints';
import { UnscheduledOrderRecord } from '../../types';

interface ScheduleOrderModalProps {
  order: UnscheduledOrderRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onScheduled: () => void;
}

export const ScheduleOrderModal: React.FC<ScheduleOrderModalProps> = ({
  order,
  isOpen,
  onClose,
  onScheduled,
}) => {
  const [activeTab, setActiveTab] = useState<'EXISTING_RUN' | 'CREATE_RUN'>('EXISTING_RUN');
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [deliveryWindow, setDeliveryWindow] = useState<string>('');
  const [publishRunNow, setPublishRunNow] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New Run Creation State
  const [routes, setRoutes] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [newRunDate, setNewRunDate] = useState<string>('');
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [validationResult, setValidationResult] = useState<{ isValid: boolean; errors: string[]; warnings: string[] } | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);

  // Initialize defaults when order changes
  useEffect(() => {
    if (!order) return;
    setErrorMsg(null);
    setNotes('');

    const preferredRun = order.eligible_runs.find((r) => r.fits_order);
    if (preferredRun) {
      setSelectedRunId(preferredRun.delivery_run_id);
      setDeliveryWindow(preferredRun.delivery_window || '06:00 AM - 09:00 AM');
      setPublishRunNow(!preferredRun.is_published);
    } else if (order.eligible_runs[0]) {
      setSelectedRunId(order.eligible_runs[0].delivery_run_id);
      setDeliveryWindow(order.eligible_runs[0].delivery_window || '06:00 AM - 09:00 AM');
      setPublishRunNow(!order.eligible_runs[0].is_published);
    } else {
      setSelectedRunId('');
      setDeliveryWindow('06:00 AM - 09:00 AM');
    }

    // Default new run date to requested delivery date or tomorrow
    if (order.requested_delivery_date) {
      setNewRunDate(order.requested_delivery_date);
    } else {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      setNewRunDate(d.toISOString().slice(0, 10));
    }
  }, [order]);

  // Load resources for "Create New Run"
  useEffect(() => {
    if (!isOpen || activeTab !== 'CREATE_RUN') return;

    let isMounted = true;
    async function loadData() {
      try {
        const [rList, dList, vList] = await Promise.all([
          api.routes.list({ status: 'ACTIVE' }),
          api.deliveries.listAllDrivers({ status: 'ACTIVE' }),
          api.vehicles.list({ status: 'ACTIVE' }),
        ]);

        if (!isMounted) return;
        setRoutes(Array.isArray(rList) ? rList : []);
        setDrivers(Array.isArray(dList) ? dList : []);
        setVehicles(Array.isArray(vList?.data) ? vList.data : (Array.isArray(vList) ? vList : []));

        if (rList?.[0] && !selectedRouteId) setSelectedRouteId(rList[0].id);
      } catch (e) {
        console.warn('Failed to load scheduling resources', e);
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, [isOpen, activeTab]);

  // Real-time conflict validation for new run creation
  useEffect(() => {
    if (activeTab !== 'CREATE_RUN' || !selectedRouteId || !selectedDriverId || !selectedVehicleId || !newRunDate) {
      setValidationResult(null);
      return;
    }

    let isMounted = true;
    async function runValidation() {
      setIsValidating(true);
      try {
        const res = await api.assignments.validate({
          routeId: selectedRouteId,
          driverId: selectedDriverId,
          vehicleId: selectedVehicleId,
          deliveryDate: newRunDate,
        });
        if (isMounted) setValidationResult(res);
      } catch {
        if (isMounted) setValidationResult(null);
      } finally {
        if (isMounted) setIsValidating(false);
      }
    }

    runValidation();
    return () => { isMounted = false; };
  }, [activeTab, selectedRouteId, selectedDriverId, selectedVehicleId, newRunDate]);

  if (!isOpen || !order) return null;

  const handleScheduleExisting = async () => {
    if (!selectedRunId) {
      setErrorMsg('Please select an eligible delivery run.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      // 1. Atomic scheduling transaction
      await api.orders.schedule(order.id, {
        deliveryRunId: selectedRunId,
        deliveryWindow,
        notes: notes.trim() || undefined,
      });

      // 2. Publish run if requested and currently draft
      if (publishRunNow) {
        const chosenRun = order.eligible_runs.find((r) => r.delivery_run_id === selectedRunId);
        if (chosenRun && !chosenRun.is_published) {
          try {
            await api.assignments.publishRun(selectedRunId);
          } catch (pubErr) {
            console.warn('Run publication warning:', pubErr);
          }
        }
      }

      onScheduled();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to schedule order. Please verify capacity and retry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAndSchedule = async () => {
    if (!selectedRouteId || !selectedDriverId || !selectedVehicleId || !newRunDate) {
      setErrorMsg('Please select a route, delivery date, driver, and vehicle.');
      return;
    }

    if (validationResult && !validationResult.isValid) {
      setErrorMsg('Validation conflicts detected. Please resolve driver/vehicle conflicts before proceeding.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      // 1. Create delivery run assignment
      const newRun = await api.assignments.create({
        routeId: selectedRouteId,
        driverId: selectedDriverId,
        vehicleId: selectedVehicleId,
        deliveryDate: newRunDate,
        notes: notes.trim() || 'Created from Unscheduled Orders Queue',
      });

      const newRunId = newRun.id;

      // 2. Publish run if requested
      if (publishRunNow) {
        await api.assignments.publishRun(newRunId);
      }

      // 3. Schedule the order into the new delivery run
      await api.orders.schedule(order.id, {
        deliveryRunId: newRunId,
        deliveryWindow,
        notes: notes.trim() || undefined,
      });

      onScheduled();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to create run and schedule order.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: '#FEF3C7',
                  color: '#92400E',
                  padding: '2px 8px',
                  borderRadius: '12px',
                }}
              >
                UNSCHEDULED ORDER
              </span>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Schedule Order {order.order_number}
              </h3>
            </div>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0 0' }}>
              Allocate confirmed cold-chain delivery run and notify shop owner
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
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

        {/* Scrollable Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Order Snapshot Card */}
          <div
            style={{
              backgroundColor: '#F1F5F9',
              borderRadius: '10px',
              padding: '14px 18px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              border: '1px solid #E2E8F0',
            }}
          >
            <div>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Destination Shop</span>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                {order.shop_name}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>
                {typeof order.shop_address === 'string' ? order.shop_address : `${order.shop_address?.street || ''}, ${order.shop_address?.city || ''}`}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Crates & Volume Required</span>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#047857', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Boxes size={16} />
                <span>{order.total_crates} Milk Crates</span>
              </div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>
                {order.total_volume_litres} Litres • {formatCurrency(order.total)}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Requested Date & Window</span>
              <div style={{ fontSize: '13px', fontWeight: 700, color: order.requested_delivery_date ? '#1E293B' : '#B45309', marginTop: '2px' }}>
                {order.requested_delivery_date ? formatDate(order.requested_delivery_date) : 'No Date Specified'}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>
                Window: {order.delivery_window || 'Standard Morning'}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Queue Waiting Duration</span>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#B45309', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={14} />
                <span>{order.awaiting_time_hours} hours in queue</span>
              </div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>
                Created {formatDate(order.created_at)}
              </div>
            </div>
          </div>

          {/* Mode Switch Tabs */}
          <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('EXISTING_RUN')}
              style={{
                background: 'none',
                border: 'none',
                padding: '6px 12px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                color: activeTab === 'EXISTING_RUN' ? '#047857' : '#64748B',
                borderBottom: activeTab === 'EXISTING_RUN' ? '2px solid #047857' : '2px solid transparent',
              }}
            >
              Eligible Existing Runs ({order.eligible_runs.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('CREATE_RUN')}
              style={{
                background: 'none',
                border: 'none',
                padding: '6px 12px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                color: activeTab === 'CREATE_RUN' ? '#047857' : '#64748B',
                borderBottom: activeTab === 'CREATE_RUN' ? '2px solid #047857' : '2px solid transparent',
              }}
            >
              + Create New Delivery Run & Schedule
            </button>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div
              style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#991B1B',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertTriangle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: Existing Eligible Runs */}
          {activeTab === 'EXISTING_RUN' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>
                Select an upcoming delivery run covering {order.shop_name}'s route:
              </div>

              {order.eligible_runs.length === 0 ? (
                <div
                  style={{
                    padding: '28px',
                    textAlign: 'center',
                    backgroundColor: '#FFFBEB',
                    borderRadius: '10px',
                    border: '1px solid #FDE68A',
                  }}
                >
                  <AlertTriangle size={28} color="#D97706" style={{ margin: '0 auto 8px auto' }} />
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#92400E' }}>
                    No Published Runs Currently Cover This Shop's Route
                  </div>
                  <div style={{ fontSize: '12px', color: '#B45309', marginTop: '4px' }}>
                    Switch to the "Create New Delivery Run" tab to instantiate a run from a route template.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {order.eligible_runs.map((run) => {
                    const isSelected = selectedRunId === run.delivery_run_id;
                    const hasCapacity = run.available_crate_capacity >= order.total_crates;

                    return (
                      <div
                        key={run.delivery_run_id}
                        onClick={() => setSelectedRunId(run.delivery_run_id)}
                        style={{
                          border: isSelected ? '2px solid #047857' : '1px solid #E2E8F0',
                          backgroundColor: isSelected ? '#F0FDF4' : '#FFFFFF',
                          borderRadius: '10px',
                          padding: '14px 16px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.15s ease-in-out',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 800, color: isSelected ? '#047857' : '#0F172A' }}>
                              {run.run_code} • {formatDate(run.delivery_date)}
                            </span>
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: run.is_published ? '#DCFCE7' : '#FEF3C7',
                                color: run.is_published ? '#166534' : '#92400E',
                              }}
                            >
                              {run.is_published ? 'PUBLISHED' : 'DRAFT'}
                            </span>
                            {hasCapacity ? (
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: '#E0F2FE',
                                  color: '#0369A1',
                                }}
                              >
                                {run.available_crate_capacity} crates space left
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: '#FEE2E2',
                                  color: '#991B1B',
                                }}
                              >
                                INSUFFICIENT CAPACITY ({run.available_crate_capacity} left)
                              </span>
                            )}
                          </div>

                          <div style={{ fontSize: '12px', color: '#475569', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                            <span><strong>Route:</strong> {run.route_name}</span>
                            <span><strong>Driver:</strong> {run.driver_name || 'Unassigned'}</span>
                            <span><strong>Vehicle:</strong> {run.vehicle_registration || 'Unassigned'}</span>
                            <span><strong>Window:</strong> {run.delivery_window}</span>
                          </div>
                        </div>

                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            border: isSelected ? '5px solid #047857' : '2px solid #CBD5E1',
                            backgroundColor: '#FFFFFF',
                            marginLeft: '12px',
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Create New Run & Schedule */}
          {activeTab === 'CREATE_RUN' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Route Template:
                  </label>
                  <select
                    value={selectedRouteId}
                    onChange={(e) => setSelectedRouteId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <option value="">Select Route Template...</option>
                    {routes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.route_code || r.code}) - {r.city}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Scheduled Delivery Date:
                  </label>
                  <input
                    type="date"
                    value={newRunDate}
                    onChange={(e) => setNewRunDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Assigned Eligible Driver:
                  </label>
                  <select
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <option value="">Select Driver...</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.phone ? `(${d.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Assigned Vehicle (Cold-Chain Verified):
                  </label>
                  <select
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <option value="">Select Vehicle...</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.registration_number || v.registrationNumber} - {v.model} ({v.crate_capacity || v.crateCapacity || 40} crates)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Conflict Validation Feedback */}
              {isValidating ? (
                <div style={{ fontSize: '11px', color: '#64748B' }}>Validating driver conflicts & vehicle compliance...</div>
              ) : validationResult ? (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: validationResult.isValid ? '#F0FDF4' : '#FEF2F2',
                    border: `1px solid ${validationResult.isValid ? '#BBF7D0' : '#FECACA'}`,
                    fontSize: '12px',
                  }}
                >
                  <div style={{ fontWeight: 700, color: validationResult.isValid ? '#166534' : '#991B1B' }}>
                    {validationResult.isValid ? '✓ Resource Assignment Validated' : '⚠ Scheduling Conflicts Detected'}
                  </div>
                  {validationResult.errors.map((e, idx) => (
                    <div key={idx} style={{ color: '#DC2626', marginTop: '2px' }}>• {e}</div>
                  ))}
                  {validationResult.warnings.map((w, idx) => (
                    <div key={idx} style={{ color: '#D97706', marginTop: '2px' }}>• {w}</div>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {/* Delivery Window & Audit Notes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px', marginTop: '4px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                Delivery Time Window:
              </label>
              <input
                type="text"
                value={deliveryWindow}
                onChange={(e) => setDeliveryWindow(e.target.value)}
                placeholder="06:00 AM - 09:00 AM"
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                Scheduling Notes (Preserved in Audit Log):
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Prioritized early morning drop per shop request"
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                }}
              />
            </div>
          </div>

          {/* Confirmation & Publication Option */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#F8FAFC',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
            }}
          >
            <input
              type="checkbox"
              id="chk-publish-run"
              checked={publishRunNow}
              onChange={(e) => setPublishRunNow(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#047857' }}
            />
            <label htmlFor="chk-publish-run" style={{ fontSize: '12px', fontWeight: 600, color: '#1E293B', cursor: 'pointer' }}>
              Publish Run Immediately & Send Confirmed Delivery Date Notification to Shop Owner
            </label>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC',
          }}
        >
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>

          <Button
            variant="primary"
            onClick={activeTab === 'EXISTING_RUN' ? handleScheduleExisting : handleCreateAndSchedule}
            disabled={submitting || (activeTab === 'EXISTING_RUN' && !selectedRunId)}
            style={{ backgroundColor: '#047857', borderColor: '#047857', fontWeight: 700 }}
          >
            {submitting ? 'Processing Allocation...' : 'Confirm Delivery Schedule →'}
          </Button>
        </div>
      </div>
    </div>
  );
};
