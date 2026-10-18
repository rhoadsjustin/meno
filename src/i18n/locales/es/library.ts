import type { Catalog } from '@/i18n/catalog';
import type en from '@/i18n/locales/en/library';

export default {
  inProgress: 'En curso',
  memorized: 'Memorizados',
  nowOnWidgets: '{{title}} ya está en tus widgets.',

  goal: {
    summary_one: '{{translation}} · {{done}} de {{count}} fragmento memorizado',
    summary_other: '{{translation}} · {{done}} de {{count}} fragmentos memorizados',
    heatmap:
      'Progreso de los fragmentos de {{title}}: {{memorized}} memorizados, {{learning}} en curso, {{locked}} sin empezar',
    practice: 'Practicar',
    share: 'Compartir reto',
    shareSpoken: 'Compartir {{title}} como reto',
    onWidgets: 'En tus widgets',
    showOnWidgets: 'Mostrar en widgets',
    showOnWidgetsSpoken: 'Mostrar {{title}} en tus widgets',
  },

  emptyInProgressTitle: 'Aún no hay pasajes',
  emptyInProgressBody: 'Aquí aparecerán los pasajes que estás aprendiendo.',
  practiceAnother: '+ Practicar otro pasaje',
  choosePassage: 'Elegir un pasaje',

  emptyMemorizedTitle: 'Aún no has memorizado nada',
  emptyMemorizedBody:
    'Aquí aparecen los fragmentos que ya guardaste por completo en tu corazón, con su estado.',
  memorizedDetail: '{{translation}} · {{health}}',
  health: {
    fresh: 'fresco',
    fading: 'desvaneciéndose',
    atRisk: 'en riesgo',
  },
} satisfies Catalog<typeof en>;
