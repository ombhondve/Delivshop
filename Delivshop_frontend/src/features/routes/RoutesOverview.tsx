import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, Navigation, MapPin, 
  Clock, CheckCircle2, Layers, AlertTriangle, Truck, RefreshCw, Eye
} from 'lucide-react';
import { api } from '../../services/api/endpoints';
import { Route } from '../../types';
import { RouteCreationWizard } from './RouteCreationWizard';
import { RouteDetailsDrawer } from './RouteDetailsDrawer';

interface RoutesOverviewProps {
  onDispatchRun?: (route: Route) => void;
}

export const RoutesOverview: React.FC<RoutesOverviewProps> = ({ onDispatchRun }) => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');
  
  // Modals state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    loadRoutes();
  }, [statusFilter, cityFilter]);

  const loadRoutes = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (cityFilter !== 'ALL') params.city = cityFilter;

      const res: any = await api.routes.list(params);
      const list = Array.isArray(res) ? res : res?.data || [];
      setRoutes(list);
    } catch (err) {
      console.error('Failed to load routes:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRoutes = routes.filter(r => 
    (r.name && r.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    ((r.route_code || r.code || '').toLowerCase().includes(searchTerm.toLowerCase())) ||
    (r.city && r.city.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Statistics
  const totalRoutes = routes.length;
  const publishedRoutes = routes.filter(r => r.status === 'PUBLISHED' || r.status === 'ACTIVE').length;
  const totalStops = routes.reduce((sum, r) => sum + (r.stops_count || r.stopsCount || 0), 0);
  const avgDistance = routes.length > 0 
    ? Math.round(routes.reduce((sum, r) => sum + (Number(r.total_distance_km || r.estimatedDistanceKm) || 0), 0) / routes.length)
    : 0;

  const cities = Array.from(new Set(routes.map(r => r.city).filter(Boolean)));

  const handleOpenDetails = (route: Route) => {
    setSelectedRouteId(route.id);
    setIsDetailsOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Delivery Routes</h1>
          <p className="text-sm text-slate-500 mt-1">
            Build, optimize, and version sequenced shop delivery corridors across Pune & Maharashtra depots.
          </p>
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <button
            onClick={() => loadRoutes()}
            className="p-2.5 text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors shadow-sm"
            title="Refresh routes"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsWizardOpen(true)}
            className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center space-x-2 transition-all shadow-sm hover:shadow"
          >
            <Plus className="w-4 h-4" />
            <span>New Route Wizard</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Routes</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Navigation className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{totalRoutes}</span>
            <span className="text-xs text-slate-500 font-medium">{routes.length} active templates</span>
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Published & Dispatchable</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-600">{publishedRoutes}</span>
            <span className="text-xs text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
              {totalRoutes > 0 ? Math.round((publishedRoutes / totalRoutes) * 100) : 0}% ready
            </span>
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sequenced Stops</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <MapPin className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{totalStops}</span>
            <span className="text-xs text-slate-500 font-medium">Mapped retail points</span>
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Route Distance</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{avgDistance} km</span>
            <span className="text-xs text-slate-500 font-medium">Per delivery circuit</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search code, route name, city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-slate-500">City:</span>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Cities</option>
              {cities.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Routes Grid / Cards */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-slate-500 mt-3 font-medium">Loading routes...</p>
        </div>
      ) : filteredRoutes.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <Navigation className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900">No Routes Found</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            {searchTerm || statusFilter !== 'ALL' 
              ? 'No routes match your current filter criteria.' 
              : 'Get started by creating your first sequenced shop delivery corridor.'}
          </p>
          <button
            onClick={() => setIsWizardOpen(true)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            Create First Route
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRoutes.map((route) => (
            <div
              key={route.id}
              className="bg-white rounded-2xl border border-slate-200/80 hover:border-blue-300 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded">
                    {route.route_code || route.code}
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs text-slate-400 font-mono">v{route.version}</span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                      route.status === 'PUBLISHED' || route.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : route.status === 'DRAFT'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {route.status}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-slate-900 mt-3 group-hover:text-blue-600 transition-colors">
                  {route.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span>{route.city}, {route.state} • Depot: {route.depot || route.depotName || 'Main Depot'}</span>
                </p>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Stops</span>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">{route.stops_count || route.stopsCount || 0}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Distance</span>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">{route.total_distance_km || route.estimatedDistanceKm || '—'} km</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Est Time</span>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">
                      {route.estimated_duration_minutes || route.estimatedDurationMinutes 
                        ? `${Math.round(Number(route.estimated_duration_minutes || route.estimatedDurationMinutes))}m` 
                        : '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => handleOpenDetails(route)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Details</span>
                </button>

                {(route.status === 'PUBLISHED' || route.status === 'ACTIVE') && onDispatchRun && (
                  <button
                    onClick={() => onDispatchRun(route)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors shadow-sm"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Dispatch Run</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Creation Wizard Modal */}
      {isWizardOpen && (
        <RouteCreationWizard
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          onRouteCreated={() => {
            setIsWizardOpen(false);
            loadRoutes();
          }}
        />
      )}

      {/* Details Drawer */}
      {isDetailsOpen && (
        <RouteDetailsDrawer
          routeId={selectedRouteId}
          isOpen={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedRouteId(null);
          }}
          onDispatchRun={onDispatchRun}
        />
      )}
    </div>
  );
};
