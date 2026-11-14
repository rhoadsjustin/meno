import type { Catalog } from '@/i18n/catalog';
import type en from '@/i18n/locales/en/today';

export default {
  streak_one: 'Racha de {{count}} día',
  streak_other: 'Racha de {{count}} días',
  streakSecured_one: 'Racha de {{count}} día, asegurada hoy',
  streakSecured_other: 'Racha de {{count}} días, asegurada hoy',
  focusLabel: 'Tu enfoque',
  nowOnWidgets: '{{title}} es ahora tu enfoque. Tus widgets también lo muestran.',
  widgetsFailed: 'No se pudo hacer de {{title}} tu enfoque',
  loadFailed: {
    title: 'No se pudo cargar Hoy',
    body: 'Tus pasajes y tu progreso siguen en este dispositivo.',
  },

  empty: {
    titleFirst: 'Empieza con un versículo',
    titleAgain: '¿Quieres empezar otro pasaje?',
    bodyFirst:
      'Elige uno que quizá ya conoces a medias y pruébalo ahora: toma un par de minutos.',
    bodyAgain: 'No tienes nada en curso. Empieza un versículo ahora, o elige tu propio pasaje.',
    startFailed: 'No se pudo empezar ese versículo. Inténtalo de nuevo o elige tu propio pasaje.',
    startersFailed: 'No se pudieron cargar los versículos para empezar.',
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
  },

  due: {
    title: 'Para repasar',
    body_one: '{{count}} versículo está listo para mantenerlo fresco.',
    body_other: '{{count}} versículos están listos para mantenerlos frescos.',
    refs: '{{count}} para mantener frescos: {{refs}}',
    refsAndMore: '{{count}} para mantener frescos: {{refs}} y {{more}} más',
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
    showOnWidgetsSpoken: 'Hacer de {{title}} tu enfoque. Tus widgets y Recitar para desbloquear lo usarán.',
    showOnWidgets: 'Hacer mi enfoque',
  },

  continueReading: 'Seguir leyendo {{range}}',
  addPassage: 'Agregar pasaje',

  ladder: {
    title: 'Cómo va',
  },
} satisfies Catalog<typeof en>;
