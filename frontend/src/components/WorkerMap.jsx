import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';

// Fix default icon paths (not strictly used but prevents asset 404s)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const STATUS_COLOR = {
  active: '#10b981',          // green
  'check-in-due': '#f59e0b',  // amber
  alarm: '#ef4444',           // red
};

export default function WorkerMap({ workers = [], height = 480 }) {
  const center = useMemo(() => {
    if (!workers.length) return [51.5074, -0.1278];
    const lat = workers.reduce((s, w) => s + (w.lat || 0), 0) / workers.length;
    const lng = workers.reduce((s, w) => s + (w.lng || 0), 0) / workers.length;
    return [lat, lng];
  }, [workers]);

  return (
    <div style={{ height, width: '100%', borderRadius: 8, overflow: 'hidden', border: '1px solid #1f2937' }}>
      <MapContainer
        center={center}
        zoom={10}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {workers.map((w) => {
          const color = STATUS_COLOR[w.status] || '#6b7280';
          return (
            <CircleMarker
              key={w.id}
              center={[w.lat, w.lng]}
              radius={10}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.75, weight: 2 }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={0.9}>
                <strong>{w.name}</strong> — {w.status}
              </Tooltip>
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <div style={{ fontWeight: 700 }}>{w.name}</div>
                  <div>Status: <span style={{ color }}>{w.status}</span></div>
                  {w.department && <div>Dept: {w.department}</div>}
                  {w.role && <div>Role: {w.role}</div>}
                  {w.last_check_in && (
                    <div style={{ fontSize: 12, color: '#666' }}>
                      Last check-in: {new Date(w.last_check_in).toLocaleString()}
                    </div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
