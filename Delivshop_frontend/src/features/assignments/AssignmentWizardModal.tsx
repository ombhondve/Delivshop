import React, { useState, useEffect } from 'react';
import { 
  X, Calendar, Truck, User, Navigation, ShieldCheck, 
  AlertTriangle, CheckCircle2, ChevronRight, ArrowLeft, ArrowRight,
  Clock, MapPin, AlertCircle, FileCheck
} from 'lucide-react';
import { api } from '../../services/api/endpoints';
import { Route, Vehicle } from '../../types';

interface AssignmentWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssignmentCreated: () => void;
  preselectedRoute?: Route | null;
}

export const AssignmentWizardModal: React.FC<AssignmentWizardModalProps> = ({
  isOpen,
  onClose,
  onAssignmentCreated,
  preselectedRoute
}) => {
  const [step, setStep] = useState(1);
  
  // Step 1: Date & Operational Area
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [city, setCity] = useState('Pune');

  // Step 2: Route
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(preselectedRoute || null);

  // Step 3: Driver
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<any | null>(null);

  // Step 4: Vehicle
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Step 5: Backend Validation State
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);

  // Submitting
  const [submitting, setSubmitting] = useState(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadPrerequisites();
    }
  }, [isOpen]);

  const loadPrerequisites = async () => {
    try {
      // 1. Load published routes
      const routesRes: any = await api.routes.list({ status: 'PUBLISHED' });
      setRoutes(Array.isArray(routesRes) ? routesRes : routesRes?.data || []);

      // 2. Load active drivers
      const driversRes: any = await api.deliveries.listAllDrivers({ status: 'ACTIVE' });
      setDrivers(Array.isArray(driversRes) ? driversRes : driversRes?.data || []);

      // 3. Load active vehicles
      const vehiclesRes: any = await api.vehicles.list({ status: 'AVAILABLE' });
      setVehicles(Array.isArray(vehiclesRes) ? vehiclesRes : vehiclesRes?.data || []);
    } catch (err) {
      console.error('Failed to load assignment wizard prerequisites:', err);
    }
  };

  const handleValidateAssignment = async () => {
    if (!selectedRoute || !selectedDriver || !selectedVehicle) return;
    setValidating(true);
    setValidationResult(null);
    setDispatchError(null);

    try {
      const res: any = await api.assignments.validate({
        routeId: selectedRoute.id,
        driverId: selectedDriver.id,
        vehicleId: selectedVehicle.id,
        deliveryDate
      });

      const data = res?.data || res;
      setValidationResult({
        valid: data?.isValid ?? data?.valid ?? true,
        errors: data?.errors || [],
        warnings: data?.warnings || []
      });
    } catch (err: any) {
      setValidationResult({
        valid: false,
        errors: [err?.message || 'Validation failed due to network or invariant rejection'],
        warnings: []
      });
    } finally {
      setValidating(false);
    }
  };

  const handleCreateAssignment = async () => {
    if (!selectedRoute || !selectedDriver || !selectedVehicle) return;
    setSubmitting(true);
    setDispatchError(null);

    try {
      const res: any = await api.assignments.create({
        routeId: selectedRoute.id,
        driverId: selectedDriver.id,
        vehicleId: selectedVehicle.id,
        deliveryDate,
        dispatchImmediately: true
      });

      onAssignmentCreated();
    } catch (err: any) {
      setDispatchError(err?.message || 'Dispatch error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Dispatch Delivery Run</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Step {step} of 6 • Date, Route, Driver & Vehicle Planning
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Tracker */}
        <div className="flex border-b border-slate-100 bg-white px-6 py-3 justify-between items-center text-xs">
          {['Date & Area', 'Route', 'Driver', 'Vehicle', 'Validation', 'Dispatch'].map((label, i) => (
            <div key={label} className="flex items-center space-x-1.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                step === i + 1 
                  ? 'bg-blue-600 text-white' 
                  : step > i + 1 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : 'bg-slate-100 text-slate-400'
              }`}>
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <span className={step === i + 1 ? 'font-bold text-blue-600' : 'text-slate-500 hidden sm:inline'}>
                {label}
              </span>
              {i < 5 && <ChevronRight className="w-3 h-3 text-slate-300 hidden sm:inline" />}
            </div>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          
          {/* STEP 1: Date & Area */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-slate-900">Select Date & Operational Area</h3>
              
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Delivery Run Date *
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-400 mt-1">Assignments are scheduled and verified for this specific operating date.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Operating City / Hub
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Pune">Pune (Maharashtra)</option>
                  <option value="Mumbai">Mumbai (Maharashtra)</option>
                  <option value="Nagpur">Nagpur (Maharashtra)</option>
                  <option value="Nashik">Nashik (Maharashtra)</option>
                </select>
              </div>
            </div>
          )}

          {/* STEP 2: Route */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-slate-900">Select Published Route Template</h3>
              
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {routes.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRoute(r)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      selectedRoute?.id === r.id
                        ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                          {r.route_code || r.code}
                        </span>
                        <h4 className="font-semibold text-slate-900">{r.name}</h4>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {r.stops_count || r.stopsCount || 0} stops • {r.total_distance_km || r.estimatedDistanceKm || '—'} km • Depot: {r.depot || r.depotName || 'Main'}
                      </p>
                    </div>
                    {selectedRoute?.id === r.id && (
                      <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    )}
                  </div>
                ))}

                {routes.length === 0 && (
                  <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No published routes available. Please create and publish a route template first.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Driver */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-slate-900">Assign Eligible Driver</h3>
              
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {drivers.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => setSelectedDriver(d)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      selectedDriver?.id === d.id
                        ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm">
                        {d.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold text-slate-900">{d.name}</h4>
                          <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-100 rounded text-slate-600">
                            {d.employee_id || d.employeeId || 'DRV'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Phone: {d.phone} • Status: <span className="text-emerald-600 font-medium">Active</span>
                        </p>
                      </div>
                    </div>
                    {selectedDriver?.id === d.id && (
                      <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    )}
                  </div>
                ))}

                {drivers.length === 0 && (
                  <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No active drivers found.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: Vehicle */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-slate-900">Assign Fleet Vehicle</h3>
              
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {vehicles.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVehicle(v)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      selectedVehicle?.id === v.id
                        ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold font-mono text-slate-900">{v.registration_number || v.registrationNumber}</h4>
                          <span className="text-[11px] px-2 py-0.5 bg-slate-100 rounded text-slate-600">
                            {v.vehicle_type || v.type}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Capacity: {v.capacity_kg || v.capacityKg} kg / {v.capacity_crates || v.capacityCrates} crates • {v.make_model || v.makeModel || 'Fleet'}
                        </p>
                      </div>
                    </div>
                    {selectedVehicle?.id === v.id && (
                      <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    )}
                  </div>
                ))}

                {vehicles.length === 0 && (
                  <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No available vehicles found in this hub.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 5: Real-time Backend Validation */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">Pre-Dispatch Operational Validation</h3>
                <button
                  onClick={handleValidateAssignment}
                  disabled={validating}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  Re-check Invariants
                </button>
              </div>

              {validating ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-slate-600 mt-3 font-medium">Validating driver eligibility, vehicle compliance, and scheduling invariants...</p>
                </div>
              ) : validationResult ? (
                <div className="space-y-3">
                  {validationResult.valid ? (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-emerald-900 text-sm">All Operational Constraints Passed</h4>
                        <p className="text-xs text-emerald-700 mt-0.5">
                          Driver schedule is open. Vehicle documents (RC, Insurance, PUC) are valid. No double-booking conflict detected.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
                      <div className="flex items-center space-x-2 text-red-800 font-semibold text-sm">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        <span>Validation Invariant Violations</span>
                      </div>
                      <ul className="text-xs text-red-700 space-y-1 list-disc pl-5">
                        {validationResult.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {validationResult.warnings && validationResult.warnings.length > 0 && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                      <div className="flex items-center space-x-2 text-amber-800 font-semibold text-xs">
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span>Advisory Warnings</span>
                      </div>
                      <ul className="text-xs text-amber-700 space-y-1 list-disc pl-5">
                        {validationResult.warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* STEP 6: Review & Dispatch */}
          {step === 6 && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-slate-900">Review Assignment & Confirm Dispatch</h3>

              <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-sm">
                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <span className="text-slate-500 text-xs">Delivery Date:</span>
                  <span className="font-semibold text-slate-900">{deliveryDate}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <span className="text-slate-500 text-xs">Route:</span>
                  <span className="font-semibold text-slate-900">{selectedRoute?.route_code || selectedRoute?.code} — {selectedRoute?.name}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <span className="text-slate-500 text-xs">Driver:</span>
                  <span className="font-semibold text-slate-900">{selectedDriver?.name} ({selectedDriver?.employee_id || selectedDriver?.employeeId})</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <span className="text-slate-500 text-xs">Vehicle:</span>
                  <span className="font-semibold font-mono text-slate-900">{selectedVehicle?.registration_number || selectedVehicle?.registrationNumber}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 text-xs">Planned Stops:</span>
                  <span className="font-semibold text-slate-900">{selectedRoute?.stops_count || selectedRoute?.stopsCount || 0} retail locations</span>
                </div>
              </div>

              {dispatchError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{dispatchError}</span>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Navigation */}
        <div className="p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            onClick={() => setStep(s => Math.max(1, s - 1))}
            disabled={step === 1 || submitting}
            className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          {step < 5 && (
            <button
              onClick={() => {
                if (step === 1 && !deliveryDate) return;
                if (step === 2 && !selectedRoute) return;
                if (step === 3 && !selectedDriver) return;
                if (step === 4) {
                  setStep(5);
                  handleValidateAssignment();
                  return;
                }
                setStep(s => s + 1);
              }}
              disabled={
                (step === 1 && !deliveryDate) ||
                (step === 2 && !selectedRoute) ||
                (step === 3 && !selectedDriver) ||
                (step === 4 && !selectedVehicle)
              }
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold flex items-center space-x-1.5 transition-colors shadow-sm disabled:opacity-50"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {step === 5 && (
            <button
              onClick={() => setStep(6)}
              disabled={!validationResult?.valid}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold flex items-center space-x-1.5 transition-colors shadow-sm disabled:opacity-50"
            >
              <span>Proceed to Summary</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {step === 6 && (
            <button
              onClick={handleCreateAssignment}
              disabled={submitting}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold flex items-center space-x-2 transition-colors shadow-sm disabled:opacity-50"
            >
              <Truck className="w-4 h-4" />
              <span>{submitting ? 'Dispatching...' : 'Confirm & Dispatch Run'}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
