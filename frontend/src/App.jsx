import { useAuth } from './auth.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';

export default function App() {
  const { user, loading, signOut } = useAuth();

  if (loading) return <p className="boot">Loading…</p>;
  if (!user) return <Login />;

  return (
    <div className="shell">
      <aside className="sidebar">
        <h1 className="brand">Reminders</h1>
        <nav aria-label="Main">
          <a href="#" className="nav-link" aria-current="page">Dashboard</a>
        </nav>
        <div className="account">
          <span className="account-name">{user.name}</span>
          <button className="link-button" onClick={signOut}>Sign out</button>
        </div>
      </aside>
      <main className="main">
        <Dashboard />
      </main>
    </div>
  );
}
