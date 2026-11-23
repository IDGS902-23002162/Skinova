import { useState } from 'react';
import MainLayout from '../../../shared/components/MainLayout';
import NotificationIcon from '../components/NotificationIcon';
import NotificationCenterPage from './NotificationCenterPage';
import NotificationSettingsPage from './NotificationSettingsPage';
import { NotificationsProvider } from '../context/NotificationsContext';
import '../../../shared/styles/notification_style.css';

const VIEWS = [
  { id: 'historial', label: 'Historial', icon: 'bell' },
  { id: 'ajustes', label: 'Ajustes', icon: 'sliders' },
];

export default function ModuloNotificaciones() {
  const [view, setView] = useState('historial');

  return (
    <NotificationsProvider>
      <MainLayout>
        <main className="nt-main">
          <nav className="nt-shell" aria-label="Secciones de notificaciones">
            <h1 className="nt-title">Centro de Notificaciones</h1>
            <div className="nt-switcher">
              {VIEWS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="nt-switcher__btn"
                  aria-pressed={view === item.id}
                  onClick={() => setView(item.id)}
                >
                  <NotificationIcon name={item.icon} size={18} />
                  {item.label}
                </button>
              ))}
            </div>
          </nav>

          {view === 'historial' ? <NotificationCenterPage /> : <NotificationSettingsPage />}
        </main>
      </MainLayout>
    </NotificationsProvider>
  );
}