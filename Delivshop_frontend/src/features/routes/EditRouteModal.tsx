import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, MapPin, Play, Flag } from 'lucide-react';
import { api } from '../../services/api/endpoints';
import { Route } from '../../types';
import { Button } from '../../components/common/Button';
import { GoogleLocationPicker, LocationValue } from '../../components/common/GoogleLocationPicker';

interface EditRouteModalProps {
  route: Route | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedRoute: Route) => void;
}

export const EditRouteModal: React.FC<EditRouteModalProps> = ({
  route,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [depot, setDepot] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [startLocation, setStartLocation] = useState<LocationValue>({
    name: 'Pune Central Cold Depot',
    latitude: 18.5204,
    longitude: 73.8567,
    address: 'Central Logistics Hub, Pune, Maharashtra',
  });
  const [returnLocation, setReturnLocation] = useState<LocationValue>({
    name: 'Pune Central Cold Depot',
    latitude: 18.5204,
    longitude: 73.8567,
    address: 'Central Logistics Hub, Pune, Maharashtra',
  });
  const [activePickerModal, setActivePickerModal] = useState<'start' | 'return' | null>(null);

  useEffect(() => {
    if (route) {
      setName(route.name || '');
      setCategory(route.category || 'Retail Cold Chain Distribution');
      setDepot(route.depot || route.depotName || 'Pune Central Cold Depot');
      setCity(route.city || 'Pune');
      setState(route.state || 'Maharashtra');
      setDescription(route.description || '');
      setStatus(route.status || 'DRAFT');

      const rStartLat = route.start_latitude ?? route.startLocationLat;
      const rStartLng = route.start_longitude ?? route.startLocationLng;
      if (rStartLat !== undefined && rStartLat !== null && rStartLng !== undefined && rStartLng !== null) {
        setStartLocation({
          name: route.start_location_name || route.startLocationName || route.depot || 'Route Start Location',
          latitude: Number(rStartLat),
          longitude: Number(rStartLng),
          address: route.start_address || route.startLocationAddress || '',
          placeId: route.start_place_id,
        });
      } else {
        setStartLocation({
          name: route.depot || 'Pune Central Cold Depot',
          latitude: 18.5204,
          longitude: 73.8567,
          address: `${route.city || 'Pune'}, ${route.state || 'Maharashtra'}`,
        });
      }

      const rReturnLat = route.return_latitude ?? route.returnLocationLat;
      const rReturnLng = route.return_longitude ?? route.returnLocationLng;
      if (rReturnLat !== undefined && rReturnLat !== null && rReturnLng !== undefined && rReturnLng !== null) {
        setReturnLocation({
          name: route.return_location_name || route.returnLocationName || route.depot || 'Route Return Location',
          latitude: Number(rReturnLat),
          longitude: Number(rReturnLng),
          address: route.return_address || route.returnLocationAddress || '',
          placeId: route.return_place_id,
        });
      } else {
        setReturnLocation({
          name: route.depot || 'Pune Central Cold Depot',
          latitude: 18.5204,
          longitude: 73.8567,
          address: `${route.city || 'Pune'}, ${route.state || 'Maharashtra'}`,
        });
      }

      setError(null);
    }
  }, [route, isOpen]);

  if (!isOpen || !route) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Route name is required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res: any = await api.routes.update(route.id, {
        name: name.trim(),
        category: category.trim() || undefined,
        depot: depot.trim() || undefined,
        city: city.trim(),
        state: state.trim(),
        description: description.trim() || undefined,
        status,
        startLocation: {
          name: startLocation.name,
          latitude: startLocation.latitude,
          longitude: startLocation.longitude,
          address: startLocation.address,
          placeId: startLocation.placeId,
        },
        returnLocation: {
          name: returnLocation.name,
          latitude: returnLocation.latitude,
          longitude: returnLocation.longitude,
          address: returnLocation.address,
          placeId: returnLocation.placeId,
        },
      });

      const updated = res?.data || res;
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update route');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1200,
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
          maxWidth: '620px',
          background: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
              Edit Route
            </h3>
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--color-primary)',
                backgroundColor: 'var(--color-primary-subtle)',
                padding: '2px 8px',
                borderRadius: '4px',
                border: '1px solid #6EE7B7',
              }}
            >
              {route.route_code || route.code}
            </span>
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
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div
            style={{
              margin: '16px 20px 0 20px',
              padding: '10px 14px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '6px',
              color: '#DC2626',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Route Name */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Route Name <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Pune Central - Kothrud Express"
                required
                className="toolbar-search-input"
                style={{ width: '100%', height: '36px', padding: '0 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
              />
            </div>

            {/* Status & Category */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="toolbar-select-field"
                  style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Category
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Retail Cold Chain"
                  className="toolbar-search-input"
                  style={{ width: '100%', height: '36px', padding: '0 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                />
              </div>
            </div>

            {/* City & State */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  City <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Pune"
                  required
                  className="toolbar-search-input"
                  style={{ width: '100%', height: '36px', padding: '0 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  State <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. Maharashtra"
                  required
                  className="toolbar-search-input"
                  style={{ width: '100%', height: '36px', padding: '0 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                />
              </div>
            </div>

            {/* Depot */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Primary Depot
              </label>
              <input
                type="text"
                value={depot}
                onChange={(e) => setDepot(e.target.value)}
                placeholder="e.g. Pune Central Cold Depot"
                className="toolbar-search-input"
                style={{ width: '100%', height: '36px', padding: '0 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
              />
            </div>

            {/* Route Locations Configuration Section */}
            <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Route Locations (Origin & Return Loop)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* Start Location Card */}
                <div style={{ background: '#FFFFFF', padding: '12px', borderRadius: '8px', border: '1px solid #CBD5E1' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Play size={14} color="#059669" fill="#059669" />
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#065F46' }}>Start Location</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActivePickerModal('start')}
                      style={{
                        padding: '3px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: '#ECFDF5',
                        color: '#059669',
                        border: '1px solid #A7F3D0',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      Edit Pin
                    </button>
                  </div>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#0F172A' }}>
                    {startLocation.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px', fontFamily: 'monospace' }}>
                    {startLocation.latitude.toFixed(5)}, {startLocation.longitude.toFixed(5)}
                  </div>
                  {startLocation.address && (
                    <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {startLocation.address}
                    </div>
                  )}
                </div>

                {/* Return Location Card */}
                <div style={{ background: '#FFFFFF', padding: '12px', borderRadius: '8px', border: '1px solid #CBD5E1' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Flag size={14} color="#2563EB" fill="#2563EB" />
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#1E40AF' }}>Return Location</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActivePickerModal('return')}
                      style={{
                        padding: '3px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: '#EFF6FF',
                        color: '#2563EB',
                        border: '1px solid #BFDBFE',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      Edit Pin
                    </button>
                  </div>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#0F172A' }}>
                    {returnLocation.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px', fontFamily: 'monospace' }}>
                    {returnLocation.latitude.toFixed(5)}, {returnLocation.longitude.toFixed(5)}
                  </div>
                  {returnLocation.address && (
                    <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {returnLocation.address}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional notes about this delivery corridor..."
                rows={2}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div
            style={{
              marginTop: '24px',
              paddingTop: '16px',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
            }}
          >
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading} icon={<Save size={15} />}>
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </div>

      {/* Embedded Location Picker Modal */}
      {activePickerModal && (
        <GoogleLocationPicker
          title={activePickerModal === 'start' ? 'Select Start Location (Vehicle Origin)' : 'Select Return Location (End of Route)'}
          value={activePickerModal === 'start' ? startLocation : returnLocation}
          onSave={(loc) => {
            if (activePickerModal === 'start') {
              setStartLocation(loc);
            } else {
              setReturnLocation(loc);
            }
            setActivePickerModal(null);
          }}
          onCancel={() => setActivePickerModal(null)}
          pinColor={activePickerModal === 'start' ? '#059669' : '#2563EB'}
          badgeLabel={activePickerModal === 'start' ? 'START LOCATION' : 'RETURN LOCATION'}
        />
      )}
    </div>
  );
};

