import { useEffect, useMemo, useRef, useState } from 'react';
import MainLayout from '../../../shared/components/MainLayout';
import CompararFotos from '../components/comparar_fotos';
import CrearRegistro from '../components/crear_registro';
import LineaTiempo from '../components/linea_tiempo';
import RegistroBitacora from '../components/registro';
import { useBitacora } from '../hooks/useBitacora';
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
 * Modulo principal de Bitácora de Progreso y Hábitos.
 * Conectado con la API de backend para cargar entradas, fotos, rutinas y hábitos,
 * así como alertas automáticas (RF-NOT-07).
 */
export default function ModuloBitacoraProgreso({
  entries: propEntries,
  routines: propRoutines,
  onSave: propOnSave,
  onDeletePhoto: propOnDeletePhoto,
}) {
  const hook = useBitacora();

  const entries = propEntries !== undefined ? propEntries : hook.entries;
  const routines = propRoutines !== undefined ? propRoutines : hook.routines;
  const onSave = propOnSave || hook.saveRecord;
  const onDeletePhoto = propOnDeletePhoto || hook.deletePhoto;

  const [view, setView] = useState('linea');
  const [selectedId, setSelectedId] = useState(null);
  const detailRef = useRef(null);

  // Auto-seleccionar el primer registro si no hay uno seleccionado
  useEffect(() => {
    if (!selectedId && entries && entries.length > 0) {
      setSelectedId(entries[0].id);
    }
  }, [entries, selectedId]);

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
  }, [selectedId]);

  const handleSelect = (entry) => setSelectedId(entry ? entry.id : null);

  const handleSave = async (payload) => {
    try {
      const created = await onSave(payload);
      setView('linea');
      if (created?.id) {
        setSelectedId(created.id);
      }
    } catch (err) {
      console.error('Error al guardar en bitácora:', err);
      throw err;
    }
  };

  const handleDeleteEntry = async (id) => {
    if (!window.confirm('¿Deseas eliminar este registro de progreso?')) return;
    try {
      await hook.deleteEntry(id);
      if (selectedId === id) {
        setSelectedId(null);
      }
    } catch (err) {
      console.error('Error al eliminar registro:', err);
    }
  };

  return (
    <MainLayout>
      <div className="pb-page">
        <header className="pb-head">
          <h1 className="pb-title">Bitácora de progreso</h1>
          <p className="pb-lead">Observa, registra y compara cómo evoluciona tu piel.</p>
        </header>

        {hook.error && (
          <div className="pb-alert pb-alert--error" role="alert">
            <span>{hook.error}</span>
            <button type="button" onClick={hook.refresh} className="pb-alert__action">
              Reintentar
            </button>
          </div>
        )}

        {hook.activeReminder && (
          <div className="pb-reminder-banner" role="status">
            <div className="pb-reminder-banner__body">
              <span className="pb-reminder-banner__badge">Recordatorio</span>
              <h2 className="pb-reminder-banner__title">{hook.activeReminder.title}</h2>
              <p className="pb-reminder-banner__text">{hook.activeReminder.message}</p>
            </div>
            <div className="pb-reminder-banner__actions">
              <button
                type="button"
                className="pb-reminder-banner__btn"
                onClick={() => setView('crear')}
              >
                Tomar foto ahora
              </button>
              <button
                type="button"
                className="pb-reminder-banner__close"
                aria-label="Cerrar recordatorio"
                onClick={hook.dismissReminder}
              >
                ✕
              </button>
            </div>
          </div>
        )}

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
            {view === 'crear' && (
              <CrearRegistro
                routines={routines}
                onSave={handleSave}
                isSaving={hook.saving}
              />
            )}

            {view === 'comparar' && (
              <CompararFotos photos={photos} onDelete={onDeletePhoto} />
            )}

            {view === 'linea' && (
              <div className="pb-split">
                <div className="pb-list">
                  <LineaTiempo
                    entries={entries}
                    compact
                    selectedId={selectedId}
                    onSelect={handleSelect}
                    loading={hook.loading}
                  />
                </div>

                <section
                  ref={detailRef}
                  className={selectedEntry ? 'pb-detail' : 'pb-detail pb-detail--empty'}
                  aria-label="Detalle del registro"
                >
                  {selectedEntry ? (
                    <div>
                      <RegistroBitacora
                        entry={selectedEntry}
                        routineName={selectedEntry.routine_name}
                        habitLog={selectedEntry.habit_log}
                      />
                      <div className="pb-detail__footer">
                        <button
                          type="button"
                          className="pb-detail__del-btn"
                          onClick={() => handleDeleteEntry(selectedEntry.id)}
                          aria-label="Eliminar este registro"
                        >
                          <Icon d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" size={16} />
                          Eliminar este registro
                        </button>
                      </div>
                    </div>
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
