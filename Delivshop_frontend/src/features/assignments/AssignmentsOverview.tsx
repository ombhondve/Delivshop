import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Search, Truck, Calendar, Clock,
  Navigation, CheckCircle2,
  RefreshCw, Eye, X, ListFilter, AlertTriangle, Building2, MapPin
} from 'lucide-react';
import { api } from '../../services/api/endpoints';
import { DeliveryRun, Route } from '../../types';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { AssignmentWizardModal } from './AssignmentWizardModal';
import { AssignmentDetailsDrawer } from './AssignmentDetailsDrawer';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';

interface AssignmentsOverviewProps {
  initialRoute?: Route | null;
}

export const AssignmentsOverview: React.FC<AssignmentsOverviewProps> = ({ initialRoute }) => {
  const [runs, setRuns] = useState<DeliveryRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [depotFilter, setDepotFilter] = useState('ALL');

  // Modals & Drawers
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (statusFilter === 'ARCHIVED') {
        params.includeArchived = 'true';
      } else if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      if (dateFilter) params.deliveryDate = dateFilter;

      const res: any = await api.assignments.list(params);
      const list = Array.isArray(res) ? res : res?.data || [];
      setRuns(list);
    } catch (err: any) {
      console.error('Failed to load assignments:', err);
      setError(err?.message || 'Failed to retrieve delivery run assignments from server. Please check connection and retry.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFilter]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const safeRuns = Array.isArray(runs) ? runs.filter(Boolean) : [];

  const filteredRuns = safeRuns.filter(r => {
    if (!r) return false;
    const code = r.run_code || r.runCode || '';
    const driver = r.driver_name || r.driverName || '';
    const vehicle = r.vehicle_registration || r.registrationNumber || '';
    const route = r.route_name || r.routeName || '';
    const routeDepot = r.route_depot || '';

    const matchesSearch = 
      code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      route.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDepot = depotFilter === 'ALL' || routeDepot.toLowerCase().includes(depotFilter.toLowerCase());

    return matchesSearch && matchesDepot;
  });

  // Statistics
  const totalRuns = safeRuns.length;
  const assignedRuns = safeRuns.filter(r => r && (r.status === 'ASSIGNED' || r.status === 'READY')).length;
  const inProgressRuns = safeRuns.filter(r => r && r.status === 'IN_PROGRESS').length;
  const completedRuns = safeRuns.filter(r => r && r.status === 'COMPLETED').length;
  const cancelledRuns = safeRuns.filter(r => r && r.status === 'CANCELLED').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="success">Completed</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="info">In Progress</Badge>;
      case 'ASSIGNED':
      case 'READY':
        return <Badge variant="navy">Ready to Dispatch</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger">Cancelled</Badge>;
      case 'ARCHIVED':
        return <Badge variant="neutral">Archived</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const isFiltered = Boolean(searchTerm || statusFilter !== 'ALL' || dateFilter || depotFilter !== 'ALL');

  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setDateFilter('');
    setDepotFilter('ALL');
  };

  return (
    <div className="page-container">
      {/* 1. Page Header */}
      <div className="page-header" style={{ marginBottom: '16px' }}>
        <div>
          <h1 className="page-title">Assignments & Dispatch</h1>
          <p className="page-desc">
            Daily operational delivery runs coordinating scheduled routes, drivers, and fleet vehicles.
          </p>
        </div>
        <div className="page-header-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={() => loadAssignments()}
            icon={<RefreshCw size={15} className={loading ? 'spin-icon' : ''} />}
            title="Refresh runs"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => setIsWizardOpen(true)}
            icon={<Plus size={16} />}
          >
            New Dispatch
          </Button>
        </div>
      </div>

      {/* 2. Compact 5-Card Clickable KPI Summary Strip */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {/* Total Runs */}
        <div
          className="metric-card"
          onClick={() => setStatusFilter('ALL')}
          style={{
            cursor: 'pointer',
            borderColor: statusFilter === 'ALL' ? 'var(--color-primary)' : undefined,
            backgroundColor: statusFilter === 'ALL' ? 'var(--color-primary-subtle)' : undefined,
          }}
          title="Click to view all scheduled runs"
        >
          <div className="metric-icon" style={{ backgroundColor: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
            <Calendar size={18} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Total Runs</span>
            <span className="metric-value">{totalRuns}</span>
            <span className="metric-trend" style={{ color: 'var(--color-primary)' }}>
              Operational roster
            </span>
          </div>
        </div>

        {/* Ready to Dispatch */}
        <div
          className="metric-card"
          onClick={() => setStatusFilter('ASSIGNED')}
          style={{
            cursor: 'pointer',
            borderColor: statusFilter === 'ASSIGNED' ? 'var(--color-primary)' : undefined,
            backgroundColor: statusFilter === 'ASSIGNED' ? 'var(--color-primary-subtle)' : undefined,
          }}
          title="Click to filter verified assignments ready for dispatch"
        >
          <div className="metric-icon" style={{ backgroundColor: '#EDE9FE', color: '#6D28D9' }}>
            <Navigation size={18} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Scheduled</span>
            <span className="metric-value">{assignedRuns}</span>
            <span className="metric-trend" style={{ color: '#6D28D9' }}>
              Ready for dispatch
            </span>
          </div>
        </div>

        {/* Active on Road */}
        <div
          className="metric-card"
          onClick={() => setStatusFilter('IN_PROGRESS')}
          style={{
            cursor: 'pointer',
            borderColor: statusFilter === 'IN_PROGRESS' ? 'var(--color-warning)' : undefined,
            backgroundColor: statusFilter === 'IN_PROGRESS' ? 'var(--color-warning-bg)' : undefined,
          }}
          title="Click to filter active delivery runs in transit"
        >
          <div className="metric-icon" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>
            <Truck size={18} />
          </div>
          <div className="metric-info">
            <span className="metric-title">In Progress</span>
            <span className="metric-value">{inProgressRuns}</span>
            <span className="metric-trend" style={{ color: '#B45309' }}>
              Active in transit
            </span>
          </div>
        </div>

        {/* Completed Trips */}
        <div
          className="metric-card"
          onClick={() => setStatusFilter('COMPLETED')}
          style={{
            cursor: 'pointer',
            borderColor: statusFilter === 'COMPLETED' ? 'var(--color-success)' : undefined,
            backgroundColor: statusFilter === 'COMPLETED' ? 'var(--color-success-bg)' : undefined,
          }}
          title="Click to filter completed trips"
        >
          <div className="metric-icon" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
            <CheckCircle2 size={18} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Completed</span>
            <span className="metric-value">{completedRuns}</span>
            <span className="metric-trend" style={{ color: 'var(--color-success)' }}>
              {totalRuns > 0 ? Math.round((completedRuns / totalRuns) * 100) : 0}% success rate
            </span>
          </div>
        </div>

        {/* Cancelled Trips */}
        <div
          className="metric-card"
          onClick={() => setStatusFilter('CANCELLED')}
          style={{
            cursor: 'pointer',
            borderColor: statusFilter === 'CANCELLED' ? 'var(--color-danger)' : undefined,
            backgroundColor: statusFilter === 'CANCELLED' ? '#FEE2E2' : undefined,
          }}
          title="Click to filter cancelled runs"
        >
          <div className="metric-icon" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
            <AlertTriangle size={18} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Cancelled</span>
            <span className="metric-value">{cancelledRuns}</span>
            <span className="metric-trend" style={{ color: '#DC2626' }}>
              Exceptions
            </span>
          </div>
        </div>
      </div>

      {/* 3. Search and Filter Toolbar */}
      <div className="search-filter-toolbar">
        <div className="toolbar-search-form">
          <div className="search-input-wrapper">
            <Search size={18} className="search-input-icon" />
            <input
              type="text"
              placeholder="Search by assignment ID, driver, vehicle, or route..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="toolbar-search-input"
              aria-label="Search delivery runs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
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
            <ListFilter size={16} className="filter-leading-icon" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="toolbar-select-field"
              aria-label="Filter by run status"
            >
              <option value="ALL">All Run Statuses</option>
              <option value="ASSIGNED">Scheduled (Ready)</option>
              <option value="IN_PROGRESS">In Progress (Transit)</option>
              <option value="COMPLETED">Completed Trips</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="ARCHIVED">Archived Records</option>
            </select>
          </div>

          {/* Delivery Date Filter */}
          <div className="filter-select-wrapper">
            <Calendar size={16} className="filter-leading-icon" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="toolbar-select-field"
              aria-label="Filter by delivery date"
            />
          </div>

          {/* Depot Filter */}
          <div className="filter-select-wrapper">
            <Building2 size={16} className="filter-leading-icon" />
            <select
              value={depotFilter}
              onChange={(e) => setDepotFilter(e.target.value)}
              className="toolbar-select-field"
              aria-label="Filter by depot location"
            >
              <option value="ALL">All Depots</option>
              <option value="Pune Central">Pune Central Depot</option>
              <option value="Hadapsar">Hadapsar Hub</option>
              <option value="Hinjewadi">Hinjewadi Hub</option>
              <option value="Katraj">Katraj Cold Storage</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {isFiltered && (
            <button
              type="button"
              className="btn btn-secondary toolbar-sort-btn"
              onClick={clearAllFilters}
              title="Reset all active filters"
              style={{ color: 'var(--color-danger)' }}
            >
              <X size={14} />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Table Card */}
      <Card
        title="Daily Operational Delivery Runs"
        subtitle={`Showing ${filteredRuns.length} of ${runs.length} delivery runs configured in central database`}
        noPadding
      >
        {error && (
          <div
            style={{
              margin: '16px',
              padding: '14px 18px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={20} color="#DC2626" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#991B1B' }}>
                  Unable to Synchronize Delivery Runs
                </div>
                <div style={{ fontSize: '12px', color: '#B91C1C', marginTop: '2px' }}>
                  {error}
                </div>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => loadAssignments()}
              icon={<RefreshCw size={14} className={loading ? 'spin-icon' : ''} />}
            >
              {loading ? 'Retrying...' : 'Retry'}
            </Button>
          </div>
        )}

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
            <RefreshCw size={24} className="spin-icon text-muted" style={{ margin: '0 auto 8px auto' }} />
            <p style={{ fontSize: '13px' }}>Retrieving live delivery run assignments...</p>
          </div>
        ) : error && filteredRuns.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748B' }}>
            <AlertTriangle size={36} color="#DC2626" style={{ margin: '0 auto 10px auto', opacity: 0.8 }} />
            <h4 style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Failed to Load Operational Assignments
            </h4>
            <p style={{ fontSize: '12.5px', maxWidth: '420px', margin: '6px auto 16px auto', color: '#64748B' }}>
              {error}
            </p>
            <Button variant="primary" onClick={() => loadAssignments()} icon={<RefreshCw size={14} />}>
              Retry Connection
            </Button>
          </div>
        ) : filteredRuns.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748B' }}>
            <Truck size={36} style={{ margin: '0 auto 10px auto', opacity: 0.4 }} />
            <h4 style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
              No Delivery Runs Found
            </h4>
            <p style={{ fontSize: '12.5px', marginTop: '4px', maxWidth: '420px', margin: '4px auto 16px auto' }}>
              {isFiltered
                ? 'No delivery runs match your active search or filter criteria.'
                : 'Plan and dispatch your first delivery run for today.'}
            </p>
            {isFiltered ? (
              <Button variant="secondary" size="sm" onClick={clearAllFilters}>
                Clear All Filters
              </Button>
            ) : (
              <Button variant="primary" onClick={() => setIsWizardOpen(true)} icon={<Plus size={15} />}>
                New Dispatch
              </Button>
            )}
          </div>
        ) : (
          <div className="business-table-container">
            <table className="business-table">
              <thead>
                <tr>
                  <th style={{ width: '160px', minWidth: '150px' }}>Assignment ID</th>
                  <th style={{ width: '130px', minWidth: '120px' }}>Date & Schedule</th>
                  <th style={{ width: '180px', minWidth: '160px' }}>Driver</th>
                  <th style={{ width: '190px', minWidth: '170px' }}>Route</th>
                  <th style={{ width: '170px', minWidth: '150px' }}>Fleet Vehicle</th>
                  <th style={{ width: '140px', minWidth: '120px' }}>Stops Progress</th>
                  <th style={{ width: '140px', minWidth: '120px' }}>Assignment Status</th>
                  <th style={{ width: '110px', minWidth: '95px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRuns.map((run) => (
                  <tr key={run.id}>
                    {/* 1. Assignment ID */}
                    <td style={{ width: '160px', minWidth: '150px' }}>
                      <code
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          fontSize: '11.5px',
                          color: 'var(--color-primary)',
                          backgroundColor: 'var(--color-primary-subtle)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: '1px solid #6EE7B7',
                        }}
                      >
                        {run.run_code || run.runCode}
                      </code>
                    </td>

                    {/* 2. Date & Schedule */}
                    <td style={{ width: '130px', minWidth: '120px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {run.delivery_date || run.deliveryDate}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                        <Clock size={11} />
                        <span>06:00 AM</span>
                      </div>
                    </td>

                    {/* 3. Driver */}
                    <td style={{ width: '180px', minWidth: '160px' }}>
                      {(run.driver_name || run.driverName) ? (
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--text-primary)' }}>
                            {run.driver_name || run.driverName}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>{(run as any).driver_employee_id ? `[${(run as any).driver_employee_id}]` : ''}</span>
                            <span>{run.driver_phone || run.driverPhone || '—'}</span>
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '11.5px', color: '#D97706', fontWeight: 500 }}>Unassigned</span>
                      )}
                    </td>

                    {/* 4. Route */}
                    <td style={{ width: '190px', minWidth: '170px' }}>
                      <div style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--text-primary)' }}>
                        {run.route_name || run.routeName || 'Sequenced Route'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>
                        {run.route_code || run.routeCode || 'RT-CORRIDOR'} • {run.route_depot || 'Main Depot'}
                      </div>
                    </td>

                    {/* 5. Vehicle */}
                    <td style={{ width: '170px', minWidth: '150px' }}>
                      {(run.vehicle_registration || run.registrationNumber) ? (
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '12.5px', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                            {run.vehicle_registration || run.registrationNumber}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>
                            {run.vehicle_type || run.vehicleType || 'Commercial Van'}
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '11.5px', color: '#D97706', fontWeight: 500 }}>Unallocated</span>
                      )}
                    </td>

                    {/* 6. Stops Progress */}
                    <td style={{ width: '140px', minWidth: '120px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--text-primary)' }}>
                          {run.completed_stops_count ?? run.completedStopsCount ?? 0}/{run.planned_stops_count ?? run.totalStopsCount ?? 0}
                        </span>
                        <div style={{ width: '48px', height: '6px', backgroundColor: '#D6D3C8', borderRadius: '3px', overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              height: '100%',
                              backgroundColor: 'var(--color-primary)',
                              borderRadius: '3px',
                              width: `${(run.planned_stops_count ?? run.totalStopsCount ?? 0) > 0 
                                ? Math.round(((run.completed_stops_count ?? run.completedStopsCount ?? 0) / (run.planned_stops_count ?? run.totalStopsCount ?? 1)) * 100) 
                                : 0}%` 
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* 7. Status */}
                    <td style={{ width: '140px', minWidth: '120px' }}>
                      {getStatusBadge(run.status)}
                    </td>

                    {/* 8. Actions */}
                    <td style={{ width: '110px', minWidth: '95px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRunId(run.id);
                          setIsDetailsOpen(true);
                        }}
                        className="btn btn-secondary btn-table-action"
                        style={{
                          height: '28px',
                          padding: '0 10px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--color-primary)',
                          backgroundColor: 'var(--color-primary-subtle)',
                          border: '1px solid #6EE7B7',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                        title={`View delivery run details for ${run.run_code || run.runCode}`}
                      >
                        <Eye size={13} />
                        <span>Details</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Creation Wizard */}
      {isWizardOpen && (
        <ErrorBoundary title="Assignment Dispatch Wizard Error">
          <AssignmentWizardModal
            isOpen={isWizardOpen}
            onClose={() => setIsWizardOpen(false)}
            onAssignmentCreated={() => {
              setIsWizardOpen(false);
              loadAssignments();
            }}
            preselectedRoute={initialRoute}
          />
        </ErrorBoundary>
      )}

      {/* Details Drawer */}
      {isDetailsOpen && (
        <ErrorBoundary title="Assignment Details Error">
          <AssignmentDetailsDrawer
            runId={selectedRunId}
            isOpen={isDetailsOpen}
            onClose={() => {
              setIsDetailsOpen(false);
              setSelectedRunId(null);
            }}
            onRunUpdated={loadAssignments}
          />
        </ErrorBoundary>
      )}
    </div>
  );
};

