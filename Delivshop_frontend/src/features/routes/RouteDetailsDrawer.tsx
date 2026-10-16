import React, { useState, useEffect } from 'react';
import { 
  X, MapPin, Clock, Navigation, CheckCircle2, AlertTriangle, 
  History, Calendar, Truck, Layers, ArrowRight, ShieldCheck,
  ChevronRight, Building2, Phone, AlertCircle
} from 'lucide-react';
import { api } from '../../services/api/endpoints';
import { Route, DeliveryRun } from '../../types';

interface RouteDetailsDrawerProps {
  routeId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (route: Route) => void;
  onDispatchRun?: (route: Route) => void;
}

export const RouteDetailsDrawer: React.FC<RouteDetailsDrawerProps> = ({
  routeId,
  isOpen,
  onClose,
  onEdit,
  onDispatchRun
}) => {
  const [route, setRoute] = useState<Route | null>(null);
  const [runs, setRuns] = useState<DeliveryRun[]>([]);
  const [activeTab, setActiveTab] = useState<'stops' | 'map' | 'versions' | 'runs'>('stops');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (isOpen && routeId) {
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

      // Load runs history
      try {
        const runsRes: any = await api.assignments.list({ routeId: id });
        const runsList = Array.isArray(runsRes) ? runsRes : runsRes?.data || [];
        setRuns(runsList);
      } catch (e) {
        setRuns([]);
      }
    } catch (err: any) {
      setError(err?.message || 'Error loading route details');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!route) return;
    setPublishing(true);
    try {
      const res: any = await api.routes.update(route.id, { status: 'PUBLISHED' });
      const updated = res?.data || res;
      setRoute(updated);
    } catch (err: any) {
      alert('Failed to publish route: ' + (err?.message || 'Unknown error'));
    } finally {
      setPublishing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-sm flex justify-end transition-opacity">
      <div className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
              <Navigation className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded">
                  {route?.route_code || route?.code || 'Route'}
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                  route?.status === 'PUBLISHED' || route?.status === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-800'
                    : route?.status === 'DRAFT'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  {route?.status || 'STATUS'}
                </span>
                <span className="text-xs text-slate-500 font-medium">v{route?.version || 1}</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-1">{route?.name || 'Route Details'}</h2>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {route?.status === 'DRAFT' && (
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium flex items-center space-x-1.5 transition-colors shadow-sm disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{publishing ? 'Publishing...' : 'Publish Route'}</span>
              </button>
            )}
            {route && onDispatchRun && (route.status === 'PUBLISHED' || route.status === 'ACTIVE') && (
              <button
                onClick={() => onDispatchRun(route)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center space-x-1.5 transition-colors shadow-sm"
              >
                <Truck className="w-4 h-4" />
                <span>Create Run</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Loading / Error state */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 text-red-700 flex items-center space-x-3 m-6 rounded-xl border border-red-200">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Unable to display route</p>
              <p className="text-sm mt-0.5">{error}</p>
            </div>
          </div>
        ) : route ? (
          <>
            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-4 gap-4 p-5 bg-white border-b border-slate-200">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 font-medium">Stops Count</span>
                <p className="text-lg font-bold text-slate-900 mt-0.5">{route.stops?.length || route.stops_count || 0} stops</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 font-medium">Total Distance</span>
                <p className="text-lg font-bold text-slate-900 mt-0.5">
                  {route.total_distance_km || route.estimatedDistanceKm ? `${route.total_distance_km || route.estimatedDistanceKm} km` : 'Pending'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 font-medium">Estimated Time</span>
                <p className="text-lg font-bold text-slate-900 mt-0.5">
                  {route.estimated_duration_minutes || route.estimatedDurationMinutes 
                    ? `${Math.round(Number(route.estimated_duration_minutes || route.estimatedDurationMinutes))} mins` 
                    : 'Pending'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 font-medium">City / Depot</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5 truncate">{route.city} • {route.depot || route.depotName || 'Main'}</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 px-6 space-x-6 bg-white">
              <button
                onClick={() => setActiveTab('stops')}
                className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${
                  activeTab === 'stops'
                    ? 'border-blue-600 text-blue-600 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span>Stops Sequence ({route.stops?.length || 0})</span>
              </button>
              <button
                onClick={() => setActiveTab('map')}
                className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${
                  activeTab === 'map'
                    ? 'border-blue-600 text-blue-600 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Navigation className="w-4 h-4" />
                <span>Map Visualizer</span>
              </button>
              <button
                onClick={() => setActiveTab('versions')}
                className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${
                  activeTab === 'versions'
                    ? 'border-blue-600 text-blue-600 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Versions ({route.versions?.length || 1})</span>
              </button>
              <button
                onClick={() => setActiveTab('runs')}
                className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${
                  activeTab === 'runs'
                    ? 'border-blue-600 text-blue-600 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Truck className="w-4 h-4" />
                <span>Dispatch History ({runs.length})</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              
              {/* STOPS TAB */}
              {activeTab === 'stops' && (
                <div className="space-y-4">
                  {/* Origin Depot Card */}
                  <div className="p-4 bg-white rounded-xl border-2 border-dashed border-blue-200 flex items-start space-x-3">
                    <div className="p-2 bg-blue-50 text-blue-700 rounded-lg font-bold text-xs mt-0.5">
                      START
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">{route.depot || route.depotName || 'Depot'}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{route.depotAddress || `${route.city}, ${route.state}`}</p>
                      <div className="mt-2 text-xs text-slate-500 flex items-center space-x-3">
                        <span>City: {route.city}</span>
                        <span>•</span>
                        <span>State: {route.state}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stops List */}
                  <div className="space-y-3">
                    {route.stops && route.stops.length > 0 ? (
                      route.stops.map((stop, idx) => (
                        <div key={stop.id || idx} className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                              {(stop.stop_sequence !== undefined ? stop.stop_sequence : stop.sequenceIndex !== undefined ? stop.sequenceIndex : idx) + 1}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h4 className="font-semibold text-slate-900">{stop.shop_name || stop.shopName || `Shop #${(stop.shop_id || stop.shopId || '').slice(0, 8)}`}</h4>
                                {(stop.latitude || stop.shop_latitude) && (stop.longitude || stop.shop_longitude) ? (
                                  <span className="inline-flex items-center text-xs text-emerald-600 font-medium">
                                    <CheckCircle2 className="w-3 h-3 mr-0.5" /> GPS Verified
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center text-xs text-amber-600 font-medium">
                                    <AlertTriangle className="w-3 h-3 mr-0.5" /> Missing GPS
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-1">{stop.address || stop.shop_address || 'Address on file'}</p>
                              
                              <div className="flex items-center space-x-4 mt-2 text-xs text-slate-600">
                                {stop.planned_arrival_time && (
                                  <div className="flex items-center space-x-1">
                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Arrival: {stop.planned_arrival_time}</span>
                                  </div>
                                )}
                                <div className="flex items-center space-x-1">
                                  <span>Service Time: {stop.service_time_minutes || stop.serviceTimeMinutes || 10} mins</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="text-right text-xs text-slate-400">
                            Stop #{idx + 1}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
                        <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-slate-600 font-medium">No stops added yet</p>
                        <p className="text-xs text-slate-400 mt-1">This route template does not have sequenced stops.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* MAP VISUALIZER TAB */}
              {activeTab === 'map' && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-start space-x-2">
                    <Navigation className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Route Sequence & Road Geometry</span>
                      <p className="mt-0.5">
                        Highways and delivery corridors are mapped using verified GPS lat/long of participating shops.
                      </p>
                    </div>
                  </div>

                  {/* Schematic Map Representation */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[380px] flex flex-col justify-between">
                    <div className="relative pl-6 border-l-2 border-blue-500 space-y-6 my-4">
                      {/* Origin */}
                      <div className="relative">
                        <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow"></div>
                        <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">Origin Depot</p>
                        <p className="text-sm font-semibold text-slate-900">{route.depot || route.depotName || 'Pune Logistics Hub'}</p>
                        <p className="text-xs text-slate-400">{route.depotAddress || route.city}</p>
                      </div>

                      {/* Stops progression */}
                      {route.stops?.map((stop, sIdx) => (
                        <div key={stop.id || sIdx} className="relative">
                          <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-slate-900 border-2 border-white shadow"></div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-slate-500">Stop #{sIdx + 1}</p>
                              <p className="text-sm font-semibold text-slate-900">{stop.shop_name || stop.shopName}</p>
                              <p className="text-xs text-slate-500">{stop.address || stop.shop_address}</p>
                            </div>
                            <span className="text-xs px-2 py-0.5 bg-slate-100 rounded text-slate-600">
                              {(stop.latitude || stop.shop_latitude) && (stop.longitude || stop.shop_longitude)
                                ? `${Number(stop.latitude || stop.shop_latitude).toFixed(3)}, ${Number(stop.longitude || stop.shop_longitude).toFixed(3)}` 
                                : 'Manual Point'}
                            </span>
                          </div>
                        </div>
                      ))}

                      {/* Return to Depot */}
                      <div className="relative">
                        <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-emerald-600 border-2 border-white shadow"></div>
                        <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Return to Depot</p>
                        <p className="text-sm font-semibold text-slate-900">{route.depot || route.depotName || 'Depot Return'}</p>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs text-slate-600">
                      <span>Total Planned Stops: <strong>{route.stops?.length || 0}</strong></span>
                      <span>Total Distance: <strong>{route.total_distance_km || route.estimatedDistanceKm || 0} km</strong></span>
                      <span>Estimated Tour: <strong>{Math.round(Number(route.estimated_duration_minutes || route.estimatedDurationMinutes || 0))} mins</strong></span>
                    </div>
                  </div>
                </div>
              )}

              {/* VERSIONS TAB */}
              {activeTab === 'versions' && (
                <div className="space-y-3">
                  {route.versions && route.versions.length > 0 ? (
                    route.versions.map((ver) => (
                      <div key={ver.id} className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-sm font-bold text-slate-900">Version {ver.version_number || ver.version}</span>
                            {(ver.version_number || ver.version) === route.version && (
                              <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-medium">Active</span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400">
                            {new Date(ver.created_at || ver.createdAt || '').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-2">{ver.changes_summary || ver.changeReason || 'Standard route sequence optimization update.'}</p>
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center space-x-4 text-xs text-slate-500">
                          <span>Stops: {(ver.stops_snapshot || ver.stopsSnapshot)?.length || 0}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 bg-white rounded-xl border border-slate-200 text-center text-slate-500 text-sm">
                      Current active version is v{route.version}.
                    </div>
                  )}
                </div>
              )}

              {/* RUNS / DISPATCH HISTORY TAB */}
              {activeTab === 'runs' && (
                <div className="space-y-3">
                  {runs.length > 0 ? (
                    runs.map((run) => (
                      <div key={run.id} className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-semibold text-xs text-blue-600">{run.run_code || run.runCode}</span>
                            <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                              run.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                              run.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                              run.status === 'ASSIGNED' ? 'bg-purple-100 text-purple-800' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {run.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Date: {run.delivery_date || run.deliveryDate} • Driver: {run.driver_name || run.driverName || 'Unassigned'} • Vehicle: {run.vehicle_registration || run.registrationNumber || 'Unassigned'}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-medium text-slate-900">{run.completed_stops_count ?? run.completedStopsCount ?? 0}/{run.planned_stops_count ?? run.totalStopsCount ?? 0} stops</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
                      <Truck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-600 font-medium">No dispatch runs recorded</p>
                      <p className="text-xs text-slate-400 mt-1">This route template has not been dispatched to a vehicle yet.</p>
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
