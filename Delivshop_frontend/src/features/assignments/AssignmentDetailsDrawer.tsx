import React, { useState, useEffect } from 'react';
import { 
  X, Truck, User, Navigation, Calendar, Clock, 
  CheckCircle2, AlertTriangle, AlertCircle, Phone, 
  MapPin, RefreshCw, Check, ShieldCheck, ChevronRight
} from 'lucide-react';
import { api } from '../../services/api/endpoints';
import { DeliveryRun, DeliveryRunStop } from '../../types';

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
  onRunUpdated
}) => {
  const [run, setRun] = useState<DeliveryRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Selected stop for status update
  const [selectedStop, setSelectedStop] = useState<DeliveryRunStop | null>(null);
  const [stopNotes, setStopNotes] = useState('');
  const [recipientName, setRecipientName] = useState('');

  useEffect(() => {
    if (isOpen && runId) {
      loadRunDetails(runId);
    }
  }, [isOpen, runId]);

  const loadRunDetails = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res: any = await api.assignments.get(id);
      const data = res?.data || res;
      setRun(data);
    } catch (err: any) {
      setError(err?.message || 'Error fetching run details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRunStatus = async (newStatus: string) => {
    if (!run) return;
    setActionLoading(true);
    try {
      const res: any = await api.assignments.updateStatus(run.id, newStatus);
      const data = res?.data || res;
      setRun(data);
      onRunUpdated();
    } catch (err: any) {
      alert('Failed to update run status: ' + (err?.message || 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStopStatus = async (status: string) => {
    if (!run || !selectedStop) return;
    setActionLoading(true);
    try {
      const seq = selectedStop.stop_sequence !== undefined ? selectedStop.stop_sequence : selectedStop.sequenceIndex !== undefined ? selectedStop.sequenceIndex : 0;
      await api.assignments.updateStopStatus(run.id, seq, {
        status,
        recipientName: recipientName || undefined,
        notes: stopNotes || undefined
      });

      setSelectedStop(null);
      setStopNotes('');
      setRecipientName('');
      await loadRunDetails(run.id);
      onRunUpdated();
    } catch (err: any) {
      alert('Failed to update stop: ' + (err?.message || 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  const completedStops = run ? (run.completed_stops_count ?? run.completedStopsCount ?? 0) : 0;
  const plannedStops = run ? (run.planned_stops_count ?? run.totalStopsCount ?? 0) : 0;
  const progressPercent = plannedStops > 0 ? Math.round((completedStops / plannedStops) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-sm flex justify-end transition-opacity">
      <div className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded">
                  {run?.run_code || run?.runCode || 'Run'}
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                  run?.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                  run?.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                  run?.status === 'ASSIGNED' ? 'bg-purple-100 text-purple-800' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {run?.status || 'STATUS'}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-1">
                {(run?.route_name || run?.routeName) ? `${run.route_name || run.routeName} Run` : 'Delivery Run Details'}
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {run?.status === 'ASSIGNED' && (
              <button
                onClick={() => handleUpdateRunStatus('IN_PROGRESS')}
                disabled={actionLoading}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors shadow-sm disabled:opacity-50"
              >
                <span>Start Run</span>
              </button>
            )}
            {run?.status === 'IN_PROGRESS' && (
              <button
                onClick={() => handleUpdateRunStatus('COMPLETED')}
                disabled={actionLoading}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors shadow-sm disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Complete Run</span>
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

        {/* Content */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 text-red-700 flex items-center space-x-3 m-6 rounded-xl border border-red-200">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Unable to display run</p>
              <p className="text-sm mt-0.5">{error}</p>
            </div>
          </div>
        ) : run ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
            
            {/* Meta summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Driver</span>
                <p className="text-sm font-bold text-slate-900 mt-1">{run.driver_name || run.driverName || 'Not Assigned'}</p>
                <p className="text-xs text-slate-500 mt-0.5">{run.driver_phone || run.driverPhone || '—'}</p>
              </div>

              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Vehicle</span>
                <p className="text-sm font-bold font-mono text-slate-900 mt-1">{run.vehicle_registration || run.registrationNumber || 'Not Assigned'}</p>
                <p className="text-xs text-slate-500 mt-0.5">{run.vehicle_type || run.vehicleType || 'Fleet Van'}</p>
              </div>

              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Execution Date</span>
                <p className="text-sm font-bold text-slate-900 mt-1">{run.delivery_date || run.deliveryDate}</p>
                <p className="text-xs text-slate-500 mt-0.5">Stops: {completedStops}/{plannedStops} completed</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex justify-between items-center text-xs font-medium">
                <span className="text-slate-700">Trip Progression</span>
                <span className="text-blue-600 font-bold">{progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>

            {/* Stop Execution Table / List */}
            <div className="space-y-3">
              <h3 className="text-base font-bold text-slate-900">Delivery Stops & Drops ({run.stops?.length || 0})</h3>
              
              <div className="space-y-3">
                {run.stops?.map((stop, sIndex) => (
                  <div
                    key={stop.id || sIndex}
                    className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5 ${
                        stop.status === 'DELIVERED' ? 'bg-emerald-600 text-white' :
                        stop.status === 'ARRIVED' ? 'bg-blue-600 text-white' :
                        stop.status === 'FAILED' ? 'bg-red-600 text-white' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {(stop.stop_sequence !== undefined ? stop.stop_sequence : stop.sequenceIndex !== undefined ? stop.sequenceIndex : sIndex) + 1}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold text-slate-900">{stop.shop_name || stop.shopName || `Shop #${(stop.shop_id || stop.shopId || '').slice(0, 8)}`}</h4>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                            stop.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' :
                            stop.status === 'ARRIVED' ? 'bg-blue-100 text-blue-800' :
                            stop.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {stop.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{stop.shop_address || stop.address || 'Standard retail shop address'}</p>
                        
                        {stop.recipientName && (
                          <p className="text-xs text-slate-600 mt-1">
                            Received by: <strong>{stop.recipientName}</strong>
                          </p>
                        )}
                        {(stop.failure_reason || stop.failureReason) && (
                          <p className="text-xs text-red-600 mt-1">
                            Issue: {stop.failure_reason || stop.failureReason}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Operational controls for stop */}
                    <div className="flex items-center space-x-2 self-end md:self-center">
                      {stop.status === 'PENDING' && (
                        <button
                          onClick={() => {
                            setSelectedStop(stop);
                            handleUpdateStopStatus('ARRIVED');
                          }}
                          className="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                        >
                          Mark Arrived
                        </button>
                      )}
                      {(stop.status === 'PENDING' || stop.status === 'ARRIVED') && (
                        <button
                          onClick={() => setSelectedStop(stop)}
                          className="px-3 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm"
                        >
                          Complete Drop
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal for completing a stop */}
            {selectedStop && (
              <div className="fixed inset-0 z-60 bg-slate-900/40 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-900">
                      Complete Stop #{(selectedStop.stop_sequence !== undefined ? selectedStop.stop_sequence : selectedStop.sequenceIndex !== undefined ? selectedStop.sequenceIndex : 0) + 1}
                    </h4>
                    <button onClick={() => setSelectedStop(null)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    Recording proof of delivery for <strong>{selectedStop.shop_name || selectedStop.shopName}</strong>
                  </p>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Recipient / Storekeeper Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Patil"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Delivery Notes / Crate Count
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. 5 milk crates delivered, 5 empty crates returned"
                      value={stopNotes}
                      onChange={(e) => setStopNotes(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      onClick={() => handleUpdateStopStatus('FAILED')}
                      disabled={actionLoading}
                      className="px-3 py-2 border border-red-200 text-red-600 rounded-xl text-xs font-semibold hover:bg-red-50"
                    >
                      Mark Failed
                    </button>
                    <button
                      onClick={() => handleUpdateStopStatus('DELIVERED')}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 shadow-sm"
                    >
                      Confirm Delivery
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        ) : null}

      </div>
    </div>
  );
};
