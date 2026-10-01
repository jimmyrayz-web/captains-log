import { useState } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import ListView from './pages/ListView.jsx';
import EntryForm from './pages/EntryForm.jsx';
import EntryDetail from './pages/EntryDetail.jsx';

export default function App() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  function toggleSearch() {
    if (!searchOpen && location.pathname !== '/') {
      navigate('/');
    }
    if (searchOpen) setSearchQuery('');
    setSearchOpen((open) => !open);
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
            + New Entry
          </Link>
          {searchOpen && (
            <input
              type="text"
              className="nav-search"
              placeholder="Search entries…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          )}
          <button
            type="button"
            className="button icon-button icon-button-search"
            onClick={toggleSearch}
            aria-label="Search entries"
          >
            🔍
          </button>
        </nav>
      </header>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<ListView searchQuery={searchQuery} />} />
          <Route path="/new" element={<EntryForm />} />
          <Route path="/entries/:id" element={<EntryDetail />} />
          <Route path="/entries/:id/edit" element={<EntryForm />} />
        </Routes>
      </main>

      <footer className="site-footer no-print">Fair winds and following seas ⛵</footer>
    </div>
  );
}
