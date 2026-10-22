import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, Calendar, Truck, User, Navigation, ShieldCheck, 
  AlertTriangle, CheckCircle2, ChevronRight, ArrowLeft, ArrowRight,
  Clock, MapPin, AlertCircle, FileCheck, Search, Info, Check
} from 'lucide-react';
import { api } from '../../services/api/endpoints';
import { Route, Vehicle, DriverUser } from '../../types';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { GoogleLocationPicker, LocationValue } from '../../components/common/GoogleLocationPicker';

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
  
  // Step 1: Dispatch & Schedule Information
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [plannedTime, setPlannedTime] = useState('06:00 AM');
  const [depot, setDepot] = useState('Pune Central Depot');
  const [city, setCity] = useState('Pune');
  const [dispatchNotes, setDispatchNotes] = useState('');

  // Step 2: Route Selection
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(preselectedRoute || null);
  const [routeSearch, setRouteSearch] = useState('');

  // Start Location and Return Location configuration
  const [startLocation, setStartLocation] = useState<LocationValue>({
    name: 'Pune Central Cold Depot',
    latitude: 18.5204,
    longitude: 73.8567,
    address: 'Hadapsar Industrial Estate, Pune, Maharashtra',
  });
  const [showStartPicker, setShowStartPicker] = useState(false);

  const [returnLocation, setReturnLocation] = useState<LocationValue>({
    name: 'Pune Central Cold Depot',
    latitude: 18.5204,
    longitude: 73.8567,
    address: 'Hadapsar Industrial Estate, Pune, Maharashtra',
  });
  const [showReturnPicker, setShowReturnPicker] = useState(false);

  // Derived Supplier Collection Stops and Sequenced Stops
  const [collectionStops, setCollectionStops] = useState<any[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [fullRouteDetails, setFullRouteDetails] = useState<any | null>(null);

  // Step 3: Driver Selection
  const [drivers, setDrivers] = useState<DriverUser[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<DriverUser | null>(null);
  const [driverSearch, setDriverSearch] = useState('');

  // Step 4: Vehicle Selection
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [vehicleSearch, setVehicleSearch] = useState('');

  // Step 5: Backend Constraint Validation & Submission
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [loadingPrereqs, setLoadingPrereqs] = useState(false);

  // Load prerequisites
  const loadPrerequisites = useCallback(async () => {
    setLoadingPrereqs(true);
    try {
      // 1. Load routes (query active/published or fallback to all)
      try {
        const routesRes: any = await api.routes.list({ status: 'ACTIVE' });
        const list = Array.isArray(routesRes) ? routesRes : routesRes?.data || [];
        if (list.length > 0) {
          setRoutes(list);
        } else {
          const allRoutes: any = await api.routes.list();
          setRoutes(Array.isArray(allRoutes) ? allRoutes : allRoutes?.data || []);
        }
      } catch (e) {
        const allRoutes: any = await api.routes.list();
        setRoutes(Array.isArray(allRoutes) ? allRoutes : allRoutes?.data || []);
      }

      // 2. Load active drivers
      const driversRes: any = await api.deliveries.listAllDrivers();
      const driverList = Array.isArray(driversRes) ? driversRes : driversRes?.data || [];
      setDrivers(driverList);

      // 3. Load fleet vehicles
      const vehiclesRes: any = await api.vehicles.list({ limit: 100 });
      const vehicleList = Array.isArray(vehiclesRes) ? vehiclesRes : vehiclesRes?.data || [];
      setVehicles(vehicleList);

    } catch (err) {
      console.error('Failed to load assignment wizard prerequisites:', err);
    } finally {
      setLoadingPrereqs(false);
    }
  }, []);

  // Function to load route locations and derived collection stops
  const loadRouteDetailsAndCollections = useCallback(async (route: Route) => {
    // Populate start and return locations from route data
    setStartLocation({
      name: route.start_location_name || route.startLocationName || route.depot || 'Pune Central Cold Depot',
      latitude: Number(route.start_latitude ?? route.startLatitude ?? 18.5204),
      longitude: Number(route.start_longitude ?? route.startLongitude ?? 73.8567),
      address: route.start_address || route.startAddress || (route.depot ? `${route.depot}, Pune, Maharashtra` : 'Hadapsar Industrial Estate, Pune, Maharashtra'),
    });

    setReturnLocation({
      name: route.return_location_name || route.returnLocationName || route.depot || 'Pune Central Cold Depot',
      latitude: Number(route.return_latitude ?? route.returnLatitude ?? 18.5204),
      longitude: Number(route.return_longitude ?? route.returnLongitude ?? 73.8567),
      address: route.return_address || route.returnAddress || (route.depot ? `${route.depot}, Pune, Maharashtra` : 'Hadapsar Industrial Estate, Pune, Maharashtra'),
    });

    try {
      setLoadingCollections(true);
      const [routeRes, pickupRes]: any = await Promise.all([
        api.routes.get(route.id).catch(() => null),
        api.routes.getPickupRequirements(route.id).catch(() => null),
      ]);

      const rData = routeRes?.data || routeRes;
      if (rData) {
        setFullRouteDetails(rData);
      }

      const pData = pickupRes?.data || pickupRes;
      const comps = pData?.companies || pData?.supplierPickups || [];
      setCollectionStops(comps);
    } catch (err) {
      console.warn('Could not load derived collection stops for route:', err);
    } finally {
      setLoadingCollections(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadPrerequisites();
      if (preselectedRoute) {
        setSelectedRoute(preselectedRoute);
        loadRouteDetailsAndCollections(preselectedRoute);
      }
    } else {
      setStep(1);
      setValidationResult(null);
      setDispatchError(null);
      setCollectionStops([]);
      setFullRouteDetails(null);
    }
  }, [isOpen, preselectedRoute, loadPrerequisites, loadRouteDetailsAndCollections]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !submitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, submitting, onClose]);

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
        deliveryDate,
      });

      const data = res?.data || res;
      setValidationResult({
        valid: data?.isValid ?? data?.valid ?? true,
        errors: data?.errors || [],
        warnings: data?.warnings || [],
      });
    } catch (err: any) {
      setValidationResult({
        valid: false,
        errors: [err?.message || 'Assignment constraint validation check rejected'],
        warnings: [],
      });
    } finally {
      setValidating(false);
    }
  };

  const handleCreateAssignment = async () => {
    if (!selectedRoute || !selectedDriver || !selectedVehicle) return;
    setSubmitting(true);
    setDispatchError(null);

    // Validate that required locations have valid coordinates before publishing
    if (
      isNaN(startLocation.latitude) ||
      startLocation.latitude < -90 ||
      startLocation.latitude > 90 ||
      isNaN(startLocation.longitude) ||
      startLocation.longitude < -180 ||
      startLocation.longitude > 180
    ) {
      setDispatchError('Start Location coordinates are invalid or missing. Please calibrate on map before dispatch.');
      setSubmitting(false);
      return;
    }

    if (
      isNaN(returnLocation.latitude) ||
      returnLocation.latitude < -90 ||
      returnLocation.latitude > 90 ||
      isNaN(returnLocation.longitude) ||
      returnLocation.longitude < -180 ||
      returnLocation.longitude > 180
    ) {
      setDispatchError('Return Location coordinates are invalid or missing. Please calibrate on map before dispatch.');
      setSubmitting(false);
      return;
    }

    try {
      await api.assignments.create({
        routeId: selectedRoute.id,
        driverId: selectedDriver.id,
        vehicleId: selectedVehicle.id,
        deliveryDate,
        notes: dispatchNotes ? `[Depot: ${depot} | Departure: ${plannedTime}] ${dispatchNotes}` : `[Depot: ${depot} | Departure: ${plannedTime}]`,
        startLocation,
        returnLocation,
      });

      onAssignmentCreated();
      onClose();
    } catch (err: any) {
      setDispatchError(err?.message || 'Failed to persist delivery dispatch run. Please resolve conflicts.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Filtered lists
  const filteredRoutes = routes.filter(r => 
    (r.name || '').toLowerCase().includes(routeSearch.toLowerCase()) ||
    (r.route_code || r.code || '').toLowerCase().includes(routeSearch.toLowerCase()) ||
    (r.depot || '').toLowerCase().includes(routeSearch.toLowerCase())
  );

  const filteredDrivers = drivers.filter(d => 
    (d.name || '').toLowerCase().includes(driverSearch.toLowerCase()) ||
    (d.employee_id || '').toLowerCase().includes(driverSearch.toLowerCase()) ||
    (d.phone || '').includes(driverSearch)
  );

  const filteredVehicles = vehicles.filter(v => 
    (v.registration_number || v.registrationNumber || '').toLowerCase().includes(vehicleSearch.toLowerCase()) ||
    (v.vehicle_type || v.type || '').toLowerCase().includes(vehicleSearch.toLowerCase()) ||
    (v.vehicle_code || '').toLowerCase().includes(vehicleSearch.toLowerCase())
  );

  const stepLabels = [
    'Schedule',
    'Select Route',
    'Assign Driver',
    'Assign Vehicle',
    'Verify & Dispatch',
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(6, 78, 59, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 1250,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '740px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #D6D3C8',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid #D6D3C8',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-primary-subtle)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Truck size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Dispatch Delivery Run
              </h2>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
                Step {step} of 5 • {stepLabels[step - 1]}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748B',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress Tracker Strip */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #D6D3C8',
            backgroundColor: '#F8FAFC',
            padding: '10px 20px',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {stepLabels.map((label, i) => {
            const isCurrent = step === i + 1;
            const isCompleted = step > i + 1;

            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 700,
                    backgroundColor: isCurrent 
                      ? 'var(--color-primary)' 
                      : (isCompleted ? 'var(--color-success)' : '#D6D3C8'),
                    color: (isCurrent || isCompleted) ? '#FFFFFF' : '#64748B',
                  }}
                >
                  {isCompleted ? <Check size={12} /> : i + 1}
                </div>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: isCurrent ? 700 : 500,
                    color: isCurrent ? 'var(--color-primary)' : (isCompleted ? '#1E293B' : '#94A3B8'),
                  }}
                >
                  {label}
                </span>
                {i < 4 && <ChevronRight size={14} color="#A7AE9F" style={{ marginLeft: '4px' }} />}
              </div>
            );
          })}
        </div>

        {/* Content Body */}
        <div style={{ padding: '22px', overflowY: 'auto', flex: 1, backgroundColor: '#FFFFFF' }}>
          
          {/* STEP 1: Dispatch & Schedule */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                  Operational Date & Dispatch Scheduling
                </h3>
                <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0 }}>
                  Define target delivery date, dispatch depot, and planned departure time.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '5px' }}>
                    Delivery Run Date *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="toolbar-search-input"
                      style={{ width: '100%', height: '38px' }}
                    />
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                    Drivers and vehicles are evaluated against this date for conflicting dispatches.
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '5px' }}>
                    Planned Departure Time *
                  </label>
                  <select
                    value={plannedTime}
                    onChange={(e) => setPlannedTime(e.target.value)}
                    className="toolbar-select-field"
                    style={{ width: '100%', height: '38px' }}
                  >
                    <option value="05:00 AM">05:00 AM (Early Milk Run)</option>
                    <option value="05:30 AM">05:30 AM (Morning Drop)</option>
                    <option value="06:00 AM">06:00 AM (Standard Commercial)</option>
                    <option value="06:30 AM">06:30 AM (Second Shift)</option>
                    <option value="07:00 AM">07:00 AM (Retail Rush)</option>
                    <option value="08:00 AM">08:00 AM (Mid-Morning Route)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '5px' }}>
                    Dispatch Depot / Fulfillment Center *
                  </label>
                  <select
                    value={depot}
                    onChange={(e) => setDepot(e.target.value)}
                    className="toolbar-select-field"
                    style={{ width: '100%', height: '38px' }}
                  >
                    <option value="Pune Central Depot">Pune Central Depot (Shivajinagar)</option>
                    <option value="Hadapsar Distribution Hub">Hadapsar Distribution Hub</option>
                    <option value="Hinjewadi Logistics Hub">Hinjewadi Logistics Hub</option>
                    <option value="Katraj Cold Storage Depot">Katraj Cold Storage Depot</option>
                    <option value="Pimpri Processing Hub">Pimpri Processing Hub</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '5px' }}>
                    Operating City Hub
                  </label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="toolbar-select-field"
                    style={{ width: '100%', height: '38px' }}
                  >
                    <option value="Pune">Pune (Maharashtra)</option>
                    <option value="Mumbai">Mumbai (Maharashtra)</option>
                    <option value="Nagpur">Nagpur (Maharashtra)</option>
                    <option value="Nashik">Nashik (Maharashtra)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '5px' }}>
                  Dispatch Notes & Instructions
                </label>
                <textarea
                  rows={2}
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  placeholder="e.g. Ensure all crates are cold-chain sealed before departure"
                  className="toolbar-search-input"
                  style={{ width: '100%', height: 'auto', padding: '8px 12px' }}
                />
              </div>
            </div>
          )}

          {/* STEP 2: Route Selection */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                  Select Delivery Corridor / Route
                </h3>
                <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0 }}>
                  Choose from published routes with configured shop sequences and distance plans.
                </p>
              </div>

              {/* Route Search */}
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  type="text"
                  placeholder="Search route by name, corridor code, or depot..."
                  value={routeSearch}
                  onChange={(e) => setRouteSearch(e.target.value)}
                  className="toolbar-search-input"
                  style={{ width: '100%', paddingLeft: '36px', height: '38px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '340px', overflowY: 'auto' }}>
                {filteredRoutes.map((r) => {
                  const isSelected = selectedRoute?.id === r.id;
                  const stopsCount = r.stops_count || r.stopsCount || 0;

                  return (
                    <div
                      key={r.id}
                      onClick={() => setSelectedRoute(r)}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '8px',
                        border: isSelected ? '2px solid var(--color-primary)' : '1px solid #D6D3C8',
                        backgroundColor: isSelected ? 'var(--color-primary-subtle)' : '#FFFFFF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <code
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              fontSize: '11.5px',
                              color: 'var(--color-primary)',
                              backgroundColor: '#DBEAFE',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            {r.route_code || r.code || 'RT-CORRIDOR'}
                          </code>
                          <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {r.name}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                          <strong>{stopsCount}</strong> delivery stops • {r.total_distance_km || '—'} km • Depot: {r.depot || depot}
                        </div>
                      </div>

                      {isSelected ? (
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--color-primary)',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Check size={14} />
                        </div>
                      ) : (
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid #A7AE9F' }} />
                      )}
                    </div>
                  );
                })}

                {filteredRoutes.length === 0 && (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#64748B', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px dashed #A7AE9F' }}>
                    No matching routes found. Create and publish a route before dispatching runs.
                  </div>
                )}
              </div>

              {/* Selected Route Locations Corridor */}
              {selectedRoute && (
                <div
                  style={{
                    marginTop: '8px',
                    padding: '16px',
                    borderRadius: '10px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #D6D3C8',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                        Route Location Corridor & Derived Stops
                      </h4>
                      <p style={{ fontSize: '11.5px', color: '#64748B', margin: '2px 0 0 0' }}>
                        Operational stages: Start Location → Supplier Collections (from order products) → Delivery Stops → Return Location.
                      </p>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#0284C7', backgroundColor: '#E0F2FE', padding: '2px 8px', borderRadius: '4px' }}>
                      {selectedRoute.route_code || 'ROUTE'}
                    </span>
                  </div>

                  {/* 4 STAGES GRID */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {/* 1. START LOCATION */}
                    <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#0369A1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#0284C7', color: '#FFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10.5px' }}>1</span>
                          Start Location
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowStartPicker(true)}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: '#0284C7',
                            color: '#FFFFFF',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Edit Pin
                        </button>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>{startLocation.name}</div>
                      <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>{startLocation.address}</div>
                      <code style={{ fontSize: '10.5px', color: '#0369A1', fontFamily: 'monospace', display: 'block', marginTop: '4px' }}>
                        {startLocation.latitude.toFixed(6)}, {startLocation.longitude.toFixed(6)}
                      </code>
                    </div>

                    {/* 4. RETURN LOCATION */}
                    <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#991B1B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#DC2626', color: '#FFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10.5px' }}>4</span>
                          Return Location
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowReturnPicker(true)}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: '#DC2626',
                            color: '#FFFFFF',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Edit Pin
                        </button>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>{returnLocation.name}</div>
                      <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>{returnLocation.address}</div>
                      <code style={{ fontSize: '10.5px', color: '#991B1B', fontFamily: 'monospace', display: 'block', marginTop: '4px' }}>
                        {returnLocation.latitude.toFixed(6)}, {returnLocation.longitude.toFixed(6)}
                      </code>
                    </div>
                  </div>

                  {/* 2. DERIVED SUPPLIER COLLECTION LOCATIONS */}
                  <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#92400E', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#D97706', color: '#FFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10.5px' }}>2</span>
                        Derived Supplier Collection Locations ({collectionStops.length} stops identified)
                      </span>
                      {loadingCollections && <span style={{ fontSize: '11px', color: '#92400E' }}>Refreshing...</span>}
                    </div>

                    {collectionStops.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                        {collectionStops.map((stop, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', backgroundColor: '#FFFFFF', padding: '6px 10px', borderRadius: '4px', border: '1px solid #FEF3C7' }}>
                            <div>
                              <strong>{stop.companyName}</strong> • {stop.city || 'Pune'}
                              <span style={{ display: 'block', color: '#64748B', fontSize: '10.5px' }}>
                                {stop.addressLine1 || 'Supplier Warehouse'}
                              </span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              {stop.hasCoordinates ? (
                                <Badge variant="success">GPS Verified</Badge>
                              ) : (
                                <Badge variant="danger">No GPS</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '11.5px', color: '#92400E' }}>
                        No orders currently assigned to this route or pending collection. When orders are assigned, collection stops are derived automatically from the supplying companies.
                      </div>
                    )}
                  </div>

                  {/* 3. SEQUENCED DELIVERY STOPS */}
                  <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#16A34A', color: '#FFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10.5px' }}>3</span>
                        Sequenced Delivery Stops ({fullRouteDetails?.stops?.length || selectedRoute.stops_count || 0} retail shops)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Driver Selection */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                  Assign Eligible Driver
                </h3>
                <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0 }}>
                  Select an active licensed personnel from the roster for this delivery run.
                </p>
              </div>

              {/* Driver Search */}
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  type="text"
                  placeholder="Search driver by name, employee ID, or phone..."
                  value={driverSearch}
                  onChange={(e) => setDriverSearch(e.target.value)}
                  className="toolbar-search-input"
                  style={{ width: '100%', paddingLeft: '36px', height: '38px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '340px', overflowY: 'auto' }}>
                {filteredDrivers.map((d) => {
                  const isSelected = selectedDriver?.id === d.id;
                  const isInactive = !d.is_active;

                  return (
                    <div
                      key={d.id}
                      onClick={() => !isInactive && setSelectedDriver(d)}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '8px',
                        border: isSelected 
                          ? '2px solid var(--color-primary)' 
                          : (isInactive ? '1px dashed #A7AE9F' : '1px solid #D6D3C8'),
                        backgroundColor: isSelected 
                          ? 'var(--color-primary-subtle)' 
                          : (isInactive ? '#F8FAFC' : '#FFFFFF'),
                        cursor: isInactive ? 'not-allowed' : 'pointer',
                        opacity: isInactive ? 0.6 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '8px',
                            backgroundColor: 'var(--color-navy)',
                            color: '#FFFFFF',
                            fontWeight: 700,
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {d.name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {d.name}
                            </span>
                            <code
                              style={{
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                fontSize: '11px',
                                color: 'var(--color-primary)',
                                backgroundColor: 'var(--color-primary-subtle)',
                                padding: '1px 5px',
                                borderRadius: '4px',
                              }}
                            >
                              {d.employee_id || 'DRV'}
                            </code>
                            <Badge variant={d.is_active ? 'success' : 'danger'}>
                              {d.is_active ? 'Available' : 'Inactive'}
                            </Badge>
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '3px' }}>
                            Phone: {d.phone || '—'} • Licence: {d.license_number || 'LMV-TR'}
                          </div>
                        </div>
                      </div>

                      {isSelected ? (
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--color-primary)',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Check size={14} />
                        </div>
                      ) : (
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid #A7AE9F' }} />
                      )}
                    </div>
                  );
                })}

                {filteredDrivers.length === 0 && (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#64748B', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px dashed #A7AE9F' }}>
                    No matching active drivers found in roster.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: Vehicle Selection */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                  Assign Fleet Vehicle
                </h3>
                <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0 }}>
                  Allocate an operational fleet asset with validated crate capacity and compliance.
                </p>
              </div>

              {/* Vehicle Search */}
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  type="text"
                  placeholder="Search vehicle by registration, type, or asset ID..."
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                  className="toolbar-search-input"
                  style={{ width: '100%', paddingLeft: '36px', height: '38px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '340px', overflowY: 'auto' }}>
                {filteredVehicles.map((v) => {
                  const isSelected = selectedVehicle?.id === v.id;
                  const isMaintenance = v.status === 'UNDER_MAINTENANCE' || v.status === 'INACTIVE';

                  return (
                    <div
                      key={v.id}
                      onClick={() => !isMaintenance && setSelectedVehicle(v)}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '8px',
                        border: isSelected 
                          ? '2px solid var(--color-primary)' 
                          : (isMaintenance ? '1px dashed #A7AE9F' : '1px solid #D6D3C8'),
                        backgroundColor: isSelected 
                          ? 'var(--color-primary-subtle)' 
                          : (isMaintenance ? '#F8FAFC' : '#FFFFFF'),
                        cursor: isMaintenance ? 'not-allowed' : 'pointer',
                        opacity: isMaintenance ? 0.6 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '8px',
                            backgroundColor: '#F1F5F9',
                            color: '#334155',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Truck size={18} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13.5px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                              {v.registration_number || v.registrationNumber}
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748B', backgroundColor: '#F1F5F9', padding: '1px 6px', borderRadius: '4px' }}>
                              {v.vehicle_type || v.type}
                            </span>
                            {v.is_refrigerated && (
                              <Badge variant="navy">Cold Chain</Badge>
                            )}
                            <Badge variant={v.status === 'AVAILABLE' ? 'success' : (v.status === 'UNDER_MAINTENANCE' ? 'warning' : 'neutral')}>
                              {v.status}
                            </Badge>
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '3px' }}>
                            Capacity: <strong>{v.capacity_crates || v.capacityCrates || 60}</strong> crates ({v.capacity_kg || v.capacityKg || 500} kg) • {v.make_model || 'Commercial Fleet'}
                          </div>
                        </div>
                      </div>

                      {isSelected ? (
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--color-primary)',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Check size={14} />
                        </div>
                      ) : (
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid #A7AE9F' }} />
                      )}
                    </div>
                  );
                })}

                {filteredVehicles.length === 0 && (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#64748B', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px dashed #A7AE9F' }}>
                    No available fleet vehicles found.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 5: Real-time Backend Validation & Review */}
          {step === 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 2px 0' }}>
                    Pre-Dispatch Operational Validation
                  </h3>
                  <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0 }}>
                    Real-time verification against double-booking, vehicle compliance, and route sequencing.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleValidateAssignment}
                  disabled={validating}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-primary)',
                    fontWeight: 600,
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Re-check Invariants
                </button>
              </div>

              {/* Validation Status Box */}
              {validating ? (
                <div style={{ padding: '24px', textAlign: 'center', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #D6D3C8' }}>
                  <div className="spin-icon" style={{ display: 'inline-block', marginBottom: '8px' }}>
                    <ShieldCheck size={28} color="var(--color-primary)" />
                  </div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#475569', margin: 0 }}>
                    Validating operational invariants against database...
                  </p>
                </div>
              ) : validationResult ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {validationResult.valid ? (
                    <div
                      style={{
                        padding: '14px 16px',
                        backgroundColor: '#F0FDF4',
                        border: '1px solid #BBF7D0',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                    >
                      <CheckCircle2 size={20} color="var(--color-success)" style={{ flexShrink: 0 }} />
                      <div>
                        <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: '#166534', margin: 0 }}>
                          Operational Constraints Validated Successfully
                        </h4>
                        <p style={{ fontSize: '12px', color: '#15803D', margin: '2px 0 0 0' }}>
                          Driver is open for assignment. Vehicle compliance is verified. No double-booking conflict detected.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: '14px 16px',
                        backgroundColor: '#FEF2F2',
                        border: '1px solid #FECACA',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-danger)', fontWeight: 700, fontSize: '13.5px' }}>
                        <AlertCircle size={18} />
                        <span>Validation Constraint Conflicts Detected</span>
                      </div>
                      <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px', fontSize: '12.5px', color: '#991B1B' }}>
                        {validationResult.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {validationResult.warnings && validationResult.warnings.length > 0 && (
                    <div
                      style={{
                        padding: '12px 14px',
                        backgroundColor: '#FFFBEB',
                        border: '1px solid #FDE68A',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#92400E',
                      }}
                    >
                      <strong style={{ display: 'block', marginBottom: '2px' }}>Operational Notice:</strong>
                      {validationResult.warnings.join(' • ')}
                    </div>
                  )}
                </div>
              ) : null}

              {/* Summary Cards */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: '10px',
                  border: '1px solid #D6D3C8',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Dispatch Manifest Summary
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '13px' }}>
                  <div>
                    <span style={{ fontSize: '11.5px', color: '#64748B', display: 'block' }}>Delivery Date & Time</span>
                    <strong>{deliveryDate} ({plannedTime})</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '11.5px', color: '#64748B', display: 'block' }}>Depot Location</span>
                    <strong>{depot}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '11.5px', color: '#64748B', display: 'block' }}>Selected Route</span>
                    <strong>{selectedRoute?.route_code || 'RT'} — {selectedRoute?.name}</strong>
                    <span style={{ display: 'block', fontSize: '11.5px', color: '#64748B' }}>
                      {selectedRoute?.stops_count || selectedRoute?.stopsCount || 0} scheduled retail shops
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '11.5px', color: '#64748B', display: 'block' }}>Assigned Driver</span>
                    <strong>{selectedDriver?.name}</strong>
                    <span style={{ display: 'block', fontSize: '11.5px', color: '#64748B' }}>
                      ID: {selectedDriver?.employee_id || 'DRV'} • Phone: {selectedDriver?.phone}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '11.5px', color: '#64748B', display: 'block' }}>Allocated Fleet Vehicle</span>
                    <strong style={{ fontFamily: 'monospace' }}>{selectedVehicle?.registration_number || selectedVehicle?.registrationNumber}</strong>
                    <span style={{ display: 'block', fontSize: '11.5px', color: '#64748B' }}>
                      {selectedVehicle?.vehicle_type || 'Van'} • {selectedVehicle?.capacity_crates || 60} crates capacity
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '11.5px', color: '#64748B', display: 'block' }}>Operational City</span>
                    <strong>{city} (Maharashtra)</strong>
                  </div>
                </div>

                {/* Corridor Overview in Summary */}
                <div style={{ borderTop: '1px solid #D6D3C8', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155' }}>
                    Run Corridor Overview:
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                    <div style={{ padding: '8px', borderRadius: '6px', backgroundColor: '#E0F2FE' }}>
                      <strong style={{ color: '#0369A1' }}>Start: </strong>
                      <span>{startLocation.name} ({startLocation.latitude.toFixed(4)}, {startLocation.longitude.toFixed(4)})</span>
                    </div>
                    <div style={{ padding: '8px', borderRadius: '6px', backgroundColor: '#FEE2E2' }}>
                      <strong style={{ color: '#991B1B' }}>Return: </strong>
                      <span>{returnLocation.name} ({returnLocation.latitude.toFixed(4)}, {returnLocation.longitude.toFixed(4)})</span>
                    </div>
                  </div>
                </div>

                {dispatchNotes && (
                  <div style={{ borderTop: '1px solid #D6D3C8', paddingTop: '10px', fontSize: '12.5px', color: '#475569' }}>
                    <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>Notes: </span>
                    {dispatchNotes}
                  </div>
                )}
              </div>

              {dispatchError && (
                <div
                  style={{
                    padding: '12px 16px',
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: '8px',
                    color: 'var(--color-danger)',
                    fontSize: '12.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{dispatchError}</span>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Navigation */}
        <div
          style={{
            padding: '16px 22px',
            borderTop: '1px solid #D6D3C8',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (step === 1) {
                onClose();
              } else {
                setStep(s => Math.max(1, s - 1));
              }
            }}
            disabled={submitting}
            icon={step > 1 ? <ArrowLeft size={14} /> : undefined}
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>

          {step < 4 && (
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                if (step === 1 && !deliveryDate) return;
                if (step === 2 && !selectedRoute) return;
                if (step === 3 && !selectedDriver) return;
                setStep(s => s + 1);
              }}
              disabled={
                (step === 1 && !deliveryDate) ||
                (step === 2 && !selectedRoute) ||
                (step === 3 && !selectedDriver)
              }
            >
              <span>Continue</span>
              <ArrowRight size={14} style={{ marginLeft: '6px' }} />
            </Button>
          )}

          {step === 4 && (
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                if (!selectedVehicle) return;
                setStep(5);
                handleValidateAssignment();
              }}
              disabled={!selectedVehicle}
            >
              <span>Verify & Review</span>
              <ArrowRight size={14} style={{ marginLeft: '6px' }} />
            </Button>
          )}

          {step === 5 && (
            <Button
              type="button"
              variant="primary"
              onClick={handleCreateAssignment}
              disabled={submitting || (validationResult !== null && !validationResult.valid)}
              icon={<Truck size={15} />}
            >
              {submitting ? 'Dispatching Run...' : 'Confirm & Dispatch Run'}
            </Button>
          )}
        </div>

        {/* Google Location Picker Modals */}
        {showStartPicker && (
          <GoogleLocationPicker
            isOpen={showStartPicker}
            title="Configure Run Start Location"
            label="Calibrate the physical departure gate, yard, or depot for this run"
            badgeLabel="START LOCATION"
            pinColor="#0284C7"
            value={startLocation}
            initialLatitude={startLocation.latitude}
            initialLongitude={startLocation.longitude}
            initialName={startLocation.name}
            initialAddress={startLocation.address}
            onSave={(loc) => {
              setStartLocation(loc);
              setShowStartPicker(false);
            }}
            onCancel={() => setShowStartPicker(false)}
          />
        )}

        {showReturnPicker && (
          <GoogleLocationPicker
            isOpen={showReturnPicker}
            title="Configure Run Return Location"
            label="Calibrate where the vehicle must return after completing deliveries"
            badgeLabel="RETURN LOCATION"
            pinColor="#DC2626"
            value={returnLocation}
            initialLatitude={returnLocation.latitude}
            initialLongitude={returnLocation.longitude}
            initialName={returnLocation.name}
            initialAddress={returnLocation.address}
            onSave={(loc) => {
              setReturnLocation(loc);
              setShowReturnPicker(false);
            }}
            onCancel={() => setShowReturnPicker(false)}
          />
        )}

      </div>
    </div>
  );
};

