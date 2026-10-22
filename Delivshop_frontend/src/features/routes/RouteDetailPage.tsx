import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Truck,
  ShieldCheck,
  AlertCircle,
  Pencil,
  Trash2,
  Building2,
  Package,
  RefreshCw,
  Phone,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  Power,
  FileText,
  History,
  Calendar,
  Layers,
  Play,
  Flag,
} from 'lucide-react';
import { api } from '../../services/api/endpoints';
import { Route, DeliveryRun, PickupRequirementsResponse, RouteStop, RouteVersion } from '../../types';
import { useNavigation } from '../../context/NavigationContext';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { formatDate } from '../../utils/formatters';
import { EditRouteModal } from './EditRouteModal';
import { DeleteRouteModal } from './DeleteRouteModal';

interface RouteDetailPageProps {
  routeId: string;
}

type TabType = 'overview' | 'stops' | 'assignments' | 'history';

export const RouteDetailPage: React.FC<RouteDetailPageProps> = ({ routeId }) => {
  const { navigate } = useNavigation();

  const [route, setRoute] = useState<Route | null>(null);
  const [runs, setRuns] = useState<DeliveryRun[]>([]);
  const [pickupRequirements, setPickupRequirements] = useState<PickupRequirementsResponse | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [savingStops, setSavingStops] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  // Actions menu dropdown state
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
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

  const fetchRouteData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res: any = await api.routes.get(routeId);
      const routeData = res?.data || res;
      setRoute(routeData);

      // Runs history for this route
      try {
        const runsRes: any = await api.assignments.list({ routeId });
        const runsList = Array.isArray(runsRes) ? runsRes : runsRes?.data || [];
        setRuns(runsList);
      } catch {
        setRuns([]);
      }

      // Pickup requirements
      try {
        const pRes: any = await api.routes.getPickupRequirements(routeId);
        setPickupRequirements(pRes?.data || pRes);
      } catch {
        setPickupRequirements(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load route details');
    } finally {
      setLoading(false);
    }
  }, [routeId]);

  useEffect(() => {
    fetchRouteData();
  }, [fetchRouteData]);

  // Status transitions
  const handlePublish = async () => {
    if (!route || publishing) return;
    const stopsCount = route.stops?.length ?? (route as any).stops_count ?? 0;
    if (stopsCount === 0) {
      showToast('Cannot publish route with 0 stops. Please add stops first.', 'error');
      return;
    }

    setPublishing(true);
    try {
      const res: any = await api.routes.update(route.id, { status: 'PUBLISHED' });
      const updated = res?.data || res;
      setRoute((prev) => (prev ? { ...prev, ...updated, status: 'PUBLISHED' } : updated));
      showToast(`Route ${updated.route_code || ''} published successfully!`);
    } catch (err: any) {
      showToast(err?.message || 'Failed to publish route', 'error');
    } finally {
      setPublishing(false);
    }
  };

  const handleToggleStatus = async (newStatus: 'ACTIVE' | 'INACTIVE') => {
    if (!route) return;
    try {
      const res: any = await api.routes.update(route.id, { status: newStatus });
      const updated = res?.data || res;
      setRoute((prev) => (prev ? { ...prev, ...updated, status: newStatus } : updated));
      showToast(`Route is now ${newStatus === 'ACTIVE' ? 'Active' : 'Inactive'}`);
    } catch (err: any) {
      showToast(err?.message || 'Failed to update route status', 'error');
    }
  };

  // Explicit Road Distance Recalculation via Google Routes API
  const handleRecalculateDistance = async () => {
    if (!route || recalculating) return;
    const stopsCount = route.stops?.length ?? (route as any).stops_count ?? 0;
    if (stopsCount === 0) {
      showToast('Cannot calculate distance: Route has no assigned delivery stops.', 'error');
      return;
    }

    setRecalculating(true);
    try {
      const res: any = await api.routes.recalculateDistance(route.id);
      const updated = res?.data || res;
      setRoute((prev) => (prev ? { ...prev, ...updated } : updated));
      showToast(`Road distance updated: ${updated.total_distance_km} km (~${updated.estimated_duration_minutes} mins)`);
    } catch (err: any) {
      showToast(err?.message || 'Failed to recalculate distance. Check waypoint addresses/coordinates.', 'error');
    } finally {
      setRecalculating(false);
    }
  };

  // Reorder stops
  const handleMoveStop = async (index: number, direction: 'up' | 'down') => {
    if (!route || !route.stops) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= route.stops.length) return;

    const newStops = [...route.stops];
    const [moved] = newStops.splice(index, 1);
    newStops.splice(targetIndex, 0, moved);

    const payloadStops = newStops.map((s, idx) => ({
      shopId: s.shop_id || (s as any).shopId || s.id,
      sequenceOrder: idx + 1,
      plannedArrivalTime: s.planned_arrival_time || (s as any).plannedArrivalTime,
      serviceTimeMinutes: s.service_time_minutes || (s as any).serviceTimeMinutes || 15,
      deliveryInstructions: s.delivery_instructions || (s as any).deliveryInstructions,
    }));

    setSavingStops(true);
    try {
      const res: any = await api.routes.updateStops(route.id, payloadStops, 'Sequence reordered');
      const updated = res?.data || res;
      setRoute((prev) => (prev ? { ...prev, ...updated } : updated));
      showToast('Stops sequence updated');
    } catch (err: any) {
      showToast(err?.message || 'Failed to reorder stops', 'error');
    } finally {
      setSavingStops(false);
    }
  };

  // Remove stop
  const handleRemoveStop = async (stopId: string) => {
    if (!route || !route.stops) return;
    const remainingStops = route.stops.filter((s) => s.id !== stopId);
    const payloadStops = remainingStops.map((s, idx) => ({
      shopId: s.shop_id || (s as any).shopId || s.id,
      sequenceOrder: idx + 1,
      plannedArrivalTime: s.planned_arrival_time || (s as any).plannedArrivalTime,
      serviceTimeMinutes: s.service_time_minutes || (s as any).serviceTimeMinutes || 15,
      deliveryInstructions: s.delivery_instructions || (s as any).deliveryInstructions,
    }));

    setSavingStops(true);
    try {
      const res: any = await api.routes.updateStops(route.id, payloadStops, 'Stop removed');
      const updated = res?.data || res;
      setRoute((prev) => (prev ? { ...prev, ...updated } : updated));
      showToast('Stop removed from route');
    } catch (err: any) {
      showToast(err?.message || 'Failed to remove stop', 'error');
    } finally {
      setSavingStops(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
      case 'ACTIVE':
        return <Badge variant="success">Active</Badge>;
      case 'DRAFT':
        return <Badge variant="warning">Draft</Badge>;
      case 'INACTIVE':
        return <Badge variant="neutral">Inactive</Badge>;
      case 'ARCHIVED':
        return <Badge variant="danger">Archived</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
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

  if (error || !route) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#FEF2F2',
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
          Route Not Found
        </h2>
        <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '24px' }}>
          {error || 'The requested delivery route could not be found or has been deleted.'}
        </p>
        <Button variant="secondary" onClick={() => navigate('/admin/routes')}>
          <ArrowLeft size={16} style={{ marginRight: '6px' }} />
          Back
        </Button>
      </div>
    );
  }

  const stops: RouteStop[] = route.stops || [];
  const versions: RouteVersion[] = route.versions || [];
  const supplierPickups = pickupRequirements?.supplierPickups || pickupRequirements?.companies || [];

  // Active run assignment
  const activeRun = runs.find(
    (r) => r.status === 'ASSIGNED' || r.status === 'READY' || r.status === 'IN_PROGRESS'
  );

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
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header Row (exact styling of Driver Details and Vehicle Details) */}
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
          {/* Back Button matching Driver/Vehicle Details */}
          <button
            type="button"
            onClick={() => navigate('/admin/routes')}
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              {route.name}
            </h1>
            <span
              style={{
                fontFamily: 'monospace',
                fontWeight: 700,
                fontSize: '12.5px',
                color: 'var(--color-primary, #16805D)',
                backgroundColor: 'var(--color-primary-subtle, #E6F4EA)',
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid #6EE7B7',
              }}
            >
              {route.route_code || route.code}
            </span>
            {getStatusBadge(route.status)}
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
              v{route.version || 1}
            </span>
          </div>
        </div>

        {/* Action Controls: Refresh, Edit, and Actions Dropdown (OUTSIDE the card) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={fetchRouteData}
            title="Refresh route details"
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
                {route.status === 'DRAFT' && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsActionsOpen(false);
                      handlePublish();
                    }}
                    disabled={publishing}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: '#15803D',
                      background: 'none',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F0FDF4')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <ShieldCheck size={14} />
                    <span>{publishing ? 'Publishing...' : 'Publish'}</span>
                  </button>
                )}

                {(route.status === 'PUBLISHED' || route.status === 'ACTIVE') && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsActionsOpen(false);
                        navigate('/admin/assignments');
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 12px',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#2563EB',
                        background: 'none',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EFF6FF')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <Truck size={14} />
                      <span>Dispatch Run</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsActionsOpen(false);
                        handleToggleStatus('INACTIVE');
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 12px',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#B45309',
                        background: 'none',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FFFBEB')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <Power size={14} />
                      <span>Deactivate</span>
                    </button>
                  </>
                )}

                {route.status === 'INACTIVE' && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsActionsOpen(false);
                      handleToggleStatus('ACTIVE');
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: '#15803D',
                      background: 'none',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F0FDF4')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <Power size={14} />
                    <span>Activate</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsActionsOpen(false);
                    handleRecalculateDistance();
                  }}
                  disabled={recalculating}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#0284C7',
                    background: 'none',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: recalculating ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F0F9FF')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <RefreshCw size={14} className={recalculating ? 'animate-spin' : ''} />
                  <span>{recalculating ? 'Calculating...' : 'Recalculate Distance'}</span>
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

      {/* Main Route Information Card (Matching Driver Details & Vehicle Details layout) */}
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
            <Navigation size={28} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Route Code
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
                  {route.route_code || route.code}
                </code>
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '3px' }}>
                {route.name}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Base Depot
              </div>
              <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                {route.depot || route.depotName || 'Pune Central Cold Depot'}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                {route.city}, {route.state}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Corridor Category
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                {route.category || 'Retail Distribution'}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                {stops.length} sequenced {stops.length === 1 ? 'stop' : 'stops'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Active Assignment
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: activeRun ? '#2563EB' : '#0F172A', marginTop: '2px' }}>
                {activeRun
                  ? activeRun.driver?.name || (activeRun as any).driver_name || 'Assigned Driver'
                  : 'Available / Unassigned'}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                {activeRun
                  ? `Vehicle: ${activeRun.vehicle?.registration_number || (activeRun as any).vehicle_registration || '—'}`
                  : 'No active dispatch run'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Status
              </div>
              <div style={{ marginTop: '4px' }}>
                {getStatusBadge(route.status)}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Summary KPI Cards Grid (Matching Driver & Vehicle Details) */}
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
                Total Stops
              </span>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#1F2937', marginTop: '4px' }}>
                {stops.length} {stops.length === 1 ? 'Shop' : 'Shops'}
              </div>
            </div>
            <div style={{ background: '#F0FDF4', color: '#15803D', padding: '8px', borderRadius: '6px' }}>
              <MapPin size={18} />
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px' }}>
            Sequenced delivery stops
          </div>
        </Card>

        <Card style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                Road Distance
              </span>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#1F2937', marginTop: '4px' }}>
                {Number(route.total_distance_km) > 0 ? `${Number(route.total_distance_km).toFixed(1)} km` : 'Not calculated'}
              </div>
            </div>
            <div style={{ background: '#F0F9FF', color: '#0284C7', padding: '8px', borderRadius: '6px' }}>
              <Navigation size={18} />
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px' }}>
            Google Routes driving distance
          </div>
        </Card>

        <Card style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                Estimated Duration
              </span>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#1F2937', marginTop: '4px' }}>
                {Number(route.total_distance_km) > 0 && route.estimated_duration_minutes
                  ? `${Math.round(Number(route.estimated_duration_minutes))} mins`
                  : '—'}
              </div>
            </div>
            <div style={{ background: '#FFFBEB', color: '#D97706', padding: '8px', borderRadius: '6px' }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px' }}>
            Calculated transit travel time
          </div>
        </Card>

        <Card style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                Delivery Runs
              </span>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#1F2937', marginTop: '4px' }}>
                {runs.length} {runs.length === 1 ? 'Run' : 'Runs'}
              </div>
            </div>
            <div style={{ background: '#F8FAFC', color: '#0F172A', padding: '8px', borderRadius: '6px' }}>
              <Package size={18} />
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px' }}>
            {activeRun ? 'Active run in progress' : 'Scheduled & completed runs'}
          </div>
        </Card>
      </div>

      {/* Tabs Navigation (Overview, Stops, Assignments, History) */}
      <div
        style={{
          borderBottom: '1px solid #D6D3C8',
          marginBottom: '20px',
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
        }}
      >
        {[
          { key: 'overview', label: 'Overview', icon: FileText },
          { key: 'stops', label: 'Stops', icon: MapPin, count: stops.length },
          { key: 'assignments', label: 'Assignments', icon: Truck, count: runs.length },
          { key: 'history', label: 'History', icon: History, count: versions.length },
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
                fontSize: '13.5px',
                fontWeight: 600,
                color: isActive ? 'var(--color-primary, #16805D)' : '#64748B',
                borderBottom: isActive ? '2px solid var(--color-primary, #16805D)' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '10px',
                    backgroundColor: isActive ? 'var(--color-primary-subtle, #E6F4EA)' : '#F1F5F9',
                    color: isActive ? 'var(--color-primary, #16805D)' : '#64748B',
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Corridor Locations Flow Card */}
          <Card title="Corridor Route Locations (4 Stages)">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              {/* Stage 1: Start Location */}
              <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #A7F3D0', backgroundColor: '#F0FDF4' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#047857', letterSpacing: '0.04em' }}>
                    STAGE 1 • START LOCATION
                  </span>
                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: '#DCFCE7', color: '#15803D' }}>
                    ORIGIN
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#059669', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Play size={16} fill="#FFFFFF" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                      {route.start_location_name || route.startLocationName || route.depot || 'Vehicle Start Depot'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                      {route.start_address || route.startLocationAddress || 'Depot Hub / Journey Starting Point'}
                    </div>
                    {(route.start_latitude || route.startLocationLat) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontFamily: 'monospace', fontSize: '11.5px', color: '#047857' }}>
                        <MapPin size={12} />
                        <span>{Number(route.start_latitude ?? route.startLocationLat).toFixed(5)}, {Number(route.start_longitude ?? route.startLocationLng).toFixed(5)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Stage 2: Supplier Collection Stops */}
              <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#475569', letterSpacing: '0.04em' }}>
                    STAGE 2 • SUPPLIER PICKUPS
                  </span>
                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: '#E2E8F0', color: '#334155' }}>
                    DERIVED
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#475569', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Building2 size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                      {supplierPickups.length > 0 ? `${supplierPickups.length} Supplier Companies` : 'Derived from Order Items'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                      {supplierPickups.length > 0 ? 'Fulfillment points based on ordered products' : 'Automatically resolved when orders assigned'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stage 3: Delivery Stops */}
              <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#475569', letterSpacing: '0.04em' }}>
                    STAGE 3 • DELIVERY STOPS
                  </span>
                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: '#E2E8F0', color: '#334155' }}>
                    {stops.length} DROPS
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#1E293B', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Truck size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                      {stops.length > 0 ? `${stops.length} Sequenced Shops` : 'No delivery drops yet'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                      {stops.length > 0 ? `${stops[0]?.shop?.name || stops[0]?.shop_name || 'Stop 1'} ...` : 'Configure in Stops tab'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stage 4: Return Location */}
              <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #BFDBFE', backgroundColor: '#EFF6FF' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#1D4ED8', letterSpacing: '0.04em' }}>
                    STAGE 4 • RETURN LOCATION
                  </span>
                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: '#DBEAFE', color: '#1E40AF' }}>
                    DESTINATION
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#2563EB', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Flag size={16} fill="#FFFFFF" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                      {route.return_location_name || route.returnLocationName || route.depot || 'Vehicle Return Depot'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                      {route.return_address || route.returnLocationAddress || 'End of journey loop depot'}
                    </div>
                    {(route.return_latitude || route.returnLocationLat) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontFamily: 'monospace', fontSize: '11.5px', color: '#1D4ED8' }}>
                        <MapPin size={12} />
                        <span>{Number(route.return_latitude ?? route.returnLocationLat).toFixed(5)}, {Number(route.return_longitude ?? route.returnLocationLng).toFixed(5)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Corridor Configuration & Parameters">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '11.5px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
                  Departure Depot Hub
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '4px' }}>
                  {route.depot || route.depotName || 'Pune Central Cold Depot'}
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  {route.city}, {route.state}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11.5px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
                  Corridor Span
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '4px' }}>
                  {stops.length > 0
                    ? `${stops[0]?.shop?.name || stops[0]?.shop_name || 'Stop 1'} → ${stops[stops.length - 1]?.shop?.name || stops[stops.length - 1]?.shop_name || `Stop ${stops.length}`}`
                    : 'No stops sequenced'}
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  {stops.length} delivery drops • Circular return loop
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11.5px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
                  Road Distance & Transit
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '4px' }}>
                  {Number(route.total_distance_km) > 0 ? `${Number(route.total_distance_km).toFixed(1)} km` : 'Not calculated'}
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  {Number(route.total_distance_km) > 0 && route.estimated_duration_minutes
                    ? `~${Math.round(Number(route.estimated_duration_minutes))} mins driving duration`
                    : 'Calculated using Google Routes API'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11.5px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
                  Creation & Status
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '4px' }}>
                  {route.created_at ? formatDate(route.created_at) : '—'}
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  Status: {route.status} (v{route.version || 1})
                </div>
              </div>
            </div>

            {route.description && (
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
                <div style={{ fontSize: '11.5px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
                  Operating Notes
                </div>
                <div style={{ fontSize: '13px', color: '#334155', marginTop: '6px', lineHeight: '1.5' }}>
                  {route.description}
                </div>
              </div>
            )}
          </Card>

          {/* Linked Supplier Pickups Card (if any exist) */}
          {supplierPickups.length > 0 && (
            <Card title="Linked Supplier Pickups" noPadding>
              <div className="business-table-container">
                <table className="business-table">
                  <thead>
                    <tr>
                      <th>Supplier Name</th>
                      <th>City</th>
                      <th style={{ textAlign: 'center' }}>Total Units</th>
                      <th style={{ textAlign: 'center' }}>Total Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierPickups.map((p: any, idx: number) => (
                      <tr key={p.id || idx}>
                        <td>
                          <div style={{ fontWeight: 600, color: '#1E293B', fontSize: '13px' }}>
                            {p.companyName || p.name || 'Dairy Producer'}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '12.5px', color: '#475569' }}>
                            {p.city || route.city}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontWeight: 600, fontSize: '13px' }}>
                            {p.totalUnits || p.units || 0}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: '12.5px', color: '#64748B' }}>
                            {p.totalWeightKg ? `${p.totalWeightKg} kg` : '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Tab 2: Stops */}
      {activeTab === 'stops' && (
        <Card noPadding>
          {stops.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: '#64748B' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: '#F1F5F9',
                  color: '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px auto',
                }}
              >
                <MapPin size={28} />
              </div>
              <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B' }}>
                No Stops Configured
              </h4>
              <p style={{ fontSize: '13px', marginTop: '4px', maxWidth: '400px', margin: '4px auto 0 auto' }}>
                This route currently has no shop stops assigned. Click Edit above to add stops.
              </p>
            </div>
          ) : (
            <div className="business-table-container">
              <table className="business-table">
                <thead>
                  <tr>
                    <th style={{ width: '70px', textAlign: 'center' }}>Seq</th>
                    <th>Shop</th>
                    <th>Location</th>
                    <th style={{ width: '130px', textAlign: 'center' }}>Arrival</th>
                    <th style={{ width: '110px', textAlign: 'center' }}>Service</th>
                    <th>Instructions</th>
                    <th style={{ width: '120px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stops.map((stop, idx) => (
                    <tr key={stop.id || idx}>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--color-primary-subtle, #E6F4EA)',
                            color: 'var(--color-primary, #16805D)',
                            fontWeight: 700,
                            fontSize: '12px',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {stop.sequence_order || idx + 1}
                        </span>
                      </td>

                      <td>
                        <div style={{ fontWeight: 600, color: '#1E293B', fontSize: '13px' }}>
                          {stop.shop?.name || stop.shop_name || 'Retail Partner'}
                        </div>
                        {stop.shop?.phone && (
                          <div style={{ fontSize: '11.5px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <Phone size={10} /> {stop.shop.phone}
                          </div>
                        )}
                      </td>

                      <td>
                        <div style={{ fontSize: '12.5px', color: '#334155' }}>
                          {stop.shop?.address || stop.shop?.area || stop.shop_address || 'Retail Shop Location'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>
                          {stop.shop?.city || route.city}
                        </div>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 500, color: '#334155' }}>
                          {stop.planned_arrival_time || '—'}
                        </span>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '12.5px', color: '#64748B' }}>
                          {stop.service_time_minutes || 15} mins
                        </span>
                      </td>

                      <td>
                        <span style={{ fontSize: '12px', color: '#64748B' }}>
                          {stop.delivery_instructions || '—'}
                        </span>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => handleMoveStop(idx, 'up')}
                            disabled={idx === 0 || savingStops}
                            style={{
                              padding: '5px 7px',
                              borderRadius: '4px',
                              border: '1px solid #CBD5E1',
                              background: '#FFFFFF',
                              cursor: idx === 0 || savingStops ? 'not-allowed' : 'pointer',
                              opacity: idx === 0 ? 0.4 : 1,
                              display: 'flex',
                              alignItems: 'center',
                            }}
                            title="Move Stop Up"
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveStop(idx, 'down')}
                            disabled={idx === stops.length - 1 || savingStops}
                            style={{
                              padding: '5px 7px',
                              borderRadius: '4px',
                              border: '1px solid #CBD5E1',
                              background: '#FFFFFF',
                              cursor: idx === stops.length - 1 || savingStops ? 'not-allowed' : 'pointer',
                              opacity: idx === stops.length - 1 ? 0.4 : 1,
                              display: 'flex',
                              alignItems: 'center',
                            }}
                            title="Move Stop Down"
                          >
                            <ArrowDown size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveStop(stop.id)}
                            disabled={savingStops}
                            style={{
                              padding: '5px 7px',
                              borderRadius: '4px',
                              border: '1px solid #FCA5A5',
                              background: '#FFF5F5',
                              color: '#DC2626',
                              cursor: savingStops ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                            title="Remove Stop"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Tab 3: Assignments */}
      {activeTab === 'assignments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Active Run Card if currently assigned */}
          {activeRun && (
            <Card style={{ padding: '18px 20px', border: '1px solid #93C5FD', backgroundColor: '#F0F9FF' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '8px',
                      backgroundColor: '#2563EB',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Truck size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#1E40AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Active Run Assignment • {activeRun.run_code || 'RUN-ACTIVE'}
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                      Driver: {activeRun.driver?.name || (activeRun as any).driver_name || 'Assigned Driver'} • Vehicle: {activeRun.vehicle?.registration_number || (activeRun as any).vehicle_registration || '—'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                      Scheduled for {activeRun.delivery_date ? formatDate(activeRun.delivery_date) : 'Today'}
                    </div>
                  </div>
                </div>

                <Button
                  variant="primary"
                  onClick={() => navigate('/admin/assignments')}
                  icon={<Truck size={14} />}
                >
                  View in Dispatch
                </Button>
              </div>
            </Card>
          )}

          {/* Delivery Runs Table */}
          <Card noPadding title="Delivery Run History">
            {runs.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center', color: '#64748B' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    backgroundColor: '#F1F5F9',
                    color: '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px auto',
                  }}
                >
                  <Truck size={28} />
                </div>
                <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B' }}>
                  No Delivery Runs
                </h4>
                <p style={{ fontSize: '13px', marginTop: '4px', maxWidth: '400px', margin: '4px auto 16px auto' }}>
                  No delivery runs have been scheduled or dispatched for this route yet.
                </p>
                <Button variant="secondary" onClick={() => navigate('/admin/assignments')}>
                  Schedule Run
                </Button>
              </div>
            ) : (
              <div className="business-table-container">
                <table className="business-table">
                  <thead>
                    <tr>
                      <th>Run Code</th>
                      <th>Delivery Date</th>
                      <th>Driver</th>
                      <th>Vehicle</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((run) => (
                      <tr key={run.id}>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '12.5px' }}>
                            {run.run_code || run.code || run.id.slice(0, 8)}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '12.5px', color: '#475569' }}>
                            {run.delivery_date ? formatDate(run.delivery_date) : '—'}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontSize: '13px', color: '#1E293B', fontWeight: 600 }}>
                            {run.driver?.name || (run as any).driver_name || 'Unassigned'}
                          </div>
                          {(run.driver?.phone || (run as any).driver_phone) && (
                            <div style={{ fontSize: '11px', color: '#64748B' }}>
                              {run.driver?.phone || (run as any).driver_phone}
                            </div>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: '12.5px', color: '#1E293B', fontWeight: 500 }}>
                            {run.vehicle?.registration_number || (run as any).vehicle_registration || 'Unassigned'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <Badge
                            variant={
                              run.status === 'COMPLETED'
                                ? 'success'
                                : run.status === 'IN_PROGRESS' || run.status === 'READY'
                                ? 'info'
                                : 'neutral'
                            }
                          >
                            {run.status}
                          </Badge>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <Button
                            variant="secondary"
                            onClick={() => navigate('/admin/assignments')}
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                          >
                            Details
                          </Button>
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

      {/* Tab 4: History (Route Versions & Audit Log) */}
      {activeTab === 'history' && (
        <Card noPadding title="Revision & Version History">
          {versions.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: '#64748B' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: '#F1F5F9',
                  color: '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px auto',
                }}
              >
                <History size={28} />
              </div>
              <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B' }}>
                Initial Version (v1)
              </h4>
              <p style={{ fontSize: '13px', marginTop: '4px' }}>
                No subsequent revisions or stops resequencing have occurred for this route.
              </p>
            </div>
          ) : (
            <div className="business-table-container">
              <table className="business-table">
                <thead>
                  <tr>
                    <th style={{ width: '90px' }}>Version</th>
                    <th>Changes Summary</th>
                    <th>Stops Count</th>
                    <th>Created By</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {versions.map((v) => {
                    const snapCount = Array.isArray(v.stops_snapshot)
                      ? v.stops_snapshot.length
                      : Array.isArray(v.stopsSnapshot)
                      ? v.stopsSnapshot.length
                      : stops.length;

                    return (
                      <tr key={v.id || v.version_number}>
                        <td>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              fontSize: '12px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: '#F1F5F9',
                              color: '#334155',
                              border: '1px solid #CBD5E1',
                            }}
                          >
                            v{v.version_number || v.version}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '13px', fontWeight: 500, color: '#0F172A' }}>
                            {v.changes_summary || v.changeReason || 'Stops resequenced and published'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '12.5px', color: '#475569' }}>
                            {snapCount} {snapCount === 1 ? 'stop' : 'stops'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '12.5px', color: '#475569' }}>
                            {v.created_by_name || 'System Admin'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '12px', color: '#64748B' }}>
                            {v.created_at || v.createdAt ? formatDate(v.created_at || v.createdAt!) : '—'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <EditRouteModal
          route={route}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={(updated) => {
            setRoute((prev) => (prev ? { ...prev, ...updated } : updated));
            showToast('Route updated successfully');
          }}
        />
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <DeleteRouteModal
          route={route}
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onDeleted={() => {
            navigate('/admin/routes');
          }}
        />
      )}
    </div>
  );
};
