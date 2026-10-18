import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, Truck, User, Navigation, Calendar, Clock, 
  CheckCircle2, AlertTriangle, AlertCircle, Phone, 
  MapPin, RefreshCw, Check, ShieldCheck, ChevronRight,
  Package, FileText, Ban, PlayCircle, Trash2,
  Building2, ChevronDown, ExternalLink
} from 'lucide-react';
import { api } from '../../services/api/endpoints';
import {
  DeliveryRun,
  DeliveryRunStop,
  PickupRequirementsResponse,
  AggregatedPickupProduct,
  CompanyPickupStop,
  PickupProductItem,
  PickupShopContribution,
} from '../../types';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { formatDate } from '../../utils/formatters';
import { useAuth } from '../../hooks/useAuth';
import { DeleteAssignmentModal } from './DeleteAssignmentModal';

interface AssignmentDetailsDrawerProps {
  runId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onRunUpdated: () => void;
}

export const AssignmentDetailsDrawer: React.FC<AssignmentDetailsDrawerProps> = ({
  runId,
  isOpen,
  onClose,
  onRunUpdated,
}) => {
  const [run, setRun] = useState<DeliveryRun | null>(null);
  const [pickupRequirements, setPickupRequirements] = useState<PickupRequirementsResponse | null>(null);
  const [pickupLoading, setPickupLoading] = useState(false);
  const [expandedShopProduct, setExpandedShopProduct] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Stop update modal state
  const [selectedStop, setSelectedStop] = useState<DeliveryRunStop | null>(null);
  const [stopActionType, setStopActionType] = useState<'DELIVERED' | 'FAILED' | null>(null);
  const [recipientName, setRecipientName] = useState('');
  const [stopNotes, setStopNotes] = useState('');
  const [deliveredCrates, setDeliveredCrates] = useState<number>(0);
  const [returnedCrates, setReturnedCrates] = useState<number>(0);
  const [failureReason, setFailureReason] = useState('');

  // Cancel run confirmation dialog
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [cancelNotes, setCancelNotes] = useState('');

  // Delete / Archive assignment modal state
  const { user } = useAuth();
  const canDeleteAssignment = user?.role === 'ADMIN' || user?.role === 'SUPPLIER';
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleAssignmentDeleted = (msg: string) => {
    showToast(msg);
    onRunUpdated();
    onClose();
  };

  const loadRunDetails = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res: any = await api.assignments.get(id);
      const data = res?.data || res;
      setRun(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to retrieve delivery assignment details');
    } finally {
      setLoading(false);
    }

    // Load pickup requirements automatically
    try {
      setPickupLoading(true);
      const pRes: any = await api.assignments.getPickupRequirements(id);
      const pData = pRes?.data || pRes;
      setPickupRequirements(pData);
    } catch (pErr: any) {
      console.warn('Could not load pickup requirements for run:', pErr?.message);
      setPickupRequirements(null);
    } finally {
      setPickupLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && runId) {
      loadRunDetails(runId);
    } else {
      setRun(null);
      setPickupRequirements(null);
      setError(null);
    }
  }, [isOpen, runId, loadRunDetails]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (selectedStop) {
          setSelectedStop(null);
        } else if (isCancelConfirmOpen) {
          setIsCancelConfirmOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedStop, isCancelConfirmOpen, onClose]);

  const handleUpdateRunStatus = async (newStatus: string, notes?: string) => {
    if (!run) return;
    setActionLoading(true);
    try {
      const res: any = await api.assignments.updateStatus(run.id, newStatus, notes);
      const data = res?.data || res;
      setRun(data);
      onRunUpdated();
      showToast(`Run transitioned to ${newStatus}`);
      if (newStatus === 'CANCELLED') {
        setIsCancelConfirmOpen(false);
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to update run status', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStopStatus = async (status: 'ARRIVED' | 'DELIVERED' | 'FAILED') => {
    if (!run || !selectedStop) return;
    setActionLoading(true);
    try {
      const seq = selectedStop.stop_sequence !== undefined 
        ? selectedStop.stop_sequence 
        : (selectedStop.sequenceIndex !== undefined ? selectedStop.sequenceIndex : 0);

      await api.assignments.updateStopStatus(run.id, seq, {
        status,
        recipientName: recipientName.trim() || undefined,
        notes: stopNotes.trim() || undefined,
        deliveredCratesCount: deliveredCrates > 0 ? deliveredCrates : undefined,
        returnedCratesCount: returnedCrates > 0 ? returnedCrates : undefined,
        failureReason: failureReason.trim() || undefined,
      });

      setSelectedStop(null);
      setStopActionType(null);
      setRecipientName('');
      setStopNotes('');
      setDeliveredCrates(0);
      setReturnedCrates(0);
      setFailureReason('');
      showToast(`Stop marked as ${status}`);
      await loadRunDetails(run.id);
      onRunUpdated();
    } catch (err: any) {
      showToast(err?.message || 'Failed to update stop status', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  const completedStops = run ? (run.completed_stops_count ?? run.completedStopsCount ?? 0) : 0;
  const plannedStops = run ? (run.planned_stops_count ?? run.totalStopsCount ?? 0) : 0;
  const progressPercent = plannedStops > 0 ? Math.round((completedStops / plannedStops) * 100) : 0;

  const getRunBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="success">Completed</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="info">In Progress (Transit)</Badge>;
      case 'ASSIGNED':
      case 'READY':
        return <Badge variant="navy">Ready for Dispatch</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger">Cancelled</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const getStopBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return <Badge variant="success">Delivered</Badge>;
      case 'ARRIVED':
        return <Badge variant="info">Arrived at Shop</Badge>;
      case 'FAILED':
        return <Badge variant="danger">Failed</Badge>;
      case 'SKIPPED':
        return <Badge variant="warning">Skipped</Badge>;
      default:
        return <Badge variant="neutral">Pending</Badge>;
    }
  };

  return (
    <>
      {/* Toast */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 1400,
            padding: '10px 16px',
            borderRadius: '8px',
            backgroundColor: toastMessage.type === 'success' ? 'var(--color-navy)' : 'var(--color-danger)',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.2s ease-in-out',
          }}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 size={16} color="var(--color-success)" /> : <AlertCircle size={16} color="#FECACA" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Drawer Backdrop */}
      <div 
        className="drawer-backdrop" 
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(6, 78, 59, 0.55)',
          backdropFilter: 'blur(3px)',
          zIndex: 1200,
        }}
      />

      {/* Drawer Panel */}
      <div
        className="drawer-panel"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '740px',
          maxWidth: '92vw',
          backgroundColor: '#FFFFFF',
          zIndex: 1201,
          boxShadow: '-8px 0 25px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #D6D3C8',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-primary-subtle)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Navigation size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <code
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: '13px',
                    color: 'var(--color-primary)',
                    backgroundColor: 'var(--color-primary-subtle)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    border: '1px solid #6EE7B7',
                  }}
                >
                  {run?.run_code || run?.runCode || 'RUN-RECORD'}
                </code>
                {run && getRunBadge(run.status)}
              </div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0 0 0' }}>
                {run?.route_name || run?.routeName || 'Delivery Run Details'}
              </h2>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => runId && loadRunDetails(runId)}
              disabled={loading}
              title="Refresh details"
            >
              <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
            </Button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                padding: '6px',
                cursor: 'pointer',
                color: '#64748B',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Close drawer (Esc)"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Action Toolbar for Run Status Transitions */}
        {run && (
          <div
            style={{
              padding: '12px 24px',
              backgroundColor: '#FFFFFF',
              borderBottom: '1px solid #D6D3C8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Operational Actions:</span>
              {run.status === 'ASSIGNED' && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => handleUpdateRunStatus('IN_PROGRESS')}
                  disabled={actionLoading}
                  icon={<PlayCircle size={15} />}
                >
                  Start Delivery Run
                </Button>
              )}
              {run.status === 'IN_PROGRESS' && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => handleUpdateRunStatus('COMPLETED')}
                  disabled={actionLoading}
                  icon={<CheckCircle2 size={15} />}
                >
                  Mark Run Completed
                </Button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {run.status !== 'COMPLETED' && run.status !== 'CANCELLED' && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsCancelConfirmOpen(true)}
                  disabled={actionLoading}
                  icon={<Ban size={14} />}
                >
                  Cancel Run
                </Button>
              )}

              {canDeleteAssignment && (
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => setIsDeleteModalOpen(true)}
                  disabled={actionLoading}
                  icon={<Trash2 size={14} />}
                >
                  Delete Assignment
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Drawer Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', backgroundColor: '#F8FAFC' }}>
          {loading ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748B' }}>
              <RefreshCw size={28} className="spin-icon" style={{ margin: '0 auto 12px auto' }} />
              <p style={{ fontSize: '13.5px', fontWeight: 600 }}>Loading delivery run details...</p>
            </div>
          ) : error ? (
            <div
              style={{
                padding: '20px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                color: '#991B1B',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 4px 0' }}>Unable to load assignment</h4>
                <p style={{ fontSize: '13px', margin: 0 }}>{error}</p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => runId && loadRunDetails(runId)}
                  style={{ marginTop: '12px' }}
                >
                  Retry Loading
                </Button>
              </div>
            </div>
          ) : run ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Trip Progression Card */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  padding: '18px 20px',
                  border: '1px solid #D6D3C8',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Package size={16} color="var(--color-primary)" />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Trip Drops Progression
                    </span>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)' }}>
                    {completedStops} of {plannedStops} Stops Completed ({progressPercent}%)
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: '#D6D3C8', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      backgroundColor: progressPercent === 100 ? 'var(--color-success)' : 'var(--color-primary)',
                      width: `${progressPercent}%`,
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>

              {/* 3-Column Resource Info Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                
                {/* 1. Driver Card */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '10px',
                    padding: '16px',
                    border: '1px solid #D6D3C8',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                    <User size={14} />
                    <span>Assigned Driver</span>
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {run.driver_name || run.driverName || 'Unassigned'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-primary)', fontFamily: 'monospace', fontWeight: 600, marginTop: '2px' }}>
                    ID: {(run as any).driver_employee_id || 'DRV-N/A'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Phone size={12} />
                    <span>{run.driver_phone || run.driverPhone || 'No phone'}</span>
                  </div>
                </div>

                {/* 2. Vehicle Card */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '10px',
                    padding: '16px',
                    border: '1px solid #D6D3C8',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                    <Truck size={14} />
                    <span>Fleet Vehicle</span>
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '14px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                    {run.vehicle_registration || run.registrationNumber || 'Unallocated'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                    {run.vehicle_type || run.vehicleType || 'Commercial Van'}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>
                    Capacity: <strong>{run.capacity_crates || 60}</strong> crates
                    {run.is_refrigerated && (
                      <span style={{ marginLeft: '6px', color: 'var(--color-primary)', fontWeight: 600 }}>• Cold Chain</span>
                    )}
                  </div>
                </div>

                {/* 3. Schedule & Route Card */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '10px',
                    padding: '16px',
                    border: '1px solid #D6D3C8',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                    <Calendar size={14} />
                    <span>Schedule & Depot</span>
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {run.delivery_date ? formatDate(run.delivery_date) : 'Today'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                    Depot: {run.route_depot || 'Pune Central'}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>
                    Distance: <strong>{run.total_distance_km || '—'} km</strong>
                  </div>
                </div>

              </div>

              {/* PART G: Supplier Pickups & Product Quantities (Calculated Automatically) */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid #D6D3C8',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #D6D3C8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#F0FDF4',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: '#059669',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Building2 size={20} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#065F46', margin: 0 }}>
                          Supplier Pickups & Required Quantities
                        </h3>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: '#D1FAE5',
                            color: '#065F46',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            border: '1px solid #6EE7B7',
                          }}
                        >
                          Auto-Calculated Backend Totals
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: '#047857', margin: '2px 0 0 0' }}>
                        Authoritatively aggregated from eligible orders for shops on this delivery run
                      </p>
                    </div>
                  </div>

                  {pickupRequirements && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ textAlign: 'right', fontSize: '12px' }}>
                        <div style={{ fontWeight: 700, color: '#1E293B' }}>
                          {pickupRequirements.completedPickups} / {pickupRequirements.totalPickups} Suppliers Collected
                        </div>
                        <div style={{ color: '#64748B' }}>
                          {pickupRequirements.totalCollectedUnits} / {pickupRequirements.totalRequiredUnits} Total Units
                        </div>
                      </div>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          border: '3px solid #10B981',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 800,
                          color: '#047857',
                          backgroundColor: '#FFFFFF',
                        }}
                      >
                        {pickupRequirements.totalRequiredUnits > 0
                          ? Math.round((pickupRequirements.totalCollectedUnits / pickupRequirements.totalRequiredUnits) * 100)
                          : 0}%
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {pickupLoading ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: '#64748B' }}>
                      <RefreshCw size={22} className="spin-icon" style={{ margin: '0 auto 8px auto' }} />
                      <p style={{ fontSize: '13px', margin: 0 }}>Calculating supplier pickup quantities from route orders...</p>
                    </div>
                  ) : !pickupRequirements || pickupRequirements.supplierPickups.length === 0 ? (
                    <div
                      style={{
                        padding: '24px',
                        textAlign: 'center',
                        backgroundColor: '#F8FAFC',
                        borderRadius: '8px',
                        border: '1px dashed #CBD5E1',
                        color: '#64748B',
                      }}
                    >
                      <Package size={28} style={{ margin: '0 auto 8px auto', opacity: 0.6 }} />
                      <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>
                        No Supplier Pickups Required
                      </div>
                      <p style={{ fontSize: '12.5px', margin: '4px 0 0 0' }}>
                        No products from active supplier companies are ordered by the shops mapped to this delivery run.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* 1. Route-Wide Aggregated Totals Summary */}
                      {pickupRequirements.aggregatedProducts && pickupRequirements.aggregatedProducts.length > 0 && (
                        <div
                          style={{
                            padding: '14px 16px',
                            backgroundColor: '#F8FAFC',
                            borderRadius: '8px',
                            border: '1px solid #E2E8F0',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Route-Wide Aggregated Product Demand ({pickupRequirements.aggregatedProducts.length} Products)
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748B' }}>
                              Summed across all supplying companies
                            </span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                            {pickupRequirements.aggregatedProducts.map((agg: AggregatedPickupProduct) => (
                              <div
                                key={agg.productId}
                                style={{
                                  padding: '10px 12px',
                                  backgroundColor: '#FFFFFF',
                                  borderRadius: '6px',
                                  border: '1px solid #CBD5E1',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                }}
                              >
                                <div>
                                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>
                                    {agg.productName}
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                                    {agg.productSku || 'SKU-—'}
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#047857' }}>
                                    {agg.totalRequiredQuantity} <span style={{ fontSize: '11px', fontWeight: 500 }}>{agg.unit}</span>
                                  </div>
                                  <div style={{ fontSize: '10.5px', color: agg.totalOutstandingQuantity > 0 ? '#D97706' : '#059669' }}>
                                    {agg.totalCollectedQuantity} collected
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 2. Breakdown per Supplier Company */}
                      {pickupRequirements.supplierPickups.map((supplier: CompanyPickupStop) => (
                        <div
                          key={supplier.companyId}
                          style={{
                            border: '1px solid #E2E8F0',
                            borderRadius: '8px',
                            backgroundColor: '#FFFFFF',
                            overflow: 'hidden',
                          }}
                        >
                          {/* Supplier Header */}
                          <div
                            style={{
                              padding: '14px 16px',
                              backgroundColor: '#F8FAFC',
                              borderBottom: '1px solid #E2E8F0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '10px',
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: '#0F172A' }}>
                                  {supplier.companyName}
                                </h4>
                                {supplier.companyCode && (
                                  <code
                                    style={{
                                      fontSize: '11px',
                                      backgroundColor: '#E2E8F0',
                                      padding: '1px 5px',
                                      borderRadius: '4px',
                                      color: '#334155',
                                    }}
                                  >
                                    {supplier.companyCode}
                                  </code>
                                )}
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '10px',
                                    backgroundColor:
                                      supplier.status === 'COLLECTED'
                                        ? '#D1FAE5'
                                        : supplier.status === 'ARRIVED'
                                        ? '#DBEAFE'
                                        : supplier.status === 'SHORTAGE'
                                        ? '#FEE2E2'
                                        : '#F1F5F9',
                                    color:
                                      supplier.status === 'COLLECTED'
                                        ? '#065F46'
                                        : supplier.status === 'ARRIVED'
                                        ? '#1E40AF'
                                        : supplier.status === 'SHORTAGE'
                                        ? '#991B1B'
                                        : '#475569',
                                  }}
                                >
                                  {supplier.status}
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <MapPin size={13} color="#059669" />
                                  <span>{supplier.addressLine1 ? `${supplier.addressLine1}, ${supplier.city || ''}` : (supplier.companyAddress || 'No address registered')}</span>
                                </div>
                                {supplier.phone && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Phone size={13} />
                                    <span>{supplier.phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* GPS Proximity Anchor Status */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {supplier.hasCoordinates ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span
                                    style={{
                                      fontSize: '11px',
                                      backgroundColor: '#ECFDF5',
                                      color: '#065F46',
                                      padding: '3px 8px',
                                      borderRadius: '6px',
                                      border: '1px solid #A7F3D0',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontWeight: 600,
                                    }}
                                  >
                                    <ShieldCheck size={13} color="#059669" />
                                    300m Proximity Active ({Number(supplier.latitude).toFixed(4)}, {Number(supplier.longitude).toFixed(4)})
                                  </span>
                                  <a
                                    href={`https://www.google.com/maps?q=${supplier.latitude},${supplier.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: '#0284C7', display: 'flex', alignItems: 'center' }}
                                    title="Open coordinates in Google Maps"
                                  >
                                    <ExternalLink size={14} />
                                  </a>
                                </div>
                              ) : (
                                <span
                                  style={{
                                    fontSize: '11px',
                                    backgroundColor: '#FEF3C7',
                                    color: '#92400E',
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    border: '1px solid #FCD34D',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontWeight: 600,
                                  }}
                                >
                                  <AlertTriangle size={13} color="#D97706" />
                                  ⚠️ GPS Missing — Proximity Check Blocked
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Products Table for this Supplier */}
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                              <thead>
                                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600 }}>Product & SKU</th>
                                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600 }}>Unit</th>
                                  <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>Required Qty</th>
                                  <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>Collected</th>
                                  <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>Outstanding</th>
                                  <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600 }}>Pickup Status</th>
                                  <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600 }}>Contributing Shops</th>
                                </tr>
                              </thead>
                              <tbody>
                                {supplier.products.map((item: any) => {
                                  const isExpanded = expandedShopProduct === `${supplier.companyId}-${item.productId}`;
                                  const shopCount = item.shopContributions?.length || 0;

                                  return (
                                    <React.Fragment key={item.productId}>
                                      <tr
                                        style={{
                                          borderBottom: '1px solid #F1F5F9',
                                          backgroundColor: item.isCollected ? '#F0FDF4' : 'transparent',
                                        }}
                                      >
                                        <td style={{ padding: '12px 14px' }}>
                                          <div style={{ fontWeight: 600, color: '#1E293B' }}>{item.productName}</div>
                                          {item.productSku && (
                                            <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                                              {item.productSku}
                                            </div>
                                          )}
                                        </td>
                                        <td style={{ padding: '12px 14px', color: '#475569' }}>
                                          {item.unit}
                                        </td>
                                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#047857' }}>
                                          {item.requiredQuantity}
                                        </td>
                                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: item.collectedQuantity > 0 ? '#059669' : '#94A3B8' }}>
                                          {item.collectedQuantity}
                                        </td>
                                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: item.outstandingQuantity > 0 ? '#D97706' : '#059669' }}>
                                          {item.outstandingQuantity}
                                        </td>
                                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                          <span
                                            style={{
                                              fontSize: '11px',
                                              fontWeight: 600,
                                              padding: '2px 8px',
                                              borderRadius: '6px',
                                              backgroundColor: item.isCollected ? '#D1FAE5' : '#F1F5F9',
                                              color: item.isCollected ? '#065F46' : '#64748B',
                                            }}
                                          >
                                            {item.isCollected ? 'Collected' : 'Pending'}
                                          </span>
                                        </td>
                                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                          {shopCount > 0 ? (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setExpandedShopProduct(
                                                  isExpanded ? null : `${supplier.companyId}-${item.productId}`
                                                )
                                              }
                                              style={{
                                                padding: '4px 8px',
                                                fontSize: '11.5px',
                                                borderRadius: '6px',
                                                border: '1px solid #CBD5E1',
                                                backgroundColor: isExpanded ? '#1E3A8A' : '#FFFFFF',
                                                color: isExpanded ? '#FFFFFF' : '#334155',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                fontWeight: 500,
                                              }}
                                            >
                                              <span>{shopCount} {shopCount === 1 ? 'Shop' : 'Shops'}</span>
                                              <ChevronDown
                                                size={13}
                                                style={{
                                                  transform: isExpanded ? 'rotate(180deg)' : 'none',
                                                  transition: 'transform 0.15s ease',
                                                }}
                                              />
                                            </button>
                                          ) : (
                                            <span style={{ fontSize: '11px', color: '#94A3B8' }}>—</span>
                                          )}
                                        </td>
                                      </tr>

                                      {/* Expanded Shop Breakdown Row */}
                                      {isExpanded && item.shopContributions && (
                                        <tr style={{ backgroundColor: '#F8FAFC' }}>
                                          <td colSpan={7} style={{ padding: '12px 20px', borderBottom: '1px solid #E2E8F0' }}>
                                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                                              Orders Requiring "{item.productName}":
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '8px' }}>
                                              {item.shopContributions.map((sc: any, scIdx: number) => (
                                                <div
                                                  key={sc.orderId || scIdx}
                                                  style={{
                                                    padding: '8px 12px',
                                                    backgroundColor: '#FFFFFF',
                                                    borderRadius: '6px',
                                                    border: '1px solid #CBD5E1',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                  }}
                                                >
                                                  <div>
                                                    <div style={{ fontWeight: 600, color: '#1E293B' }}>{sc.shopName}</div>
                                                    <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                                                      Order: {sc.orderCode || sc.orderId.substring(0, 8)}
                                                    </div>
                                                  </div>
                                                  <div style={{ fontWeight: 700, color: '#047857', fontSize: '13px' }}>
                                                    {sc.quantity} {item.unit}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </td>
                                        </tr>
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Delivery Stops List */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid #D6D3C8',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '14px 20px',
                    borderBottom: '1px solid #D6D3C8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#FAFAFA',
                  }}
                >
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    Scheduled Route Stops & Drops ({run.stops?.length || 0})
                  </h3>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>
                    Optimal delivery sequence
                  </span>
                </div>

                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(!run.stops || run.stops.length === 0) ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                      No stops mapped to this assignment run.
                    </div>
                  ) : (
                    run.stops.map((stop, index) => {
                      const seqNum = (stop.stop_sequence !== undefined ? stop.stop_sequence : stop.sequenceIndex ?? index) + 1;
                      
                      return (
                        <div
                          key={stop.id || index}
                          style={{
                            padding: '14px 16px',
                            borderRadius: '8px',
                            border: '1px solid #D6D3C8',
                            backgroundColor: stop.status === 'DELIVERED' ? '#F0FDF4' : '#FFFFFF',
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: '14px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <div
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                backgroundColor: stop.status === 'DELIVERED' 
                                  ? 'var(--color-success)' 
                                  : (stop.status === 'ARRIVED' ? 'var(--color-primary)' : '#64748B'),
                                color: '#FFFFFF',
                                fontWeight: 700,
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                marginTop: '2px',
                              }}
                            >
                              {stop.status === 'DELIVERED' ? <Check size={14} /> : seqNum}
                            </div>

                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                                  {stop.shop_name || stop.shopName || `Shop #${(stop.shop_id || '').slice(0, 8)}`}
                                </h4>
                                {getStopBadge(stop.status)}
                              </div>

                              <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <MapPin size={12} />
                                <span>{stop.shop_address || stop.address || 'Registered shop address'}</span>
                              </p>

                              {(stop.delivery_contact_name || stop.delivery_contact_phone) && (
                                <p style={{ fontSize: '11.5px', color: '#475569', margin: '4px 0 0 0' }}>
                                  Contact: {stop.delivery_contact_name || 'Storekeeper'} ({stop.delivery_contact_phone || '—'})
                                </p>
                              )}

                              {((stop as any).recipient_name || stop.recipientName) && (
                                <p style={{ fontSize: '11.5px', color: '#15803D', margin: '4px 0 0 0', fontWeight: 600 }}>
                                  Received by: {(stop as any).recipient_name || stop.recipientName}
                                  {(stop as any).delivered_crates_count ? ` • ${(stop as any).delivered_crates_count} crates delivered` : ''}
                                  {(stop as any).returned_crates_count ? ` • ${(stop as any).returned_crates_count} empty crates returned` : ''}
                                </p>
                              )}

                              {stop.failure_reason && (
                                <p style={{ fontSize: '11.5px', color: 'var(--color-danger)', margin: '4px 0 0 0', fontWeight: 600 }}>
                                  Exception: {stop.failure_reason}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons for Stop */}
                          {run.status === 'IN_PROGRESS' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                              {stop.status === 'PENDING' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedStop(stop);
                                    handleUpdateStopStatus('ARRIVED');
                                  }}
                                  className="btn btn-secondary"
                                  style={{ height: '28px', padding: '0 10px', fontSize: '11.5px', fontWeight: 600 }}
                                >
                                  Mark Arrived
                                </button>
                              )}
                              {stop.status !== 'DELIVERED' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedStop(stop);
                                    setStopActionType('DELIVERED');
                                  }}
                                  className="btn btn-primary"
                                  style={{ height: '28px', padding: '0 10px', fontSize: '11.5px', fontWeight: 600 }}
                                >
                                  Complete Drop
                                </button>
                              )}
                              {stop.status !== 'DELIVERED' && stop.status !== 'FAILED' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedStop(stop);
                                    setStopActionType('FAILED');
                                  }}
                                  className="btn btn-outline-danger"
                                  style={{ height: '28px', padding: '0 8px', fontSize: '11.5px', color: 'var(--color-danger)', border: '1px solid #FECACA', background: '#FFF5F5', borderRadius: '6px', cursor: 'pointer' }}
                                >
                                  Report Issue
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          ) : null}
        </div>

        {/* Drawer Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #D6D3C8',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '12px', color: '#94A3B8' }}>
            ID: <code style={{ fontFamily: 'monospace' }}>{run?.id}</code>
          </span>
          <Button variant="secondary" onClick={onClose}>
            Close Details
          </Button>
        </div>
      </div>

      {/* Stop Completion Modal */}
      {selectedStop && stopActionType && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(6, 78, 59, 0.65)',
            zIndex: 1300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              border: '1px solid #D6D3C8',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {stopActionType === 'DELIVERED' ? 'Confirm Stop Delivery' : 'Record Delivery Exception'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setSelectedStop(null);
                  setStopActionType(null);
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '12.5px', color: '#64748B', margin: '0 0 16px 0' }}>
              Recording delivery event for <strong>{selectedStop.shop_name || selectedStop.shopName}</strong>
            </p>

            {stopActionType === 'DELIVERED' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Recipient / Storekeeper Name *
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="e.g. Ramesh Patil"
                    className="toolbar-search-input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      Crates Delivered
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={deliveredCrates}
                      onChange={(e) => setDeliveredCrates(parseInt(e.target.value) || 0)}
                      className="toolbar-search-input"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      Crates Returned
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={returnedCrates}
                      onChange={(e) => setReturnedCrates(parseInt(e.target.value) || 0)}
                      className="toolbar-search-input"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Delivery Notes
                  </label>
                  <textarea
                    rows={2}
                    value={stopNotes}
                    onChange={(e) => setStopNotes(e.target.value)}
                    placeholder="Optional notes or remarks"
                    className="toolbar-search-input"
                    style={{ width: '100%', height: 'auto', padding: '8px' }}
                  />
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Failure Reason / Issue *
                  </label>
                  <select
                    value={failureReason}
                    onChange={(e) => setFailureReason(e.target.value)}
                    className="toolbar-select-field"
                    style={{ width: '100%' }}
                  >
                    <option value="">Select reason...</option>
                    <option value="Shop closed / No storekeeper present">Shop closed / No storekeeper present</option>
                    <option value="Storekeeper refused delivery">Storekeeper refused delivery</option>
                    <option value="Address unreachable / Road blocked">Address unreachable / Road blocked</option>
                    <option value="Damaged crates or cold chain break">Damaged crates or cold chain break</option>
                    <option value="Payment / Order dispute">Payment / Order dispute</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Operational Notes
                  </label>
                  <textarea
                    rows={2}
                    value={stopNotes}
                    onChange={(e) => setStopNotes(e.target.value)}
                    placeholder="Provide additional details regarding the incident"
                    className="toolbar-search-input"
                    style={{ width: '100%', height: 'auto', padding: '8px' }}
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <Button
                variant="secondary"
                onClick={() => {
                  setSelectedStop(null);
                  setStopActionType(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant={stopActionType === 'DELIVERED' ? 'primary' : 'danger'}
                onClick={() => handleUpdateStopStatus(stopActionType)}
                disabled={actionLoading || (stopActionType === 'FAILED' && !failureReason)}
              >
                {actionLoading ? 'Updating...' : (stopActionType === 'DELIVERED' ? 'Confirm Delivery' : 'Save Exception')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Run Dialog */}
      {isCancelConfirmOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(6, 78, 59, 0.65)',
            zIndex: 1300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              border: '1px solid #FECACA',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <AlertTriangle size={22} color="var(--color-danger)" />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-danger)', margin: 0 }}>
                Cancel Assignment Run?
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              Are you sure you want to cancel run <strong>{run?.run_code || run?.runCode}</strong>? This will release the allocated vehicle and assigned driver back to the pool.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Cancellation Reason
              </label>
              <input
                type="text"
                placeholder="e.g. Depot operational delay, route rescheduling"
                value={cancelNotes}
                onChange={(e) => setCancelNotes(e.target.value)}
                className="toolbar-search-input"
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button variant="secondary" onClick={() => setIsCancelConfirmOpen(false)}>
                Nevermind
              </Button>
              <Button
                variant="danger"
                onClick={() => handleUpdateRunStatus('CANCELLED', cancelNotes)}
                disabled={actionLoading}
              >
                {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete / Archive Assignment Modal */}
      <DeleteAssignmentModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        run={run}
        onDeleted={handleAssignmentDeleted}
      />
    </>
  );
};

