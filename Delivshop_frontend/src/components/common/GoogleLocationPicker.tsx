import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapPin,
  Navigation,
  Search,
  Check,
  X,
  Compass,
  AlertCircle,
  Loader2,
  Layers,
  ZoomIn,
  ZoomOut,
  Crosshair,
} from 'lucide-react';

export interface LocationValue {
  name?: string;
  latitude: number;
  longitude: number;
  address?: string;
  placeId?: string | null;
}

export interface GoogleLocationPickerProps {
  title?: string;
  label?: string;
  value?: LocationValue | null;
  initialLatitude?: number;
  initialLongitude?: number;
  initialName?: string;
  initialAddress?: string;
  onSave: (location: LocationValue) => void;
  onCancel?: () => void;
  isOpen?: boolean;
  pinColor?: string; // e.g. '#0284C7' for Start, '#DC2626' for Return
  badgeLabel?: string; // 'START LOCATION' | 'RETURN LOCATION'
}

declare global {
  interface Window {
    google?: any;
    __google_maps_callback?: () => void;
  }
}

// Preset common logistics hubs in Maharashtra for rapid snap
const REGIONAL_LOGISTICS_HUBS = [
  { name: 'Pune Central Cold Depot (Hadapsar)', lat: 18.5204, lng: 73.8567, addr: 'Hadapsar Industrial Estate, Pune, Maharashtra' },
  { name: 'Chakan Automotive & Cold Cluster', lat: 18.7606, lng: 73.8576, addr: 'MIDC Phase II, Chakan, Pune, Maharashtra' },
  { name: 'Bhosari MIDC Hub', lat: 18.6277, lng: 73.8347, addr: 'Telco Road, Bhosari, Pune, Maharashtra' },
  { name: 'Nashik Central Depot (Panchavati)', lat: 20.0059, lng: 73.7898, addr: 'Panchavati, Nashik, Maharashtra' },
  { name: 'Ozar Dairy Hub (Sai Amrut)', lat: 20.0911, lng: 73.9168, addr: 'Ozar Mig, Nashik, Maharashtra' },
  { name: 'Mumbai Central Logistics Hub (Bhiwandi)', lat: 19.2967, lng: 73.0631, addr: 'Mankoli Naka, Bhiwandi, Maharashtra' },
];

