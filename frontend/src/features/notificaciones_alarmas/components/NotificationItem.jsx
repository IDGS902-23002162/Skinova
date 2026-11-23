import { useNavigate } from 'react-router-dom';
import NotificationIcon from './NotificationIcon';
import { useNotifications } from '../context/NotificationsContext';
import { CATEGORY_BY_ID } from '../config/notificationCategories';
import { formatTime, parseServerDate } from '../utils/dateUtils';
import "../../../shared/styles/notification_style.css";

export default function NotificationItem({ notification, timeZone }) {
  const navigate = useNavigate();
  const { markAsRead } = useNotifications();

  const { id, type, title, message, action_path: actionPath, read_at: readAt, created_at } =
    notification;

  const category = CATEGORY_BY_ID[type];
  const isUnread = !readAt;
  const isAlert = category?.tone === 'alert';
  const date = parseServerDate(created_at);

  const handleClick = () => {
    if (isUnread) markAsRead(id);
    if (actionPath) navigate(actionPath);
  };

  const classes = [
    'nt-item',
    isUnread && 'nt-item--unread',
    isAlert && 'nt-item--alert',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <li>
      <button type="button" className={classes} onClick={handleClick}>
        <span className="nt-item__icon" aria-hidden="true">
          <NotificationIcon name={category?.icon ?? 'bell'} />
        </span>

        <span className="nt-item__body">
          <span className="nt-item__title">{title || category?.label || 'Notificación'}</span>
          {message && <span className="nt-item__message">{message}</span>}
        </span>

        <span className="nt-item__meta">
          {date && <time dateTime={date.toISOString()}>{formatTime(date, timeZone)}</time>}
          {isUnread && (
            <>
              <span className="nt-item__dot" aria-hidden="true" />
              <span className="nt-sr-only">No leída</span>
            </>
          )}
        </span>
      </button>
    </li>
  );
}