import type { Catalog } from '@/i18n/catalog';
import type en from '@/i18n/locales/en/library';

export default {
  inProgress: 'En curso',
  memorized: 'Memorizados',
  nowOnWidgets: '{{title}} ya está en tus widgets.',
  widgetsFailed: 'No se pudo poner {{title}} en tus widgets',
  loadFailed: {
    title: 'No se pudo cargar tu biblioteca',
    body: 'Tus pasajes siguen en este dispositivo.',
  },

  goal: {
    summary_one: '{{translation}} · {{done}} de {{count}} fragmento memorizado',
    summary_other: '{{translation}} · {{done}} de {{count}} fragmentos memorizados',
    heatmap:
      'Progreso de los fragmentos de {{title}}: {{memorized}} memorizados, {{learning}} en curso, {{locked}} sin empezar',
    share: 'Compartir reto',
    onWidgets: 'En tus widgets',
    showOnWidgets: 'Mostrar en widgets',
    moreSpoken: 'Más acciones para {{title}}',
  },

  emptyInProgressTitle: 'Aún no hay pasajes',
  emptyInProgressBody: 'Agrega un pasaje y aparecerá aquí mientras lo aprendes.',
  addPassage: 'Agregar pasaje',

  emptyMemorizedTitle: 'Aún no has memorizado nada',
  emptyMemorizedBody: 'Aquí aparecen los fragmentos que ya memorizaste, con su estado.',
  memorizedDetail: '{{translation}} · {{health}}',
  health: {
    fresh: 'fresco',
    fading: 'desvaneciéndose',
    atRisk: 'en riesgo',
  },

  remove: {
    tryAgain: 'Vuelve a intentarlo en un momento.',
    delete: {
      spoken: 'Eliminar {{title}}',
      title: '¿Eliminar {{title}}?',
      message:
        'Se borrará tu historial de práctica de este pasaje. Tu racha y tus insignias se mantienen.',
      confirm: 'Eliminar pasaje',
      done: 'Se eliminó {{title}}.',
      failed: 'No se pudo eliminar {{title}}',
    },
    stop: {
      spoken: 'Dejar {{title}}',
      title: '¿Dejar {{title}}?',
      message:
        'Los versículos memorizados se quedan en tu estante Memorizados y en tus repasos. Se borrará tu práctica del resto de este pasaje.',
      confirm: 'Dejar el pasaje',
      done: 'Dejaste {{title}}. Sus versículos memorizados están en tu estante Memorizados.',
      failed: 'No se pudo dejar {{title}}',
    },
  },
} satisfies Catalog<typeof en>;
