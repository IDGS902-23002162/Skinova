import { useEffect, useMemo, useRef, useState } from 'react';
import MainLayout from '../../../shared/components/MainLayout';
import CompararFotos from '../components/comparar_fotos';
import CrearRegistro from '../components/crear_registro';
import LineaTiempo from '../components/linea_tiempo';
import RegistroBitacora from '../components/registro';
import '../../../shared/styles/progress_registry_style.css';

const EMPTY = [];

const VIEWS = [
  { id: 'linea', label: 'Línea de tiempo', icon: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01' },
  { id: 'crear', label: 'Nuevo registro', icon: 'M12 5v14M5 12h14' },
  { id: 'comparar', label: 'Comparar fotos', icon: 'M4 5h7v14H4zM13 5h7v14h-7z' },
];

function Icon({ d, size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} />
    </svg>
  );
}

/**
 * entries:  [{ id, perception, notes, created_at, photos: [{ id, url, created_at }],
 *              routine_name?, habit_log? }]
 * routines: [{ id, name }]
 * TODO: cargar entries y routines desde la API y actualizar entries tras guardar o borrar.
 */
export default function ModuloBitacoraProgreso({
  entries = EMPTY,
  routines = EMPTY,
  onSave,
  onDeletePhoto,
}) {
  const [view, setView] = useState('linea');
  const [selectedId, setSelectedId] = useState(null);
  const detailRef = useRef(null);

  const selectedEntry = useMemo(
    () => entries.find((e) => e.id === selectedId) ?? null,
    [entries, selectedId]
  );

  /* Todas las fotos de todos los registros, para CompararFotos */
  const photos = useMemo(() => entries.flatMap((e) => e.photos ?? []), [entries]);

  /* En pantallas estrechas el detalle va sobre la lista: llévalo a la vista al seleccionar */
  useEffect(() => {
    if (!selectedId) return;
    if (!window.matchMedia('(max-width: 959px)').matches) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    detailRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const handleSelect = (entry) => setSelectedId(entry ? entry.id : null);

  return (
    <MainLayout>
      <div className="pb-page">
        <header className="pb-head">
          <h1 className="pb-title">Bitácora de progreso</h1>
          <p className="pb-lead">Observa, registra y compara cómo evoluciona tu piel.</p>
        </header>

        <nav className="pb-nav" aria-label="Secciones de la bitácora">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              className="pb-tab"
              aria-current={view === v.id ? 'page' : undefined}
              onClick={() => setView(v.id)}
            >
              <Icon d={v.icon} />
              {v.label}
            </button>
          ))}
        </nav>

        <main className="pb-main">
          <div key={view} className="pb-view">
            {view === 'crear' && <CrearRegistro routines={routines} onSave={onSave} />}

            {view === 'comparar' && <CompararFotos photos={photos} onDelete={onDeletePhoto} />}

            {view === 'linea' && (
              <div className="pb-split">
                <div className="pb-list">
                  <LineaTiempo
                    entries={entries}
                    compact
                    selectedId={selectedId}
                    onSelect={handleSelect}
                  />
                </div>

                <section
                  ref={detailRef}
                  className={selectedEntry ? 'pb-detail' : 'pb-detail pb-detail--empty'}
                  aria-label="Detalle del registro"
                >
                  {selectedEntry ? (
                    <RegistroBitacora
                      entry={selectedEntry}
                      routineName={selectedEntry.routine_name}
                      habitLog={selectedEntry.habit_log}
                    />
                  ) : (
                    <p>Selecciona un registro de la línea de tiempo para ver su detalle.</p>
                  )}
                </section>
              </div>
            )}
          </div>
        </main>
      </div>
    </MainLayout>
  );
}