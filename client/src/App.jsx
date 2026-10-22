import { useEffect, useRef, useState } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import ListView from './pages/ListView.jsx';
import EntryForm from './pages/EntryForm.jsx';
import EntryDetail from './pages/EntryDetail.jsx';
import Reports from './pages/Reports.jsx';
import MapPage from './pages/Map.jsx';
import { exportEntriesZip, importEntriesZip } from './exportImport.js';

const LAST_BACKUP_KEY = 'captains-log-last-backup';
const SNOOZE_KEY = 'captains-log-backup-snooze-until';
const BACKUP_REMINDER_DAYS = 60;
const SNOOZE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

// Remembered per device, which is fine for a single-user app: worst case a
// second device nags once until a backup is made from it too.
function readStoredTime(key) {
  try {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function writeStoredTime(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // storage unavailable (e.g. private browsing); the reminder just returns
  }
}

function isBackupDue() {
  const now = Date.now();
  const snoozeUntil = readStoredTime(SNOOZE_KEY);
  if (snoozeUntil && snoozeUntil > now) return false;
  const lastBackup = readStoredTime(LAST_BACKUP_KEY);
  return !lastBackup || now - lastBackup > BACKUP_REMINDER_DAYS * DAY_MS;
}

function describeLastBackup() {
  const lastBackup = readStoredTime(LAST_BACKUP_KEY);
  if (!lastBackup) return 'Never backed up on this device';
  return `Last backup: ${new Date(lastBackup).toLocaleDateString()}`;
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [listKey, setListKey] = useState(0);
  const [backupDue, setBackupDue] = useState(isBackupDue);
  const [backingUp, setBackingUp] = useState(false);
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
    if (backingUp) return;
    setBackingUp(true);
    try {
      const blob = await exportEntriesZip();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `captains-log-backup-${new Date().toISOString().slice(0, 10)}.zip`;
      link.click();
      // Revoking immediately can cancel the download on mobile Safari.
      setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
      writeStoredTime(LAST_BACKUP_KEY, Date.now());
      setBackupDue(false);
    } catch (err) {
      alert(`Backup failed: ${err.message}`);
    } finally {
      setBackingUp(false);
    }
  }

  function snoozeBackupReminder() {
    writeStoredTime(SNOOZE_KEY, Date.now() + SNOOZE_DAYS * DAY_MS);
    setBackupDue(false);
  }

  function triggerImport() {
    setMenuOpen(false);
    importInputRef.current?.click();
  }

  function openReports() {
    setMenuOpen(false);
    navigate('/reports');
  }

  function openMap() {
    setMenuOpen(false);
    navigate('/map');
  }

  async function handleImportFile(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;

    try {
      const result = await importEntriesZip(file);
      if (result.empty) {
        alert('No data rows found in that file.');
        return;
      }
      setListKey((k) => k + 1);
      navigate('/');
      alert(
        `Imported ${result.imported} ${result.imported === 1 ? 'entry' : 'entries'}` +
          `${result.photosImported ? ` with ${result.photosImported} photo${result.photosImported === 1 ? '' : 's'}` : ''}.` +
          `${result.skipped ? ` Skipped ${result.skipped}.` : ''}`
      );
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
                <button type="button" onClick={openReports}>
                  📊 Reports
                </button>
                <button type="button" onClick={openMap}>
                  🗺️ Map
                </button>
                <button type="button" onClick={handleExport} disabled={backingUp}>
                  ⬇️ {backingUp ? 'Backing up…' : 'Backup (Export)'}
                  <span className="nav-menu-note">{describeLastBackup()}</span>
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
            accept=".csv,.zip,text/csv,application/zip"
            style={{ display: 'none' }}
            onChange={handleImportFile}
          />
        </nav>
      </header>

      <main className="main-content">
        {backingUp && (
          <div className="backup-banner no-print">
            Preparing your backup with all photos… this can take a minute.
          </div>
        )}
        {!backingUp && backupDue && location.pathname === '/' && (
          <div className="backup-banner no-print">
            <span>
              🛟 Time to back up your log. It saves every entry and photo to a file on
              this device.
            </span>
            <span className="backup-banner-actions">
              <button type="button" className="button" onClick={handleExport}>
                Back up now
              </button>
              <button type="button" className="backup-banner-later" onClick={snoozeBackupReminder}>
                Later
              </button>
            </span>
          </div>
        )}
        <Routes>
          <Route path="/" element={<ListView key={listKey} searchQuery={searchQuery} />} />
          <Route path="/new" element={<EntryForm />} />
          <Route path="/entries/:id" element={<EntryDetail />} />
          <Route path="/entries/:id/edit" element={<EntryForm />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/map" element={<MapPage />} />
        </Routes>
      </main>

      <footer className="site-footer no-print">Fair winds and following seas ⛵</footer>
    </div>
  );
}
