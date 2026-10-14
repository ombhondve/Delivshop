import React, { useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';

interface InteractiveMapPickerProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
}

// Preset common delivery hubs in Nashik for rapid testing and visual pin selection
const NASHIK_HUBS = [
  { name: 'Nashik Central (Panchavati)', lat: 20.005882, lng: 73.789764 },
  { name: 'College Road Hub', lat: 20.0084, lng: 73.7635 },
  { name: 'Satpur Industrial Area', lat: 19.9932, lng: 73.7314 },
  { name: 'Ambad Industrial Area', lat: 19.9482, lng: 73.7423 },
  { name: 'Nashik Road Railway Station', lat: 19.9575, lng: 73.8344 },
  { name: 'Indira Nagar Area', lat: 19.9721, lng: 73.7712 },
];

export const InteractiveMapPicker: React.FC<InteractiveMapPickerProps> = ({
  latitude,
  longitude,
  onChange,
}) => {
  const currentLat = latitude ?? 20.005882;
  const currentLng = longitude ?? 73.789764;

  const [pinLat, setPinLat] = useState(currentLat);
  const [pinLng, setPinLng] = useState(currentLng);

  // Approximate Nashik bounding box for map canvas
  const minLat = 19.92;
  const maxLat = 20.06;
  const minLng = 73.70;
  const maxLng = 73.86;

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const pctX = Math.max(0, Math.min(1, x / rect.width));
    const pctY = Math.max(0, Math.min(1, y / rect.height));

    // Convert pixel click to Nashik geographic coordinates
    const newLng = Number((minLng + pctX * (maxLng - minLng)).toFixed(6));
    const newLat = Number((maxLat - pctY * (maxLat - minLat)).toFixed(6));

    setPinLat(newLat);
    setPinLng(newLng);
    onChange(newLat, newLng);
  };

  const handlePresetSelect = (lat: number, lng: number) => {
    setPinLat(lat);
    setPinLng(lng);
    onChange(lat, lng);
  };

  // Convert lat/lng to percentage for pin rendering
  const pinLeftPct = Math.max(0, Math.min(100, ((pinLng - minLng) / (maxLng - minLng)) * 100));
  const pinTopPct = Math.max(0, Math.min(100, ((maxLat - pinLat) / (maxLat - minLat)) * 100));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Click anywhere on the area map or select a delivery hub preset:
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#60A5FA' }}>
          <Navigation size={14} />
          <code>{pinLat.toFixed(6)}, {pinLng.toFixed(6)}</code>
        </div>
      </div>

      {/* Preset Quick-Select Chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {NASHIK_HUBS.map((hub) => (
          <button
            key={hub.name}
            type="button"
            onClick={() => handlePresetSelect(hub.lat, hub.lng)}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              borderRadius: '9999px',
              backgroundColor:
                Math.abs(pinLat - hub.lat) < 0.001 && Math.abs(pinLng - hub.lng) < 0.001
                  ? 'var(--color-primary)'
                  : 'var(--bg-hover)',
              color: '#FFFFFF',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {hub.name}
          </button>
        ))}
      </div>

      {/* Interactive Map Visual Pin Picker Canvas */}
      <div
        onClick={handleCanvasClick}
        style={{
          position: 'relative',
          height: '240px',
          width: '100%',
          backgroundColor: '#0B132B',
          borderRadius: '8px',
          overflow: 'hidden',
          cursor: 'crosshair',
          border: '1px solid var(--border-color)',
          backgroundImage: `
            radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.15) 0%, transparent 60%),
            linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 30px 30px, 30px 30px',
        }}
      >
        {/* River / Road Stylized Visual Overlays */}
        <div
          style={{
            position: 'absolute',
            top: '35%',
            left: '0',
            right: '0',
            height: '14px',
            background: 'linear-gradient(90deg, #1E3A8A 0%, #3B82F6 50%, #1D4ED8 100%)',
            opacity: 0.35,
            transform: 'rotate(-4deg)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '0',
            bottom: '0',
            left: '48%',
            width: '6px',
            backgroundColor: '#F59E0B',
            opacity: 0.3,
            transform: 'rotate(8deg)',
          }}
        />

        {/* Nashik Map Label */}
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            left: '12px',
            fontSize: '11px',
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          Nashik Metro Area Map View • Click to Place Pin
        </div>

        {/* Placed Pin Marker */}
        <div
          style={{
            position: 'absolute',
            left: `${pinLeftPct}%`,
            top: `${pinTopPct}%`,
            transform: 'translate(-50%, -100%)',
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            transition: 'all 0.15s ease-out',
          }}
        >
          <div
            style={{
              backgroundColor: '#EF4444',
              color: '#FFFFFF',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 700,
              boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
              marginBottom: '2px',
              whiteSpace: 'nowrap',
            }}
          >
            Delivery Entrance
          </div>
          <MapPin size={28} color="#EF4444" fill="#EF4444" style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.6))' }} />
        </div>
      </div>
    </div>
  );
};
