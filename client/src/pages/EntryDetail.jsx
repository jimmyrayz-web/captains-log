import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getEntry, deleteEntry } from '../api.js';
import PhotoGallery from '../components/PhotoGallery.jsx';

function formatDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTime(timeStr) {
  const d = new Date(`2000-01-01T${timeStr}`);
  if (Number.isNaN(d.getTime())) return timeStr;
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export default function EntryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [entry, setEntry] = useState(null);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getEntry(id)
      .then(setEntry)
      .catch((err) => setError(err.message));
  }, [id]);

  async function handleDelete() {
    if (!confirm('Delete this log entry and its photos? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await deleteEntry(id);
      navigate('/');
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }

  if (error && !entry) return <div className="error-banner">{error}</div>;
  if (!entry) return <div className="loading">Loading entry…</div>;

  return (
    <div className="card">
      <div className="top-actions no-print">
        <button type="button" className="icon-close" onClick={() => navigate(-1)} aria-label="Close">
          ✕
        </button>
        <div className="top-actions-right">
          <button type="button" className="button secondary" onClick={() => window.print()}>
            Print
          </button>
          <Link to={`/entries/${id}/edit`} className="button secondary">
            Edit
          </Link>
          <button type="button" className="button danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>

      <div className="detail-header">
        <div className="date">{formatDate(entry.date)}</div>
      </div>

      <div className="detail-body">
        {error && <div className="error-banner">{error}</div>}

        <div className="detail-grid">
          {entry.weather && (
            <div className="stat">
              <span className="label">Weather</span>
              <span className="value">{entry.weather}</span>
            </div>
          )}
          {entry.engine_hours != null && (
            <div className="stat">
              <span className="label">Engine Hours</span>
              <span className="value">{entry.engine_hours}</span>
            </div>
          )}
          {entry.departure_point && (
            <div className="stat">
              <span className="label">Departure</span>
              <span className="value">{entry.departure_point}</span>
            </div>
          )}
          {entry.departure_time && (
            <div className="stat">
              <span className="label">Departure Time</span>
              <span className="value">{formatTime(entry.departure_time)}</span>
            </div>
          )}
          {entry.departure_fuel != null && (
            <div className="stat">
              <span className="label">Departure Fuel</span>
              <span className="value">{entry.departure_fuel}</span>
            </div>
          )}
          {entry.arrival_point && (
            <div className="stat">
              <span className="label">Arrival</span>
              <span className="value">{entry.arrival_point}</span>
            </div>
          )}
          {entry.arrival_time && (
            <div className="stat">
              <span className="label">Arrival Time</span>
              <span className="value">{formatTime(entry.arrival_time)}</span>
            </div>
          )}
          {entry.arrival_fuel != null && (
            <div className="stat">
              <span className="label">Arrival Fuel</span>
              <span className="value">{entry.arrival_fuel}</span>
            </div>
          )}
          {entry.fuel_consumed != null && (
            <div className="stat">
              <span className="label">Total Fuel Consumed</span>
              <span className="value">{entry.fuel_consumed}</span>
            </div>
          )}
          {entry.distance_nm != null && (
            <div className="stat">
              <span className="label">Distance</span>
              <span className="value">{entry.distance_nm} nm</span>
            </div>
          )}
          {entry.duration_hours != null && (
            <div className="stat">
              <span className="label">Duration</span>
              <span className="value">{entry.duration_hours} hrs</span>
            </div>
          )}
          {entry.crew.length > 0 && (
            <div className="stat">
              <span className="label">Crew</span>
              <span className="value">{entry.crew.join(', ')}</span>
            </div>
          )}
          {entry.fuel_added_gal != null && (
            <div className="stat">
              <span className="label">Fuel Added</span>
              <span className="value">{entry.fuel_added_gal} gal</span>
            </div>
          )}
          <div className="stat">
            <span className="label">Departure Checklist</span>
            <span className={`badge ${entry.oil_checked ? 'yes' : 'no'}`}>
              {entry.oil_checked ? '✓ Yes' : '✕ No'}
            </span>
          </div>
        </div>

        {entry.maintenance_notes && (
          <div className="notes-block">
            <h3>Maintenance Notes</h3>
            <p>{entry.maintenance_notes}</p>
          </div>
        )}

        {entry.notes && (
          <div className="notes-block">
            <h3>General Notes</h3>
            <p>{entry.notes}</p>
          </div>
        )}

        {entry.photos.length > 0 && (
          <PhotoGallery entryId={entry.id} photos={entry.photos} readOnly />
        )}
      </div>
    </div>
  );
}
