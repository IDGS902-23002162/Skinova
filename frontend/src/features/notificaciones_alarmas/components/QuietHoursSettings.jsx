import NotificationIcon from './NotificationIcon';
import ToggleSwitch from './ToggleSwitch';
import TimePicker from './TimePicker';
import "../../../shared/styles/notification_style.css";

// `value` = { enabled, start, end } · admite rangos nocturnos (22:00 → 07:00)
export default function QuietHoursSettings({ value, onChange }) {
  const { enabled, start, end } = value;

  return (
    <section className="nt-card" aria-labelledby="quiet-hours-title">
      <header className="nt-card__header">
        <span className="nt-card__icon" aria-hidden="true">
          <NotificationIcon name="moon" />
        </span>
        <div className="nt-card__text">
          <h3 id="quiet-hours-title" className="nt-card__title">
            Horas de silencio
          </h3>
          <p className="nt-card__desc">
            Durante este tiempo no te enviaremos avisos. Los verás después en tu historial.
          </p>
        </div>
        <ToggleSwitch
          id="quiet-hours-switch"
          checked={enabled}
          onChange={(next) => onChange({ enabled: next })}
          label="Activar horas de silencio"
        />
      </header>

      {enabled && (
        <div className="nt-card__options">
          <TimePicker
            id="quiet-hours-start"
            label="Desde"
            value={start}
            onChange={(next) => onChange({ start: next })}
          />
          <TimePicker
            id="quiet-hours-end"
            label="Hasta"
            value={end}
            onChange={(next) => onChange({ end: next })}
          />
        </div>
      )}
    </section>
  );
}