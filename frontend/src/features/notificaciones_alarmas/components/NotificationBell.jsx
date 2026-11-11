import { useNavigate } from 'react-router-dom';
import NotificationIcon from './NotificationIcon';
import { useNotifications } from '../context/NotificationsContext';
import "../../../shared/styles/notification_style.css";

export default function NotificationBell({ to = '/notificaciones' }) {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();

  const label =
    unreadCount > 0 ? `Notificaciones, ${unreadCount} sin leer` : 'Notificaciones';

  return (
    <button type="button" className="nt-bell" aria-label={label} onClick={() => navigate(to)}>
      <NotificationIcon name="bell" size={22} />
      {unreadCount > 0 && (
        <span className="nt-bell__badge" aria-hidden="true">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}