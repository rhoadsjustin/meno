import type { Catalog } from '@/i18n/catalog';
import type en from '@/i18n/locales/en/stats';

export default {
  numeral: {
    streak_one: 'día de racha',
    streak_other: 'días de racha',
    accuracy: 'precisión en 30 días',
    memorized_one: 'versículo memorizado',
    memorized_other: 'versículos memorizados',
    spoken: '{{value}} {{label}}',
  },
  practice: 'Práctica',
  practiceDays: 'Días de práctica',
  practicedOn: 'Practicaste {{practiced}} de los últimos {{total}} días',
  lockSummary: 'Recitar para desbloquear: {{recitations}}, {{overrides}}.',
  recitationCount_one: '{{count}} recitación',
  recitationCount_other: '{{count}} recitaciones',
  overrideCount_one: '{{count}} omisión',
  overrideCount_other: '{{count}} omisiones',

  badgesTitle: 'Insignias',
  badgeSpoken: '{{name}}: {{status}}',
  earned: 'obtenida',
  badges: {
    first_verse: { name: 'Primer versículo', hint: 'Memoriza tu primer fragmento' },
    first_chapter: { name: 'Primer capítulo', hint: 'Memoriza un capítulo completo' },
    first_book: { name: 'Primer libro', hint: 'Memoriza un libro entero' },
    perfect_speak: { name: 'Palabra perfecta', hint: '100 % en una recitación en voz alta' },
    century_reviews: { name: 'Centenario', hint: 'Completa 100 repasos' },
    dawn_reciter: { name: 'Recitador del alba', hint: '10 desbloqueos recitando' },
    steady_30: { name: 'Constante 30', hint: 'Una racha de 30 días' },
    steady_100: { name: 'Constante 100', hint: 'Una racha de 100 días' },
    steady_365: { name: 'Constante 365', hint: 'Un año completo' },
    word_hoard_1k: { name: 'Tesoro de palabras I', hint: '1000 palabras memorizadas' },
    word_hoard_5k: { name: 'Tesoro de palabras II', hint: '5000 palabras memorizadas' },
    word_hoard_10k: { name: 'Tesoro de palabras III', hint: '10 000 palabras memorizadas' },
  },
} satisfies Catalog<typeof en>;
