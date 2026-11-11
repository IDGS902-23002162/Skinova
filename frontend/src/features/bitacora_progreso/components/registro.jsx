import '../../../shared/styles/progress_registry_style.css';

/* Valores alineados con ProgressEntry.perception */
const PERCEPTIONS = {
  better: { label: 'Mejor', tone: 'calm', icon: 'M7 17 17 7M8 7h9v9' },
  same: { label: 'Igual', tone: 'calm', icon: 'M5 9h14M5 15h14' },
  worse: { label: 'Peor', tone: 'warn', icon: 'M7 7l10 10M17 8v9H8' },
  irritated: {
    label: 'Irritada',
    tone: 'warn',
    icon: 'M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z',
  },
  dry: {
    label: 'Seca',
    tone: 'warn',
    icon: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  },
  oily: { label: 'Grasa', tone: 'calm', icon: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z' },
};

const HABIT_ICONS = {
  water: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z',
  sleep: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  activity: 'M3 12h4l3-8 4 16 3-8h4',
  stress: 'M4 15c2-6 4-6 8 0s6 6 8 0',
  cycle: 'M21 12a9 9 0 1 1-3-6.7M21 4v5h-5',
};

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

/* created_at sin zona horaria (UTC del backend) se interpreta como UTC */
const parseDateTime = (value) => {
  if (value instanceof Date) return value;
  const str = String(value);
  return new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(str) ? str : `${str}Z`);
};

/* log_date ("2026-10-19") es una fecha de calendario: se interpreta en local */
const parseDateOnly = (value) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : parseDateTime(value);
};

const longDate = new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' });
const shortTime = new Intl.DateTimeFormat('es-MX', { timeStyle: 'short' });

const isFilled = (v) => v !== null && v !== undefined && v !== '';

export default function RegistroBitacora({ entry, routineName, habitLog = null }) {
  if (!entry) return null;

  const created = parseDateTime(entry.created_at);
  const date = longDate.format(created);
  const time = shortTime.format(created);
  const perception = PERCEPTIONS[entry.perception];
  const photos = entry.photos ?? [];

  const habits = habitLog
    ? [
        isFilled(habitLog.water_ml) && {
          key: 'water',
          label: 'Agua',
          value: `${habitLog.water_ml} ml`,
        },
        isFilled(habitLog.sleep_hours) && {
          key: 'sleep',
          label: 'Sueño',
          value: `${Number(habitLog.sleep_hours)} h`,
        },
        isFilled(habitLog.activity_minutes) && {
          key: 'activity',
          label: 'Actividad',
          value: `${habitLog.activity_minutes} min`,
        },
        isFilled(habitLog.stress_level) && {
          key: 'stress',
          label: 'Estrés',
          value: `${habitLog.stress_level} de 5`,
        },
        isFilled(habitLog.menstrual_cycle_info) && {
          key: 'cycle',
          label: 'Ciclo',
          value: habitLog.menstrual_cycle_info,
        },
      ].filter(Boolean)
    : [];

  const hasHabits = habits.length > 0 || (habitLog && isFilled(habitLog.notes));

  return (
    <article className="reg-card" aria-labelledby={`reg-${entry.id}`}>
      <header className="reg-head">
        <div>
          <h2 id={`reg-${entry.id}`} className="reg-date">
            <time dateTime={created.toISOString()}>{date}</time>
          </h2>
          <p className="reg-meta">
            {time}
            {routineName ? ` · Rutina: ${routineName}` : ''}
          </p>
        </div>

        {perception && (
          <p className="reg-badge" data-tone={perception.tone}>
            <Icon d={perception.icon} size={18} />
            <span>Piel {perception.label.toLowerCase()}</span>
          </p>
        )}
      </header>

      {photos.length > 0 && (
        <ul className="reg-photos" data-count={Math.min(photos.length, 3)}>
          {photos.map((photo) => (
            <li key={photo.id} className="reg-photo">
              <img src={photo.url} alt={`Fotografía de tu piel tomada el ${date}`} loading="lazy" />
            </li>
          ))}
        </ul>
      )}

      {entry.notes && <p className="reg-notes">{entry.notes}</p>}

      {hasHabits && (
        <section
          className="reg-habits"
          aria-label={`Hábitos del ${longDate.format(parseDateOnly(habitLog.log_date))}`}
        >
          <h3 className="reg-habits__title">
            Hábitos del {longDate.format(parseDateOnly(habitLog.log_date))}
          </h3>

          {habits.length > 0 && (
            <dl className="reg-metrics">
              {habits.map((h) => (
                <div key={h.key} className="reg-metric">
                  <dt>
                    <Icon d={HABIT_ICONS[h.key]} size={18} />
                    {h.label}
                  </dt>
                  <dd>{h.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {isFilled(habitLog.notes) && <p className="reg-habits__notes">{habitLog.notes}</p>}
        </section>
      )}
    </article>
  );
}