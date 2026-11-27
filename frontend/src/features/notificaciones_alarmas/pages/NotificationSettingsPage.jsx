import CategorySettingsCard from '../components/CategorySettingsCard';
import QuietHoursSettings from '../components/QuietHoursSettings';
import TimezoneSelector from '../components/TimezoneSelector';
import useNotificationSettings from '../hooks/useNotificationSettings';
import { CATEGORY_GROUPS, NOTIFICATION_CATEGORIES } from '../config/notificationCategories';

const SAVE_MESSAGES = {
  idle: '',
  saving: 'Guardando…',
  saved: 'Cambios guardados',
  error: 'No se pudieron guardar los cambios. Se reintentará con el siguiente ajuste.',
};

export default function NotificacionSettingsPage() {
  const { settings, status, saveState, reload, setCategory, setQuietHours, setTimezone } =
    useNotificationSettings();

  if (status === 'loading') {
    return (
      <div className="nt-page">
        <p className="nt-state" role="status">
          Cargando tus ajustes…
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="nt-page">
        <div className="nt-state" role="alert">
          <p>No pudimos cargar tus ajustes.</p>
          <button type="button" className="nt-btn nt-btn--secondary" onClick={reload}>
            Intentar de nuevo
          </button>
        </div>
      </div>
    );
  }

  const sections = CATEGORY_GROUPS.filter((g) => g.id !== 'all');

  return (
    <div className="nt-page">
      <header className="nt-page__header">
        <div>
          <h1 className="nt-title">Ajustes de notificaciones</h1>
          <p className="nt-lead">Elige qué quieres recibir y cuándo. Tú marcas el ritmo.</p>
        </div>
        <p className={`nt-save nt-save--${saveState}`} role="status" aria-live="polite">
          {SAVE_MESSAGES[saveState]}
        </p>
      </header>

      {sections.map((section) => (
        <section
          key={section.id}
          className="nt-section"
          aria-labelledby={`nt-section-${section.id}`}
        >
          <h2 id={`nt-section-${section.id}`} className="nt-section__title">
            {section.label}
          </h2>
          <div className="nt-stack">
            {NOTIFICATION_CATEGORIES.filter((c) => c.group === section.id).map((category) => (
              <CategorySettingsCard
                key={category.id}
                category={category}
                value={settings.categories[category.id]}
                onChange={(patch) => setCategory(category.id, patch)}
              />
            ))}
          </div>
        </section>
      ))}

      <section className="nt-section" aria-labelledby="nt-section-rest">
        <h2 id="nt-section-rest" className="nt-section__title">
          Descanso y horario
        </h2>
        <div className="nt-stack">
          <QuietHoursSettings value={settings.quietHours} onChange={setQuietHours} />
          <TimezoneSelector value={settings.timezone} onChange={setTimezone} />
        </div>
      </section>
    </div>
  );
}