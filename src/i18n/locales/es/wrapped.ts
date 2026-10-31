import type { Catalog } from '@/i18n/catalog';
import type en from '@/i18n/locales/en/wrapped';

/** BORRADOR: nombres y frases de los perfiles pendientes de revisión (docs/10 D5). */
export default {
  title: 'Mi año en la Palabra',
  cover: 'Tu {{year}} en la Palabra',
  span: {
    year: 'En {{year}}',
    firstSeason: 'Desde que empezaste en {{month}}',
  },
  cards: {
    words: {
      heading: 'Palabras guardadas en tu corazón',
      words_one: '{{count}} palabra',
      words_other: '{{count}} palabras',
      verses_one: 'en {{count}} versículo',
      verses_other: 'en {{count}} versículos',
      versesOnly_one: '{{count}} versículo',
      versesOnly_other: '{{count}} versículos',
      echo: 'En mi corazón he guardado tus dichos. — Salmo 119:11',
    },
    passage: {
      heading: 'Tu pasaje del año',
      minutes_one: '{{count}} minuto con él',
      minutes_other: '{{count}} minutos con él',
    },
    days: {
      heading: 'Días con la Palabra',
      days_one: '{{count}} día',
      days_other: '{{count}} días',
      longest_one: 'Racha más larga: {{count}} día',
      longest_other: 'Racha más larga: {{count}} días',
      grace_one: 'La gracia cubrió {{count}} día perdido',
      grace_other: 'La gracia cubrió {{count}} días perdidos',
    },
    minutes: {
      heading: 'Tiempo con las Escrituras',
      minutes_one: '{{count}} minuto',
      minutes_other: '{{count}} minutos',
    },
    spoken: {
      heading: 'Recitado de memoria',
      times_one: 'En voz alta {{count}} vez',
      times_other: 'En voz alta {{count}} veces',
    },
    unlocks: {
      heading: 'Las Escrituras abrieron tu teléfono',
      times_one: '{{count}} vez',
      times_other: '{{count}} veces',
    },
    persona: {
      heading: 'Tu ritmo',
    },
    badges: {
      heading: 'Medallas obtenidas',
    },
    summary: {
      heading: 'Mi {{year}} en la Palabra',
      invite: 'Empieza {{next}} conmigo',
    },
  },
  persona: {
    morningWatch: {
      name: 'La vigilia de la mañana',
      line: 'Te encontraste con la Palabra antes de que empezara el día.',
    },
    nightMeditator: {
      name: 'Meditación nocturna',
      line: 'Guardaste la Palabra en las horas de silencio.',
    },
    middayPause: {
      name: 'La pausa del mediodía',
      line: 'Hiciste espacio para la Palabra en medio del día.',
    },
    voiceInTheRoom: {
      name: 'Una voz que proclama',
      line: 'Dijiste la Palabra en voz alta, una y otra vez.',
    },
    faithfulKeeper: {
      name: 'Fiel en lo poco',
      line: 'Día tras día, volviste.',
    },
    steadyWalker: {
      name: 'Paso firme',
      line: 'Siempre que pudiste, volviste a la Palabra.',
    },
  },
  notYet: 'Tu año en la Palabra se abre cuando hayas practicado 3 días.',
  todayCard: 'Tu {{year}} en la Palabra está listo',
  notification: {
    title: 'Tu {{year}} en la Palabra',
    body: 'Un vistazo a las Escrituras que llevaste contigo este año.',
  },
  share: {
    action: 'Compartir',
    footer: 'meno-scripture.org',
  },
} satisfies Catalog<typeof en>;
