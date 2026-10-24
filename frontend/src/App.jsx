import { useEffect, useState } from 'react';
import { useAuth } from './auth.jsx';
import { applyTheme, initialTheme } from './theme.js';
import { toISO } from './dates.js';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Placeholder from './pages/Placeholder.jsx';
import Sidebar from './components/Sidebar.jsx';
import ReminderForm from './components/ReminderForm.jsx';

const TITLES = { calendar: 'Calendar', budget: 'Budget', profile: 'Profile' };

export default function App() {
  const { user, loading, signOut } = useAuth();
  const [theme, setTheme] = useState(initialTheme);
  const [page, setPage] = useState('home');
  const [form, setForm] = useState(null); // null | { reminder? }
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => applyTheme(theme), [theme]);

  if (loading) return <p className="boot">Loading…</p>;
  if (!user) return <Login />;

  return (
    <div className="shell">
      <Sidebar
        page={page}
        onNavigate={setPage}
        onAddReminder={() => setForm({})}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        onSignOut={() => { setPage('home'); signOut(); }}
      />

      <main className="main">
        {page === 'home' ? (
          <Dashboard refreshKey={refreshKey} onEdit={(reminder) => setForm({ reminder })} />
        ) : (
          <Placeholder title={TITLES[page]} />
        )}
      </main>

      {form && (
        <ReminderForm
          reminder={form.reminder}
          defaultDate={toISO(new Date())}
          onClose={() => setForm(null)}
          onSaved={() => { setForm(null); setRefreshKey((k) => k + 1); }}
        />
      )}
    </div>
  );
}
