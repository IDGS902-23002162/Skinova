import { useState } from 'react';
import AiChat from '../../../shared/components/CameraInput';
import '../../../shared/styles/progress_registry_style.css';

/* Valores alineados con ProgressEntry.perception */
const PERCEPTIONS = [
  { value: 'better', label: 'Mejor', tone: 'calm', icon: 'M7 17 17 7M8 7h9v9' },
  { value: 'same', label: 'Igual', tone: 'calm', icon: 'M5 9h14M5 15h14' },
  { value: 'worse', label: 'Peor', tone: 'warn', icon: 'M7 7l10 10M17 8v9H8' },
  {
    value: 'irritated',
    label: 'Irritada',
    tone: 'warn',
    icon: 'M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z',
  },
  {
    value: 'dry',
    label: 'Seca',
    tone: 'warn',
    icon: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  },
  {
    value: 'oily',
    label: 'Grasa',
    tone: 'calm',
    icon: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z',
  },
];

const STRESS_LEVELS = [1, 2, 3, 4, 5];

const todayISO = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

const createEmptyHabits = () => ({
  log_date: todayISO(),
  water_ml: '',
  sleep_hours: '',
  stress_level: '',
  activity_minutes: '',
  menstrual_cycle_info: '',
  notes: '',
});

const toInt = (v) => (v === '' ? null : parseInt(v, 10));
const toFloat = (v) => (v === '' ? null : parseFloat(v));

function Icon({ d, size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} />
    </svg>
  );
}

