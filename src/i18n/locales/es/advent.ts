/** El plan de Adviento (docs/11 §3): la tarjeta de Hoy y los avisos de los domingos. */
export default {
  kicker: 'Adviento',
  title: 'Memoriza la historia de la Navidad antes de Navidad',
  body: '{{passage}}, unos versículos cada semana de Adviento.',
  start: 'Empezar {{passage}}',
  startShort: 'O uno más corto: {{passage}}',
  dismiss: 'Este año no',
  dismissed: 'Plan de Adviento oculto',
  dismissedSpoken: 'Plan de Adviento oculto. Puedes deshacerlo.',
  undo: 'Deshacer',
  restored: 'Plan de Adviento restaurado',
  goalTitle: 'Adviento: {{passage}}',
  progress: {
    before: 'El Adviento empieza el domingo',
    week: 'Adviento, semana {{week}} de 4',
    christmas: 'Día de Navidad',
    thisWeek: 'Esta semana: {{passage}}',
    byChristmas: '{{passage}} antes de Navidad',
    fromMemory: 'Di {{passage}} de memoria',
    hint: 'Abre tu pasaje de Adviento',
  },
  notification: {
    inviteTitle: 'Hoy empieza el Adviento',
    inviteBody: 'Memoriza la historia de la Navidad, {{passage}}, antes de Navidad.',
    weekTitle: 'Adviento, semana {{week}} de 4',
    weekBody: 'Esta semana: {{passage}}.',
  },
};
