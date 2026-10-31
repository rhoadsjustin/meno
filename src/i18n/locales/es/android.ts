import type { Catalog } from '@/i18n/catalog';
import type en from '@/i18n/locales/en/android';

/** Redacción para Android; ver locales/en/android.ts. */
export default {
  today: {
    focusLabel: 'Pasaje actual',
    nowOnWidgets: '{{title}} ya es tu pasaje actual.',
    others: {
      showOnWidgetsSpoken: 'Hacer de {{title}} tu pasaje actual',
      showOnWidgets: 'Hacer actual',
    },
  },
  library: {
    nowOnWidgets: '{{title}} ya es tu pasaje actual.',
    goal: {
      onWidgets: 'Pasaje actual',
      showOnWidgets: 'Hacer actual',
      showOnWidgetsSpoken: 'Hacer de {{title}} tu pasaje actual',
    },
  },
  onboarding: {
    notificationsBlocked: {
      body: 'Tu teléfono no está permitiendo notificaciones de Meno, así que no te llegarán recordatorios ni pruebas sorpresa. Para recibirlos, abre Ajustes, toca Notificaciones y activa Todas las notificaciones de Meno.',
      openSettings: 'Abrir Ajustes',
    },
    lock: {
      title: 'Empieza con un versículo',
      body: 'Elige un pasaje y Meno te lleva de leerlo a recitarlo de memoria, con unos minutos al día. ¿No sabes por dónde empezar? Empieza con el versículo que casi todos aprenden primero.',
    },
  },
  settings: {
    guide: {
      body: 'Paso a paso: pruebas y recitar en voz alta, además de preguntas frecuentes.',
    },
    reminders: {
      focusNote:
        'No molestar, el modo Descanso o el Ahorro de batería aún pueden retenerlos. Meno no puede ver ninguno de ellos.',
      askNote: 'Tu teléfono te preguntará si Meno puede enviarte notificaciones. Toca Permitir.',
      blockedNote: 'Activa Todas las notificaciones de Meno y empezarán solas.',
      openSettings: 'Abrir Ajustes',
    },
  },
  notifications: {
    status: {
      blockedCanAsk:
        'Aún no pueden llegar. Tu teléfono todavía no ha preguntado si permites las notificaciones de Meno.',
      blocked:
        'No pueden llegar. Las notificaciones de Meno están desactivadas en los Ajustes de tu teléfono.',
      allBlockedCanAsk:
        'El recordatorio diario, las pruebas sorpresa y el recordatorio de racha están activados en Meno, pero tu teléfono todavía no ha preguntado si permites las notificaciones de Meno.',
      allBlocked:
        'El recordatorio diario, las pruebas sorpresa y el recordatorio de racha están activados en Meno, pero las notificaciones de Meno están desactivadas en los Ajustes de tu teléfono.',
      summaryNeedsSettings: 'Necesita permiso en Ajustes',
    },
    prompt: {
      bodyViaSettings:
        'Están activados en Meno, pero las notificaciones de Meno están desactivadas en este teléfono. Activa Todas las notificaciones de Meno y empezarán solas.',
      bodyBlocked:
        'Están activados en Meno, pero tu teléfono todavía no ha preguntado si los permites.',
      openSettings: 'Abrir Ajustes',
    },
  },
  help: {
    status: {
      openSettings: 'Necesita permiso en Ajustes',
    },
    actions: {
      openIphoneSettings: 'Abrir Ajustes',
    },
    steps: {
      tapOpenSettings: 'Toca Abrir Ajustes aquí abajo.',
    },
    quizzes: {
      blocked:
        'Los recordatorios están activados en Meno, pero tu teléfono no los deja pasar, así que todavía no puede llegarte nada.',
      allowNotifications: 'Activa Todas las notificaciones de Meno.',
      readyTip:
        'Cambia la hora o desactiva los recordatorios en Ajustes → Recordatorios. No molestar, el modo Descanso o el Ahorro de batería aún pueden retener notificaciones; Meno no puede ver ninguno de ellos.',
      offTip:
        'Los recordatorios están desactivados en Meno. Si tu teléfono pregunta si Meno puede enviarte notificaciones, toca Permitir.',
      askTip: 'Tu teléfono te preguntará si Meno puede enviarte notificaciones: toca Permitir.',
    },
    speak: {
      body: 'En las rondas de Recitar dices el versículo en voz alta y Meno lo revisa. Tu voz se procesa en este teléfono y nunca sale de él. Siempre puedes escribirlo en su lugar.',
      turnOn: 'Activa el Micrófono.',
      askTip: 'Tu teléfono te preguntará por el micrófono: toca Permitir.',
    },
    faq: {
      multiple: {
        a: 'Sí. Toca “+ Practicar otro pasaje” en Hoy (o en Biblioteca). Cada pasaje guarda su propio progreso, y Hoy los muestra todos, con tu pasaje actual hasta arriba.',
      },
      noReminders: {
        a: 'Abre Ajustes → Recordatorios. Cada tipo de recordatorio indica cuándo llega el próximo, o por qué todavía no llegará ninguno. El recordatorio diario llega a la hora que elegiste y se salta los días en que ya practicaste. Las pruebas sorpresa empiezan cuando ya memorizaste un versículo, y solo llegan entre las 9 a. m. y las 9 p. m. Si todo ahí se ve bien, revisa tu teléfono: No molestar o el modo Descanso retienen las notificaciones hasta que terminan, y el Ahorro de batería puede retrasarlas. Meno no puede ver ninguno de ellos.',
      },
      voice: {
        a: 'No. Cuando recitas un versículo, tu teléfono lo convierte en texto directamente en el dispositivo. El audio nunca se guarda ni se envía a ningún lado.',
      },
      deleteApp: {
        a: 'Meno no usa una cuenta (tus versículos y tu progreso viven en este teléfono), así que eliminar la app también los borra.',
      },
    },
  },
  lock: {
    setup: {
      unavailableTitle: 'Recitar para desbloquear aún no está en Android',
      unavailableBody:
        'Depende de Tiempo en pantalla de Apple, que Android no tiene. Todo lo demás en Meno funciona aquí como siempre.',
    },
  },
} as const satisfies Catalog<typeof en>;
