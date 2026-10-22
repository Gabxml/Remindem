import { useEffect, useRef, useState } from 'react';
import { api } from '../api';

const REPEAT_OPTIONS = [
  ['none', 'Doesn’t repeat'],
  ['daily', 'Daily'],
  ['weekly', 'Weekly'],
  ['monthly', 'Monthly'],
  ['yearly', 'Yearly'],
];
const UNIT = { daily: 'day(s)', weekly: 'week(s)', monthly: 'month(s)', yearly: 'year(s)' };

export default function ReminderForm({ reminder, defaultDate, onClose, onSaved }) {
  const dialogRef = useRef(null);
  const editing = Boolean(reminder);

  const [title, setTitle] = useState(reminder?.title ?? '');
  const [description, setDescription] = useState(reminder?.description ?? '');
  const [startAt, setStartAt] = useState(reminder ? reminder.start_at.slice(0, 16) : `${defaultDate}T09:00`);
  const [recurrence, setRecurrence] = useState(reminder?.recurrence ?? 'none');
  const [interval, setInterval_] = useState(reminder?.interval ?? 1);
  const [endDate, setEndDate] = useState(reminder?.end_date ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog.open) dialog.showModal();
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const body = {
      title,
      description,
      start_at: startAt,
      recurrence,
      interval: Number(interval) || 1,
      end_date: recurrence !== 'none' && endDate ? endDate : null,
    };
    try {
      if (editing) await api.put(`/reminders/${reminder.id}`, body);
      else await api.post('/reminders', body);
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  async function remove() {
    const what = reminder.recurrence === 'none' ? 'this reminder' : 'this reminder and all its repeats';
    if (!window.confirm(`Delete ${what}?`)) return;
    setBusy(true);
    try {
      await api.del(`/reminders/${reminder.id}`);
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <dialog ref={dialogRef} className="modal" onClose={onClose} onClick={(e) => e.target === dialogRef.current && onClose()}>
      <form onSubmit={submit} className="modal-form">
        <h2>{editing ? 'Edit reminder' : 'New reminder'}</h2>

        <label className="field">Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required autoFocus />
        </label>
        <label className="field">Notes
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={2000} />
        </label>
        <label className="field">When
          <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
        </label>

        <div className="row">
          <label className="field grow">Repeat
            <select value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
              {REPEAT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          {recurrence !== 'none' && (
            <label className="field">Every
              <span className="inline">
                <input type="number" min="1" max="365" value={interval} onChange={(e) => setInterval_(e.target.value)} className="narrow" />
                <span className="muted">{UNIT[recurrence]}</span>
              </span>
            </label>
          )}
        </div>

        {recurrence !== 'none' && (
          <label className="field">Stop repeating after
            <input type="date" value={endDate} min={startAt.slice(0, 10)} onChange={(e) => setEndDate(e.target.value)} />
            <span className="hint">Leave empty to repeat forever.{editing && ' Changes apply to every repeat.'}</span>
          </label>
        )}

        {error && <p className="error" role="alert">{error}</p>}

        <div className="actions">
          {editing && <button type="button" className="btn danger" onClick={remove} disabled={busy}>Delete</button>}
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy}>{editing ? 'Save changes' : 'Add reminder'}</button>
        </div>
      </form>
    </dialog>
  );
}
