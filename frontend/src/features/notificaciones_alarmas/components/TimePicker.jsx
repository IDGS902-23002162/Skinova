import "../../../shared/styles/notification_style.css";
export default function TimePicker({ id, label, value, onChange, disabled = false }) {
  return (
    <div className="nt-field">
      <label className="nt-field__label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="time"
        className="nt-input"
        value={value ?? ''}
        disabled={disabled}
        onChange={(event) => {
          if (event.target.value) onChange(event.target.value);
        }}
      />
    </div>
  );
}