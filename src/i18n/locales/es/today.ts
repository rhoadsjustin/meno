import type { Catalog } from '@/i18n/catalog';
import type en from '@/i18n/locales/en/today';

export default {
  streak_one: 'Racha de {{count}} día',
  streak_other: 'Racha de {{count}} días',
  streakSecured_one: 'Racha de {{count}} día, asegurada hoy',
  streakSecured_other: 'Racha de {{count}} días, asegurada hoy',
  focusLabel: 'En tus widgets',
  nowOnWidgets: '{{title}} ya está en tus widgets.',

  empty: {
    titleFirst: 'Aún no has memorizado nada',
    titleAgain: '¿Quieres empezar otro pasaje?',
    bodyFirstSwipe:
      'Empieza con un versículo que quizá ya conoces a medias. Desliza para elegir uno y pruébalo ahora: toma un par de minutos.',
    bodyFirstChoose:
      'Empieza con un versículo que quizá ya conoces a medias. Elige uno y pruébalo ahora: toma un par de minutos.',
    bodyAgainSwipe:
      'No tienes nada en curso. Desliza para elegir un versículo y empezarlo ahora, o elige tu propio pasaje.',
    bodyAgainChoose:
      'No tienes nada en curso. Elige un versículo y empiézalo ahora, o elige tu propio pasaje.',
    startFailed: 'No se pudo empezar ese versículo. Inténtalo de nuevo o elige tu propio pasaje.',
    chooseOwn: 'Elegir mi propio pasaje',
  },

  hero: {
    chunkPlace: 'Fragmento {{index}} de {{total}}',
    placeAndDetail: '{{place}} · {{detail}}',
    spokenWithPlace: '{{spoken}} {{place}}.',
    passageFirstLetters: 'Pasaje actual, {{ref}}, mostrado con las primeras letras',
    passageFull: 'Pasaje actual, {{ref}}. {{text}}',
    attribution: '{{ref}} · {{translation}}',
    sealSpoken:
      'Opcional. ¿Todavía recuerdas {{ref}}? Una recitación sin errores lo deja memorizado.',
    sealOffer: '¿Todavía recuerdas {{ref}}? Una recitación lo sella; hoy es opcional.',
    recite: 'Recitar {{ref}}',
    memorizedTitle: '{{title}}: memorizado',
    memorizedBody: 'Cada fragmento está guardado en tu corazón. ¿Empiezas otro pasaje?',
    chooseAnother: 'Elegir otro pasaje',
  },

  stitch: {
    title: 'Únelo todo',
    body: 'Recita todo lo que has aprendido hasta ahora como un solo pasaje.',
    begin: 'Empezar a unir',
  },

  due: {
    title: 'Para repasar',
    body_one: '{{count}} versículo está listo para mantenerlo fresco.',
    body_other: '{{count}} versículos están listos para mantenerlos frescos.',
    action: 'Repasar {{count}}',
  },

  others: {
    header: 'También practicando',
    chunkAndDetail: '{{ref}} · {{detail}}',
    allMemorized: 'Todos los fragmentos memorizados',
    stitch: 'Unir',
    stitchSpoken: 'Unir {{title}}',
    stepSpoken: '{{title}}. {{spoken}}',
    sealSpoken: 'Opcional. Sella {{ref}} con una recitación sin errores.',
    seal: 'Sellar {{ref}}',
    showOnWidgetsSpoken: 'Mostrar {{title}} en tus widgets',
    showOnWidgets: 'Mostrar en widgets',
  },

  continueReading: 'Seguir leyendo {{range}}',
  practiceAnother: '+ Practicar otro pasaje',

  ladder: {
    title: 'Cómo va',
    withStreak_one: '{{progress}} · racha de {{count}} día',
    withStreak_other: '{{progress}} · racha de {{count}} días',
    withStreakSecured_one: '{{progress}} · racha de {{count}} día, asegurada hoy',
    withStreakSecured_other: '{{progress}} · racha de {{count}} días, asegurada hoy',
  },
} satisfies Catalog<typeof en>;
