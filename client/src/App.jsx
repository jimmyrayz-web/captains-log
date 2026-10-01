import { useEffect, useRef, useState } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import ListView from './pages/ListView.jsx';
import EntryForm from './pages/EntryForm.jsx';
import EntryDetail from './pages/EntryDetail.jsx';

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef(null);

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
              </div>
            )}
          </div>
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
