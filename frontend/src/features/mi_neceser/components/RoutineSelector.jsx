import "./RoutineSelector.css";

export default function RoutineSelector({
  value,
  onChange,
  onSelectAll,
  isAllSelected,
}) {
  const isNight = value === "evening";

  return (
    <div className="routine-selector">
      <button
        className={`routine-selector-all${isAllSelected ? " is-active" : ""}`}
        type="button"
        aria-pressed={isAllSelected}
        onClick={onSelectAll}
      >
        Todas
      </button>

      <div className="routine-selector-toggle">
        <span className={!isNight ? "is-current" : ""}>Mañana</span>
        <button
          className="routine-selector-switch"
          type="button"
          role="switch"
          aria-checked={isNight}
          aria-label="Cambiar rutina entre mañana y noche"
          onClick={() => onChange(isNight ? "morning" : "evening")}
        >
          <span className="routine-selector-thumb" />
        </button>
        <span className={isNight ? "is-current" : ""}>Noche</span>
      </div>
    </div>
  );
}
