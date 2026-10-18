import type { Catalog } from '@/i18n/catalog';
import type en from '@/i18n/locales/en/review';

export default {
  title: 'Repaso',
  position: '{{index}} de {{total}}',
  closeLabel: 'Cerrar el repaso',
  emptyTitle: 'No hay nada pendiente de repaso',
  emptyBody: 'Los versículos memorizados vuelven aquí cuando llega su fecha de repaso.',
  roundHeader: 'Repaso · {{reference}}',
  almost: 'Casi',
  almostMarked: 'Casi — abajo están marcadas las palabras que fallaron',
  keptFresh_one: '{{count}} versículo repasado y fresco',
  keptFresh_other: '{{count}} versículos repasados y frescos',
} satisfies Catalog<typeof en>;
