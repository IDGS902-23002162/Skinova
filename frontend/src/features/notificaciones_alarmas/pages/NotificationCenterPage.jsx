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
          <h1 className="nt-title">Notificaciones</h1>
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
          <p className="nt-state" role="status">
            Cargando tus notificaciones…
          </p>
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