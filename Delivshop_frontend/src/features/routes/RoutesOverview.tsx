import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Plus, Search, MapPin, CheckCircle2, 
  Truck, RefreshCw, Eye, ShieldCheck, 
  AlertCircle, X, Route as RouteIcon, Trash2,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { api } from '../../services/api/endpoints';
import { Route, RouteSummary } from '../../types';
import { RouteCreationWizard } from './RouteCreationWizard';
import { DeleteRouteModal } from './DeleteRouteModal';
import { useNavigation } from '../../context/NavigationContext';

interface RoutesOverviewProps {
  onDispatchRun?: (route: Route) => void;
}

export const RoutesOverview: React.FC<RoutesOverviewProps> = ({ onDispatchRun }) => {
  const { navigate } = useNavigation();

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
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [depotFilter, setDepotFilter] = useState('ALL');

  // Pagination (Default 7 per page, exactly matching Drivers & Vehicles)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(7);

  // Modals state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
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
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const handleStatusFilterChange = (val: string) => {
    setStatusFilter(val);
    setPage(1);
  };

  const handleCityFilterChange = (val: string) => {
    setCityFilter(val);
    setPage(1);
  };

  const handleDepotFilterChange = (val: string) => {
    setDepotFilter(val);
    setPage(1);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('ALL');
    setCityFilter('ALL');
    setDepotFilter('ALL');
    setPage(1);
  };

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
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Failed to load routes:', err);
      setError(err?.message || 'Unable to connect to route service. Please check your connection and retry.');
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
    showToast('Refreshing routes...');
  };

  const isFilterActive = search.trim() !== '' || statusFilter !== 'ALL' || cityFilter !== 'ALL' || depotFilter !== 'ALL';

  // Extract unique cities & depots for dynamic dropdowns
  const availableCities = Array.from(new Set(routes.map(r => r.city).filter(Boolean)));
  const availableDepots = Array.from(new Set(routes.map(r => r.depot || r.depotName).filter(Boolean)));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
      case 'ACTIVE':
        return <Badge variant="success">PUBLISHED</Badge>;
      case 'DRAFT':
        return <Badge variant="warning">DRAFT</Badge>;
      case 'INACTIVE':
      case 'ARCHIVED':
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  // Pagination slicing
  const totalCount = routes.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const displayedRoutes = routes.slice((page - 1) * pageSize, page * pageSize);

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

      {/* 1. Page Header (Simplified Title & Actions) */}
      <div className="page-header" style={{ marginBottom: '16px' }}>
        <div>
          <h1 className="page-title">Routes</h1>
        </div>

        <div className="page-header-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            icon={<RefreshCw size={15} className={refreshing ? 'spin-icon' : ''} />}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={() => setIsWizardOpen(true)}
            icon={<Plus size={16} />}
          >
            Create Route
          </Button>
        </div>
      </div>

      {/* 2. Responsive 4-Card Statistics Strip (Clean & Compact) */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        
        {/* Card 1: Total Routes */}
        <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => handleStatusFilterChange('ALL')}>
          <div className="metric-icon" style={{ backgroundColor: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
            <RouteIcon size={18} />
          </div>
          <div className="metric-info">
            <span className="metric-title">TOTAL ROUTES</span>
            <span className="metric-value">{summary.totalRoutes}</span>
          </div>
        </div>

        {/* Card 2: Published */}
        <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => handleStatusFilterChange('PUBLISHED')}>
          <div className="metric-icon" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
            <ShieldCheck size={18} />
          </div>
          <div className="metric-info">
            <span className="metric-title">DISPATCH READY</span>
            <span className="metric-value">{summary.dispatchableRoutes ?? 0}</span>
          </div>
        </div>

        {/* Card 3: Total Stops */}
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
            <MapPin size={18} />
          </div>
          <div className="metric-info">
            <span className="metric-title">TOTAL STOPS</span>
            <span className="metric-value">{summary.totalStopsConfigured ?? 0}</span>
          </div>
        </div>

        {/* Card 4: Average Distance */}
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#E0F2FE', color: '#0369A1' }}>
            <RouteIcon size={18} />
          </div>
          <div className="metric-info">
            <span className="metric-title">AVG DISTANCE</span>
            <span className="metric-value">
              {summary.measuredRoutesCount && summary.measuredRoutesCount > 0 ? `${summary.avgDistanceKm} km` : '—'}
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
              placeholder="Search routes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="toolbar-search-input"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '2px',
                }}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="toolbar-filters-group">
          {/* Status Filter */}
          <div className="filter-select-wrapper">
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="toolbar-select-field"
              aria-label="Filter by route status"
            >
              <option value="ALL">All Statuses</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          {/* City Filter */}
          <div className="filter-select-wrapper">
            <select
              value={cityFilter}
              onChange={(e) => handleCityFilterChange(e.target.value)}
              className="toolbar-select-field"
              aria-label="Filter by city"
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
                onChange={(e) => handleDepotFilterChange(e.target.value)}
                className="toolbar-select-field"
                aria-label="Filter by depot"
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
              variant="secondary"
              onClick={handleClearFilters}
              icon={<X size={14} />}
              style={{ color: 'var(--color-danger)' }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* 4. Routes Table Card */}
      <Card title="Routes" noPadding>
        {error ? (
          <div style={{ padding: '30px', textAlign: 'center' }}>
            <p style={{ color: '#B91C1C', fontSize: '13.5px', marginBottom: '12px' }}>{error}</p>
            <Button variant="secondary" size="sm" onClick={() => fetchRoutesData(false)}>
              Retry Connection
            </Button>
          </div>
        ) : loading && routes.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
            <RefreshCw size={24} className="spin-icon text-muted" style={{ margin: '0 auto 8px auto' }} />
            <p style={{ fontSize: '13px' }}>Loading routes...</p>
          </div>
        ) : routes.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748B' }}>
            <RouteIcon size={36} style={{ margin: '0 auto 10px auto', opacity: 0.4 }} />
            <h4 style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
              No matching routes found
            </h4>
            <p style={{ fontSize: '12.5px', marginTop: '4px', maxWidth: '420px', margin: '4px auto 16px auto' }}>
              {isFilterActive
                ? 'No routes match your active search and filter criteria.'
                : 'No delivery routes are configured yet.'}
            </p>
            {isFilterActive ? (
              <Button variant="secondary" size="sm" onClick={handleClearFilters}>
                Clear All Filters
              </Button>
            ) : (
              <Button variant="primary" onClick={() => setIsWizardOpen(true)} icon={<Plus size={15} />}>
                Create Route
              </Button>
            )}
          </div>
        ) : (
          <div
            className="business-table-container"
            tabIndex={0}
            role="region"
            aria-label="Routes table"
            style={{
              maxHeight: pageSize > 7 ? '540px' : 'none',
              overflowY: pageSize > 7 ? 'auto' : 'visible',
              overflowX: 'auto',
              position: 'relative',
            }}
          >
            <table className="business-table">
              <thead
                style={{
                  position: pageSize > 7 ? 'sticky' : 'static',
                  top: 0,
                  zIndex: 10,
                  backgroundColor: '#F8FAFC',
                }}
              >
                <tr>
                  <th style={{ width: '240px', minWidth: '200px' }}>Route</th>
                  <th style={{ width: '200px', minWidth: '160px' }}>Location</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Stops</th>
                  <th style={{ width: '130px', textAlign: 'center' }}>Distance</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Status</th>
                  <th style={{ width: '180px', minWidth: '160px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedRoutes.map((route) => {
                  const stopsCount = route.stops_count ?? route.stopsCount ?? route.stops?.length ?? 0;
                  const distanceKm = route.total_distance_km ?? route.estimatedDistanceKm;
                  const isDispatchable = (route.status === 'PUBLISHED' || route.status === 'ACTIVE') && stopsCount > 0;

                  return (
                    <tr key={route.id}>
                      {/* 1. Route Name & Code */}
                      <td style={{ width: '240px', minWidth: '200px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              backgroundColor: 'var(--color-navy)',
                              color: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <RouteIcon size={14} />
                          </div>
                          <div style={{ minWidth: 0, overflow: 'hidden' }}>
                            <div
                              onClick={() => navigate(`/admin/routes/${route.id}`)}
                              style={{
                                fontWeight: 600,
                                fontSize: '13px',
                                color: 'var(--color-navy)',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                              title={route.name}
                            >
                              {route.name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '1px' }}>
                              <span
                                style={{
                                  fontFamily: 'monospace',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  color: 'var(--color-primary)',
                                  backgroundColor: 'var(--color-primary-subtle)',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  border: '1px solid #6EE7B7',
                                }}
                              >
                                {route.route_code || route.code}
                              </span>
                              <span style={{ fontSize: '10.5px', color: '#94A3B8' }}>
                                v{route.version || 1}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. City & Depot */}
                      <td style={{ width: '200px', minWidth: '160px' }}>
                        <div style={{ fontSize: '12.5px', fontWeight: 500, color: '#334155' }}>
                          {route.city}, {route.state}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>
                          {route.depot || route.depotName || 'Central Hub'}
                        </div>
                      </td>

                      {/* 3. Stops Count */}
                      <td style={{ width: '100px', textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '13px', color: stopsCount > 0 ? 'var(--text-primary)' : 'var(--color-warning)' }}>
                          {stopsCount}
                        </span>
                        <span style={{ fontSize: '10.5px', color: '#64748B', marginLeft: '3px' }}>
                          {stopsCount === 1 ? 'shop' : 'shops'}
                        </span>
                      </td>

                      {/* 4. Distance & Est. Time */}
                      <td style={{ width: '130px', textAlign: 'center' }}>
                        <div style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--text-primary)' }}>
                          {distanceKm ? `${Number(distanceKm).toFixed(1)} km` : '—'}
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#64748B' }}>
                          {(route.estimated_duration_minutes || route.estimatedDurationMinutes)
                            ? `${Math.round(Number(route.estimated_duration_minutes || route.estimatedDurationMinutes))} mins`
                            : 'Pending'}
                        </div>
                      </td>

                      {/* 5. Status */}
                      <td style={{ width: '120px', textAlign: 'center' }}>
                        {getStatusBadge(route.status)}
                      </td>

                      {/* 6. Actions */}
                      <td style={{ width: '180px', minWidth: '160px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px' }}>
                          <Button
                            type="button"
                            variant="secondary"
                            className="btn-table-action"
                            onClick={() => navigate(`/admin/routes/${route.id}`)}
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

                          <button
                            type="button"
                            onClick={() => {
                              setRouteToDelete(route);
                              setIsDeleteModalOpen(true);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              border: '1px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              color: '#64748B',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            className="hover:text-red-600 hover:border-red-300 hover:bg-red-50"
                            title="Delete route"
                            aria-label={`Delete route ${route.name}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Pagination Footer (Identical to Drivers and Vehicles) */}
        <div className="table-pagination-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <span className="pagination-info">
              Showing <strong>{totalCount > 0 ? (page - 1) * pageSize + 1 : 0}</strong>–<strong>{totalCount > 0 ? Math.min(page * pageSize, totalCount) : 0}</strong> of <strong>{totalCount}</strong> routes
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label htmlFor="route-rows-per-page-select" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Rows per page:
              </label>
              <select
                id="route-rows-per-page-select"
                className="toolbar-select-field"
                style={{ height: '28px', padding: '0 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #CBD5E1' }}
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              >
                <option value={7}>7</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Page <strong>{page}</strong> of <strong>{totalPages}</strong>
            </span>
            <div className="pagination-buttons" style={{ display: 'flex', gap: '6px' }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                title="Previous page"
                aria-label="Previous page"
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                title="Next page"
                aria-label="Next page"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* 5. Route Creation Wizard Modal */}
      {isWizardOpen && (
        <RouteCreationWizard
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          onRouteCreated={(newRoute) => {
            showToast(`Route ${newRoute.route_code || ''} created successfully`);
            fetchRoutesData(false);
          }}
          onOpenDetails={(routeId) => {
            navigate(`/admin/routes/${routeId}`);
          }}
        />
      )}

      {/* 6. Delete Confirmation Modal */}
      {isDeleteModalOpen && routeToDelete && (
        <DeleteRouteModal
          route={routeToDelete}
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setRouteToDelete(null);
          }}
          onDeleted={() => {
            showToast(`Route ${routeToDelete.route_code || ''} deleted.`);
            fetchRoutesData(false);
          }}
        />
      )}

    </div>
  );
};
