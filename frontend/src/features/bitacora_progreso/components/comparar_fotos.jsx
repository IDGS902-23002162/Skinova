import { useMemo, useState } from 'react';
import '../../../shared/styles/progress_registry_style.css';

const EMPTY = [];

const ICONS = {
  prev: 'M15 6l-6 6 6 6',
  next: 'M9 6l6 6-6 6',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
};

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

/* Si el backend envía la fecha UTC sin zona ("2026-10-19T12:00:00"), se interpreta como UTC */
const parseDate = (value) => {
  if (value instanceof Date) return value;
  const str = String(value);
  return new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(str) ? str : `${str}Z`);
};

const formatDate = (value) =>
  new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(parseDate(value));

function PhotoPanel({
  photo,
  position,
  total,
  confirming,
  onPrev,
  onNext,
  onAskDelete,
  onConfirmDelete,
  onCancelDelete,
}) {
  if (!photo) {
    return (
      <section className="cmp-card cmp-card--empty" aria-label="Foto sin seleccionar">
        <h2 className="cmp-date">Sin fotos</h2>
        <div className="cmp-frame cmp-frame--empty">
          <p>Aún no hay fotos para comparar. Registra tu progreso y vuelve aquí.</p>
        </div>
      </section>
    );
  }

  const date = formatDate(photo.created_at);

  return (
    <section className="cmp-card" aria-label={`Foto del ${date}`}>
      <h2 className="cmp-date">{date}</h2>
      <p className="cmp-count" aria-live="polite">
        Foto {position} de {total}
      </p>

      <div className="cmp-frame">
        <img src={photo.url} alt={`Fotografía de tu piel tomada el ${date}`} />
      </div>

      {confirming ? (
        <div className="cmp-confirm" role="alertdialog" aria-label="Confirmar borrado">
          <p>¿Borrar esta foto? No podrás recuperarla.</p>
          <div className="cmp-confirm__actions">
            <button type="button" className="cmp-btn cmp-btn--danger" onClick={onConfirmDelete}>
              Borrar foto
            </button>
            <button type="button" className="cmp-btn cmp-btn--secondary" onClick={onCancelDelete}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="cmp-actions">
          <button
            type="button"
            className="cmp-btn cmp-btn--secondary"
            onClick={onPrev}
            disabled={position <= 1}
            aria-label={`Atrás, foto anterior a la del ${date}`}
          >
            <Icon d={ICONS.prev} />
            Atrás
          </button>
          <button type="button" className="cmp-btn cmp-btn--danger-outline" onClick={onAskDelete}>
            <Icon d={ICONS.trash} />
            Borrar
          </button>
          <button
            type="button"
            className="cmp-btn cmp-btn--secondary"
            onClick={onNext}
            disabled={position >= total}
            aria-label={`Siguiente, foto posterior a la del ${date}`}
          >
            Siguiente
            <Icon d={ICONS.next} />
          </button>
        </div>
      )}
    </section>
  );
}

/**
 * photos: [{ id, url, created_at }]  (ProgressPhoto + url resuelta desde storage_key)
 * onDelete: (photo) => void  — aquí debe ir la llamada al backend
 */
export default function CompararFotos({ photos = EMPTY, onDelete }) {
  const [deletedIds, setDeletedIds] = useState([]);
  const [indexA, setIndexA] = useState(0);
  const [indexB, setIndexB] = useState(Number.MAX_SAFE_INTEGER);
  const [confirming, setConfirming] = useState(null); // 'a' | 'b' | null

  /* Orden cronológico: atrás = más antigua, siguiente = más reciente */
  const list = useMemo(
    () =>
      [...photos]
        .filter((p) => !deletedIds.includes(p.id))
        .sort((x, y) => parseDate(x.created_at) - parseDate(y.created_at)),
    [photos, deletedIds]
  );

  const last = list.length - 1;
  const clamp = (i) => Math.max(0, Math.min(i, last));
  const posA = clamp(indexA);
  const posB = clamp(indexB);

  const deletePhoto = (photo) => {
    setDeletedIds((ids) => [...ids, photo.id]);
    setConfirming(null);
    onDelete?.(photo);
  };

  const panelProps = (key, pos, setIndex) => ({
    photo: list[pos],
    position: pos + 1,
    total: list.length,
    confirming: confirming === key,
    onPrev: () => setIndex(Math.max(0, pos - 1)),
    onNext: () => setIndex(Math.min(last, pos + 1)),
    onAskDelete: () => setConfirming(key),
    onConfirmDelete: () => deletePhoto(list[pos]),
    onCancelDelete: () => setConfirming(null),
  });

  return (
    <div className="cmp-page">
      <div className="cmp-container">
        <header className="cmp-head">
          <h2 className="cmp-title">Compara tu piel</h2>
          <p className="cmp-lead">
            Elige dos fechas y observa con calma cómo ha cambiado tu piel.
          </p>
        </header>

        <div className="cmp-grid">
          <PhotoPanel {...panelProps('a', posA, setIndexA)} />
          <PhotoPanel {...panelProps('b', posB, setIndexB)} />
        </div>
      </div>
    </div>
  );
}