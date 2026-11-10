import NotificationIcon from './NotificationIcon';
import "../../../shared/styles/notification_style.css";
export default function ToggleSwitch({ id, checked, onChange, label, disabled = false }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className="nt-switch"
      onClick={() => onChange(!checked)}
    >
      <span className="nt-switch__track">
        <span className="nt-switch__thumb">
          {/* La marca no depende solo del color para indicar "activado" */}
          {checked && <NotificationIcon name="check" size={14} strokeWidth={2.75} />}
        </span>
      </span>
    </button>
  );
}