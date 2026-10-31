import type { Catalog } from '@/i18n/catalog';
import type en from '@/i18n/locales/en/wrapped';

/** Nombres y frases de los perfiles aprobados el 2026-10-31 (docs/10 D5). */
export default {
  title: 'Mi año en la Palabra',
  cover: 'Tu {{year}} en la Palabra',
  coverHint: 'Toca para empezar',
  span: {
    year: 'En {{year}}',
    firstSeason: 'Desde que empezaste en {{month}}',
  },
  cards: {
    words: {
      heading: 'Palabras guardadas en tu corazón',
      words_one: 'palabra',
      words_other: 'palabras',
      verses_one: 'versículo',
      verses_other: 'versículos',
      across_one: 'en {{value}} versículo',
      across_other: 'en {{value}} versículos',
      echo: '“En mi corazón he guardado tus dichos.”',
      echoRef: 'Salmo 119:11',
    },
    passage: {
      heading: 'Tu pasaje del año',
      minutes_one: '{{value}} minuto con él',
      minutes_other: '{{value}} minutos con él',
    },
    days: {
      heading: 'Días con la Palabra',
      days_one: 'día',
      days_other: 'días',
      longest_one: 'Racha más larga: {{value}} día',
      longest_other: 'Racha más larga: {{value}} días',
      grace_one: 'La gracia cubrió {{value}} día perdido',
      grace_other: 'La gracia cubrió {{value}} días perdidos',
    },
    minutes: {
      heading: 'Tiempo con las Escrituras',
      minutes_one: 'minuto',
      minutes_other: 'minutos',
    },
    spoken: {
      heading: 'Recitado de memoria',
      times_one: 'vez en voz alta',
      times_other: 'veces en voz alta',
    },
    unlocks: {
      heading: 'Las Escrituras abrieron tu teléfono',
      times_one: 'vez',
      times_other: 'veces',
    },
    persona: {
      heading: 'Tu ritmo',
      also: 'También: {{names}}',
    },
    badges: {
      heading: 'Medallas obtenidas',
      count_one: 'medalla',
      count_other: 'medallas',
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
  screen: {
    close: 'Cerrar',
    share: 'Compartir',
    shareLabel: 'Compartir esta tarjeta como imagen',
    shareHeading: 'Comparte esta tarjeta',
    storyFormat: 'Para historias',
    postFormat: 'Para una publicación',
    position: 'Tarjeta {{index}} de {{total}}',
    next: 'Siguiente tarjeta',
    previous: 'Tarjeta anterior',
    shareFailed: 'No se pudo convertir esta tarjeta en imagen. Inténtalo de nuevo.',
    notYetTitle: 'Todavía no',
  },
  notYet: 'Tu año en la Palabra se abre cuando hayas practicado 3 días.',
  todayCard: 'Tu {{year}} en la Palabra está listo',
  todayCardHint: 'Un vistazo a las Escrituras que llevaste contigo',
  statsRow: '{{year}} en la Palabra',
  notification: {
    title: 'Tu {{year}} en la Palabra',
    body: 'Un vistazo a las Escrituras que llevaste contigo este año.',
  },
  share: {
    footer: 'meno-scripture.org',
    dialogTitle: 'Comparte tu año en la Palabra',
  },
} satisfies Catalog<typeof en>;
