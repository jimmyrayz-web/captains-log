import { Routes, Route, Link } from 'react-router-dom';
import ListView from './pages/ListView.jsx';
import EntryForm from './pages/EntryForm.jsx';
import EntryDetail from './pages/EntryDetail.jsx';

export default function App() {
  return (
    <div className="app-shell">
      <header className="top-nav no-print">
        <Link to="/" className="brand">
          <span className="anchor">⚓</span>
          High Slack Captain's Log
        </Link>
        <nav className="nav-actions">
          <Link to="/new" className="button">
            + New Entry
          </Link>
        </nav>
      </header>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<ListView />} />
          <Route path="/new" element={<EntryForm />} />
          <Route path="/entries/:id" element={<EntryDetail />} />
          <Route path="/entries/:id/edit" element={<EntryForm />} />
        </Routes>
      </main>

      <footer className="site-footer no-print">Fair winds and following seas ⛵</footer>
    </div>
  );
}
