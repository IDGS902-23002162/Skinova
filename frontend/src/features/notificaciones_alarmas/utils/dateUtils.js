export const detectTimezone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone;

// SQLAlchemy guarda UTC en una columna DateTime "naive": el isoformat() llega
// sin 'Z' y JS lo interpretaría como hora local. Aquí se fuerza UTC.
export function parseServerDate(value) {
  if (!value) return null;
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(value);
  return new Date(hasZone ? value : `${value}Z`);
}

const dayKey = (date, timeZone) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

export function formatTime(date, timeZone) {
  return new Intl.DateTimeFormat('es', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function getDayLabel(date, timeZone, now = new Date()) {
  const key = dayKey(date, timeZone);
  if (key === dayKey(now, timeZone)) return 'Hoy';
  if (key === dayKey(new Date(now.getTime() - 86_400_000), timeZone)) return 'Ayer';

  const sameYear = key.slice(0, 4) === dayKey(now, timeZone).slice(0, 4);
  const label = new Intl.DateTimeFormat('es', {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// Recibe la lista ya ordenada (más reciente primero).
export function groupByDay(items, timeZone) {
  const groups = new Map();
  items.forEach((item) => {
    const date = parseServerDate(item.created_at);
    const key = dayKey(date, timeZone);
    if (!groups.has(key)) {
      groups.set(key, { key, label: getDayLabel(date, timeZone), items: [] });
    }
    groups.get(key).items.push(item);
  });
  return [...groups.values()];
}