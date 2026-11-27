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
    const shimmer = {
      background: 'linear-gradient(90deg, rgba(231,223,210,0.45) 25%, rgba(231,223,210,0.85) 50%, rgba(231,223,210,0.45) 75%)',
      backgroundSize: '200% 100%',
      animation: 'nt-shimmer 1.6s ease-in-out infinite',
      borderRadius: '10px',
    };
    return (
      <div className="nt-page" aria-busy="true" aria-label="Cargando ajustes de notificaciones">
        <style>{`@keyframes nt-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div className="nt-page__header">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', minWidth: 0 }}>
            <div style={{ ...shimmer, height: 24, width: '100%', maxWidth: 220 }} />
            <div style={{ ...shimmer, height: 14, width: '100%', maxWidth: 300 }} />
          </div>
        </div>
        <div className="nt-stack">
          {[1, 2, 3].map((i) => (
            <div key={i} className="nt-card">
              <div className="nt-card__header">
                <div style={{ ...shimmer, width: 40, height: 40, borderRadius: 12 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
                  <div style={{ ...shimmer, height: 16, width: '65%' }} />
                  <div style={{ ...shimmer, height: 13, width: '90%' }} />
                </div>
                <div style={{ ...shimmer, width: 52, height: 30, borderRadius: 999 }} />
              </div>
            </div>
          ))}
        </div>
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
          <h2 className="nt-subtitle">Ajustes de notificaciones</h2>
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