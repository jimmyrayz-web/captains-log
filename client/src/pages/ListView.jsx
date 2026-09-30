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

export default function ListView() {
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    listEntries()
      .then(setEntries)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <>
      <div className="page-header">
        <h1>Trip Log</h1>
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

      {entries && entries.length > 0 && (
        <ul className="entry-list">
          {entries.map((entry) => (
            <li key={entry.id} className="card">
              <Link to={`/entries/${entry.id}`} className="entry-card">
                <div className="entry-summary">
                  <div className="date">
                    {formatDate(entry.date)}
                    {formatRoute(entry) && ` - ${formatRoute(entry)}`}
                  </div>
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
