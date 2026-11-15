import type { Catalog } from '@/i18n/catalog';
import type en from '@/i18n/locales/en/widgets';

export default {
  streakCaption_one: 'día de racha',
  streakCaption_other: 'días de racha',
  dueBadge_one: '{{count}} pendiente',
  dueBadge_other: '{{count}} pendientes',
  memorizedNote: 'Este ya lo sabes.',
  fromMemoryNote: 'De memoria.',
  emptyPrompt: 'Elige un pasaje para empezar.',
  inlineEmpty: 'Elige un pasaje',
  dueList: 'Pendientes: {{refs}}',
  nothingDue: 'Nada pendiente. ¡Bien hecho!',
  streakLabelActive_one: 'Racha de {{count}} día, ya practicaste hoy',
  streakLabelActive_other: 'Racha de {{count}} días, ya practicaste hoy',
  streakLabelPending_one: 'Racha de {{count}} día, aún sin practicar hoy',
  streakLabelPending_other: 'Racha de {{count}} días, aún sin practicar hoy',
  streakLabelNone: 'Aún sin racha',
  weekLabel: 'Practicaste {{practiced}} de los últimos {{days}} días',
} satisfies Catalog<typeof en>;
