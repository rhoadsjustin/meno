import type { Catalog } from '@/i18n/catalog';
import type en from '@/i18n/locales/en/siri';

export default {
  unparsed: 'No entendí la cita. Prueba con algo como Juan 3:16.',
  noChapter: '¿Qué capítulo y versículo de {{book}}?',
  chapterOutOfRange: '{{book}} no tiene ese capítulo.',
  notFound: 'No encontré {{ref}} en la {{abbrev}}.',
  substituted: 'No puedo leer la {{abbrev}} desde aquí, así que esta es la {{name}}.',
  unavailable: 'No puedo leer la {{abbrev}} desde aquí. Abre Meno para leer {{ref}}.',
  truncated: 'Esos son los primeros {{n}} versículos.',
} satisfies Catalog<typeof en>;
