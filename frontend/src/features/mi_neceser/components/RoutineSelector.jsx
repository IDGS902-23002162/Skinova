import "./RoutineSelector.css";

export default function RoutineSelector({ value, onChange, onSelectAll, isAllSelected }) {
  return (
    <div className="skinova-module-segments routine-selector" role="group" aria-label="Filtrar por rutina">
      <button type="button" aria-pressed={isAllSelected} onClick={onSelectAll}>Todas</button>
      <button type="button" aria-pressed={!isAllSelected && value === "morning"} onClick={() => onChange("morning")}>
        Mañana
      </button>
      <button type="button" aria-pressed={!isAllSelected && value === "evening"} onClick={() => onChange("evening")}>
        Noche
      </button>
    </div>
  );
}
