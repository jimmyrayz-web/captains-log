import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getEntry, createEntry, updateEntry } from '../api.js';
import PhotoGallery from '../components/PhotoGallery.jsx';
import ChecklistModal, { CHECKLIST_GROUPS } from '../components/ChecklistModal.jsx';

function computeDurationHours(departureTime, arrivalTime) {
  const [dh, dm] = departureTime.split(':').map(Number);
  const [ah, am] = arrivalTime.split(':').map(Number);
  let minutes = ah * 60 + am - (dh * 60 + dm);
  if (minutes < 0) minutes += 24 * 60; // arrival past midnight
  return String(Math.round((minutes / 60) * 100) / 100);
}

const EMPTY = {
  date: new Date().toISOString().slice(0, 10),
  weather: '',
  engine_hours: '',
  departure_point: '',
  departure_time: '',
  departure_fuel: '',
  arrival_point: '',
  arrival_time: '',
  arrival_fuel: '',
  distance_nm: '',
  duration_hours: '',
  crew: 'James, Steve',
  fuel_added_gal: '0',
  oil_checked: false,
  maintenance_notes: '',
  notes: '',
};

export default function EntryForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [checklistChecked, setChecklistChecked] = useState({});

  useEffect(() => {
    setChecklistChecked({});
  }, [id]);

  useEffect(() => {
    if (!isEdit) return;
    getEntry(id)
      .then((entry) => {
        setForm({
          date: entry.date || '',
          weather: entry.weather || '',
          engine_hours: entry.engine_hours ?? '',
          departure_point: entry.departure_point || '',
          departure_time: entry.departure_time || '',
          departure_fuel: entry.departure_fuel ?? '',
          arrival_point: entry.arrival_point || '',
          arrival_time: entry.arrival_time || '',
          arrival_fuel: entry.arrival_fuel ?? '',
          distance_nm: entry.distance_nm ?? '',
          duration_hours: entry.duration_hours ?? '',
          crew: (entry.crew || []).join(', '),
          fuel_added_gal: entry.fuel_added_gal ?? '',
          oil_checked: entry.oil_checked,
          maintenance_notes: entry.maintenance_notes || '',
          notes: entry.notes || '',
        });
        setPhotos(entry.photos || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function updateTime(field, value) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (next.departure_time && next.arrival_time) {
        next.duration_hours = computeDurationHours(next.departure_time, next.arrival_time);
      }
      return next;
    });
  }

  function toggleChecklistItem(groupIndex, itemIndex, isChecked) {
    setChecklistChecked((prev) => ({ ...prev, [`${groupIndex}-${itemIndex}`]: isChecked }));
  }

  function toggleChecklistGroup(groupIndex, isChecked) {
    setChecklistChecked((prev) => {
      const next = { ...prev };
      CHECKLIST_GROUPS[groupIndex].items.forEach((_, itemIndex) => {
        next[`${groupIndex}-${itemIndex}`] = isChecked;
      });
      return next;
    });
  }

  function handleChecklistConfirm() {
    update('oil_checked', true);
    setChecklistOpen(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        engine_hours: form.engine_hours === '' ? null : Number(form.engine_hours),
        distance_nm: form.distance_nm === '' ? null : Number(form.distance_nm),
        duration_hours: form.duration_hours === '' ? null : Number(form.duration_hours),
        fuel_added_gal: form.fuel_added_gal === '' ? null : Number(form.fuel_added_gal),
        departure_fuel: form.departure_fuel === '' ? null : Number(form.departure_fuel),
        arrival_fuel: form.arrival_fuel === '' ? null : Number(form.arrival_fuel),
      };
      if (isEdit) {
        await updateEntry(id, payload);
        navigate(`/entries/${id}`);
      } else {
        const created = await createEntry(payload);
        navigate(`/entries/${created.id}`);
      }
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (loading) return <div className="loading">Loading entry…</div>;

  return (
    <>
      <div className="page-header">
        <h1>{isEdit ? 'Edit Entry' : 'New Log Entry'}</h1>
        <button
          type="button"
          className="icon-close"
          onClick={() => navigate(-1)}
          aria-label="Close"
          disabled={saving}
        >
          ✕
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form className="entry-form card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="date">Date</label>
            <input
              id="date"
              type="date"
              value={form.date}
              onChange={(e) => update('date', e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="weather">Weather</label>
            <input
              id="weather"
              type="text"
              value={form.weather}
              onChange={(e) => update('weather', e.target.value)}
              placeholder="e.g. Sunny, light chop"
            />
          </div>
          <div className="field">
            <label htmlFor="engine_hours">Engine Hours</label>
            <input
              id="engine_hours"
              type="number"
              step="0.1"
              value={form.engine_hours}
              onChange={(e) => update('engine_hours', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="departure_point">Departure Point</label>
            <input
              id="departure_point"
              type="text"
              value={form.departure_point}
              onChange={(e) => update('departure_point', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="departure_time">Departure Time</label>
            <input
              id="departure_time"
              type="time"
              value={form.departure_time}
              onChange={(e) => updateTime('departure_time', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="departure_fuel">Departure Fuel</label>
            <input
              id="departure_fuel"
              type="number"
              step="0.1"
              value={form.departure_fuel}
              onChange={(e) => update('departure_fuel', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="arrival_point">Arrival Point</label>
            <input
              id="arrival_point"
              type="text"
              value={form.arrival_point}
              onChange={(e) => update('arrival_point', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="arrival_time">Arrival Time</label>
            <input
              id="arrival_time"
              type="time"
              value={form.arrival_time}
              onChange={(e) => updateTime('arrival_time', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="arrival_fuel">Arrival Fuel</label>
            <input
              id="arrival_fuel"
              type="number"
              step="0.1"
              value={form.arrival_fuel}
              onChange={(e) => update('arrival_fuel', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="distance_nm">Distance (nm)</label>
            <input
              id="distance_nm"
              type="number"
              step="0.1"
              value={form.distance_nm}
              onChange={(e) => update('distance_nm', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="duration_hours">Duration (hours)</label>
            <input
              id="duration_hours"
              type="number"
              step="0.1"
              value={form.duration_hours}
              onChange={(e) => update('duration_hours', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="crew">Crew Names</label>
            <input
              id="crew"
              type="text"
              value={form.crew}
              onChange={(e) => update('crew', e.target.value)}
              placeholder="Comma-separated, e.g. Jim, Sarah"
            />
          </div>
          <div className="field">
            <label htmlFor="fuel_added_gal">Fuel Added (gal)</label>
            <input
              id="fuel_added_gal"
              type="number"
              step="0.1"
              value={form.fuel_added_gal}
              onChange={(e) => update('fuel_added_gal', e.target.value)}
            />
          </div>
          <div className="field checkbox">
            <input
              id="oil_checked"
              type="checkbox"
              checked={form.oil_checked}
              onChange={(e) => update('oil_checked', e.target.checked)}
            />
            <button type="button" className="checklist-link" onClick={() => setChecklistOpen(true)}>
              Departure Checklist
            </button>
          </div>
        </div>

        <div className="field">
          <label htmlFor="maintenance_notes">Maintenance Notes</label>
          <textarea
            id="maintenance_notes"
            value={form.maintenance_notes}
            onChange={(e) => update('maintenance_notes', e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="notes">General Notes</label>
          <textarea
            id="notes"
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
          />
        </div>

        {isEdit && <PhotoGallery entryId={id} photos={photos} onChange={setPhotos} />}

        <div className="form-bottom-actions">
          <button type="submit" className="button" disabled={saving}>
            {saving ? 'Saving…' : 'Save Entry'}
          </button>
        </div>
      </form>

      {checklistOpen && (
        <ChecklistModal
          checked={checklistChecked}
          onToggleItem={toggleChecklistItem}
          onToggleGroup={toggleChecklistGroup}
          onConfirm={handleChecklistConfirm}
          onClose={() => setChecklistOpen(false)}
        />
      )}
    </>
  );
}
