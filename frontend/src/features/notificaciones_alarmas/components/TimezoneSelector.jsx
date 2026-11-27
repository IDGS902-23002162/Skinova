import { useMemo } from 'react';
import NotificationIcon from './NotificationIcon';
import { detectTimezone } from '../utils/dateUtils';
import "../../../shared/styles/notification_style.css";

const FALLBACK_ZONES = [
  'America/Mexico_City',
  'America/Bogota',
  'America/Lima',
  'America/Santiago',
  'America/Argentina/Buenos_Aires',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/Madrid',
  'UTC',
];

const getZones = () =>
  typeof Intl.supportedValuesOf === 'function'
    ? Intl.supportedValuesOf('timeZone')
    : FALLBACK_ZONES;

const prettify = (zone) => zone.replace(/_/g, ' ');

// `value` puede ser null: significa "usar la zona detectada".
export default function TimezoneSelector({ value, onChange }) {
  const detected = useMemo(detectTimezone, []);
  const current = value || detected;

  const zones = useMemo(() => {
    const list = new Set([detected, current, ...getZones()]);
    return [...list].sort();
  }, [detected, current]);

  const localTime = useMemo(
    () =>
      new Intl.DateTimeFormat('es', {
        timeZone: current,
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date()),
    [current],
  );

  return (
    <section className="nt-card" aria-labelledby="timezone-title">
      <header className="nt-card__header">
        <span className="nt-card__icon" aria-hidden="true">
          <NotificationIcon name="globe" />
        </span>
        <div className="nt-card__text">
          <h3 id="timezone-title" className="nt-card__title">
            Zona horaria
          </h3>
          <p className="nt-card__desc">
            Detectada: {prettify(detected)}. Tus recordatorios se envían según esta zona.
          </p>
        </div>
      </header>

      <div className="nt-card__options nt-card__options--stack">
        <div className="nt-field">
          <label className="nt-field__label" htmlFor="timezone-select">
            Zona horaria
          </label>
          <select
            id="timezone-select"
            className="nt-input"
            value={current}
            onChange={(event) => onChange(event.target.value)}
          >
            {zones.map((zone) => (
              <option key={zone} value={zone}>
                {prettify(zone)}
              </option>
            ))}
          </select>
        </div>

        <p className="nt-hint">Ahora mismo allí: {localTime}</p>

        {current !== detected && (
          <button type="button" className="nt-btn nt-btn--text" onClick={() => onChange(detected)}>
            Usar la zona detectada
          </button>
        )}
      </div>
    </section>
  );
}