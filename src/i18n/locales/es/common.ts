import type { Catalog } from '@/i18n/catalog';
import type en from '@/i18n/locales/en/common';

export default {
  cancel: 'Cancelar',
  close: 'Cerrar',
  continue: 'Continuar',
  done: 'Listo',
  back: 'Atrás',
  next: 'Siguiente',
  save: 'Guardar',
  delete: 'Eliminar',
  edit: 'Editar',
  ok: 'OK',
  retry: 'Reintentar',
  loading: 'Cargando…',
  notNow: 'Ahora no',
  verseCount_one: '{{count}} versículo',
  verseCount_other: '{{count}} versículos',
  dayCount_one: '{{count}} día',
  dayCount_other: '{{count}} días',
  percent: '{{value}} %',
} satisfies Catalog<typeof en>;