export default function CreaRegistroProgreso({ routines = [], onSave }) {
  const [notes, setNotes] = useState('');
  const [image, setImage] = useState(null);
  const [perception, setPerception] = useState('');
  const [routineId, setRoutineId] = useState('');
  const [habitsOpen, setHabitsOpen] = useState(false);
  const [habits, setHabits] = useState(createEmptyHabits);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const touch = () => {
    setError('');
    setSaved(false);
  };

  const handleNotes = (value) => {
    touch();
    setNotes(typeof value === 'string' ? value : value?.target?.value ?? '');
  };

  const handleImage = (value) => {
    touch();
    setImage(value ?? null);
  };

  const handleHabit = (key) => (e) => {
    touch();
    setHabits((h) => ({ ...h, [key]: e.target.value }));
  };

  const handleClear = () => {
    setNotes('');
    setImage(null);
    setPerception('');
    setRoutineId('');
    setHabitsOpen(false);
    setHabits(createEmptyHabits());
    setError('');
    setSaved(false);
  };

  const handleSubmit = (e) => {
    e?.preventDefault?.();

    if (!perception && !notes.trim() && !image) {
      setError(
        'Añade una foto, un comentario o cómo sientes tu piel para guardar el registro.'
      );
      setSaved(false);
      return;
    }

    const hasHabits =
      habitsOpen &&
      Object.entries(habits).some(([k, v]) => k !== 'log_date' && v !== '');

    /* Estructura alineada con ProgressEntry / ProgressPhoto / HabitLog */
    const payload = {
      entry: {
        routine_id: routineId || null,
        perception: perception || null,
        notes: notes.trim() || null,
        photo: image,
      },
      habit_log: hasHabits
        ? {
            log_date: habits.log_date,
            water_ml: toInt(habits.water_ml),
            sleep_hours: toFloat(habits.sleep_hours),
            stress_level: toInt(habits.stress_level),
            activity_minutes: toInt(habits.activity_minutes),
            menstrual_cycle_info: habits.menstrual_cycle_info.trim() || null,
            notes: habits.notes.trim() || null,
          }
        : null,
    };

    if (onSave) onSave(payload);
    else console.log('Registro de progreso:', payload);

    handleClear();
    setSaved(true);
  };

  return (
    <div className="sk-page">
      <div className="sk-container">
        <header className="sk-head">
          <h2 className="sk-title">Registra tu progreso</h2>
          <p className="sk-lead">
            Anota cómo está tu piel hoy. Con el tiempo, estos registros te ayudan a
            conocer qué funciona para ti.
          </p>
        </header>

        <div className="sk-grid">
          <div className="sk-main">
            <section className="sk-card" aria-labelledby="sk-observa">
              <h2 id="sk-observa" className="sk-card__title">
                Observa tu piel
              </h2>
              <p className="sk-card__text">
                Una foto con luz natural y unas líneas sobre lo que notas es suficiente.
              </p>
              <div className="sk-aichat">
                <AiChat
                  productText={notes}
                  onProductTextChange={handleNotes}
                  capturedImage={image}
                  onImageCaptured={handleImage}
                  onSubmit={handleSubmit}
                  onClearAll={handleClear}
                  labelProduct="Comentarios sobre tu piel"
                  labelCamera="Fotografía de tu piel (opcional)"
                />
              </div>
            </section>

            <section className="sk-card" aria-labelledby="sk-entiende">
              <h2 id="sk-entiende" className="sk-card__title">
                ¿Cómo la sientes hoy?
              </h2>

              <fieldset className="sk-fieldset">
                <legend className="sk-legend">Percepción general</legend>
                <div className="sk-chips">
                  {PERCEPTIONS.map((p) => (
                    <label key={p.value} className="sk-chip" data-tone={p.tone}>
                      <input
                        type="radio"
                        name="perception"
                        value={p.value}
                        checked={perception === p.value}
                        onChange={() => {
                          touch();
                          setPerception(p.value);
                        }}
                      />
                      <span className="sk-chip__face">
                        <Icon d={p.icon} />
                        <span className="sk-chip__label">{p.label}</span>
                        <span className="sk-chip__check">
                          <Icon d="M5 12.5l4.5 4.5L19 7.5" size={16} />
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="sk-field">
                <label htmlFor="sk-routine" className="sk-label">
                  Rutina asociada (opcional)
                </label>
                <select
                  id="sk-routine"
                  className="sk-input"
                  value={routineId}
                  onChange={(e) => {
                    touch();
                    setRoutineId(e.target.value);
                  }}
                >
                  <option value="">Sin rutina asociada</option>
                  {routines.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </section>
          </div>

          <aside className="sk-side">
            <section className="sk-card sk-card--sage" aria-labelledby="sk-habitos">
              <div className="sk-habits-head">
                <div>
                  <h2 id="sk-habitos" className="sk-card__title">
                    Hábitos del día
                  </h2>
                  <p className="sk-card__text">Opcional. Ajusta lo que quieras registrar.</p>
                </div>
                <button
                  type="button"
                  className="sk-btn sk-btn--ghost"
                  aria-expanded={habitsOpen}
                  aria-controls="sk-habits-body"
                  onClick={() => setHabitsOpen((o) => !o)}
                >
                  {habitsOpen ? 'Ocultar' : 'Añadir'}
                </button>
              </div>

              {habitsOpen && (
                <div id="sk-habits-body" className="sk-habits-body">
                  <div className="sk-field">
                    <label htmlFor="sk-log-date" className="sk-label">
                      Fecha
                    </label>
                    <input
                      id="sk-log-date"
                      type="date"
                      className="sk-input"
                      value={habits.log_date}
                      max={todayISO()}
                      onChange={handleHabit('log_date')}
                    />
                  </div>

                  <div className="sk-row">
                    <div className="sk-field">
                      <label htmlFor="sk-water" className="sk-label">
                        Agua (ml)
                      </label>
                      <input
                        id="sk-water"
                        type="number"
                        inputMode="numeric"
                        min="0"
                        step="250"
                        className="sk-input"
                        value={habits.water_ml}
                        onChange={handleHabit('water_ml')}
                      />
                    </div>
                    <div className="sk-field">
                      <label htmlFor="sk-sleep" className="sk-label">
                        Sueño (horas)
                      </label>
                      <input
                        id="sk-sleep"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        max="24"
                        step="0.5"
                        className="sk-input"
                        value={habits.sleep_hours}
                        onChange={handleHabit('sleep_hours')}
                      />
                    </div>
                  </div>

                  <div className="sk-field">
                    <label htmlFor="sk-activity" className="sk-label">
                      Actividad (minutos)
                    </label>
                    <input
                      id="sk-activity"
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="5"
                      className="sk-input"
                      value={habits.activity_minutes}
                      onChange={handleHabit('activity_minutes')}
                    />
                  </div>

                  <fieldset className="sk-fieldset">
                    <legend className="sk-legend">Nivel de estrés</legend>
                    <div className="sk-scale">
                      {STRESS_LEVELS.map((n) => (
                        <label key={n} className="sk-scale__item">
                          <input
                            type="radio"
                            name="stress_level"
                            value={n}
                            checked={habits.stress_level === String(n)}
                            onChange={handleHabit('stress_level')}
                          />
                          <span>{n}</span>
                        </label>
                      ))}
                    </div>
                    <p className="sk-hint">1 es muy bajo, 5 es muy alto.</p>
                  </fieldset>

                  <div className="sk-field">
                    <label htmlFor="sk-cycle" className="sk-label">
                      Ciclo menstrual (opcional)
                    </label>
                    <input
                      id="sk-cycle"
                      type="text"
                      maxLength={100}
                      className="sk-input"
                      value={habits.menstrual_cycle_info}
                      onChange={handleHabit('menstrual_cycle_info')}
                    />
                  </div>

                  <div className="sk-field">
                    <label htmlFor="sk-habit-notes" className="sk-label">
                      Notas del día
                    </label>
                    <textarea
                      id="sk-habit-notes"
                      rows={3}
                      className="sk-input sk-input--area"
                      value={habits.notes}
                      onChange={handleHabit('notes')}
                    />
                  </div>
                </div>
              )}
            </section>

            <section className="sk-card sk-actions" aria-label="Guardar registro">
              {error && (
                <p className="sk-msg sk-msg--error" role="alert">
                  <Icon d="M12 8v5M12 16.5v.5M12 3l10 18H2L12 3z" size={18} />
                  <span>{error}</span>
                </p>
              )}
              {saved && (
                <p className="sk-msg sk-msg--ok" role="status">
                  <Icon d="M5 12.5l4.5 4.5L19 7.5" size={18} />
                  <span>Registro guardado. Ya forma parte de tu historial.</span>
                </p>
              )}
              <button type="button" className="sk-btn sk-btn--primary" onClick={handleSubmit}>
                Guardar registro
              </button>
              <button type="button" className="sk-btn sk-btn--secondary" onClick={handleClear}>
                Limpiar
              </button>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}