export const GoogleLocationPicker: React.FC<GoogleLocationPickerProps> = ({
  title = 'Configure Location',
  label = 'Select location on map or enter GPS coordinates',
  value,
  initialLatitude = 18.5204,
  initialLongitude = 73.8567,
  initialName = '',
  initialAddress = '',
  onSave,
  onCancel,
  isOpen = true,
  pinColor = '#0284C7',
  badgeLabel = 'LOCATION',
}) => {
  // Mode selection: 'map' | 'coordinates'
  const [mode, setMode] = useState<'map' | 'coordinates'>('map');

  // Working state
  const [lat, setLat] = useState<number>(() => {
    if (value?.latitude != null && !isNaN(value.latitude)) return value.latitude;
    return initialLatitude;
  });
  const [lng, setLng] = useState<number>(() => {
    if (value?.longitude != null && !isNaN(value.longitude)) return value.longitude;
    return initialLongitude;
  });
  const [name, setName] = useState<string>(() => value?.name || initialName || '');
  const [address, setAddress] = useState<string>(() => value?.address || initialAddress || '');

  // Form inputs for coordinate manual mode
  const [inputLat, setInputLat] = useState<string>(() => lat.toFixed(6));
  const [inputLng, setInputLng] = useState<string>(() => lng.toFixed(6));
  const [coordError, setCoordError] = useState<string | null>(null);

  // Address geocoding status
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodingNotice, setGeocodingNotice] = useState<string | null>(null);

  // Map references
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const googleMapInstanceRef = useRef<any>(null);
  const googleMarkerRef = useRef<any>(null);
  const [googleMapsStatus, setGoogleMapsStatus] = useState<'loading' | 'ready' | 'fallback'>('loading');

  // Fallback interactive canvas state (when Google Maps JS API is offline or without billing)
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [canvasCenter, setCanvasCenter] = useState({ lat, lng });

  // Sync inputs with state
  useEffect(() => {
    setInputLat(lat.toFixed(6));
    setInputLng(lng.toFixed(6));
  }, [lat, lng]);

  // Reverse Geocoding helper (debounced)
  const resolveAddressForCoords = useCallback(async (targetLat: number, targetLng: number) => {
    setIsGeocoding(true);
    setGeocodingNotice(null);

    // 1. Try Google Geocoder if available
    if (window.google?.maps?.Geocoder) {
      try {
        const geocoder = new window.google.maps.Geocoder();
        const response = await geocoder.geocode({ location: { lat: targetLat, lng: targetLng } });
        if (response.results && response.results.length > 0) {
          const resolved = response.results[0].formatted_address;
          setAddress(resolved);
          setIsGeocoding(false);
          return;
        }
      } catch (err) {
        // Fall through to public reverse geocoder without blocking
      }
    }

    // 2. OpenStreetMap Nominatim reverse geocoder fallback
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${targetLat}&lon=${targetLng}&zoom=18&addressdetails=1`,
        { headers: { Accept: 'application/json' } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          setAddress(data.display_name);
          setIsGeocoding(false);
          return;
        }
      }
    } catch {
      // Never block location save if reverse lookup fails
    }

    setIsGeocoding(false);
    setGeocodingNotice('Precise address could not be resolved automatically. Coordinates will be saved.');
  }, []);

  // Update coordinates from any source (map click, drag, or manual input)
  const updateCoordinates = useCallback(
    (newLat: number, newLng: number, triggerReverseGeocode = true) => {
      const clampedLat = Math.max(-90, Math.min(90, Number(newLat.toFixed(6))));
      const clampedLng = Math.max(-180, Math.min(180, Number(newLng.toFixed(6))));

      setLat(clampedLat);
      setLng(clampedLng);
      setInputLat(clampedLat.toFixed(6));
      setInputLng(clampedLng.toFixed(6));
      setCoordError(null);

      // Move Google Maps marker if loaded
      if (googleMarkerRef.current && window.google?.maps) {
        const pos = new window.google.maps.LatLng(clampedLat, clampedLng);
        googleMarkerRef.current.setPosition(pos);
        if (googleMapInstanceRef.current) {
          googleMapInstanceRef.current.panTo(pos);
        }
      }

      setCanvasCenter({ lat: clampedLat, lng: clampedLng });

      if (triggerReverseGeocode) {
        resolveAddressForCoords(clampedLat, clampedLng);
      }
    },
    [resolveAddressForCoords]
  );

  // Initialize Google Maps JavaScript API
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const apiKey =
      (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ||
      (import.meta as any).env?.VITE_GOOGLE_ROUTES_API_KEY ||
      '';

    const initMap = () => {
      if (!isMounted || !mapContainerRef.current || !window.google?.maps) return;

      try {
        const center = { lat, lng };
        const map = new window.google.maps.Map(mapContainerRef.current, {
          center,
          zoom: 14,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: [
            {
              featureType: 'poi.business',
              stylers: [{ visibility: 'on' }],
            },
          ],
        });

        googleMapInstanceRef.current = map;

        // Custom Pin Marker
        const marker = new window.google.maps.Marker({
          position: center,
          map,
          draggable: true,
          title: title || 'Selected Location',
          animation: window.google.maps.Animation.DROP,
        });

        googleMarkerRef.current = marker;

        // Listener: Pin Dragged
        marker.addListener('dragend', (e: any) => {
          if (!e.latLng) return;
          updateCoordinates(e.latLng.lat(), e.latLng.lng(), true);
        });

        // Listener: Map Clicked
        map.addListener('click', (e: any) => {
          if (!e.latLng) return;
          marker.setPosition(e.latLng);
          updateCoordinates(e.latLng.lat(), e.latLng.lng(), true);
        });

        setGoogleMapsStatus('ready');
      } catch (err) {
        console.warn('Google Maps initialization failed, switching to interactive canvas:', err);
        setGoogleMapsStatus('fallback');
      }
    };

    if (window.google?.maps) {
      initMap();
    } else if (apiKey) {
      const scriptId = 'google-maps-js-sdk';
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          if (isMounted) initMap();
        };
        script.onerror = () => {
          if (isMounted) setGoogleMapsStatus('fallback');
        };
        document.head.appendChild(script);
      } else {
        const timer = setTimeout(() => {
          if (window.google?.maps && isMounted) initMap();
          else if (isMounted) setGoogleMapsStatus('fallback');
        }, 1500);
        return () => clearTimeout(timer);
      }
    } else {
      // No Google Maps API key found in frontend environment, use high-precision interactive canvas fallback
      setGoogleMapsStatus('fallback');
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Handle "Show on Map" button from manual coordinates
  const handleApplyCoordinates = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCoordError(null);

    const parsedLat = parseFloat(inputLat.trim());
    const parsedLng = parseFloat(inputLng.trim());

    if (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) {
      setCoordError('Latitude must be a valid number between -90.000000 and 90.000000.');
      return;
    }
    if (isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
      setCoordError('Longitude must be a valid number between -180.000000 and 180.000000.');
      return;
    }

    updateCoordinates(parsedLat, parsedLng, true);
    setMode('map');
  };

  // Handle preset hub selection
  const handleSelectPreset = (hub: (typeof REGIONAL_LOGISTICS_HUBS)[0]) => {
    setName(hub.name);
    setAddress(hub.addr);
    updateCoordinates(hub.lat, hub.lng, false);
  };

  // Interactive Canvas fallback click handler
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const span = 0.15 / canvasZoom;
    const minLat = canvasCenter.lat - span / 2;
    const maxLat = canvasCenter.lat + span / 2;
    const minLng = canvasCenter.lng - span / 2;
    const maxLng = canvasCenter.lng + span / 2;

    const pctX = Math.max(0, Math.min(1, x / rect.width));
    const pctY = Math.max(0, Math.min(1, y / rect.height));

    const newLng = minLng + pctX * (maxLng - minLng);
    const newLat = maxLat - pctY * (maxLat - minLat);

    updateCoordinates(newLat, newLng, true);
  };

  // Save confirmed location
  const handleSave = () => {
    if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
      setCoordError('Coordinates are invalid. Please place the map pin or enter valid coordinates.');
      return;
    }

    onSave({
      name: name.trim() || undefined,
      latitude: Number(lat.toFixed(7)),
      longitude: Number(lng.toFixed(7)),
      address: address.trim() || undefined,
    });
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '780px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
          border: '1px solid #D6D3C8',
          overflow: 'hidden',
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
            backgroundColor: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: `${pinColor}15`,
                color: pinColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MapPin size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  {title}
                </h3>
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: `${pinColor}18`,
                    color: pinColor,
                  }}
                >
                  {badgeLabel}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>{label}</p>
            </div>
          </div>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#64748B',
                padding: '4px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Close modal"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Mode Selector Tabs */}
        <div
          style={{
            padding: '10px 20px',
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setMode('map')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                border: mode === 'map' ? `1px solid ${pinColor}` : '1px solid #CBD5E1',
                backgroundColor: mode === 'map' ? `${pinColor}15` : '#FFFFFF',
                color: mode === 'map' ? pinColor : '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Compass size={14} />
              <span>Select on Map</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('coordinates')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                border: mode === 'coordinates' ? `1px solid ${pinColor}` : '1px solid #CBD5E1',
                backgroundColor: mode === 'coordinates' ? `${pinColor}15` : '#FFFFFF',
                color: mode === 'coordinates' ? pinColor : '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Crosshair size={14} />
              <span>Enter Coordinates</span>
            </button>
          </div>

          {/* Quick Preset Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Quick Depot:</span>
            <select
              onChange={(e) => {
                const idx = Number(e.target.value);
                if (idx >= 0 && REGIONAL_LOGISTICS_HUBS[idx]) {
                  handleSelectPreset(REGIONAL_LOGISTICS_HUBS[idx]);
                }
              }}
              defaultValue=""
              style={{
                fontSize: '11.5px',
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#F8FAFC',
                color: '#334155',
                cursor: 'pointer',
                maxWidth: '220px',
              }}
            >
              <option value="" disabled>
                Select preset warehouse...
              </option>
              {REGIONAL_LOGISTICS_HUBS.map((h, i) => (
                <option key={i} value={i}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Body Content */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* MAP MODE */}
          {mode === 'map' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '320px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  overflow: 'hidden',
                  backgroundColor: '#E2E8F0',
                }}
              >
                {/* Google Map Div */}
                <div
                  ref={mapContainerRef}
                  style={{
                    width: '100%',
                    height: '100%',
                    display: googleMapsStatus === 'ready' ? 'block' : 'none',
                  }}
                />

                {/* Loading state for Google Maps */}
                {googleMapsStatus === 'loading' && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#F8FAFC',
                      gap: '8px',
                    }}
                  >
                    <Loader2 size={24} className="spin-icon" color={pinColor} />
                    <span style={{ fontSize: '12.5px', color: '#64748B' }}>
                      Loading Google Maps Engine...
                    </span>
                  </div>
                )}

                {/* Interactive High-Precision Map Canvas Fallback */}
                {googleMapsStatus === 'fallback' && (
                  <div
                    onClick={handleCanvasClick}
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: '100%',
                      backgroundColor: '#0F172A',
                      cursor: 'crosshair',
                      backgroundImage: `
                        radial-gradient(circle at 50% 50%, #1E293B 0%, #0F172A 100%),
                        linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
                      `,
                      backgroundSize: '100% 100%, 24px 24px, 24px 24px',
                    }}
                  >
                    {/* Visual Coordinate Rings */}
                    <div
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '120px',
                        height: '120px',
                        borderRadius: '50%',
                        border: `1px dashed ${pinColor}50`,
                        pointerEvents: 'none',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '240px',
                        height: '240px',
                        borderRadius: '50%',
                        border: '1px dashed rgba(255,255,255,0.07)',
                        pointerEvents: 'none',
                      }}
                    />

                    {/* Center Pin Indicator */}
                    <div
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -100%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        pointerEvents: 'none',
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: pinColor,
                          color: '#FFFFFF',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.4)',
                          whiteSpace: 'nowrap',
                          marginBottom: '2px',
                        }}
                      >
                        {name || badgeLabel}
                      </div>
                      <MapPin size={34} color={pinColor} fill={pinColor} style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))' }} />
                    </div>

                    {/* Interactive Canvas Overlay Info */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '10px',
                        left: '12px',
                        backgroundColor: 'rgba(15, 23, 42, 0.85)',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#94A3B8',
                        fontSize: '11.5px',
                        pointerEvents: 'none',
                      }}
                    >
                      Click anywhere on grid to position pin • Pan & Zoom to calibrate
                    </div>

                    {/* Zoom Controls */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        zIndex: 10,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => setCanvasZoom((z) => Math.min(8, z * 1.4))}
                        style={{
                          width: '30px',
                          height: '30px',
                          backgroundColor: '#1E293B',
                          color: '#FFFFFF',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title="Zoom In"
                      >
                        <ZoomIn size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCanvasZoom((z) => Math.max(0.4, z / 1.4))}
                        style={{
                          width: '30px',
                          height: '30px',
                          backgroundColor: '#1E293B',
                          color: '#FFFFFF',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title="Zoom Out"
                      >
                        <ZoomOut size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Instructions banner */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  fontSize: '11.5px',
                  color: '#64748B',
                }}
              >
                <span>
                  📍 <strong>Drag pin</strong> or <strong>click map</strong> to select the exact warehouse, gate, or parking point.
                </span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>
                  {lat.toFixed(6)}, {lng.toFixed(6)}
                </span>
              </div>
            </div>
          )}

          {/* COORDINATES MODE */}
          {mode === 'coordinates' && (
            <div
              style={{
                padding: '16px',
                backgroundColor: '#F8FAFC',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Latitude (-90.000000 to +90.000000) *
                  </label>
                  <input
                    type="text"
                    value={inputLat}
                    onChange={(e) => setInputLat(e.target.value)}
                    placeholder="e.g. 18.520430"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Longitude (-180.000000 to +180.000000) *
                  </label>
                  <input
                    type="text"
                    value={inputLng}
                    onChange={(e) => setInputLng(e.target.value)}
                    placeholder="e.g. 73.856743"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>
              </div>

              {coordError && (
                <div
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: '6px',
                    color: '#DC2626',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <AlertCircle size={15} />
                  <span>{coordError}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleApplyCoordinates}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: pinColor,
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Compass size={14} />
                  <span>Show on Map</span>
                </button>
              </div>
            </div>
          )}

          {/* Location Name & Address Display / Inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Location Label / Warehouse Name (Optional)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Pune Central Cold Depot, Gate 3 Loading Bay"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', margin: 0 }}>
                  Resolved Physical Address
                </label>
                {isGeocoding && (
                  <span style={{ fontSize: '11px', color: pinColor, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Loader2 size={12} className="spin-icon" /> Resolving address...
                  </span>
                )}
              </div>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Address resolved via reverse geocoding or enter manual facility address..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12.5px',
                  color: '#334155',
                  resize: 'none',
                }}
              />
              {geocodingNotice && (
                <span style={{ fontSize: '11px', color: '#64748B', display: 'block', marginTop: '2px' }}>
                  {geocodingNotice}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748B' }}>
            <span>Coordinates:</span>
            <code style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0F172A', backgroundColor: '#E2E8F0', padding: '2px 6px', borderRadius: '4px' }}>
              {lat.toFixed(6)}, {lng.toFixed(6)}
            </code>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                }}
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              onClick={handleSave}
              style={{
                padding: '8px 20px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                backgroundColor: pinColor,
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              <Check size={16} />
              <span>Use This Location</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
