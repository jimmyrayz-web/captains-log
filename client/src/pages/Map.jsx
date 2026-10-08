import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { listEntries } from '../api.js';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function formatDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatRoute(entry) {
  if (entry.departure_point && entry.arrival_point) {
    return `${entry.departure_point} to ${entry.arrival_point}`;
  }
  return entry.departure_point || entry.arrival_point || '';
}

export default function MapPage() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState('');
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    listEntries()
      .then(setEntries)
      .catch((err) => setError(err.message));
  }, []);

  const located = entries ? entries.filter((e) => e.gps_lat != null && e.gps_lng != null) : [];

  useEffect(() => {
    if (!mapContainerRef.current || located.length === 0) return;

    const map = L.map(mapContainerRef.current);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    const markers = located.map((entry) => {
      const marker = L.marker([entry.gps_lat, entry.gps_lng]).addTo(map);
      const route = formatRoute(entry);
      marker.bindPopup(
        `<strong>${formatDate(entry.date)}</strong>${route ? `<br>${route}` : ''}<br><a href="/entries/${entry.id}">View Entry</a>`
      );
      return marker;
    });

    if (markers.length === 1) {
      map.setView(markers[0].getLatLng(), 13);
    } else {
      const bounds = L.latLngBounds(markers.map((m) => m.getLatLng()));
      map.fitBounds(bounds, { padding: [30, 30] });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [located.length, entries]);

  return (
    <>
      <div className="page-header">
        <h1>Map</h1>
        <button type="button" className="icon-close" onClick={() => navigate(-1)} aria-label="Close">
          ✕
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {entries === null && !error && <div className="loading">Loading map…</div>}

      {entries && located.length === 0 && (
        <div className="card empty-state">
          <span className="anchor">🗺️</span>
          No trips have a saved location yet. New entries will be pinned here automatically.
          <div style={{ marginTop: '1rem' }}>
            <Link to="/new" className="button">
              + New Entry
            </Link>
          </div>
        </div>
      )}

      {entries && located.length > 0 && (
        <div className="card map-card">
          <div ref={mapContainerRef} className="map-container" />
        </div>
      )}
    </>
  );
}
