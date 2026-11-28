import { useMemo, useState } from 'react';
import NotificationIcon from '../components/NotificationIcon';
import NotificationItem from '../components/NotificationItem';
import { useNotifications } from '../context/NotificationsContext';
import { CATEGORY_BY_ID, CATEGORY_GROUPS } from '../config/notificationCategories';
import { groupByDay, parseServerDate } from '../utils/dateUtils';

export default function NotificationCenterPage({
  timeZone, // opcional: si no se pasa, se usa la zona del navegador
}) {
  const { notifications, unreadCount, status, refresh, markAllAsRead } = useNotifications();
  const [activeTab, setActiveTab] = useState('all');

  const sorted = useMemo(
    () =>
      [...notifications].sort(
        (a, b) => parseServerDate(b.created_at) - parseServerDate(a.created_at),
      ),
    [notifications],
  );

  const filtered = useMemo(
    () =>
      activeTab === 'all'
        ? sorted
        : sorted.filter((n) => CATEGORY_BY_ID[n.type]?.group === activeTab),
    [sorted, activeTab],
  );

  const groups = useMemo(() => groupByDay(filtered, timeZone), [filtered, timeZone]);

  const handleTabKeyDown = (event, index) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const next =
      CATEGORY_GROUPS[(index + direction + CATEGORY_GROUPS.length) % CATEGORY_GROUPS.length];
    setActiveTab(next.id);
    document.getElementById(`nt-tab-${next.id}`)?.focus();
  };

  return (
    <div className="nt-page">
      <header className="nt-page__header">
        <div>
          <h2 className="nt-subtitle">Notificaciones</h2>
          <p className="nt-lead">Observa lo que ha pasado en tu rutina y qué puedes hacer ahora.</p>
        </div>
        {unreadCount > 0 && (
          <div className="nt-page__actions">
            <button type="button" className="nt-btn nt-btn--text" onClick={markAllAsRead}>
              <NotificationIcon name="check" size={18} />
              Marcar todo como leído
            </button>
          </div>
        )}
      </header>

      <div className="nt-tabs" role="tablist" aria-label="Categorías de notificaciones">
        {CATEGORY_GROUPS.map((group, index) => {
          const selected = group.id === activeTab;
          return (
            <button
              key={group.id}
              id={`nt-tab-${group.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="nt-tabpanel"
              tabIndex={selected ? 0 : -1}
              className={`nt-tab ${selected ? 'nt-tab--active' : ''}`}
              onClick={() => setActiveTab(group.id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
            >
              {group.label}
            </button>
          );
        })}
      </div>

      <div id="nt-tabpanel" role="tabpanel" aria-labelledby={`nt-tab-${activeTab}`}>
        {status === 'loading' && (
          <div className="nt-group" aria-busy="true" aria-label="Cargando notificaciones">
            <style>{`@keyframes nt-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
            <div
              style={{
                height: 14,
                width: 90,
                borderRadius: 8,
                marginBottom: 16,
                background: 'linear-gradient(90deg, rgba(231,223,210,0.45) 25%, rgba(231,223,210,0.85) 50%, rgba(231,223,210,0.45) 75%)',
                backgroundSize: '200% 100%',
                animation: 'nt-shimmer 1.6s ease-in-out infinite',
              }}
            />
            <div className="nt-list">
              {[1, 2, 3, 4].map((i) => {
                const shimmer = {
                  background: 'linear-gradient(90deg, rgba(231,223,210,0.45) 25%, rgba(231,223,210,0.85) 50%, rgba(231,223,210,0.45) 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'nt-shimmer 1.6s ease-in-out infinite',
                  borderRadius: '10px',
                };
                return (
                  <div key={i} className="nt-item" style={{ cursor: 'default' }}>
                    <div style={{ ...shimmer, width: 40, height: 40, borderRadius: 12 }} />
                    <div className="nt-item__body" style={{ gap: 8 }}>
                      <div style={{ ...shimmer, height: 16, width: '55%' }} />
                      <div style={{ ...shimmer, height: 13, width: '85%' }} />
                    </div>
                    <div style={{ ...shimmer, height: 13, width: 52 }} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="nt-state" role="alert">
            <p>No pudimos cargar tus notificaciones.</p>
            <button type="button" className="nt-btn nt-btn--secondary" onClick={refresh}>
              Intentar de nuevo
            </button>
          </div>
        )}

        {status === 'ready' && groups.length === 0 && (
          <div className="nt-state nt-state--empty">
            <NotificationIcon name="leaf" size={28} />
            <p className="nt-state__title">Todo en calma</p>
            <p>Cuando haya algo que observar, lo verás aquí.</p>
          </div>
        )}

        {status === 'ready' &&
          groups.map((group) => (
            <section key={group.key} className="nt-group" aria-labelledby={`nt-group-${group.key}`}>
              <h2 id={`nt-group-${group.key}`} className="nt-group__title">
                {group.label}
              </h2>
              <ul className="nt-list">
                {group.items.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    timeZone={timeZone}
                  />
                ))}
              </ul>
            </section>
          ))}
      </div>
    </div>
  );
}