// Las 10 categorías. `id` debe coincidir con Notification.type en el backend.
export const CATEGORY_GROUPS = [
  { id: 'all', label: 'Todas' },
  { id: 'routine', label: 'Rutina' },
  { id: 'habits', label: 'Hábitos' },
  { id: 'progress', label: 'Progreso' },
  { id: 'notices', label: 'Avisos' },
];

export const WEEKDAYS = [
  { value: 1, short: 'L', label: 'Lunes' },
  { value: 2, short: 'M', label: 'Martes' },
  { value: 3, short: 'X', label: 'Miércoles' },
  { value: 4, short: 'J', label: 'Jueves' },
  { value: 5, short: 'V', label: 'Viernes' },
  { value: 6, short: 'S', label: 'Sábado' },
  { value: 7, short: 'D', label: 'Domingo' },
];

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

export const NOTIFICATION_CATEGORIES = [
  {
    id: 'routine_morning',
    group: 'routine',
    icon: 'sun',
    label: 'Rutina de la mañana',
    description: 'Un recordatorio suave para comenzar tu cuidado del día.',
    hasTime: true,
    defaultTime: '08:00',
  },
  {
    id: 'routine_night',
    group: 'routine',
    icon: 'moon',
    label: 'Rutina de la noche',
    description: 'Para cerrar el día con tu rutina de limpieza y reparación.',
    hasTime: true,
    defaultTime: '21:30',
  },
  {
    id: 'sun_protection',
    group: 'routine',
    icon: 'shield',
    label: 'Protector solar',
    description: 'Recuerda aplicar y reaplicar tu protección durante el día.',
    hasTime: true,
    defaultTime: '10:00',
  },
  {
    id: 'water',
    group: 'habits',
    icon: 'droplet',
    label: 'Hidratación',
    description: 'Observa cuánta agua has registrado hoy.',
    hasTime: true,
    defaultTime: '16:00',
  },
  {
    id: 'sleep',
    group: 'habits',
    icon: 'bed',
    label: 'Sueño',
    description: 'Registra cómo dormiste para entender cómo responde tu piel.',
    hasTime: true,
    defaultTime: '09:00',
  },
  {
    id: 'progress_photo',
    group: 'progress',
    icon: 'camera',
    label: 'Foto de progreso',
    description: 'Un momento para registrar la evolución de tu piel con luz natural.',
    hasTime: true,
    hasDays: true,
    defaultTime: '19:00',
    defaultDays: [7],
  },
  {
    id: 'weekly_summary',
    group: 'progress',
    icon: 'chart',
    label: 'Resumen semanal',
    description: 'Conoce cómo fue tu semana: rutinas, hábitos y cambios.',
    hasTime: true,
    hasDays: true,
    defaultTime: '18:00',
    defaultDays: [7],
  },
  {
    id: 'product_expiry',
    group: 'notices',
    icon: 'flask',
    label: 'Caducidad de productos',
    description: 'Te avisamos cuando un producto esté por vencer.',
  },
  {
    id: 'sensitivity_alert',
    group: 'notices',
    icon: 'alert',
    label: 'Alertas de sensibilidad',
    description: 'Observaciones cuando tu piel muestre señales de sensibilidad.',
    tone: 'alert',
  },
  {
    id: 'tips',
    group: 'notices',
    icon: 'leaf',
    label: 'Consejos y novedades',
    description: 'Ideas breves para ajustar tu cuidado, sin saturarte.',
  },
];

export const CATEGORY_BY_ID = Object.fromEntries(
  NOTIFICATION_CATEGORIES.map((category) => [category.id, category]),
);

export function buildDefaultSettings() {
  return {
    categories: Object.fromEntries(
      NOTIFICATION_CATEGORIES.map((c) => [
        c.id,
        {
          enabled: true,
          time: c.hasTime ? c.defaultTime ?? '09:00' : null,
          days: c.hasDays ? c.defaultDays ?? ALL_DAYS : null,
        },
      ]),
    ),
    quietHours: { enabled: false, start: '22:00', end: '07:00' },
    timezone: null, // null = usar la zona detectada
  };
}

// Completa con valores por defecto lo que el servidor no haya guardado aún.
export function mergeSettings(data = {}) {
  const defaults = buildDefaultSettings();
  const categories = {};
  Object.keys(defaults.categories).forEach((id) => {
    categories[id] = { ...defaults.categories[id], ...data.categories?.[id] };
  });
  return {
    categories,
    quietHours: { ...defaults.quietHours, ...data.quietHours },
    timezone: data.timezone ?? null,
  };
}