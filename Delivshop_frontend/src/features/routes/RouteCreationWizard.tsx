import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { api } from '../../services/api/endpoints';
import { Shop, Route } from '../../types';

interface RouteCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onRouteCreated: (route: Route) => void;
}

export const RouteCreationWizard: React.FC<RouteCreationWizardProps> = ({
  isOpen,
  onClose,
  onRouteCreated,
}) => {
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [routeCode, setRouteCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('Pune');
  const [state, setState] = useState('Maharashtra');
  const [depot, setDepot] = useState('Pune Central Cold Depot');

  // Shops selection and sequencing
  const [availableShops, setAvailableShops] = useState<Shop[]>([]);
  const [shopSearch, setShopSearch] = useState('');
  const [selectedStops, setSelectedStops] = useState<
    Array<{
      shop: Shop;
      plannedArrivalTime?: string;
      serviceTimeMinutes: number;
      deliveryInstructions?: string;
    }>
  >([]);

  useEffect(() => {
    if (isOpen) {
      // Load shops for selection
      api.shops
        .list({ limit: 100 })
        .then((res: any) => {
          setAvailableShops(res.data?.items || res.data || []);
        })
        .catch((err: any) => {
          console.error('Failed to load shops for route builder:', err);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddShopToRoute = (shop: Shop) => {
    if (selectedStops.some((s) => s.shop.id === shop.id)) {
      alert('This shop is already added to the route stops sequence.');
      return;
    }

    const nextSeq = selectedStops.length + 1;
    // Calculate a default planned arrival time: 06:00 AM + 30 mins * (nextSeq - 1)
    const baseHour = 6;
    const totalMinutes = (nextSeq - 1) * 30;
    const hour = baseHour + Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    const formattedTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} AM`;

    setSelectedStops([
      ...selectedStops,
      {
        shop,
        plannedArrivalTime: formattedTime,
        serviceTimeMinutes: 12,
        deliveryInstructions: shop.delivery_instructions || 'Unload standard milk pouches into chiller.',
      },
    ]);
  };

  const handleRemoveStop = (index: number) => {
    const updated = [...selectedStops];
    updated.splice(index, 1);
    setSelectedStops(updated);
  };

  const handleMoveStop = (index: number, direction: 'UP' | 'DOWN') => {
    if (direction === 'UP' && index === 0) return;
    if (direction === 'DOWN' && index === selectedStops.length - 1) return;

    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    const updated = [...selectedStops];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setSelectedStops(updated);
  };

  const handleSaveRoute = async (publishImmediately: boolean) => {
    if (!name.trim()) {
      setError('Route name is required.');
      setStep(1);
      return;
    }

    if (selectedStops.length === 0) {
      setError('Please add at least one shop stop to the route.');
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
        serviceTimeMinutes: Number(s.serviceTimeMinutes),
        deliveryInstructions: s.deliveryInstructions,
      }));

      const res = await api.routes.create({
        routeCode: routeCode.trim() || undefined,
        name: name.trim(),
        description: description.trim() || undefined,
        city,
        state,
        depot,
        status: publishImmediately ? 'PUBLISHED' : 'DRAFT',
        stops: stopsPayload,
        totalDistanceKm: parseFloat((selectedStops.length * 4.2).toFixed(2)),
        estimatedDurationMinutes: selectedStops.length * 15,
      });

      onRouteCreated(res.data);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create route');
    } finally {
      setLoading(false);
    }
  };

  const filteredShops = availableShops.filter((s) => {
    const q = shopSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.area?.toLowerCase().includes(q) ||
      s.city?.toLowerCase().includes(q) ||
      s.address.toLowerCase().includes(q)
    );
  });

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog" style={{ maxWidth: '820px' }}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              <Navigation size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="modal-title">Route Creation & Sequence Builder</h3>
              <p className="modal-subtitle">Design, validate, and sequence master delivery corridor</p>
            </div>
          </div>
          <button type="button" className="btn-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Step Progression Bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC', padding: '10px 24px' }}>
          {[
            { num: 1, title: 'Route Details' },
            { num: 2, title: 'Depot & Service Area' },
            { num: 3, title: 'Add Shops' },
            { num: 4, title: 'Arrange Sequence' },
            { num: 5, title: 'Review & Publish' },
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
                  gap: '8px',
                  cursor: isCompleted ? 'pointer' : 'default',
                  opacity: isCurrent || isCompleted ? 1 : 0.5,
                }}
                onClick={() => {
                  if (isCompleted) setStep(s.num);
                }}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: isCurrent ? '#0F172A' : isCompleted ? '#16A34A' : '#CBD5E1',
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
                <span style={{ fontSize: '12px', fontWeight: isCurrent ? 700 : 500, color: '#1E293B' }}>
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="form-error-banner" style={{ margin: '16px 24px 0 24px' }}>
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto', padding: '24px' }}>
          {/* STEP 1: ROUTE DETAILS */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label required">Route Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Route 1 • Central & Camp Area"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <span className="form-hint">Descriptive name for dispatchers and drivers</span>
              </div>

              <div className="form-group">
                <label className="form-label">Route Code / Identifier</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. RT-PUN-01 (Auto-generated if empty)"
                  value={routeCode}
                  onChange={(e) => setRouteCode(e.target.value.toUpperCase())}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description / Delivery Scope</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="e.g. Morning peak retail dairy distribution covering MG Road and Shivaji Nagar..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* STEP 2: DEPOT & SERVICE AREA */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label required">Starting Distribution Depot</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={depot}
                  onChange={(e) => setDepot(e.target.value)}
                />
                <span className="form-hint">Central facility where vehicles are loaded with cold crates</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label required">Operational City</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label required">State</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: ADD SHOPS */}
          {step === 3 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Select Existing Shops</h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                    Reusing validated shops from the Shops Module ({selectedStops.length} selected)
                  </p>
                </div>
                <div style={{ position: 'relative', width: '240px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94A3B8' }} />
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    style={{ paddingLeft: '30px' }}
                    placeholder="Search shops..."
                    value={shopSearch}
                    onChange={(e) => setShopSearch(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ maxHeight: '340px', overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                {filteredShops.map((shop) => {
                  const isSelected = selectedStops.some((s) => s.shop.id === shop.id);
                  return (
                    <div
                      key={shop.id}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #F1F5F9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: isSelected ? '#F0FDF4' : '#FFFFFF',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ fontSize: '13px', color: '#0F172A' }}>{shop.name}</strong>
                          <span style={{ fontSize: '11px', color: '#64748B' }}>{shop.shop_id}</span>
                          {shop.is_location_verified && (
                            <span style={{ fontSize: '11px', color: '#16A34A', display: 'flex', alignItems: 'center', gap: '2px' }}>
                              <CheckCircle2 size={12} /> Verified Map
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                          {shop.address}, {shop.area || shop.city}
                        </div>
                      </div>

                      <button
                        type="button"
                        className={`btn btn-xs ${isSelected ? 'btn-secondary' : 'btn-outline-primary'}`}
                        disabled={isSelected}
                        onClick={() => handleAddShopToRoute(shop)}
                      >
                        {isSelected ? 'Added to Route' : '+ Add Stop'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: ARRANGE SEQUENCE */}
          {step === 4 && (
            <div>
              <div style={{ marginBottom: '14px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Arrange Delivery Stop Sequence</h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                  Use the Up/Down controls to arrange the exact delivery sequence
                </p>
              </div>

              {selectedStops.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', background: '#F8FAFC', borderRadius: '8px', color: '#64748B' }}>
                  <Store size={32} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
                  <p>No shops selected yet. Go back to Step 3 to select shops.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {selectedStops.map((stop, idx) => (
                    <div
                      key={stop.shop.id}
                      style={{
                        padding: '12px 16px',
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: '#0F172A',
                            color: '#FFFFFF',
                            fontSize: '12px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {idx + 1}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '13px', color: '#0F172A' }}>{stop.shop.name}</strong>
                            <span style={{ fontSize: '11px', color: '#64748B' }}>
                              ETA: {stop.plannedArrivalTime || '06:00 AM'}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748B' }}>
                            {stop.shop.address} • Window: {stop.shop.delivery_window || 'Morning 06-09 AM'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn btn-xs btn-outline-secondary"
                          disabled={idx === 0}
                          onClick={() => handleMoveStop(idx, 'UP')}
                          title="Move stop earlier"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-xs btn-outline-secondary"
                          disabled={idx === selectedStops.length - 1}
                          onClick={() => handleMoveStop(idx, 'DOWN')}
                          title="Move stop later"
                        >
                          <ArrowDown size={13} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-xs btn-outline-danger"
                          onClick={() => handleRemoveStop(idx)}
                          title="Remove stop"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 5: REVIEW & PUBLISH */}
          {step === 5 && (
            <div>
              <div className="card" style={{ padding: '16px', background: '#F8FAFC', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px 0' }}>Route Summary & Metrics</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: '#64748B', display: 'block' }}>Route Name</span>
                    <strong style={{ color: '#0F172A' }}>{name}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block' }}>Starting Depot</span>
                    <strong style={{ color: '#0F172A' }}>{depot}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block' }}>Service Area</span>
                    <strong style={{ color: '#0F172A' }}>{city}, {state}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block' }}>Configured Stops</span>
                    <strong style={{ color: '#0F172A' }}>{selectedStops.length} Shop Stops</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block' }}>Est. Travel Distance</span>
                    <strong style={{ color: '#0F172A' }}>{(selectedStops.length * 4.2).toFixed(1)} KM</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block' }}>Est. Total Duration</span>
                    <strong style={{ color: '#0F172A' }}>{selectedStops.length * 15} Minutes</strong>
                  </div>
                </div>
              </div>

              {/* Stop Timeline Preview */}
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 10px 0', color: '#475569' }}>
                  Sequenced Shop Stops Itinerary
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedStops.map((s, idx) => (
                    <div
                      key={s.shop.id}
                      style={{
                        padding: '10px 14px',
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                      }}
                    >
                      <div>
                        <strong>Stop #{idx + 1}: {s.shop.name}</strong>
                        <span style={{ color: '#64748B', marginLeft: '8px' }}>({s.shop.area || s.shop.address})</span>
                      </div>
                      <div style={{ color: '#0369A1', fontWeight: 600 }}>ETA {s.plannedArrivalTime}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            {step > 1 && (
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={loading}
                onClick={() => setStep(step - 1)}
              >
                Back
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>

            {step < 5 ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  if (step === 1 && !name.trim()) {
                    setError('Please enter a route name.');
                    return;
                  }
                  if (step === 3 && selectedStops.length === 0) {
                    setError('Please select at least one shop stop.');
                    return;
                  }
                  setError(null);
                  setStep(step + 1);
                }}
              >
                Continue to Step {step + 1}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  disabled={loading}
                  onClick={() => handleSaveRoute(false)}
                >
                  <Save size={14} /> Save as Draft
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={loading}
                  onClick={() => handleSaveRoute(true)}
                >
                  {loading ? 'Publishing...' : 'Validate & Publish Route'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
