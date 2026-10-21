import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Layers,
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
} from 'lucide-react';
import { api } from '../../services/api/endpoints';
import { Route, DeliveryRun, PickupRequirementsResponse, RouteStop } from '../../types';
import { useNavigation } from '../../context/NavigationContext';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { EditRouteModal } from './EditRouteModal';
import { DeleteRouteModal } from './DeleteRouteModal';

interface RouteDetailPageProps {
  routeId: string;
}

export const RouteDetailPage: React.FC<RouteDetailPageProps> = ({ routeId }) => {
  const { navigate } = useNavigation();

  const [route, setRoute] = useState<Route | null>(null);
  const [runs, setRuns] = useState<DeliveryRun[]>([]);
  const [pickupRequirements, setPickupRequirements] = useState<PickupRequirementsResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'stops' | 'pickups' | 'history'>('stops');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [savingStops, setSavingStops] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchRouteData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res: any = await api.routes.get(routeId);
      const routeData = res?.data || res;
      setRoute(routeData);

      // Runs history
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

  // Publish handler
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
      setRoute(updated);
      showToast(`Route ${updated.route_code || ''} published successfully!`);
    } catch (err: any) {
      showToast(err?.message || 'Failed to publish route', 'error');
    } finally {
      setPublishing(false);
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
      setRoute((prev: any) => ({
        ...prev,
        ...updated,
      }));
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

    // Update sequence numbers
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
      setRoute(updated);
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
      setRoute(updated);
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
        return <Badge variant="success">PUBLISHED</Badge>;
      case 'DRAFT':
        return <Badge variant="warning">DRAFT</Badge>;
      case 'INACTIVE':
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
          {error || 'The requested route could not be found or has been deleted.'}
        </p>
        <Button variant="secondary" onClick={() => navigate('/admin/routes')}>
          Back
        </Button>
      </div>
    );
  }

  const stops = route.stops || [];
  const supplierPickups = pickupRequirements?.supplierPickups || pickupRequirements?.companies || [];

  return (
    <div className="page-container" style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '48px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 1200,
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

      {/* Top Header Row (matching Driver Details & Vehicle Details) */}
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              {route.name}
            </h1>
            <span
              style={{
                fontFamily: 'monospace',
                fontWeight: 700,
                fontSize: '12.5px',
                color: 'var(--color-primary)',
                backgroundColor: 'var(--color-primary-subtle)',
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

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {route.status === 'DRAFT' && (
            <Button
              variant="primary"
              onClick={handlePublish}
              disabled={publishing}
              icon={<ShieldCheck size={14} />}
            >
              {publishing ? 'Publishing...' : 'Publish'}
            </Button>
          )}

          {(route.status === 'PUBLISHED' || route.status === 'ACTIVE') && (
            <Button
              variant="secondary"
              onClick={() => navigate('/admin/assignments')}
              icon={<Truck size={14} />}
            >
              Dispatch
            </Button>
          )}

          <Button
            variant="secondary"
            onClick={handleRecalculateDistance}
            disabled={recalculating}
            icon={<RefreshCw size={14} style={{ animation: recalculating ? 'spin 1s linear infinite' : 'none' }} />}
            title="Recalculate road distance using Google Routes API"
          >
            {recalculating ? 'Calculating...' : 'Recalculate'}
          </Button>

          <Button
            variant="secondary"
            onClick={() => setIsEditModalOpen(true)}
            icon={<Pencil size={14} />}
          >
            Edit
          </Button>

          <Button
            variant="secondary"
            onClick={() => setIsDeleteModalOpen(true)}
            icon={<Trash2 size={14} />}
            style={{ color: 'var(--color-danger)' }}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Information Card (Route Details) */}
      <Card title="Route Details" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '11.5px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
              Category
            </div>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#1E293B', marginTop: '4px' }}>
              {route.category || 'Retail Cold Chain Distribution'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11.5px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
              Location & Depot
            </div>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#1E293B', marginTop: '4px' }}>
              {route.city}, {route.state} • {route.depot || route.depotName || 'Central Hub'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11.5px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
              Total Distance
            </div>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: Number(route.total_distance_km) > 0 ? '#1E293B' : '#64748B', marginTop: '4px' }}>
              {Number(route.total_distance_km) > 0 ? `${Number(route.total_distance_km).toFixed(1)} km` : 'Not calculated'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11.5px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
              Est. Time
            </div>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#1E293B', marginTop: '4px' }}>
              {Number(route.total_distance_km) > 0 && route.estimated_duration_minutes
                ? `${Math.round(Number(route.estimated_duration_minutes))} mins`
                : '—'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11.5px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
              Stops Count
            </div>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#1E293B', marginTop: '4px' }}>
              {stops.length} {stops.length === 1 ? 'shop' : 'shops'}
            </div>
          </div>
        </div>

        {route.description && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
            <div style={{ fontSize: '11.5px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
              Description
            </div>
            <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>
              {route.description}
            </div>
          </div>
        )}
      </Card>

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E2E8F0', marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('stops')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            fontSize: '13.5px',
            fontWeight: 600,
            color: activeTab === 'stops' ? 'var(--color-primary)' : '#64748B',
            borderBottom: activeTab === 'stops' ? '2px solid var(--color-primary)' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <MapPin size={15} />
          <span>Stops ({stops.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pickups')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            fontSize: '13.5px',
            fontWeight: 600,
            color: activeTab === 'pickups' ? 'var(--color-primary)' : '#64748B',
            borderBottom: activeTab === 'pickups' ? '2px solid var(--color-primary)' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Building2 size={15} />
          <span>Pickups ({supplierPickups.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            fontSize: '13.5px',
            fontWeight: 600,
            color: activeTab === 'history' ? 'var(--color-primary)' : '#64748B',
            borderBottom: activeTab === 'history' ? '2px solid var(--color-primary)' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Truck size={15} />
          <span>History ({runs.length})</span>
        </button>
      </div>

      {/* Tab 1: Stops */}
      {activeTab === 'stops' && (
        <Card noPadding>
          {stops.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748B' }}>
              <MapPin size={32} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
              <h4 style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                No Stops Configured
              </h4>
              <p style={{ fontSize: '12.5px', marginTop: '4px' }}>
                This route currently has no shop stops assigned.
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
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--color-primary-subtle)',
                            color: 'var(--color-primary)',
                            fontWeight: 700,
                            fontSize: '11.5px',
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
                          <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
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
                              padding: '4px 6px',
                              borderRadius: '4px',
                              border: '1px solid #CBD5E1',
                              background: '#FFFFFF',
                              cursor: idx === 0 || savingStops ? 'not-allowed' : 'pointer',
                              opacity: idx === 0 ? 0.4 : 1,
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
                              padding: '4px 6px',
                              borderRadius: '4px',
                              border: '1px solid #CBD5E1',
                              background: '#FFFFFF',
                              cursor: idx === stops.length - 1 || savingStops ? 'not-allowed' : 'pointer',
                              opacity: idx === stops.length - 1 ? 0.4 : 1,
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
                              padding: '4px 6px',
                              borderRadius: '4px',
                              border: '1px solid #FCA5A5',
                              background: '#FFF5F5',
                              color: '#DC2626',
                              cursor: savingStops ? 'not-allowed' : 'pointer',
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

      {/* Tab 2: Pickups */}
      {activeTab === 'pickups' && (
        <Card noPadding>
          {supplierPickups.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748B' }}>
              <Building2 size={32} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
              <h4 style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                No Supplier Pickups
              </h4>
              <p style={{ fontSize: '12.5px', marginTop: '4px' }}>
                No supplier pickup requirements are linked to the stops on this route.
              </p>
            </div>
          ) : (
            <div className="business-table-container">
              <table className="business-table">
                <thead>
                  <tr>
                    <th>Supplier</th>
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
          )}
        </Card>
      )}

      {/* Tab 3: History */}
      {activeTab === 'history' && (
        <Card noPadding>
          {runs.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748B' }}>
              <Truck size={32} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
              <h4 style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                No Dispatch Runs
              </h4>
              <p style={{ fontSize: '12.5px', marginTop: '4px' }}>
                No delivery runs have been dispatched for this route yet.
              </p>
            </div>
          ) : (
            <div className="business-table-container">
              <table className="business-table">
                <thead>
                  <tr>
                    <th>Run Code</th>
                    <th>Date</th>
                    <th>Driver</th>
                    <th>Vehicle</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '12px' }}>
                          {run.run_code || run.code || run.id.slice(0, 8)}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12.5px', color: '#475569' }}>
                          {run.delivery_date ? new Date(run.delivery_date).toLocaleDateString() : '—'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12.5px', color: '#1E293B', fontWeight: 500 }}>
                          {run.driver?.name || 'Unassigned'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12.5px', color: '#1E293B' }}>
                          {run.vehicle?.registration_number || 'Unassigned'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <Badge variant={run.status === 'COMPLETED' ? 'success' : run.status === 'IN_PROGRESS' || run.status === 'READY' ? 'info' : 'neutral'}>
                          {run.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Modals */}
      {isEditModalOpen && (
        <EditRouteModal
          route={route}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={(updated) => {
            setRoute(updated);
            showToast('Route updated successfully');
          }}
        />
      )}

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
