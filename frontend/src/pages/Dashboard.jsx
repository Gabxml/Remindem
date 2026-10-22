import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { addDays, describeRepeat, formatTime, fromISO, periodTitle, shiftPeriod, startOfWeek, toISO } from '../dates';
import ReminderForm from '../components/ReminderForm.jsx';

const VIEWS = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
];

export default function Dashboard() {
  const [view, setView] = useState('day');
  const [anchor, setAnchor] = useState(() => new Date());
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState(null); // null | { reminder? }

  const load = useCallback(async () => {
    setError('');
    try {
      setData(await api.get(`/dashboard?view=${view}&on=${toISO(anchor)}`));
    } catch (err) {
      setError(err.message);
    }
  }, [view, anchor]);

  useEffect(() => { load(); }, [load]);

  const byDay = useMemo(() => {
    const map = {};
    for (const o of data?.occurrences ?? []) (map[o.occurs_at.slice(0, 10)] ||= []).push(o);
    return map;
  }, [data]);

  async function openEditor(occurrence) {
    try {
      setForm({ reminder: await api.get(`/reminders/${occurrence.reminder_id}`) });
    } catch (err) {
      setError(err.message);
    }
  }

  const today = toISO(new Date());
  const days = data ? listDays(data.range_start, data.range_end) : [];
  const total = data?.occurrences.length ?? 0;

  return (
    <section className="dashboard">
      <header className="toolbar">
        <div>
          <h2 className="period">{periodTitle(view, anchor)}</h2>
          <p className="muted">
            {data ? (total === 0 ? 'Nothing scheduled' : `${total} reminder${total === 1 ? '' : 's'}`) : ' '}
          </p>
        </div>

        <div className="controls">
          <div className="segmented" role="group" aria-label="View">
            {VIEWS.map((v) => (
              <button key={v.id} aria-pressed={view === v.id} onClick={() => setView(v.id)}>{v.label}</button>
            ))}
          </div>
          <div className="stepper" role="group" aria-label="Change period">
            <button className="btn" aria-label="Previous" onClick={() => setAnchor(shiftPeriod(view, anchor, -1))}>‹</button>
            <button className="btn" onClick={() => setAnchor(new Date())}>Today</button>
            <button className="btn" aria-label="Next" onClick={() => setAnchor(shiftPeriod(view, anchor, 1))}>›</button>
          </div>
          <button className="btn primary" onClick={() => setForm({})}>New reminder</button>
        </div>
      </header>

      {error && (
        <p className="error" role="alert">
          {error} <button className="link-button" onClick={load}>Retry</button>
        </p>
      )}

      {data && view === 'month' && (
        <MonthGrid
          anchor={anchor}
          byDay={byDay}
          today={today}
          onPickDay={(iso) => { setAnchor(fromISO(iso)); setView('day'); }}
        />
      )}

      {data && view !== 'month' && (
        <div className="agenda">
          {days.map((iso) => (
            <DaySection
              key={iso}
              iso={iso}
              items={byDay[iso] ?? []}
              isToday={iso === today}
              showHeading={view === 'week'}
              onOpen={openEditor}
            />
          ))}
        </div>
      )}

      {form && (
        <ReminderForm
          reminder={form.reminder}
          defaultDate={toISO(anchor)}
          onClose={() => setForm(null)}
          onSaved={() => { setForm(null); load(); }}
        />
      )}
    </section>
  );
}

function listDays(startISO, endISO) {
  const out = [];
  for (let d = fromISO(startISO); toISO(d) <= endISO; d = addDays(d, 1)) out.push(toISO(d));
  return out;
}

function DaySection({ iso, items, isToday, showHeading, onOpen }) {
  const date = fromISO(iso);
  return (
    <section className={`day${isToday ? ' is-today' : ''}`}>
      {showHeading && (
        <h3 className="day-heading">
          <span className="day-name">{date.toLocaleDateString([], { weekday: 'long' })}</span>
          <span className="day-date">{date.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
          {isToday && <span className="today-tag">Today</span>}
        </h3>
      )}
      {items.length === 0 ? (
        <p className="empty">{showHeading ? 'Nothing planned' : 'Nothing planned for this day. Add a reminder to get started.'}</p>
      ) : (
        <ul className="occurrences">
          {items.map((o) => (
            <li key={`${o.reminder_id}-${o.occurs_at}`}>
              <button className="occurrence" onClick={() => onOpen(o)}>
                <time className="time">{formatTime(o.occurs_at)}</time>
                <span className="body">
                  <span className="title">{o.title}</span>
                  {o.description && <span className="desc">{o.description}</span>}
                </span>
                {o.recurrence !== 'none' && <span className="repeat">{describeRepeat(o.recurrence, o.interval)}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MonthGrid({ anchor, byDay, today, onPickDay }) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const cells = [];
  for (let d = startOfWeek(first); d <= addDays(startOfWeek(last), 6); d = addDays(d, 1)) cells.push(d);
  const weekdays = cells.slice(0, 7).map((d) => d.toLocaleDateString([], { weekday: 'short' }));

  return (
    <div className="month">
      {weekdays.map((w) => <div key={w} className="month-weekday">{w}</div>)}
      {cells.map((d) => {
        const iso = toISO(d);
        const inMonth = d.getMonth() === anchor.getMonth();
        const items = inMonth ? byDay[iso] ?? [] : [];
        return (
          <button
            key={iso}
            className={`cell${inMonth ? '' : ' outside'}${iso === today ? ' is-today' : ''}`}
            onClick={() => onPickDay(iso)}
            disabled={!inMonth}
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
