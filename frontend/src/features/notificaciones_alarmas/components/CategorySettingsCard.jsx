import NotificationIcon from './NotificationIcon';
import ToggleSwitch from './ToggleSwitch';
import TimePicker from './TimePicker';
import { WEEKDAYS } from '../config/notificationCategories';
import "../../../shared/styles/notification_style.css";

// Tarjeta reutilizable para las 10 categorías.
// `value` = { enabled, time, days } · `onChange(patch)` recibe solo lo que cambió.
export default function CategorySettingsCard({ category, value, onChange }) {
  const { id, label, description, icon, hasTime, hasDays, tone } = category;
  const { enabled, time, days = [] } = value;

  const toggleDay = (day) => {
    const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort();
    onChange({ days: next });
  };

  return (
    <section
      className={`nt-card ${tone === 'alert' ? 'nt-card--alert' : ''}`}
      aria-labelledby={`${id}-title`}
    >
      <header className="nt-card__header">
        <span className="nt-card__icon" aria-hidden="true">
          <NotificationIcon name={icon} />
        </span>
        <div className="nt-card__text">
          <h3 id={`${id}-title`} className="nt-card__title">
            {label}
          </h3>
          <p className="nt-card__desc">{description}</p>
        </div>
        <ToggleSwitch
          id={`${id}-switch`}
          checked={enabled}
          onChange={(next) => onChange({ enabled: next })}
          label={`Activar ${label}`}
        />
      </header>

      {enabled && (hasDays || hasTime) && (
        <div className="nt-card__options">
          {hasDays && (
            <fieldset className="nt-days">
              <legend className="nt-field__label">Días</legend>
              <div className="nt-days__row">
                {WEEKDAYS.map((day) => {
                  const pressed = days.includes(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      className={`nt-day ${pressed ? 'nt-day--on' : ''}`}
                      aria-pressed={pressed}
                      aria-label={day.label}
                      onClick={() => toggleDay(day.value)}
                    >
                      {day.short}
                    </button>
                  );
                })}
              </div>
              {days.length === 0 && (
                <p className="nt-hint">Elige al menos un día para recibir este recordatorio.</p>
              )}
            </fieldset>
          )}

          {hasTime && (
            <TimePicker
              id={`${id}-time`}
              label="Hora"
              value={time}
              onChange={(next) => onChange({ time: next })}
            />
          )}
        </div>
      )}
    </section>
  );
}