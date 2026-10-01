import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listEntries } from '../api.js';

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

function matchesQuery(entry, query) {
  if (!query.trim()) return true;
  const haystack = [
    entry.weather,
    entry.departure_point,
    entry.arrival_point,
    entry.crew?.join(' '),
    entry.maintenance_notes,
    entry.notes,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

export default function ListView({ searchQuery = '' }) {
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    listEntries()
      .then(setEntries)
      .catch((err) => setError(err.message));
  }, []);

  const filtered = entries?.filter((entry) => matchesQuery(entry, searchQuery)) ?? null;

  return (
    <>
      <div className="page-header">
        <h1>Captain's Log</h1>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {entries === null && !error && <div className="loading">Loading entries…</div>}

      {entries && entries.length === 0 && (
        <div className="card empty-state">
          <span className="anchor">⚓</span>
          No entries logged yet. Start your log with your first voyage.
          <div style={{ marginTop: '1rem' }}>
            <Link to="/new" className="button">
              + New Entry
            </Link>
          </div>
        </div>
      )}

      {entries && entries.length > 0 && filtered.length === 0 && (
        <div className="card empty-state">
          <span className="anchor">🔍</span>
          No entries match "{searchQuery}".
        </div>
      )}

      {filtered && filtered.length > 0 && (
        <ul className="entry-list">
          {filtered.map((entry) => (
            <li key={entry.id} className="card">
              <Link to={`/entries/${entry.id}`} className="entry-card">
                <div className="entry-summary">
                  <div className="date">{formatDate(entry.date)}</div>
                  {formatRoute(entry) && <div className="route">{formatRoute(entry)}</div>}
                  <div className="meta">
                    {entry.distance_nm != null && <span>{entry.distance_nm} nm</span>}
                    {entry.duration_hours != null && <span>{entry.duration_hours} hrs</span>}
                    {entry.crew.length > 0 && <span>Crew: {entry.crew.join(', ')}</span>}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
