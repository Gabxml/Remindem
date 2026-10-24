const PAGES = [
  ['home', 'Home'],
  ['calendar', 'Calendar'],
  ['budget', 'Budget'],
];

export default function Sidebar({ page, onNavigate, onAddReminder, theme, onToggleTheme, onSignOut }) {
  return (
    <aside className="sidebar">
      <div className="logo">Reminders</div>

      <nav className="nav" aria-label="Main">
        {PAGES.map(([id, label]) => (
          <button
            key={id}
            className="nav-btn"
            aria-current={page === id ? 'page' : undefined}
            onClick={() => onNavigate(id)}
          >
            {label}
          </button>
        ))}
        <button className="nav-btn add" onClick={onAddReminder}>Add reminder</button>
      </nav>

      <div className="sidebar-foot">
        <button aria-current={page === 'profile' ? 'page' : undefined} onClick={() => onNavigate('profile')}>
          Profile
        </button>
        <button onClick={onSignOut}>Log out</button>
        <button onClick={onToggleTheme}>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</button>
      </div>
    </aside>
  );
}
