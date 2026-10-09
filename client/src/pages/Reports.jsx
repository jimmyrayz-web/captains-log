import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listEntries } from '../api.js';
import { LineChart, BarChart } from '../components/Charts.jsx';

function shortDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function monthLabel(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  const month = d.toLocaleDateString(undefined, { month: 'short' });
  const year = d.toLocaleDateString(undefined, { year: '2-digit' });
  return `${month} '${year}`;
}

function sum(values) {
  return values.reduce((a, b) => a + b, 0);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function isoDateMinusMonths(months) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

export default function Reports() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState(() => isoDateMinusMonths(1));
  const [endDate, setEndDate] = useState(() => todayIso());

  useEffect(() => {
    listEntries()
      .then(setEntries)
      .catch((err) => setError(err.message));
  }, []);

  const chronological = useMemo(() => {
    if (!entries) return [];
    const sorted = [...entries].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id));
    return sorted.filter((e) => (!startDate || e.date >= startDate) && (!endDate || e.date <= endDate));
  }, [entries, startDate, endDate]);

  function showAllTime() {
    if (entries && entries.length > 0) {
      setStartDate([...entries].sort((a, b) => (a.date < b.date ? -1 : 1))[0].date);
    }
    setEndDate(todayIso());
  }

  const engineHoursSeries = useMemo(
    () =>
      chronological
        .filter((e) => e.engine_hours != null)
        .map((e) => ({ label: shortDate(e.date), value: Number(e.engine_hours) })),
    [chronological]
  );

  const distanceSeries = useMemo(
    () =>
      chronological
        .filter((e) => e.distance_nm != null)
        .map((e) => ({ label: shortDate(e.date), value: Number(e.distance_nm) })),
    [chronological]
  );

  const durationSeries = useMemo(
    () =>
      chronological
        .filter((e) => e.duration_hours != null)
        .map((e) => ({ label: shortDate(e.date), value: Number(e.duration_hours) })),
    [chronological]
  );

  const fuelSeries = useMemo(
    () =>
      chronological
        .filter((e) => e.fuel_consumed != null)
        .map((e) => ({ label: shortDate(e.date), value: Number(e.fuel_consumed) })),
    [chronological]
  );

  const fuelAddedSeries = useMemo(
    () =>
      chronological
        .filter((e) => e.fuel_added_gal != null)
        .map((e) => ({ label: shortDate(e.date), value: Number(e.fuel_added_gal) })),
    [chronological]
  );

  const tripsPerMonth = useMemo(() => {
    const counts = new Map();
    for (const e of chronological) {
      const key = e.date.slice(0, 7);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return [...counts.entries()]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, value]) => ({ label: monthLabel(`${key}-01`), value }));
  }, [chronological]);

  const stats = useMemo(() => {
    const latestEngineHours = engineHoursSeries.length
      ? engineHoursSeries[engineHoursSeries.length - 1].value
      : null;
    return {
      trips: chronological.length,
      latestEngineHours,
      totalDistance: distanceSeries.length ? Math.round(sum(distanceSeries.map((d) => d.value)) * 10) / 10 : null,
      totalDuration: durationSeries.length ? Math.round(sum(durationSeries.map((d) => d.value)) * 10) / 10 : null,
      totalFuel: fuelSeries.length ? Math.round(sum(fuelSeries.map((d) => d.value)) * 10) / 10 : null,
      totalFuelAdded: fuelAddedSeries.length
        ? Math.round(sum(fuelAddedSeries.map((d) => d.value)) * 10) / 10
        : null,
    };
  }, [chronological, engineHoursSeries, distanceSeries, durationSeries, fuelSeries, fuelAddedSeries]);

  return (
    <>
      <div className="page-header">
        <h1>Reports</h1>
        <button
          type="button"
          className="icon-close"
          onClick={() => navigate(-1)}
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {entries === null && !error && <div className="loading">Loading reports…</div>}

      {entries && entries.length === 0 && (
        <div className="card empty-state">
          <span className="anchor">⚓</span>
          No entries logged yet, so there's nothing to chart.
          <div style={{ marginTop: '1rem' }}>
            <Link to="/new" className="button">
              + New Entry
            </Link>
          </div>
        </div>
      )}

      {entries && entries.length > 0 && (
        <div className="reports-page">
          <div className="reports-filter card">
            <div className="field">
              <label htmlFor="report-start">From</label>
              <input
                id="report-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="report-end">To</label>
              <input
                id="report-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <button type="button" className="button secondary" onClick={showAllTime}>
              All Time
            </button>
          </div>

          {chronological.length === 0 && (
            <div className="card empty-state">
              <span className="anchor">📭</span>
              No trips logged between {startDate} and {endDate}.
            </div>
          )}

          {chronological.length > 0 && (
          <>
          <div className="stat-cards">
            <div className="stat-card">
              <span className="label">Total Trips</span>
              <span className="value">{stats.trips}</span>
            </div>
            {stats.latestEngineHours != null && (
              <div className="stat-card">
                <span className="label">Latest Engine Hours</span>
                <span className="value">{stats.latestEngineHours}</span>
              </div>
            )}
            {stats.totalDistance != null && (
              <div className="stat-card">
                <span className="label">Total Distance</span>
                <span className="value">{stats.totalDistance} nm</span>
              </div>
            )}
            {stats.totalDuration != null && (
              <div className="stat-card">
                <span className="label">Total Time Underway</span>
                <span className="value">{stats.totalDuration} hrs</span>
              </div>
            )}
            {stats.totalFuel != null && (
              <div className="stat-card">
                <span className="label">Total Fuel Consumed</span>
                <span className="value">{stats.totalFuel} gal</span>
              </div>
            )}
            {stats.totalFuelAdded != null && (
              <div className="stat-card">
                <span className="label">Total Fuel Added</span>
                <span className="value">{stats.totalFuelAdded} gal</span>
              </div>
            )}
          </div>

          {engineHoursSeries.length > 0 && (
            <div className="chart-card card">
              <h3>Engine Hours Over Time</h3>
              <LineChart data={engineHoursSeries} />
            </div>
          )}

          {distanceSeries.length > 0 && (
            <div className="chart-card card">
              <h3>Trip Distance (nm)</h3>
              <BarChart data={distanceSeries} unit=" nm" />
            </div>
          )}

          {durationSeries.length > 0 && (
            <div className="chart-card card">
              <h3>Trip Duration (hours)</h3>
              <BarChart data={durationSeries} unit=" hrs" color="var(--navy)" />
            </div>
          )}

          {fuelSeries.length > 0 && (
            <div className="chart-card card">
              <h3>Fuel Consumed Per Trip (gal)</h3>
              <BarChart data={fuelSeries} unit=" gal" color="var(--rust)" />
            </div>
          )}

          {fuelAddedSeries.length > 0 && (
            <div className="chart-card card">
              <h3>Fuel Added Per Trip (gal)</h3>
              <BarChart data={fuelAddedSeries} unit=" gal" color="var(--rust)" />
            </div>
          )}

          {tripsPerMonth.length > 0 && (
            <div className="chart-card card">
              <h3>Trips Per Month</h3>
              <BarChart data={tripsPerMonth} color="var(--navy)" />
            </div>
          )}
          </>
          )}
        </div>
      )}
    </>
  );
}
