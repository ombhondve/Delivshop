import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  MapPin,
  Store,
  ArrowUp,
  ArrowDown,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Navigation,
  Save,
  Check,
  ShieldAlert,
  Search,
  Plus,
  RefreshCw,
  ExternalLink,
  Copy,
  Layers,
  ChevronRight,
  Info,
} from 'lucide-react';
import { api } from '../../services/api/endpoints';
import { Shop, Route } from '../../types';
import { AutocompleteInput, AutocompleteOption } from '../../components/common/AutocompleteInput';
import {
  getAllIndianStates,
  getCitiesForState,
  getStateForCity,
  searchCities,
  searchStates,
  isValidCity,
  isValidState,
} from '../../utils/indianLocations';

interface RouteCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onRouteCreated: (route: Route) => void;
  onOpenDetails?: (routeId: string) => void;
}

export const RouteCreationWizard: React.FC<RouteCreationWizardProps> = ({
  isOpen,
  onClose,
  onRouteCreated,
  onOpenDetails,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State: Step 1 - Route Details
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Retail Cold Chain Distribution');
  const [depot, setDepot] = useState('Pune Central Cold Depot');
  const [description, setDescription] = useState('');

  // Form State: Step 2 - Location Details
  const [state, setState] = useState('Maharashtra');
  const [city, setCity] = useState('Pune');
  const [locationErrors, setLocationErrors] = useState<{ state?: string; city?: string }>({});

  // Form State: Step 3 - Shop Assignment
  const [availableShops, setAvailableShops] = useState<Shop[]>([]);
  const [loadingShops, setLoadingShops] = useState(false);
  const [shopsError, setShopsError] = useState<string | null>(null);
  const [shopSearch, setShopSearch] = useState('');
  const [filterByCityOnly, setFilterByCityOnly] = useState(false);

  const [selectedStops, setSelectedStops] = useState<
    Array<{
      shop: Shop;
      plannedArrivalTime?: string;
      serviceTimeMinutes: number;
      deliveryInstructions?: string;
    }>
  >([]);

  // Success State after Route Creation
  const [createdRoute, setCreatedRoute] = useState<Route | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Load existing shops from backend API
  const fetchShops = async () => {
    setLoadingShops(true);
    setShopsError(null);
    try {
      const res: any = await api.shops.list({ limit: 100, status: 'ACTIVE' });
      // Robustly handle paginated result or raw array
      const items = Array.isArray(res)
        ? res
        : res?.items || res?.data?.items || res?.data || [];
      setAvailableShops(items);
    } catch (err: any) {
      console.error('Failed to load saved shops for route builder:', err);
      setShopsError(
        err?.message || 'Unable to fetch saved shops from database. Please check connection and retry.'
      );
    } finally {
      setLoadingShops(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchShops();
      // Reset wizard state on opening
      setStep(1);
      setCreatedRoute(null);
      setError(null);
      setLocationErrors({});
    }
  }, [isOpen]);

  // Autocomplete Options for States
  const stateOptions: AutocompleteOption[] = useMemo(() => {
    return searchStates(state).map((s) => ({
      label: s,
      value: s,
      secondary: `${getCitiesForState(s).length} operational cities`,
    }));
  }, [state]);

  // Autocomplete Options for Cities
  const cityOptions: AutocompleteOption[] = useMemo(() => {
    return searchCities(city, state).map((entry) => ({
      label: entry.city,
      value: entry.city,
      secondary: entry.state,
    }));
  }, [city, state]);

  // State selection handler: clear city if incompatible
  const handleStateSelect = (option: AutocompleteOption) => {
    const selectedState = option.value;
    setState(selectedState);
    setLocationErrors((prev) => ({ ...prev, state: undefined }));

    // If currently selected city does not belong to this state, clear it
    if (city && !isValidCity(city, selectedState)) {
      setCity('');
    }
  };

  // City selection handler: automatically populate corresponding state
  const handleCitySelect = (option: AutocompleteOption) => {
    const selectedCity = option.value;
    setCity(selectedCity);
    setLocationErrors((prev) => ({ ...prev, city: undefined }));

    const matchingState = getStateForCity(selectedCity);
    if (matchingState && matchingState !== state) {
      setState(matchingState);
      setLocationErrors((prev) => ({ ...prev, state: undefined }));
    }
  };

  // Validate Step 1
  const validateStep1 = (): boolean => {
    if (!name.trim() || name.trim().length < 3) {
      setError('Route name is required and must be at least 3 characters long.');
      return false;
    }
    setError(null);
    return true;
  };

  // Validate Step 2
  const validateStep2 = (): boolean => {
    const errs: { state?: string; city?: string } = {};

    if (!state.trim()) {
      errs.state = 'State is required.';
    } else if (!isValidState(state)) {
      errs.state = 'Please select a valid Indian state from the suggestions.';
    }

    if (!city.trim()) {
      errs.city = 'City is required.';
    } else if (!isValidCity(city, state)) {
      errs.city = `"${city}" is not recognized for state "${state}". Please select a valid city.`;
    }

    if (Object.keys(errs).length > 0) {
      setLocationErrors(errs);
      setError('Please correct the geographic location fields before proceeding.');
      return false;
    }

    setLocationErrors({});
    setError(null);
    return true;
  };

  // Validate Step 3
  const validateStep3 = (): boolean => {
    if (selectedStops.length === 0) {
      setError('Please assign at least one retail shop stop to this route corridor.');
      return false;
    }
    setError(null);
    return true;
  };

  const handleNext = () => {
    if (step === 1) {
      if (validateStep1()) setStep(2);
    } else if (step === 2) {
      if (validateStep2()) setStep(3);
    }
  };

  const handlePrev = () => {
    setError(null);
    if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
  };

  // Add shop to sequence
  const handleAddShop = (shop: Shop) => {
    if (selectedStops.some((s) => s.shop.id === shop.id)) {
      return;
    }

    const nextSeq = selectedStops.length + 1;
    const baseHour = 6;
    const totalMinutes = (nextSeq - 1) * 25;
    const hour = baseHour + Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    const formattedTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} AM`;

    setSelectedStops((prev) => [
      ...prev,
      {
        shop,
        plannedArrivalTime: formattedTime,
        serviceTimeMinutes: 12,
        deliveryInstructions:
          shop.delivery_instructions ||
          'Unload scheduled dairy pouches and verify milk chiller temperature.',
      },
    ]);
    setError(null);
  };

  // Remove shop from sequence
  const handleRemoveShop = (index: number) => {
    setSelectedStops((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  };

  // Move stop Up / Down
  const handleMoveStop = (index: number, direction: 'UP' | 'DOWN') => {
    if (direction === 'UP' && index === 0) return;
    if (direction === 'DOWN' && index === selectedStops.length - 1) return;

    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    setSelectedStops((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return updated;
    });
  };

  // Save Route
  const handleSaveRoute = async (publishImmediately: boolean) => {
    if (!validateStep1()) {
      setStep(1);
      return;
    }
    if (!validateStep2()) {
      setStep(2);
      return;
    }
    if (!validateStep3()) {
      setStep(3);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const stopsPayload = selectedStops.map((s, idx) => ({
        shopId: s.shop.id,
        stopSequence: idx + 1,
        plannedArrivalTime: s.plannedArrivalTime,
        serviceTimeMinutes: Number(s.serviceTimeMinutes) || 10,
        deliveryInstructions: s.deliveryInstructions || null,
      }));

      // Note: routeCode is NOT sent, backend generates RTE-YYYYMMDD-001 automatically
      const res = await api.routes.create({
        name: name.trim(),
        city: city.trim(),
        state: state.trim(),
        depot: depot.trim() || 'Pune Central Cold Depot',
        description: description.trim() ? `[${category}] ${description.trim()}` : `[${category}]`,
        status: publishImmediately ? 'PUBLISHED' : 'DRAFT',
        stops: stopsPayload,
        totalDistanceKm: parseFloat((selectedStops.length * 4.2).toFixed(2)),
        estimatedDurationMinutes: selectedStops.length * 15,
      });

      const savedRoute = (res as any)?.data || res;
      setCreatedRoute(savedRoute);
      onRouteCreated(savedRoute);
    } catch (err: any) {
      console.error('Failed to create delivery route:', err);
      setError(err?.message || 'Failed to create route. Please review all fields.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (createdRoute?.route_code) {
      navigator.clipboard.writeText(createdRoute.route_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Filter available shops
  const filteredShops = useMemo(() => {
    return availableShops.filter((s) => {
      // If city filter enabled, only show shops matching current route city
      if (filterByCityOnly && city) {
        if (s.city.toLowerCase() !== city.toLowerCase()) {
          return false;
        }
      }

      const q = shopSearch.toLowerCase().trim();
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.shop_id?.toLowerCase().includes(q) ||
        s.area?.toLowerCase().includes(q) ||
        s.city?.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q)
      );
    });
  }, [availableShops, shopSearch, filterByCityOnly, city]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="modal-dialog"
        style={{
          width: '100%',
          maxWidth: '860px',
          background: '#FFFFFF',
          borderRadius: '14px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #D6D3C8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'var(--color-primary-subtle)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Navigation size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0F172A' }}>
                Create Route
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              color: '#94A3B8',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Step Indicator Bar */}
        {!createdRoute && (
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid #D6D3C8',
              background: '#F8FAFC',
              padding: '12px 24px',
              gap: '12px',
            }}
          >
            {[
              { num: 1, title: 'Step 1: Details' },
              { num: 2, title: 'Step 2: Location' },
              { num: 3, title: 'Step 3: Stops' },
            ].map((s) => {
              const isCompleted = step > s.num;
              const isCurrent = step === s.num;
              return (
                <div
                  key={s.num}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: isCompleted ? 'pointer' : 'default',
                    opacity: isCurrent || isCompleted ? 1 : 0.45,
                  }}
                  onClick={() => {
                    if (isCompleted) setStep(s.num as any);
                  }}
                >
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: isCompleted ? 'var(--color-success)' : isCurrent ? 'var(--color-primary)' : '#A7AE9F',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isCompleted ? <Check size={14} /> : s.num}
                  </div>
                  <span
                    style={{
                      fontSize: '12.5px',
                      fontWeight: isCurrent ? 700 : 500,
                      color: isCurrent ? 'var(--color-primary)' : 'var(--text-primary)',
                    }}
                  >
                    {s.title}
                  </span>
                  {s.num < 3 && (
                    <ChevronRight size={14} color="#A7AE9F" style={{ marginLeft: 'auto' }} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div
            style={{
              margin: '16px 24px 0 24px',
              padding: '12px 16px',
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: '8px',
              color: '#991B1B',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          
          {/* SUCCESS SCREEN */}
          {createdRoute ? (
            <div style={{ textAlign: 'center', padding: '20px 10px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#DCFCE7',
                  color: '#16A34A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                }}
              >
                <CheckCircle2 size={36} />
              </div>

              <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' }}>
                Delivery Route Created Successfully!
              </h3>
              <p style={{ fontSize: '13.5px', color: '#64748B', maxWidth: '480px', margin: '0 auto 20px auto' }}>
                The route corridor template has been generated with an automated monotonic code and mapped shop sequence.
              </p>

              {/* Generated Route Code Display */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: '#F1F5F9',
                  border: '1.5px dashed #A7AE9F',
                  borderRadius: '10px',
                  padding: '14px 24px',
                  marginBottom: '24px',
                }}
              >
                <div>
                  <span style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block' }}>
                    Authoritative Route Identifier
                  </span>
                  <strong style={{ fontSize: '22px', fontFamily: 'monospace', color: 'var(--color-navy)', letterSpacing: '0.05em' }}>
                    {createdRoute.route_code || (createdRoute as any).code}
                  </strong>
                </div>

                <button
                  type="button"
                  onClick={handleCopyCode}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #A7AE9F',
                    background: '#FFFFFF',
                    color: '#334155',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {copiedCode ? <Check size={14} color="#16A34A" /> : <Copy size={14} />}
                  <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Route Summary Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px',
                  maxWidth: '560px',
                  margin: '0 auto 24px auto',
                  textAlign: 'left',
                }}
              >
                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #D6D3C8' }}>
                  <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>Route Name</span>
                  <strong style={{ fontSize: '13px', color: '#0F172A' }}>{createdRoute.name}</strong>
                </div>
                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #D6D3C8' }}>
                  <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>Operational Area</span>
                  <strong style={{ fontSize: '13px', color: '#0F172A' }}>{createdRoute.city}, {createdRoute.state}</strong>
                </div>
                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #D6D3C8' }}>
                  <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>Assigned Stops</span>
                  <strong style={{ fontSize: '13px', color: 'var(--color-navy)' }}>
                    {createdRoute.stops?.length || createdRoute.stops_count || selectedStops.length} Retail Shops
                  </strong>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '13px',
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    cursor: 'pointer',
                  }}
                >
                  Done
                </button>
                {onOpenDetails && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      onClose();
                      onOpenDetails(createdRoute.id);
                    }}
                    style={{
                      padding: '8px 20px',
                      borderRadius: '8px',
                      fontWeight: 600,
                      fontSize: '13px',
                      background: 'var(--color-primary)',
                      color: '#FFFFFF',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>View Route</span>
                    <ExternalLink size={14} />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* STEP 1: ROUTE DETAILS */}
              {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label required" style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B', marginBottom: '4px', display: 'block' }}>
                      Route Name
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Pune Central - Kothrud Express"
                      required
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setError(null);
                      }}
                      style={{
                        height: '38px',
                        fontSize: '13px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        padding: '0 12px',
                        width: '100%',
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B', marginBottom: '4px', display: 'block' }}>
                        Category
                      </label>
                      <select
                        className="form-control"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        style={{
                          height: '38px',
                          fontSize: '13px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          padding: '0 10px',
                          width: '100%',
                          background: '#FFFFFF',
                        }}
                      >
                        <option value="Retail Cold Chain Distribution">Retail Cold Chain Distribution</option>
                        <option value="Morning Peak Milk Run">Morning Peak Milk Run</option>
                        <option value="Express Dispatch Corridor">Express Dispatch Corridor</option>
                        <option value="Wholesale Bulk Supply">Wholesale Bulk Supply</option>
                        <option value="Hospitality & Institutional Route">Hospitality & Institutional Route</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label required" style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B', marginBottom: '4px', display: 'block' }}>
                        Depot
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Pune Central Cold Depot or Nashik Logistics Hub"
                        required
                        value={depot}
                        onChange={(e) => setDepot(e.target.value)}
                        style={{
                          height: '42px',
                          fontSize: '13px',
                          borderRadius: '6px',
                          border: '1px solid #A7AE9F',
                          padding: '0 12px',
                          width: '100%',
                        }}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B', marginBottom: '4px', display: 'block' }}>
                      Delivery Instructions & Route Notes (Optional)
                    </label>
                    <textarea
                      className="form-control"
                      rows={3}
                      placeholder="e.g. Refrigerated milk crate distribution. Vehicles must depart before 05:30 AM to beat commercial traffic..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      style={{
                        fontSize: '13px',
                        borderRadius: '6px',
                        border: '1px solid #A7AE9F',
                        padding: '10px 12px',
                        width: '100%',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: LOCATION DETAILS WITH AUTOCOMPLETE */}
              {step === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div
                    style={{
                      background: '#F8FAFC',
                      border: '1px solid #D6D3C8',
                      borderRadius: '8px',
                      padding: '14px 16px',
                    }}
                  >
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                      Geographic Corridor & Coverage Area
                    </h4>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>
                      Type to search standardized Indian states and cities. Selecting a city automatically validates and populates its associated state.
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {/* State Autocomplete */}
                    <AutocompleteInput
                      id="route-state-input"
                      label="Operating State"
                      required
                      placeholder="Search state (e.g. Maharashtra)..."
                      value={state}
                      onChange={(val) => {
                        setState(val);
                        setLocationErrors((prev) => ({ ...prev, state: undefined }));
                      }}
                      onSelect={handleStateSelect}
                      options={stateOptions}
                      error={locationErrors.state}
                      hint="Auto-populates on city selection"
                    />

                    {/* City Autocomplete */}
                    <AutocompleteInput
                      id="route-city-input"
                      label="Operating City"
                      required
                      placeholder="Type city (e.g. Nas -> Nashik)..."
                      value={city}
                      onChange={(val) => {
                        setCity(val);
                        setLocationErrors((prev) => ({ ...prev, city: undefined }));
                      }}
                      onSelect={handleCitySelect}
                      options={cityOptions}
                      error={locationErrors.city}
                      hint="Searchable autocomplete dropdown"
                    />
                  </div>

                  {/* Geographic Match Confirmation Badge */}
                  {city && state && isValidCity(city, state) && (
                    <div
                      style={{
                        padding: '12px 16px',
                        background: '#F0FDF4',
                        border: '1px solid #BBF7D0',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '12.5px',
                        color: '#166534',
                      }}
                    >
                      <CheckCircle2 size={16} color="#059669" />
                      <div>
                        Geographic Corridor Verified: <strong>{city}</strong> is validated within <strong>{state}</strong>.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: SHOP ASSIGNMENT */}
              {step === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Step Header with Controls */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: '#0F172A' }}>
                        Assign Saved Retail Shops ({selectedStops.length} Selected)
                      </h4>
                      <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                        Reusing validated active shops from the Delivshop shop database
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {/* Filter by City Toggle */}
                      {city && (
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '12px',
                            color: '#334155',
                            cursor: 'pointer',
                            userSelect: 'none',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={filterByCityOnly}
                            onChange={(e) => setFilterByCityOnly(e.target.checked)}
                          />
                          <span>Only {city} shops</span>
                        </label>
                      )}

                      {/* Search Input */}
                      <div style={{ position: 'relative', width: '220px' }}>
                        <Search
                          size={14}
                          style={{
                            position: 'absolute',
                            left: '10px',
                            top: '11px',
                            color: '#94A3B8',
                          }}
                        />
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Search shops..."
                          value={shopSearch}
                          onChange={(e) => setShopSearch(e.target.value)}
                          style={{
                            paddingLeft: '32px',
                            height: '36px',
                            fontSize: '12.5px',
                            borderRadius: '6px',
                            border: '1px solid #A7AE9F',
                            width: '100%',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Loading, Error, Empty, and Populated List */}
                  {loadingShops ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <RefreshCw size={24} className="spin-icon" color="var(--color-primary)" style={{ margin: '0 auto 10px auto' }} />
                      <p style={{ fontSize: '13px', color: '#64748B' }}>Fetching saved shops from database...</p>
                    </div>
                  ) : shopsError ? (
                    <div
                      style={{
                        padding: '20px',
                        background: '#FEF2F2',
                        border: '1px solid #FCA5A5',
                        borderRadius: '8px',
                        textAlign: 'center',
                      }}
                    >
                      <AlertTriangle size={24} color="#DC2626" style={{ margin: '0 auto 8px auto' }} />
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '13.5px', color: '#991B1B' }}>
                        Unable to Load Shops
                      </h4>
                      <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#64748B' }}>{shopsError}</p>
                      <button
                        type="button"
                        onClick={fetchShops}
                        className="btn btn-outline-secondary"
                        style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '6px' }}
                      >
                        Retry Loading Shops
                      </button>
                    </div>
                  ) : availableShops.length === 0 ? (
                    <div
                      style={{
                        padding: '30px 20px',
                        background: '#F8FAFC',
                        border: '1px dashed #A7AE9F',
                        borderRadius: '8px',
                        textAlign: 'center',
                      }}
                    >
                      <Store size={36} color="#94A3B8" style={{ margin: '0 auto 10px auto' }} />
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#334155' }}>
                        No Saved Shops in Database
                      </h4>
                      <p style={{ margin: '0 0 14px 0', fontSize: '12.5px', color: '#64748B', maxWidth: '380px' }}>
                        No active shops were found in the database. Please add shops in the Shops Module first before creating delivery routes.
                      </p>
                      <button
                        type="button"
                        onClick={fetchShops}
                        style={{
                          padding: '6px 16px',
                          fontSize: '12.5px',
                          borderRadius: '6px',
                          border: '1px solid #A7AE9F',
                          background: '#FFFFFF',
                          cursor: 'pointer',
                        }}
                      >
                        Refresh Shop Roster
                      </button>
                    </div>
                  ) : (
                    /* Shop Selection Table / Cards */
                    <div
                      style={{
                        maxHeight: '260px',
                        overflowY: 'auto',
                        border: '1px solid #D6D3C8',
                        borderRadius: '8px',
                        background: '#FFFFFF',
                      }}
                    >
                      {filteredShops.length === 0 ? (
                        <div style={{ padding: '24px', textAlign: 'center', fontSize: '13px', color: '#64748B' }}>
                          No shops match &ldquo;{shopSearch}&rdquo; {filterByCityOnly ? `in ${city}` : ''}
                        </div>
                      ) : (
                        filteredShops.map((shop) => {
                          const isSelected = selectedStops.some((s) => s.shop.id === shop.id);
                          return (
                            <div
                              key={shop.id}
                              style={{
                                padding: '10px 14px',
                                borderBottom: '1px solid #F1F5F9',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: isSelected ? '#F0FDF4' : '#FFFFFF',
                                transition: 'background 0.1s ease',
                              }}
                            >
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <strong style={{ fontSize: '13px', color: '#0F172A' }}>{shop.name}</strong>
                                  <span
                                    style={{
                                      fontSize: '11px',
                                      fontFamily: 'monospace',
                                      background: '#D6D3C8',
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      color: '#475569',
                                    }}
                                  >
                                    ID: {shop.shop_id}
                                  </span>
                                  {shop.is_location_verified && (
                                    <span
                                      style={{
                                        fontSize: '10.5px',
                                        color: '#16A34A',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '2px',
                                        fontWeight: 600,
                                      }}
                                    >
                                      <CheckCircle2 size={11} /> GPS Verified
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                                  {shop.address}, {shop.area || shop.city}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleAddShop(shop)}
                                disabled={isSelected}
                                style={{
                                  padding: '5px 12px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  borderRadius: '6px',
                                  border: isSelected ? '1px solid #BBF7D0' : '1px solid var(--color-primary)',
                                  background: isSelected ? '#DCFCE7' : '#FFFFFF',
                                  color: isSelected ? '#166534' : 'var(--color-primary)',
                                  cursor: isSelected ? 'default' : 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                {isSelected ? (
                                  <>
                                    <Check size={13} />
                                    <span>Selected</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus size={13} />
                                    <span>Add Stop</span>
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* Selected Stops Sequencing List */}
                  {selectedStops.length > 0 && (
                    <div style={{ marginTop: '8px' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '8px',
                        }}
                      >
                        <h5 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                          Delivery Stop Sequence & Estimated Times
                        </h5>
                        <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                          Use arrow buttons to adjust delivery sequence
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                        {selectedStops.map((stop, idx) => (
                          <div
                            key={stop.shop.id}
                            style={{
                              padding: '8px 12px',
                              background: '#FFFFFF',
                              border: '1px solid #A7AE9F',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '12.5px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div
                                style={{
                                  width: '22px',
                                  height: '22px',
                                  borderRadius: '50%',
                                  background: 'var(--color-navy)',
                                  color: '#FFFFFF',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {idx + 1}
                              </div>
                              <div>
                                <strong style={{ color: '#0F172A' }}>{stop.shop.name}</strong>
                                <span style={{ color: '#64748B', marginLeft: '6px' }}>
                                  ({stop.shop.area || stop.shop.city})
                                </span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ fontSize: '11.5px', color: '#0369A1', fontWeight: 600 }}>
                                ETA {stop.plannedArrivalTime}
                              </span>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => handleMoveStop(idx, 'UP')}
                                  title="Move earlier"
                                  style={{
                                    border: '1px solid #A7AE9F',
                                    background: '#FFFFFF',
                                    borderRadius: '4px',
                                    padding: '3px',
                                    cursor: idx === 0 ? 'not-allowed' : 'pointer',
                                    opacity: idx === 0 ? 0.35 : 1,
                                    display: 'flex',
                                  }}
                                >
                                  <ArrowUp size={12} />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === selectedStops.length - 1}
                                  onClick={() => handleMoveStop(idx, 'DOWN')}
                                  title="Move later"
                                  style={{
                                    border: '1px solid #A7AE9F',
                                    background: '#FFFFFF',
                                    borderRadius: '4px',
                                    padding: '3px',
                                    cursor: idx === selectedStops.length - 1 ? 'not-allowed' : 'pointer',
                                    opacity: idx === selectedStops.length - 1 ? 0.35 : 1,
                                    display: 'flex',
                                  }}
                                >
                                  <ArrowDown size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveShop(idx)}
                                  title="Remove stop"
                                  style={{
                                    border: '1px solid #FCA5A5',
                                    background: '#FFF5F5',
                                    color: '#DC2626',
                                    borderRadius: '4px',
                                    padding: '3px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                  }}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Route Metrics Summary Pill */}
                      <div
                        style={{
                          marginTop: '10px',
                          padding: '10px 14px',
                          background: '#F8FAFC',
                          border: '1px solid #D6D3C8',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                          <Clock size={14} color="#0369A1" />
                          <span>Est. Total Distance: <strong>{(selectedStops.length * 4.2).toFixed(1)} km</strong></span>
                        </div>
                        <div style={{ color: '#475569' }}>
                          Est. Duration: <strong>{selectedStops.length * 15} mins</strong>
                        </div>
                        <div style={{ color: '#059669', fontWeight: 600 }}>
                          {selectedStops.length} stops ready
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer Controls */}
        {!createdRoute && (
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid #D6D3C8',
              background: '#F8FAFC',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              {step > 1 && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  disabled={loading}
                  onClick={handlePrev}
                  style={{
                    padding: '8px 18px',
                    fontSize: '13px',
                    borderRadius: '6px',
                    border: '1px solid #A7AE9F',
                    background: '#FFFFFF',
                    cursor: 'pointer',
                  }}
                >
                  Back
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={loading}
                style={{
                  padding: '8px 18px',
                  fontSize: '13px',
                  borderRadius: '6px',
                  border: '1px solid #A7AE9F',
                  background: '#FFFFFF',
                  color: '#475569',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>

              {step < 3 ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleNext}
                >
                  Next
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={loading || selectedStops.length === 0}
                    onClick={() => handleSaveRoute(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Save size={14} />
                    <span>Save Draft</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={loading || selectedStops.length === 0}
                    onClick={() => handleSaveRoute(true)}
                  >
                    {loading ? 'Creating Route...' : 'Create Route'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

