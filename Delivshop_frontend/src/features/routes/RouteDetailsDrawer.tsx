import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Clock,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Truck,
  ShieldCheck,
  AlertCircle,
  RotateCw,
  Trash2,
} from 'lucide-react';
import { api } from '../../services/api/endpoints';
import { Route, DeliveryRun } from '../../types';

interface RouteDetailsDrawerProps {
  routeId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (route: Route) => void;
  onDispatchRun?: (route: Route) => void;
  onDelete?: (routeId: string) => void;
}

export const RouteDetailsDrawer: React.FC<RouteDetailsDrawerProps> = ({
  routeId,
  isOpen,
  onClose,
  onEdit,
  onDispatchRun,
  onDelete,
}) => {
  const [route, setRoute] = useState<Route | null>(null);
  const [runs, setRuns] = useState<DeliveryRun[]>([]);
  const [activeTab, setActiveTab] = useState<'stops' | 'map' | 'versions' | 'runs'>('stops');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishFeedback, setPublishFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (isOpen && routeId) {
      setPublishFeedback(null);
      loadRouteDetails(routeId);
    }
  }, [isOpen, routeId]);

  const loadRouteDetails = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res: any = await api.routes.get(id);
      const routeData = res?.data || res;
      setRoute(routeData);

      // Load runs history safely
      try {
        const runsRes: any = await api.assignments.list({ routeId: id });
        const runsList = Array.isArray(runsRes) ? runsRes : runsRes?.data || [];
        setRuns(runsList);
      } catch {
        setRuns([]);
      }
    } catch (err: any) {
      setError(err?.message || 'Error loading route details');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!route || publishing) return;

    // Client-side pre-validation: route must have at least one stop
    const stopsCount = route.stops?.length ?? (route as any).stops_count ?? 0;
    if (stopsCount === 0) {
      setPublishFeedback({
        type: 'error',
        message: 'Cannot publish route: This route has 0 assigned stops. Please add at least one stop before publishing.',
      });
      return;
    }

    setPublishing(true);
    setPublishFeedback(null);
    try {
      const res: any = await api.routes.update(route.id, { status: 'PUBLISHED' });
      const updated = res?.data || res;
      setRoute(updated);
      setPublishFeedback({
        type: 'success',
        message:
          res?.message ||
          `Route "${updated.name}" (${updated.route_code || ''}) published successfully! Ready for dispatch.`,
      });
      if (onEdit) {
        onEdit(updated);
      }
    } catch (err: any) {
      let errMsg = err?.message || 'Failed to publish route';
      if (err?.details && typeof err.details === 'object') {
        const detailEntries = Object.entries(err.details)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
          .join('; ');
        if (detailEntries) {
          errMsg += ` (${detailEntries})`;
        }
      }
      setPublishFeedback({
        type: 'error',
        message: errMsg,
      });
    } finally {
      setPublishing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="drawer-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className="drawer-panel">
        {/* Header */}
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: 'rgba(0, 168, 107, 0.12)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Navigation size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="route-code-badge">
                  {route?.route_code || route?.code || 'ROUTE'}
                </span>
                {route && (
                  <span
                    className={`badge ${
                      route.status === 'PUBLISHED' || route.status === 'ACTIVE'
                        ? 'badge-success'
                        : route.status === 'DRAFT'
                        ? 'badge-warning'
                        : 'badge-neutral'
                    }`}
                  >
                    {route.status}
                  </span>
                )}
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  v{route?.version || 1}
                </span>
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0 0 0' }}>
                {route?.name || 'Route Corridor Profile'}
              </h2>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {route?.status === 'DRAFT' && (
              <button
                type="button"
                onClick={handlePublish}
                disabled={publishing}
                className="btn btn-primary"
                style={{ fontSize: '13px', padding: '6px 14px' }}
              >
                <ShieldCheck size={15} />
                <span>{publishing ? 'Publishing...' : 'Publish Route'}</span>
              </button>
            )}
            {route && onDispatchRun && (route.status === 'PUBLISHED' || route.status === 'ACTIVE') && (
              <button
                type="button"
                onClick={() => onDispatchRun(route)}
                className="btn btn-outline-primary"
                style={{ fontSize: '13px', padding: '6px 14px' }}
              >
                <Truck size={15} />
                <span>Create Run</span>
              </button>
            )}
            {route && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(route.id)}
                style={{
                  fontSize: '13px',
                  padding: '6px 12px',
                  border: '1px solid #FCA5A5',
                  background: '#FFF5F5',
                  color: '#DC2626',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
                title="Delete Route"
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Loading / Error States */}
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', flex: 1 }}>
            <RotateCw size={28} className="spin-icon" style={{ color: 'var(--color-primary)', margin: '0 auto 12px auto' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading route corridor data...</p>
          </div>
        ) : error ? (
          <div style={{ margin: '24px', padding: '16px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#991B1B' }}>
              <AlertCircle size={20} />
              <div>
                <strong>Unable to load route profile</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>{error}</p>
              </div>
            </div>
          </div>
        ) : route ? (
          <>
            {/* Publication Feedback Banner */}
            {publishFeedback && (
              <div
                style={{
                  margin: '16px 24px 0 24px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  backgroundColor: publishFeedback.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                  border: `1px solid ${publishFeedback.type === 'success' ? '#A7F3D0' : '#FECACA'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: publishFeedback.type === 'success' ? '#065F46' : '#991B1B',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                {publishFeedback.type === 'success' ? (
                  <CheckCircle2 size={18} style={{ color: '#10B981', flexShrink: 0 }} />
                ) : (
                  <AlertCircle size={18} style={{ color: '#EF4444', flexShrink: 0 }} />
                )}
                <span style={{ flex: 1 }}>{publishFeedback.message}</span>
                <button
                  type="button"
                  onClick={() => setPublishFeedback(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                  }}
                  title="Dismiss"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* 4 Metric Summary Strip */}
            <div className="drawer-metric-grid">
              <div className="drawer-metric-card">
                <div className="drawer-metric-label">Stops Count</div>
                <div className="drawer-metric-value">
                  {route.stops?.length || route.stops_count || 0} stops
                </div>
              </div>
              <div className="drawer-metric-card">
                <div className="drawer-metric-label">Total Distance</div>
                <div className="drawer-metric-value">
                  {Number(route.total_distance_km || route.estimatedDistanceKm || 0) > 0
                    ? `${Number(route.total_distance_km || route.estimatedDistanceKm).toFixed(1)} km`
                    : 'Pending'}
                </div>
              </div>
              <div className="drawer-metric-card">
                <div className="drawer-metric-label">Est. Time</div>
                <div className="drawer-metric-value">
                  {Number(route.estimated_duration_minutes || route.estimatedDurationMinutes || 0) > 0
                    ? `${Math.round(Number(route.estimated_duration_minutes || route.estimatedDurationMinutes))} mins`
                    : 'Pending'}
                </div>
              </div>
              <div className="drawer-metric-card">
                <div className="drawer-metric-label">Depot / City</div>
                <div className="drawer-metric-value" title={`${route.depot || 'Main Depot'} • ${route.city}`}>
                  {route.city} • {route.depot || 'Central'}
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="drawer-tabs-bar">
              <button
                type="button"
                onClick={() => setActiveTab('stops')}
                className={`drawer-tab-btn ${activeTab === 'stops' ? 'is-active' : ''}`}
              >
                <MapPin size={15} />
                <span>Stops Sequence ({route.stops?.length || route.stops_count || 0})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('map')}
                className={`drawer-tab-btn ${activeTab === 'map' ? 'is-active' : ''}`}
              >
                <Navigation size={15} />
                <span>Corridor Map</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('versions')}
                className={`drawer-tab-btn ${activeTab === 'versions' ? 'is-active' : ''}`}
              >
                <Layers size={15} />
                <span>Versions ({route.versions?.length || 1})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('runs')}
                className={`drawer-tab-btn ${activeTab === 'runs' ? 'is-active' : ''}`}
              >
                <Truck size={15} />
                <span>Dispatch History ({runs.length})</span>
              </button>
            </div>

            {/* Tab Body */}
            <div className="drawer-body">
              {/* TAB 1: STOPS SEQUENCE */}
              {activeTab === 'stops' && (
                <div>
                  {/* Origin Depot Card */}
                  <div
                    style={{
                      padding: '14px 18px',
                      backgroundColor: '#FFFFFF',
                      border: '1.5px dashed #00A86B',
                      borderRadius: '8px',
                      marginBottom: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <div
                      style={{
                        padding: '4px 8px',
                        background: 'rgba(0, 168, 107, 0.1)',
                        color: 'var(--color-primary)',
                        borderRadius: '4px',
                        fontWeight: 700,
                        fontSize: '11px',
                      }}
                    >
                      START
                    </div>
                    <div>
                      <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                        {route.depot || 'Pune Central Cold Storage'}
                      </strong>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Origin Distribution Depot • {route.city}, {route.state}
                      </div>
                    </div>
                  </div>

                  {/* Stop Rows */}
                  {route.stops && route.stops.length > 0 ? (
                    route.stops.map((stop: any, idx: number) => {
                      const hasGps = (stop.latitude || stop.shop_latitude) && (stop.longitude || stop.shop_longitude);
                      return (
                        <div key={stop.id || idx} className="timeline-stop-card">
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <div
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--color-primary-dark)',
                                color: '#FFFFFF',
                                fontSize: '12px',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                marginTop: '2px',
                              }}
                            >
                              {(stop.stop_sequence !== undefined ? stop.stop_sequence : idx) + 1}
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                                  {stop.shop_name || stop.shopName || `Shop #${(stop.shop_id || stop.shopId || '').slice(0, 8)}`}
                                </strong>
                                {hasGps ? (
                                  <span style={{ fontSize: '11px', color: '#16A34A', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}>
                                    <CheckCircle2 size={12} /> GPS Verified
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '11px', color: '#D97706', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}>
                                    <AlertTriangle size={12} /> Pending GPS
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                {stop.address || stop.shop_address || 'Address on record'}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                                {stop.planned_arrival_time && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Clock size={12} />
                                    <span>Planned ETA: {stop.planned_arrival_time}</span>
                                  </div>
                                )}
                                <div>Service Time: {stop.service_time_minutes || 10} mins</div>
                              </div>
                            </div>
                          </div>

                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            Stop #{idx + 1}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px', background: '#FFFFFF', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <MapPin size={32} style={{ color: 'var(--text-secondary)', opacity: 0.4, margin: '0 auto 8px auto' }} />
                      <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>No stops sequenced yet</strong>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        This route template is currently in Draft state without assigned shop stops.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: MAP VISUALIZER */}
              {activeTab === 'map' && (
                <div>
                  <div
                    style={{
                      padding: '12px 16px',
                      background: 'rgba(0, 168, 107, 0.08)',
                      border: '1px solid rgba(0, 168, 107, 0.25)',
                      borderRadius: '8px',
                      fontSize: '12.5px',
                      color: 'var(--color-primary-dark)',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <Navigation size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                    <span>
                      Sequential road network itinerary calculated from verified shop coordinates across {route.city}.
                    </span>
                  </div>

                  <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ position: 'relative', paddingLeft: '24px', borderLeft: '2px solid var(--color-primary)' }}>
                      {/* Start Depot */}
                      <div style={{ position: 'relative', marginBottom: '24px' }}>
                        <div
                          style={{
                            position: 'absolute',
                            left: '-31px',
                            top: '2px',
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--color-primary)',
                            border: '2px solid #FFFFFF',
                            boxShadow: '0 0 0 1px var(--color-primary)',
                          }}
                        />
                        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase' }}>
                          Origin Depot
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {route.depot || 'Central Logistics Hub'}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>{route.city}, {route.state}</div>
                      </div>

                      {/* Stops */}
                      {route.stops?.map((stop: any, sIdx: number) => {
                        const lat = stop.latitude || stop.shop_latitude;
                        const lng = stop.longitude || stop.shop_longitude;
                        return (
                          <div key={stop.id || sIdx} style={{ position: 'relative', marginBottom: '20px' }}>
                            <div
                              style={{
                                position: 'absolute',
                                left: '-31px',
                                top: '2px',
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--color-primary-dark)',
                                border: '2px solid #FFFFFF',
                                boxShadow: '0 0 0 1px var(--color-primary-dark)',
                              }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                                  Stop #{sIdx + 1}
                                </span>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                  {stop.shop_name || stop.shopName}
                                </div>
                                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                                  {stop.address || stop.shop_address}
                                </div>
                              </div>
                              <span
                                style={{
                                  fontSize: '11px',
                                  padding: '2px 6px',
                                  backgroundColor: '#F1F5F9',
                                  borderRadius: '4px',
                                  color: 'var(--text-secondary)',
                                  fontFamily: 'monospace',
                                }}
                              >
                                {lat && lng ? `${Number(lat).toFixed(3)}, ${Number(lng).toFixed(3)}` : 'Manual GPS'}
                              </span>
                            </div>
                          </div>
                        );
                      })}

                      {/* Return Depot */}
                      <div style={{ position: 'relative' }}>
                        <div
                          style={{
                            position: 'absolute',
                            left: '-31px',
                            top: '2px',
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            backgroundColor: '#16A34A',
                            border: '2px solid #FFFFFF',
                            boxShadow: '0 0 0 1px #16A34A',
                          }}
                        />
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#16A34A', textTransform: 'uppercase' }}>
                          Depot Return
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {route.depot || 'Central Logistics Hub'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: VERSIONS */}
              {activeTab === 'versions' && (
                <div>
                  {route.versions && route.versions.length > 0 ? (
                    route.versions.map((ver: any) => (
                      <div
                        key={ver.id}
                        style={{
                          padding: '14px 16px',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          marginBottom: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                              Version {ver.version_number || ver.version}
                            </strong>
                            {(ver.version_number || ver.version) === route.version && (
                              <span className="badge badge-success" style={{ fontSize: '10.5px' }}>
                                Active
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {new Date(ver.created_at || ver.createdAt || '').toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {ver.changes_summary || 'Standard stop sequencing & validation update.'}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '30px', textAlign: 'center', background: '#FFFFFF', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                      Current active template is v{route.version || 1}.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: DISPATCH RUNS */}
              {activeTab === 'runs' && (
                <div>
                  {runs.length > 0 ? (
                    runs.map((run: any) => (
                      <div
                        key={run.id}
                        style={{
                          padding: '14px 16px',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          marginBottom: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '13px', color: 'var(--color-primary)' }}>
                              {run.run_code || run.runCode}
                            </strong>
                            <span
                              className={`badge ${
                                run.status === 'COMPLETED'
                                  ? 'badge-success'
                                  : run.status === 'IN_PROGRESS'
                                  ? 'badge-info'
                                  : 'badge-neutral'
                              }`}
                            >
                              {run.status}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            Date: {run.delivery_date || run.deliveryDate} • Driver: {run.driver_name || run.driverName || 'Unassigned'} • Vehicle: {run.vehicle_registration || run.registrationNumber || 'Unassigned'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {run.completed_stops_count ?? run.completedStopsCount ?? 0}/{run.planned_stops_count ?? run.totalStopsCount ?? 0} stops
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px', background: '#FFFFFF', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <Truck size={32} style={{ color: 'var(--text-secondary)', opacity: 0.4, margin: '0 auto 8px auto' }} />
                      <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>No active or past delivery runs</strong>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        This route template has not been dispatched to a vehicle assignment yet.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};
