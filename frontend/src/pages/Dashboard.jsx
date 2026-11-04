import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { addDays, describeRepeat, formatTime, fromISO, periodTitle, startOfWeek, toISO } from '../dates';

const VIEWS = [
  { view: 'day', recurrence: 'daily', label: 'Daily', empty: 'Nothing planned for this day.' },
  { view: 'week', recurrence: 'weekly', label: 'Weekly', empty: 'No weekly reminders this week.' },
  { view: 'month', recurrence: 'monthly', label: 'Monthly', empty: 'No monthly reminders this month.' },
  { view: 'year', recurrence: 'yearly', label: 'Yearly', empty: 'No yearly reminders this year.' },
];

// Daily is the "due today" view: everything that falls on the selected day,
// including one-time reminders and repeats of any cadence.
function periodFilter(view) {
  return view.recurrence === 'daily' ? '' : `&recurrence=${view.recurrence}`;
}

const firstOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);

function groupByDay(occurrences = []) {
  const map = {};
  for (const o of occurrences) (map[o.occurs_at.slice(0, 10)] ||= []).push(o);
  return map;
}

export default function Dashboard({ refreshKey, onEdit }) {
  const [active, setActive] = useState(VIEWS[0]); // recurring category + its period
  const [selected, setSelected] = useState(() => new Date()); // drives the recurring card
  const [viewMonth, setViewMonth] = useState(() => firstOfMonth(new Date())); // drives the calendar
  const [card, setCard] = useState(null);
  const [calendar, setCalendar] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setCard(null);
    const on = toISO(selected);
    api.get(`/dashboard?view=${active.view}&on=${on}${periodFilter(active)}`)
      .then((data) => {
        if (cancelled) return;
        setCard(data);
        setError('');
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => { cancelled = true; };
  }, [active, selected, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    api.get(`/dashboard?view=month&on=${toISO(viewMonth)}&recurrence=none&recurrence=yearly`)
      .then((data) => !cancelled && setCalendar(data))
      .catch((err) => !cancelled && setError(err.message));
    return () => { cancelled = true; };
  }, [viewMonth, refreshKey]);

  const calendarByDay = useMemo(() => groupByDay(calendar?.occurrences), [calendar]);

  function goToday() {
    const now = new Date();
    setSelected(now);
    setViewMonth(firstOfMonth(now));
  }

  function openEditor(occurrence) {
    api.get(`/reminders/${occurrence.reminder_id}`).then(onEdit).catch((err) => setError(err.message));
  }

  const today = toISO(new Date());

  return (
    <div className="dashboard">
      {error && <p className="error" role="alert">{error}</p>}

      <div className="dashboard-grid">
        <div className="cards">
          <ReminderCard
            active={active}
            subtitle={periodTitle(active.view, selected)}
            data={card}
            today={today}
            onOpen={openEditor}
            onChangeView={(recurrence) => setActive(VIEWS.find((v) => v.recurrence === recurrence))}
          />
        </div>

        <section className="panel calendar-panel" aria-label="Calendar">
          <header className="panel-head">
            <div>
              <h2>Calendar</h2>
              <p className="muted">One-time + yearly reminders · {periodTitle('month', viewMonth)}</p>
            </div>
            <div className="stepper" role="group" aria-label="Change month">
              <button className="btn" aria-label="Previous month" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}>‹</button>
              <button className="btn" onClick={goToday}>Today</button>
              <button className="btn" aria-label="Next month" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}>›</button>
            </div>
          </header>
          <MonthGrid
            viewMonth={viewMonth}
            byDay={calendarByDay}
            today={today}
            selectedISO={toISO(selected)}
            onPick={(iso) => setSelected(fromISO(iso))}
          />
        </section>
      </div>
    </div>
  );
}

function ReminderCard({ active, subtitle, data, today, onOpen, onChangeView }) {
  const items = data?.occurrences;
  const grouped = active.view !== 'day';

  return (
    <section className="panel recurring-panel">
      <header className="panel-head">
        <div>
          <h2>{active.label} reminders</h2>
          <p className="muted">{subtitle}</p>
        </div>
        <div className="card-controls">
          {items && <span className="count">{items.length}</span>}
          <select
            aria-label="Recurring reminder period"
            value={active.recurrence}
            onChange={(e) => onChangeView(e.target.value)}
          >
            {VIEWS.map((v) => <option key={v.recurrence} value={v.recurrence}>{v.label}</option>)}
          </select>
        </div>
      </header>

      <div className="panel-body">
        {!items ? (
          <p className="empty">Loading…</p>
        ) : items.length === 0 ? (
          <p className="empty">{active.empty}</p>
        ) : (
          <ul className="occurrences">
            {items.map((o, i) => {
              const iso = o.occurs_at.slice(0, 10);
              const newDay = grouped && (i === 0 || items[i - 1].occurs_at.slice(0, 10) !== iso);
              return (
                <li key={`${o.reminder_id}-${o.occurs_at}`}>
                  {newDay && (
                    <h3 className={`group-label${iso === today ? ' is-today' : ''}`}>
                      {fromISO(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                      {iso === today && <span className="today-tag">Today</span>}
                    </h3>
                  )}
                  <button className="occurrence" onClick={() => onOpen(o)}>
                    <time className="time">{formatTime(o.occurs_at)}</time>
                    <span className="body">
                      <span className="title">{o.title}</span>
                      <span className="repeat">{describeRepeat(o.recurrence, o.interval)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function MonthGrid({ viewMonth, byDay, today, selectedISO, onPick }) {
  const first = firstOfMonth(viewMonth);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  const cells = [];
  for (let d = startOfWeek(first); d <= addDays(startOfWeek(last), 6); d = addDays(d, 1)) cells.push(d);
  const weeks = cells.length / 7;
  const weekdays = cells.slice(0, 7).map((d) => d.toLocaleDateString([], { weekday: 'short' }));

  return (
    <div className="month" style={{ gridTemplateRows: `auto repeat(${weeks}, minmax(0, 1fr))` }}>
      {weekdays.map((w) => <div key={w} className="month-weekday">{w}</div>)}
      {cells.map((d) => {
        const iso = toISO(d);
        const inMonth = d.getMonth() === first.getMonth();
        const items = inMonth ? byDay[iso] ?? [] : [];
        const classes = ['cell', !inMonth && 'outside', iso === today && 'is-today', iso === selectedISO && 'is-selected']
          .filter(Boolean).join(' ');
        return (
          <button
            key={iso}
            className={classes}
            onClick={() => onPick(iso)}
            disabled={!inMonth}
            aria-pressed={iso === selectedISO}
            aria-label={`${d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}, ${items.length} reminders`}
          >
            <span className="cell-number">{d.getDate()}</span>
            {items.slice(0, 3).map((o) => (
              <span key={`${o.reminder_id}-${o.occurs_at}`} className={`chip${o.recurrence !== 'none' ? ' recurring' : ''}`}>
                {o.title}
              </span>
            ))}
            {items.length > 3 && <span className="more">+{items.length - 3} more</span>}
          </button>
        );
      })}
    </div>
  );
}
