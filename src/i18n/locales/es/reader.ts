import type { Catalog } from '@/i18n/catalog';
import type en from '@/i18n/locales/en/reader';

export default {
  title: '{{book}} {{chapter}}',
  chapter: 'Capítulo {{chapter}}',
  previousChapter: 'Capítulo anterior',
  nextChapter: 'Capítulo siguiente',
  previousPage: 'Página anterior',
  nextPage: 'Página siguiente',
  page: 'Página {{page}}',
  loadFailed: 'No se pudo cargar {{chapter}}.',
  // A catalog version whose details haven't loaded; named by number only.
  placeholderAbbrev: 'Biblia {{n}}',
  placeholderName: 'Traducción {{n}} (detalles aún sin cargar)',
  publicDomainAttribution: '{{name}} ({{abbrev}}), dominio público.',
} satisfies Catalog<typeof en>;
