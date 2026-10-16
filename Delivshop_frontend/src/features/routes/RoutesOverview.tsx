import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Plus, Search, Navigation, MapPin, Clock, CheckCircle2, 
  Layers, AlertTriangle, Truck, RefreshCw, Eye, ShieldCheck, 
  AlertCircle, XCircle, ArrowRight, Route as RouteIcon, Trash2
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { api } from '../../services/api/endpoints';
import { Route, RouteSummary } from '../../types';
import { RouteCreationWizard } from './RouteCreationWizard';
import { RouteDetailsDrawer } from './RouteDetailsDrawer';
import { DeleteRouteModal } from './DeleteRouteModal';

interface RoutesOverviewProps {
  onDispatchRun?: (route: Route) => void;
}

export const RoutesOverview: React.FC<RoutesOverviewProps> = ({ onDispatchRun }) => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [summary, setSummary] = useState<RouteSummary>({
    totalRoutes: 0,
    dispatchableRoutes: 0,
    publishedRoutes: 0,
    activeRoutes: 0,
    draftRoutes: 0,
    inactiveRoutes: 0,
    totalStopsConfigured: 0,
    avgDistanceKm: 0,
    measuredRoutesCount: 0,
    readinessPercentage: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [depotFilter, setDepotFilter] = useState('ALL');

  // Modals state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState<Route | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Active abort controller for request cleanup
  const abortControllerRef = useRef<AbortController | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Debounce search input by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchRoutesData = useCallback(async (isBackgroundRefresh = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (!isBackgroundRefresh) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);

    try {
      const params: any = {};
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (cityFilter !== 'ALL') params.city = cityFilter;
      if (depotFilter !== 'ALL') params.depot = depotFilter;

      const [listRes, summaryRes] = await Promise.all([
        api.routes.list(params, { signal: controller.signal }),
        api.routes.getSummary({ signal: controller.signal }),
      ]);

      const listData = Array.isArray(listRes) ? listRes : (listRes as any)?.data || [];
      const summaryData = (summaryRes as any)?.data || summaryRes || {};

      setRoutes(listData);
      setSummary({
        totalRoutes: Number(summaryData.totalRoutes) || 0,
        dispatchableRoutes: Number(summaryData.dispatchableRoutes) || 0,
        publishedRoutes: Number(summaryData.publishedRoutes) || 0,
        activeRoutes: Number(summaryData.activeRoutes) || 0,
        draftRoutes: Number(summaryData.draftRoutes) || 0,
        inactiveRoutes: Number(summaryData.inactiveRoutes) || 0,
        totalStopsConfigured: Number(summaryData.totalStopsConfigured) || 0,
        avgDistanceKm: Number(summaryData.avgDistanceKm) || 0,
        measuredRoutesCount: Number(summaryData.measuredRoutesCount) || 0,
        readinessPercentage: Number(summaryData.readinessPercentage) || 0,
      });

      setLastSyncTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Failed to load routes:', err);
      setError(err?.message || 'Unable to connect to Delivshop route service. Please check your connection and retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, statusFilter, cityFilter, depotFilter]);

  useEffect(() => {
    fetchRoutesData(false);
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchRoutesData]);

  const handleRefresh = () => {
    fetchRoutesData(true);
    showToast('Refreshing route database...');
  };

  const handleClearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('ALL');
    setCityFilter('ALL');
    setDepotFilter('ALL');
  };

  const isFilterActive = search.trim() !== '' || statusFilter !== 'ALL' || cityFilter !== 'ALL' || depotFilter !== 'ALL';

  // Extract unique cities & depots for dynamic dropdowns
  const availableCities = Array.from(new Set(routes.map(r => r.city).filter(Boolean)));
  const availableDepots = Array.from(new Set(routes.map(r => r.depot || r.depotName).filter(Boolean)));

  const handleOpenDetails = (route: Route) => {
    setSelectedRouteId(route.id);
    setIsDetailsOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
      case 'ACTIVE':
        return <Badge variant="success">PUBLISHED</Badge>;
      case 'DRAFT':
        return <Badge variant="warning">DRAFT</Badge>;
      case 'INACTIVE':
      case 'ARCHIVED':
        return <Badge variant="neutral">{status}</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="page-container">
      
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
            backgroundColor: toastMessage.type === 'success' ? '#123D32' : '#B91C1C',
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
          {toastMessage.type === 'success' ? <CheckCircle2 size={16} color="#4ADE80" /> : <AlertCircle size={16} color="#FECACA" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 1. Page Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 className="page-title">Delivery Routes</h2>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '2px 8px',
                backgroundColor: '#DCFCE7',
                border: '1px solid #BBF7D0',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#16805D',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16805D' }} />
              <span>Live Database</span>
            </div>
          </div>
          <p className="page-desc">
            Create, organize, validate, and manage shop delivery routes across cities, states, and depots.
            <span style={{ marginLeft: '10px', color: '#94A3B8', fontSize: '11.5px' }}>
              Last synchronized: {lastSyncTime}
            </span>
          </p>
        </div>

        <div className="page-header-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            icon={<RefreshCw size={15} className={refreshing ? 'spin-icon' : ''} />}
          >
            {refreshing ? 'Syncing...' : 'Refresh'}
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={() => setIsWizardOpen(true)}
            icon={<Plus size={16} />}
            style={{ fontWeight: 600, padding: '9px 18px', background: '#16805D', color: '#FFFFFF' }}
          >
            Create Delivery Route
          </Button>
        </div>
      </div>

      {/* 2. Responsive 4-Card Statistics Strip (Authoritative Backend Data) */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        
        {/* Card 1: Total Routes */}
        <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('ALL')}>
          <div className="metric-icon" style={{ backgroundColor: '#F1F7F1', color: '#16805D' }}>
            <RouteIcon size={18} />
          </div>
          <div className="metric-info">
            <span className="metric-title">TOTAL ROUTES</span>
            <span className="metric-value">{summary.totalRoutes}</span>
            <span className="metric-trend" style={{ color: '#16805D' }}>
              {summary.activeRoutes} active templates
            </span>
          </div>
        </div>

        {/* Card 2: Published & Dispatchable */}
        <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('PUBLISHED')}>
          <div className="metric-icon" style={{ backgroundColor: '#DCFCE7', color: '#16805D' }}>
            <ShieldCheck size={18} />
          </div>
          <div className="metric-info">
            <span className="metric-title">DISPATCH READY</span>
            <span className="metric-value">{summary.dispatchableRoutes ?? 0}</span>
            <span className="metric-trend" style={{ color: summary.readinessPercentage && summary.readinessPercentage > 50 ? '#16805D' : '#B45309' }}>
              {summary.totalRoutes > 0 ? `${summary.readinessPercentage}% ready for runs` : '0% ready'}
            </span>
          </div>
        </div>

        {/* Card 3: Sequenced Stops */}
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#FAF6ED', color: '#C7A75A' }}>
            <MapPin size={18} />
          </div>
          <div className="metric-info">
            <span className="metric-title">SEQUENCED STOPS</span>
            <span className="metric-value">{summary.totalStopsConfigured ?? 0}</span>
            <span className="metric-trend" style={{ color: '#64748B' }}>
              Mapped retail shops
            </span>
          </div>
        </div>

        {/* Card 4: Average Route Distance */}
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#E0F2FE', color: '#0369A1' }}>
            <Clock size={18} />
          </div>
          <div className="metric-info">
            <span className="metric-title">AVG ROUTE DISTANCE</span>
            <span className="metric-value">
              {summary.measuredRoutesCount && summary.measuredRoutesCount > 0 ? `${summary.avgDistanceKm} km` : 'Pending'}
            </span>
            <span className="metric-trend" style={{ color: '#0369A1' }}>
              {summary.measuredRoutesCount && summary.measuredRoutesCount > 0
                ? `Across ${summary.measuredRoutesCount} measured routes`
                : 'No distance data yet'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Toolbar */}
      <div className="search-filter-toolbar">
        <div className="toolbar-search-form">
          <div className="search-input-wrapper">
            <Search size={14} className="search-input-icon" />
            <input
              type="text"
              placeholder="Search by route code, route name, city, or depot..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="toolbar-search-input"
            />
          </div>
        </div>

        <div className="toolbar-filters-group">
          {/* Status Filter */}
          <div className="filter-select-wrapper">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="toolbar-select-field"
            >
              <option value="ALL">All Statuses</option>
              <option value="PUBLISHED">Published & Active</option>
              <option value="DRAFT">Draft</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          {/* City Filter */}
          <div className="filter-select-wrapper">
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="toolbar-select-field"
            >
              <option value="ALL">All Cities</option>
              <option value="Pune">Pune</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Nagpur">Nagpur</option>
              <option value="Nashik">Nashik</option>
              {availableCities.filter(c => !['Pune', 'Mumbai', 'Nagpur', 'Nashik'].includes(c)).map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          {/* Depot Filter */}
          {availableDepots.length > 0 && (
            <div className="filter-select-wrapper">
              <select
                value={depotFilter}
                onChange={(e) => setDepotFilter(e.target.value)}
                className="toolbar-select-field"
              >
                <option value="ALL">All Depots</option>
                {availableDepots.map(depot => (
                  <option key={depot} value={depot}>{depot}</option>
                ))}
              </select>
            </div>
          )}

          {/* Clear Filters Action */}
          {isFilterActive && (
            <Button
              type="button"
              variant="outline"
              onClick={handleClearFilters}
              icon={<XCircle size={14} />}
              className="btn-sm"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* 4. Routes Table & Content Surface */}
      <div className="business-card no-padding">
        
        {/* Error Banner State with Retry Action */}
        {error ? (
          <div className="table-error-container" style={{ padding: '36px 20px', textAlign: 'center' }}>
            <AlertCircle size={36} color="#B91C1C" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#20342C' }}>Unable to Load Delivery Routes</h3>
            <p style={{ fontSize: '12.5px', color: '#64748B', maxWidth: '440px', margin: '6px auto 16px' }}>
              {error}
            </p>
            <Button
              type="button"
              variant="primary"
              onClick={() => fetchRoutesData(false)}
              icon={<RefreshCw size={14} />}
            >
              Retry Loading Routes
            </Button>
          </div>
        ) : loading ? (
          /* Skeleton Loading Placeholders */
          <div style={{ padding: '16px' }}>
            <div className="skeleton-row-box" />
            <div className="skeleton-row-box" />
            <div className="skeleton-row-box" />
            <div className="skeleton-row-box" />
          </div>
        ) : routes.length === 0 ? (
          /* Genuine Empty State */
          <div className="table-empty-container">
            <RouteIcon size={40} className="empty-state-icon" />
            <h3 className="empty-state-title">
              {isFilterActive ? 'No Routes Match Your Filters' : 'No Delivery Routes Configured'}
            </h3>
            <p className="empty-state-desc" style={{ maxWidth: '440px', margin: '4px auto 16px' }}>
              {isFilterActive
                ? 'Try resetting the city, status, or search query to see other routes.'
                : 'Get started by creating your first sequenced shop delivery corridor across Maharashtra depots.'}
            </p>
            {isFilterActive ? (
              <Button type="button" variant="secondary" onClick={handleClearFilters}>
                Reset Search Filters
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                onClick={() => setIsWizardOpen(true)}
                icon={<Plus size={16} />}
              >
                Create Your First Route
              </Button>
            )}
          </div>
        ) : (
          /* Populated Routes Table */
          <div className="business-table-container">
            <table className="business-table">
              <thead>
                <tr>
                  <th style={{ width: '130px' }}>Route Code</th>
                  <th>Route Name & Corridor</th>
                  <th>Operating Area & Depot</th>
                  <th style={{ textAlign: 'center' }}>Stops</th>
                  <th style={{ textAlign: 'center' }}>Road Distance</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th>Dispatch Readiness</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {routes.map((route) => {
                  const stopsCount = route.stops_count ?? route.stopsCount ?? 0;
                  const distanceKm = route.total_distance_km ?? route.estimatedDistanceKm;
                  const isDispatchable = (route.status === 'PUBLISHED' || route.status === 'ACTIVE') && stopsCount > 0;

                  return (
                    <tr key={route.id}>
                      {/* Code */}
                      <td>
                        <span className="route-code-badge">
                          {route.route_code || route.code}
                        </span>
                        <div style={{ fontSize: '10.5px', color: '#94A3B8', marginTop: '2px', fontFamily: 'monospace' }}>
                          v{route.version || 1}
                        </div>
                      </td>

                      {/* Name */}
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>
                          {route.name}
                        </div>
                        {route.description && (
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {route.description}
                          </div>
                        )}
                      </td>

                      {/* City & Depot */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', fontWeight: 500 }}>
                          <MapPin size={13} color="#16805D" />
                          <span>{route.city}, {route.state}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '1px' }}>
                          Depot: {route.depot || route.depotName || 'Central Hub'}
                        </div>
                      </td>

                      {/* Stops Count */}
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '13px', color: stopsCount > 0 ? '#123B32' : '#B45309' }}>
                          {stopsCount}
                        </span>
                        <div style={{ fontSize: '10.5px', color: '#64748B' }}>
                          {stopsCount === 1 ? 'shop' : 'shops'}
                        </div>
                      </td>

                      {/* Distance & Duration */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--text-primary)' }}>
                          {distanceKm ? `${Number(distanceKm).toFixed(1)} km` : '—'}
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#64748B' }}>
                          {(route.estimated_duration_minutes || route.estimatedDurationMinutes)
                            ? `${Math.round(Number(route.estimated_duration_minutes || route.estimatedDurationMinutes))} mins`
                            : 'Est. pending'}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ textAlign: 'center' }}>
                        {getStatusBadge(route.status)}
                      </td>

                      {/* Readiness */}
                      <td>
                        {isDispatchable ? (
                          <span className="route-readiness-tag route-readiness-ready">
                            <CheckCircle2 size={12} color="#16805D" />
                            <span>Dispatch Ready</span>
                          </span>
                        ) : stopsCount === 0 ? (
                          <span className="route-readiness-tag route-readiness-warning">
                            <AlertTriangle size={12} color="#B45309" />
                            <span>Needs Stops (0)</span>
                          </span>
                        ) : (
                          <span className="route-readiness-tag route-readiness-warning">
                            <Clock size={12} color="#B45309" />
                            <span>Draft (Unpublished)</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div className="table-actions-group" style={{ justifyContent: 'flex-end', gap: '6px' }}>
                          <Button
                            type="button"
                            variant="secondary"
                            className="btn-table-action"
                            onClick={() => handleOpenDetails(route)}
                            icon={<Eye size={13} />}
                          >
                            Details
                          </Button>

                          {isDispatchable && onDispatchRun && (
                            <Button
                              type="button"
                              variant="primary"
                              className="btn-table-action"
                              onClick={() => onDispatchRun(route)}
                              icon={<Truck size={13} />}
                            >
                              Dispatch
                            </Button>
                          )}

                          <Button
                            type="button"
                            variant="danger"
                            className="btn-table-action"
                            onClick={() => {
                              setRouteToDelete(route);
                              setIsDeleteModalOpen(true);
                            }}
                            icon={<Trash2 size={13} />}
                            title="Delete / Archive Route"
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Route Creation Wizard Modal */}
      {isWizardOpen && (
        <RouteCreationWizard
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          onRouteCreated={(newRoute) => {
            showToast(`New delivery route ${newRoute.route_code || ''} created successfully`);
            fetchRoutesData(false);
          }}
          onOpenDetails={(routeId) => {
            setSelectedRouteId(routeId);
            setIsDetailsOpen(true);
          }}
        />
      )}

      {/* 6. Route Details Drawer */}
      {isDetailsOpen && (
        <RouteDetailsDrawer
          routeId={selectedRouteId}
          isOpen={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedRouteId(null);
          }}
          onDispatchRun={onDispatchRun}
          onDelete={(routeId) => {
            const target = routes.find(r => r.id === routeId);
            if (target) {
              setRouteToDelete(target);
              setIsDeleteModalOpen(true);
            }
          }}
        />
      )}

      {/* 7. Delete Confirmation Modal */}
      {isDeleteModalOpen && routeToDelete && (
        <DeleteRouteModal
          route={routeToDelete}
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setRouteToDelete(null);
          }}
          onDeleted={(deletedId) => {
            showToast(`Route ${routeToDelete.route_code || ''} was successfully archived.`);
            if (selectedRouteId === deletedId) {
              setIsDetailsOpen(false);
              setSelectedRouteId(null);
            }
            fetchRoutesData(false);
          }}
        />
      )}

    </div>
  );
};
