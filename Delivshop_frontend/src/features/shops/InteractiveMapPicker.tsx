import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Search, Loader2 } from 'lucide-react';

interface InteractiveMapPickerProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
}

// Preset common delivery hubs & dairy suppliers for rapid visual pin selection
const REGIONAL_HUBS = [
  { name: 'Nashik Central (Panchavati)', lat: 20.005882, lng: 73.789764 },
  { name: 'Ozar Dairy Hub (Sai Amrut)', lat: 20.091100, lng: 73.916800 },
  { name: 'Satpur MIDC Industrial Area', lat: 19.993200, lng: 73.731400 },
  { name: 'Ambad MIDC Facility', lat: 19.948200, lng: 73.742300 },
  { name: 'College Road Center', lat: 20.008400, lng: 73.763500 },
  { name: 'Nashik Road Railway Hub', lat: 19.957500, lng: 73.834400 },
  { name: 'Sinnar MIDC Dairy Cluster', lat: 19.851000, lng: 73.998200 },
  { name: 'Dindori Processing Hub', lat: 20.201200, lng: 73.834200 },
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
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState<string | null>(null);

  useEffect(() => {
    if (latitude !== null && latitude !== undefined && !isNaN(latitude)) {
      setPinLat(latitude);
    }
    if (longitude !== null && longitude !== undefined && !isNaN(longitude)) {
      setPinLng(longitude);
    }
  }, [latitude, longitude]);

  // Approximate Nashik / Maharashtra bounding box for map canvas
  const minLat = 19.80;
  const maxLat = 20.25;
  const minLng = 73.65;
  const maxLng = 74.05;

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const pctX = Math.max(0, Math.min(1, x / rect.width));
    const pctY = Math.max(0, Math.min(1, y / rect.height));

    // Convert pixel click to geographic coordinates
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

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchStatus(null);
    setIsSearching(true);

    // 1. Check local presets first
    const matchedPreset = REGIONAL_HUBS.find(h =>
      h.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
    );

    if (matchedPreset) {
      handlePresetSelect(matchedPreset.lat, matchedPreset.lng);
      setSearchStatus(`Found: ${matchedPreset.name}`);
      setIsSearching(false);
      return;
    }

    // 2. Query geocoding API
    try {
      const q = encodeURIComponent(`${searchQuery.trim()}, Maharashtra, India`);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`, {
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const foundLat = Number(parseFloat(data[0].lat).toFixed(6));
          const foundLng = Number(parseFloat(data[0].lon).toFixed(6));
          handlePresetSelect(foundLat, foundLng);
          setSearchStatus(`Located: ${data[0].display_name.split(',').slice(0, 3).join(',')}`);
        } else {
          setSearchStatus('Location not found. Please click on the map or enter coordinates manually.');
        }
      } else {
        setSearchStatus('Geocoding service unavailable. Please select on map.');
      }
    } catch {
      setSearchStatus('Offline or unable to search. Please click on the map canvas.');
    } finally {
      setIsSearching(false);
    }
  };

  // Convert lat/lng to percentage for pin rendering
  const pinLeftPct = Math.max(0, Math.min(100, ((pinLng - minLng) / (maxLng - minLng)) * 100));
  const pinTopPct = Math.max(0, Math.min(100, ((maxLat - pinLat) / (maxLat - minLat)) * 100));

  const filteredHubs = searchQuery.trim()
    ? REGIONAL_HUBS.filter(h => h.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : REGIONAL_HUBS;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Search location, click map, or pick a dairy/delivery hub:
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#60A5FA', fontFamily: 'monospace' }}>
          <Navigation size={14} />
          <span>{pinLat.toFixed(6)}, {pinLng.toFixed(6)}</span>
        </div>
      </div>

      {/* Address / Location Search Bar */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search hub, facility, MIDC area, or address (e.g. Ozar, Satpur, Sinnar)..."
            style={{
              width: '100%',
              height: '36px',
              padding: '0 12px 0 34px',
              borderRadius: '8px',
              border: '1px solid #A7AE9F',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box',
              backgroundColor: '#FFFFFF',
            }}
          />
          <Search size={16} color="#64748B" style={{ position: 'absolute', left: '10px', top: '10px' }} />
        </div>
        <button
          type="button"
          onClick={() => handleSearch()}
          disabled={isSearching || !searchQuery.trim()}
          style={{
            height: '36px',
            padding: '0 14px',
            borderRadius: '8px',
            backgroundColor: '#1E3A8A',
            color: '#FFFFFF',
            border: 'none',
            fontSize: '13px',
            fontWeight: 600,
            cursor: isSearching || !searchQuery.trim() ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            opacity: isSearching || !searchQuery.trim() ? 0.6 : 1,
          }}
        >
          {isSearching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          Search
        </button>
      </form>

      {searchStatus && (
        <div style={{ fontSize: '12px', color: searchStatus.startsWith('Found') || searchStatus.startsWith('Located') ? '#059669' : '#D97706', padding: '4px 8px', backgroundColor: '#F8FAFC', borderRadius: '6px' }}>
          {searchStatus}
        </div>
      )}

      {/* Preset Quick-Select Chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {filteredHubs.map((hub) => (
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
                  ? '#1E3A8A'
                  : '#F1F5F9',
              color:
                Math.abs(pinLat - hub.lat) < 0.001 && Math.abs(pinLng - hub.lng) < 0.001
                  ? '#FFFFFF'
                  : '#334155',
              border: '1px solid #CBD5E1',
              cursor: 'pointer',
              fontWeight: 500,
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
