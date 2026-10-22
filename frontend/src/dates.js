const pad = (n) => String(n).padStart(2, '0');

export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromISO = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
export const startOfWeek = (d) => addDays(d, -((d.getDay() + 6) % 7)); // Monday first

export function shiftPeriod(view, anchor, dir) {
  if (view === 'day') return addDays(anchor, dir);
  if (view === 'week') return addDays(anchor, 7 * dir);
  return new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1);
}

export function periodTitle(view, anchor) {
  if (view === 'day') {
    return anchor.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  }
  if (view === 'week') {
    const start = startOfWeek(anchor);
    const end = addDays(start, 6);
    const sameMonth = start.getMonth() === end.getMonth();
    const a = start.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const b = end.toLocaleDateString([], sameMonth ? { day: 'numeric' } : { month: 'short', day: 'numeric' });
    return `${a} – ${b}, ${end.getFullYear()}`;
  }
  return anchor.toLocaleDateString([], { month: 'long', year: 'numeric' });
}

// occurs_at / start_at arrive as "2026-10-21T09:00:00" (no timezone = the user's wall clock)
export const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export function describeRepeat(recurrence, interval) {
  if (recurrence === 'none') return '';
  const unit = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' }[recurrence];
  return interval === 1 ? `Every ${unit}` : `Every ${interval} ${unit}s`;
}
