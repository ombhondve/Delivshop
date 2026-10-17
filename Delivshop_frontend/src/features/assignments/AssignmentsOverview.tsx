import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, Truck, Calendar, User, 
  Navigation, CheckCircle2, Clock, AlertTriangle, 
  RefreshCw, Eye, AlertCircle
} from 'lucide-react';
import { api } from '../../services/api/endpoints';
import { DeliveryRun, Route } from '../../types';
import { Button } from '../../components/common/Button';
import { AssignmentWizardModal } from './AssignmentWizardModal';
import { AssignmentDetailsDrawer } from './AssignmentDetailsDrawer';

interface AssignmentsOverviewProps {
  initialRoute?: Route | null;
}

export const AssignmentsOverview: React.FC<AssignmentsOverviewProps> = ({ initialRoute }) => {
  const [runs, setRuns] = useState<DeliveryRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');

  // Modals
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    loadAssignments();
  }, [statusFilter, dateFilter]);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (dateFilter) params.deliveryDate = dateFilter;

      const res: any = await api.assignments.list(params);
      const list = Array.isArray(res) ? res : res?.data || [];
      setRuns(list);
    } catch (err) {
      console.error('Failed to load assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRuns = runs.filter(r => {
    const code = r.run_code || r.runCode || '';
    const driver = r.driver_name || r.driverName || '';
    const vehicle = r.vehicle_registration || r.registrationNumber || '';
    const route = r.route_name || r.routeName || '';

    return (
      code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      route.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Statistics
  const totalRuns = runs.length;
  const inProgressRuns = runs.filter(r => r.status === 'IN_PROGRESS').length;
  const completedRuns = runs.filter(r => r.status === 'COMPLETED').length;
  const assignedRuns = runs.filter(r => r.status === 'ASSIGNED').length;

  return (
    <div className="page-container">
      {/* Header */}
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
            icon={<RefreshCw className="w-4 h-4" />}
            title="Refresh runs"
          >
            Refresh
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => setIsWizardOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Dispatch New Run
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Scheduled Runs</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{totalRuns}</span>
            <span className="text-xs text-slate-500 font-medium">{assignedRuns} pending start</span>
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active on Road</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-600">{inProgressRuns}</span>
            <span className="text-xs text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-full">
              In Transit
            </span>
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed Trips</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-600">{completedRuns}</span>
            <span className="text-xs text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
              {totalRuns > 0 ? Math.round((completedRuns / totalRuns) * 100) : 0}% success
            </span>
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ready for Dispatch</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Navigation className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{assignedRuns}</span>
            <span className="text-xs text-slate-500 font-medium">Verified assignments</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search run code, driver, vehicle..."
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
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-slate-500">Date:</span>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {dateFilter && (
              <button 
                onClick={() => setDateFilter('')}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-slate-500 mt-3 font-medium">Loading assignments...</p>
          </div>
        ) : filteredRuns.length === 0 ? (
          <div className="p-12 text-center">
            <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-900">No Delivery Runs Found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'ALL' || dateFilter
                ? 'No runs match your search or filter filters.'
                : 'Plan and dispatch your first delivery run for today.'}
            </p>
            <button
              onClick={() => setIsWizardOpen(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Dispatch First Run
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Run Code & Date</th>
                  <th className="py-3.5 px-4">Route Template</th>
                  <th className="py-3.5 px-4">Assigned Driver</th>
                  <th className="py-3.5 px-4">Fleet Vehicle</th>
                  <th className="py-3.5 px-4">Stops Progress</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-mono font-bold text-blue-700 text-xs">{run.run_code || run.runCode}</div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{run.delivery_date || run.deliveryDate}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-semibold text-slate-900">{run.route_name || run.routeName || 'Sequenced Route'}</div>
                      <div className="text-xs text-slate-400 font-mono">{run.route_code || run.routeCode || 'RT'}</div>
                    </td>
                    <td className="py-4 px-4">
                      {(run.driver_name || run.driverName) ? (
                        <div>
                          <div className="font-medium text-slate-900">{run.driver_name || run.driverName}</div>
                          <div className="text-xs text-slate-400">{run.driver_phone || run.driverPhone || '—'}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-amber-600 font-medium">Unassigned</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {(run.vehicle_registration || run.registrationNumber) ? (
                        <div>
                          <div className="font-mono font-bold text-slate-900">{run.vehicle_registration || run.registrationNumber}</div>
                          <div className="text-xs text-slate-400">{run.vehicle_type || run.vehicleType || 'Fleet'}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-amber-600 font-medium">Unassigned</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-slate-900">
                          {run.completed_stops_count ?? run.completedStopsCount ?? 0}/{run.planned_stops_count ?? run.totalStopsCount ?? 0}
                        </span>
                        <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-blue-600 h-1.5 rounded-full"
                            style={{ 
                              width: `${(run.planned_stops_count ?? run.totalStopsCount ?? 0) > 0 
                                ? Math.round(((run.completed_stops_count ?? run.completedStopsCount ?? 0) / (run.planned_stops_count ?? run.totalStopsCount ?? 1)) * 100) 
                                : 0}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                        run.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                        run.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                        run.status === 'ASSIGNED' ? 'bg-purple-100 text-purple-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedRunId(run.id);
                          setIsDetailsOpen(true);
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center space-x-1 font-medium text-xs"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Details</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Creation Wizard */}
      {isWizardOpen && (
        <AssignmentWizardModal
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          onAssignmentCreated={() => {
            setIsWizardOpen(false);
            loadAssignments();
          }}
          preselectedRoute={initialRoute}
        />
      )}

      {/* Details Drawer */}
      {isDetailsOpen && (
        <AssignmentDetailsDrawer
          runId={selectedRunId}
          isOpen={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedRunId(null);
          }}
          onRunUpdated={loadAssignments}
        />
      )}
    </div>
  );
};
