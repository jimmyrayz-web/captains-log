import { useEffect, useRef, useState } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import ListView from './pages/ListView.jsx';
import EntryForm from './pages/EntryForm.jsx';
import EntryDetail from './pages/EntryDetail.jsx';
import { listEntries, createEntry } from './api.js';

const CSV_COLUMNS = [
  ['date', 'Date'],
  ['departure_point', 'Departure'],
  ['arrival_point', 'Arrival'],
  ['distance_nm', 'Distance (nm)'],
  ['duration_hours', 'Duration (hrs)'],
  ['weather', 'Weather'],
  ['engine_hours', 'Engine Hours'],
  ['fuel_added_gal', 'Fuel Added (gal)'],
  ['oil_checked', 'Departure Checklist Complete'],
  ['crew', 'Crew'],
  ['maintenance_notes', 'Maintenance Notes'],
  ['notes', 'Notes'],
];

function csvCell(value) {
  const str = value == null ? '' : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function entriesToCsv(entries) {
  const header = CSV_COLUMNS.map(([, label]) => csvCell(label)).join(',');
  const rows = entries.map((entry) =>
    CSV_COLUMNS.map(([key]) => {
      let value = entry[key];
      if (key === 'crew') value = (value || []).join('; ');
      if (key === 'oil_checked') value = value ? 'Yes' : 'No';
      return csvCell(value);
    }).join(',')
  );
  return [header, ...rows].join('\n');
}

// Parses RFC4180-style CSV: quoted fields may contain commas, escaped
// quotes (""), and newlines.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\r') {
      // skip; \n (handled below) ends the row
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

const CSV_LABEL_TO_KEY = Object.fromEntries(CSV_COLUMNS.map(([key, label]) => [label, key]));

function csvRowToPayload(record) {
  const num = (v) => (v && v.trim() !== '' ? Number(v) : null);
  return {
    date: record.date || '',
    departure_point: record.departure_point || '',
    arrival_point: record.arrival_point || '',
    weather: record.weather || '',
    maintenance_notes: record.maintenance_notes || '',
    notes: record.notes || '',
    engine_hours: num(record.engine_hours),
    distance_nm: num(record.distance_nm),
    duration_hours: num(record.duration_hours),
    fuel_added_gal: num(record.fuel_added_gal),
    oil_checked: (record.oil_checked || '').trim().toLowerCase() === 'yes',
    crew: (record.crew || '')
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [listKey, setListKey] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef(null);
  const importInputRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  function openSearch() {
    if (location.pathname !== '/') {
      navigate('/');
    }
    setSearchOpen(true);
    setMenuOpen(false);
  }

  function closeSearch() {
    setSearchOpen(false);
    setSearchQuery('');
  }

  async function handleExport() {
    setMenuOpen(false);
    try {
      const entries = await listEntries();
      const csv = entriesToCsv(entries);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `captains-log-export-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    }
  }

  function triggerImport() {
    setMenuOpen(false);
    importInputRef.current?.click();
  }

  async function handleImportFile(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length < 2) {
        alert('No data rows found in that file.');
        return;
      }
      const [headerRow, ...dataRows] = rows;
      const keysByColumn = headerRow.map((label) => CSV_LABEL_TO_KEY[label.trim()]);

      let imported = 0;
      let skipped = 0;
      for (const row of dataRows) {
        const record = {};
        keysByColumn.forEach((key, i) => {
          if (key) record[key] = row[i] ?? '';
        });
        if (!record.date) {
          skipped++;
          continue;
        }
        try {
          await createEntry(csvRowToPayload(record));
          imported++;
        } catch {
          skipped++;
        }
      }

      setListKey((k) => k + 1);
      navigate('/');
      alert(`Imported ${imported} ${imported === 1 ? 'entry' : 'entries'}.${skipped ? ` Skipped ${skipped}.` : ''}`);
    } catch (err) {
      alert(`Import failed: ${err.message}`);
    }
  }

  return (
    <div className="app-shell">
      <header className="top-nav no-print">
        <Link to="/" className="brand">
          <span className="anchor">⚓</span>
          High Slack
        </Link>
        <nav className="nav-actions">
          <Link to="/new" className="button">
            + New
          </Link>
          {searchOpen && (
            <div className="nav-search-wrap">
              <input
                type="text"
                className="nav-search"
                placeholder="Search entries…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                className="nav-search-close"
                onClick={closeSearch}
                aria-label="Close search"
              >
                ✕
              </button>
            </div>
          )}
          <div className="nav-menu" ref={menuRef}>
            <button
              type="button"
              className="button icon-button icon-button-menu"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Menu"
            >
              ☰
            </button>
            {menuOpen && (
              <div className="nav-menu-dropdown">
                <button type="button" onClick={openSearch}>
                  🔍 Search
                </button>
                <button type="button" onClick={handleExport}>
                  ⬇️ Export
                </button>
                <button type="button" onClick={triggerImport}>
                  ⬆️ Import
                </button>
              </div>
            )}
          </div>
          <input
            ref={importInputRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={handleImportFile}
          />
        </nav>
      </header>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<ListView key={listKey} searchQuery={searchQuery} />} />
          <Route path="/new" element={<EntryForm />} />
          <Route path="/entries/:id" element={<EntryDetail />} />
          <Route path="/entries/:id/edit" element={<EntryForm />} />
        </Routes>
      </main>

      <footer className="site-footer no-print">Fair winds and following seas ⛵</footer>
    </div>
  );
}
