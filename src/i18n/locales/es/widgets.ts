import type { Catalog } from '@/i18n/catalog';
import type en from '@/i18n/locales/en/widgets';

export default {
  streakUnit_one: 'día',
  streakUnit_other: 'días',
  streakCaption_one: 'día de racha',
  streakCaption_other: 'días de racha',
  dueBadge_one: '{{count}} pendiente',
  dueBadge_other: '{{count}} pendientes',
  memorizedNote: 'Este ya lo sabes.',
  fromMemoryNote: 'De memoria.',
  emptyPrompt: 'Elige un pasaje para empezar.',
  dueList: 'Pendientes: {{refs}}',
  nothingDue: 'Nada pendiente. ¡Bien hecho!',
} satisfies Catalog<typeof en>;
