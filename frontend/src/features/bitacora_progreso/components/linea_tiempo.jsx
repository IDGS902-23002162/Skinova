import { useMemo, useState } from 'react';
import RegistroBitacora from './registro';
import '../../../shared/styles/progress_registry_style.css';

const EMPTY = [];

/* created_at sin zona horaria (UTC del backend) se interpreta como UTC */
const parseDateTime = (value) => {
  if (value instanceof Date) return value;
  const str = String(value);
  return new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(str) ? str : `${str}Z`);
};

const longDate = new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' });

const PERCEPTION_LABELS = {
  better: 'Piel mejor',
  same: 'Piel igual',
  worse: 'Piel peor',
  irritated: 'Piel irritada',
  dry: 'Piel seca',
  oily: 'Piel grasa',
};

/* Resumen breve de un registro, para usar cuando el detalle se muestra aparte */
function ResumenRegistro({ entry, date }) {
  const photos = entry.photos ?? [];
  const perception = PERCEPTION_LABELS[entry.perception];

  return (
    <div className="lt-summary">
      {photos[0] && (
        <img className="lt-summary__thumb" src={photos[0].url} alt="" loading="lazy" />
      )}
      <div>
        <p className="lt-summary__date">{date}</p>
        {perception && <p className="lt-summary__text">{perception}</p>}
        {photos.length > 0 && (
          <p className="lt-summary__text">
            {photos.length === 1 ? '1 foto' : `${photos.length} fotos`}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * entries: [{ id, perception, notes, created_at, photos, routine_name?, habit_log? }]
 * order: 'desc' (más recientes primero, por defecto) | 'asc'
 * compact: true muestra un resumen por elemento en vez del RegistroBitacora completo
 * selectedId / onSelect: opcionales para controlar la selección desde fuera.
 *   onSelect recibe el registro seleccionado, o null si se deselecciona.
 */
export default function LineaTiempo({
  entries = EMPTY,
  order = 'desc',
  compact = false,
  selectedId,
  onSelect,
}) {
  const [internalId, setInternalId] = useState(null);
  const selected = selectedId !== undefined ? selectedId : internalId;

  const sorted = useMemo(() => {
    const dir = order === 'asc' ? 1 : -1;
    return [...entries].sort(
      (a, b) => (parseDateTime(a.created_at) - parseDateTime(b.created_at)) * dir
    );
  }, [entries, order]);

  const handleSelect = (entry) => {
    const next = selected === entry.id ? null : entry.id;
    if (selectedId === undefined) setInternalId(next);
    onSelect?.(next ? entry : null);
  };

  if (sorted.length === 0) {
    return (
      <section className="lt lt--empty" aria-label="Línea de tiempo">
        <p>Aún no tienes registros. Cuando guardes el primero, aparecerá aquí.</p>
      </section>
    );
  }

  return (
    <section className={compact ? 'lt lt--compact' : 'lt'} aria-label="Línea de tiempo">
      <ol className="lt-list">
        {sorted.map((entry) => {
          const isSelected = selected === entry.id;
          const date = longDate.format(parseDateTime(entry.created_at));

          return (
            <li key={entry.id} className="lt-item" data-selected={isSelected}>
              <button
                type="button"
                className="lt-node"
                aria-pressed={isSelected}
                aria-label={`Seleccionar registro del ${date}`}
                onClick={() => handleSelect(entry)}
              >
                <span className="lt-node__dot">
                  {isSelected && (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  )}
                </span>
              </button>

              {/* El botón del nodo es el control accesible; clicar la tarjeta hace lo mismo con el ratón */}
              <div className="lt-card" role="presentation" onClick={() => handleSelect(entry)}>
                {compact ? (
                  <ResumenRegistro entry={entry} date={date} />
                ) : (
                  <RegistroBitacora
                    entry={entry}
                    routineName={entry.routine_name}
                    habitLog={entry.habit_log}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}