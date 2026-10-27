import type { Catalog } from '@/i18n/catalog';
import type en from '@/i18n/locales/en/notifications';

export default {
  plan: {
    practiceTitle: 'Hora de practicar',
    practiceBody: 'Tu versículo te espera. Bastan unos minutos.',
    streakTitle_one: 'Racha de {{count}} día',
    streakTitle_other: 'Racha de {{count}} días',
    streakBodyDue_one: 'Un repaso rápido la mantiene: {{count}} versículo está listo.',
    streakBodyDue_other: 'Un repaso rápido la mantiene: {{count}} versículos están listos.',
    streakBody: 'Un minuto de práctica la mantiene.',
    popQuizTitle: 'Prueba sorpresa',
    popQuizBody: 'Un versículo que guardaste está listo para brillar. ¿30 segundos?',
  },
  status: {
    titlePractice: 'Recordatorio diario',
    titlePopQuiz: 'Pruebas sorpresa',
    titleStreak: 'Recordatorio de racha',
    dayToday: 'hoy',
    dayTomorrow: 'mañana',
    dayOn: 'el {{weekday}}',
    waitingNothingMemorized:
      'Empiezan cuando memorices un versículo. Todavía no hay nada sobre qué preguntarte.',
    waitingNoStreak:
      'Aún no tienes racha. Practica hoy para empezar una, y el recordatorio diario la mencionará.',
    waitingNothingToPracticeStreak:
      'No hay nada en curso, así que no hay recordatorio que lleve tu racha. Empieza un pasaje y vuelve.',
    waitingNothingToPractice:
      'No hay ningún pasaje en curso, así que no hay nada que recordarte. Empieza uno y comenzará.',
    waitingNotScheduled:
      'No hay nada programado ahora. Abre Meno de nuevo y programará el siguiente.',
    off: 'Desactivado. Los recordatorios están desactivados en Meno.',
    blockedCanAsk:
      'Aún no pueden llegar. Tu iPhone todavía no ha preguntado si permites las notificaciones de Meno.',
    blocked: 'No pueden llegar. Las notificaciones de Meno están desactivadas en Ajustes del iPhone.',
    nextQuiz: 'Próxima prueba {{day}}, a una hora sorpresa (entre {{from}} y {{to}}).',
    streakSafe_one:
      'Tu racha de {{count}} día está a salvo por hoy. El próximo recordatorio ({{day}}, {{time}}) la mencionará.',
    streakSafe_other:
      'Tu racha de {{count}} días está a salvo por hoy. El próximo recordatorio ({{day}}, {{time}}) la mencionará.',
    streakNext_one:
      'Tu racha de {{count}} día aparece en el próximo recordatorio ({{day}}, {{time}}).',
    streakNext_other:
      'Tu racha de {{count}} días aparece en el próximo recordatorio ({{day}}, {{time}}).',
    nextReminder: 'Próximo recordatorio: {{day}} ({{time}}).',
    allBlockedTitle: 'Ninguno de estos puede llegar aún',
    allBlockedCanAsk:
      'El recordatorio diario, las pruebas sorpresa y el recordatorio de racha están activados en Meno, pero tu iPhone todavía no ha preguntado si permites las notificaciones de Meno.',
    allBlocked:
      'El recordatorio diario, las pruebas sorpresa y el recordatorio de racha están activados en Meno, pero las notificaciones de Meno están desactivadas en Ajustes del iPhone.',
    summaryOff: 'Desactivado',
    summaryNeedsPermission: 'Necesita tu permiso',
    summaryNeedsSettings: 'Necesita permiso en Ajustes del iPhone',
    summaryNothing: 'Activado, nada que enviar aún',
    summaryNextAt: 'Activado, próximo: {{day}}, {{time}}',
    summaryNext: 'Activado, próximo: {{day}}',
    lineLabel: '{{title}}. {{detail}}',
  },
  prompt: {
    titleBlocked: 'Los recordatorios aún no te llegan',
    titleOff: '¿Un recordatorio para volver?',
    bodyViaSettings:
      'Están activados en Meno, pero las notificaciones de Meno están desactivadas en este iPhone. Activa Permitir notificaciones y empezarán solas.',
    bodyBlocked: 'Están activados en Meno, pero tu iPhone todavía no ha preguntado si los permites.',
    bodyOff:
      'Los recordatorios están desactivados, así que Meno no te avisará para practicar. Actívalos para recibir uno al día, a la hora que elijas.',
    openSettings: 'Abrir Ajustes del iPhone',
    allow: 'Permitir notificaciones',
    turnOn: 'Activar recordatorios',
    dismissHint: 'Lo oculta para siempre. Los recordatorios siguen en Ajustes.',
  },
} satisfies Catalog<typeof en>;
