const hoursAgo = (hours) => new Date(Date.now() - hours * 3_600_000).toISOString();

export const MOCK_NOTIFICATIONS = [
  {
    id: 'n1',
    type: 'routine_morning',
    title: 'Es hora de tu rutina de la mañana',
    message: 'Limpieza, hidratante y protector solar. Registra cómo te sientes al terminar.',
    action_path: '/rutina',
    read_at: null,
    created_at: hoursAgo(0.5),
  }
];