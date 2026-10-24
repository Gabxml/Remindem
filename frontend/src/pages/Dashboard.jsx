import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { addDays, describeRepeat, formatTime, fromISO, periodTitle, startOfWeek, toISO } from '../dates';

const CARDS = [
  { view: 'day', title: 'Daily reminders', empty: 'Nothing planned for this day.' },
  { view: 'week', title: 'Weekly reminders', empty: 'Nothing planned this week.' },
  { view: 'month', title: 'Monthly reminders', empty: 'Nothing planned this month.' },
];

const firstOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);

function groupByDay(occurrences = []) {
  const map = {};
  for (const o of occurrences) (map[o.occurs_at.slice(0, 10)] ||= []).push(o);
  return map;
}

export default function Dashboard({ refreshKey, onEdit }) {
  const [selected, setSelected] = useState(() => new Date()); // drives the three cards
  const [viewMonth, setViewMonth] = useState(() => firstOfMonth(new Date())); // drives the calendar
  const [cards, setCards] = useState(null); // { day, week, month }
  const [calendar, setCalendar] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const on = toISO(selected);
    Promise.all(CARDS.map((c) => api.get(`/dashboard?view=${c.view}&on=${on}`)))
      .then(([day, week, month]) => {
        if (cancelled) return;
        setCards({ day, week, month });
        setError('');
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => { cancelled = true; };
  }, [selected, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    api.get(`/dashboard?view=month&on=${toISO(viewMonth)}`)
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
          {CARDS.map((c) => (
            <ReminderCard
              key={c.view}
              card={c}
              subtitle={periodTitle(c.view, selected)}
              data={cards?.[c.view]}
              today={today}
              onOpen={openEditor}
            />
          ))}
        </div>

        <section className="panel calendar-panel" aria-label="Calendar">
          <header className="panel-head">
            <div>
              <h2>Calendar</h2>
              <p className="muted">{periodTitle('month', viewMonth)}</p>
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

function ReminderCard({ card, subtitle, data, today, onOpen }) {
  const items = data?.occurrences;
  const grouped = card.view !== 'day';

  return (
    <section className="panel">
      <header className="panel-head">
        <div>
          <h2>{card.title}</h2>
          <p className="muted">{subtitle}</p>
        </div>
        {items && <span className="count">{items.length}</span>}
      </header>

      <div className="panel-body">
        {!items ? (
          <p className="empty">Loading…</p>
        ) : items.length === 0 ? (
          <p className="empty">{card.empty}</p>
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
                      {o.recurrence !== 'none' && <span className="repeat">{describeRepeat(o.recurrence, o.interval)}</span>}
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
