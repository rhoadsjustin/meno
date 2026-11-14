import type { Catalog } from '@/i18n/catalog';
import type en from '@/i18n/locales/en/reader';

export default {
  title: '{{book}} {{chapter}}',
  chapter: 'Capítulo {{chapter}}',
  chapterMenu: 'Capítulos',
  previousChapter: 'Capítulo anterior',
  nextChapter: 'Capítulo siguiente',
  previousPage: 'Página anterior',
  nextPage: 'Página siguiente',
  page: 'Página {{page}}',
  pageSpoken: 'Página {{page}}.',
  verseSpoken: 'Versículo {{verse}}.',
  verse: 'Versículo {{verse}}. {{text}}',
  loadFailed: 'No se pudo cargar {{chapter}}.',
  loadFailedTitle: 'Este capítulo no se cargó',
  loadingChapter: 'Cargando {{chapter}}',
  // A catalog version whose details haven't loaded; named by number only.
  placeholderAbbrev: 'Biblia {{n}}',
  placeholderName: 'Traducción {{n}} (detalles aún sin cargar)',
  publicDomainAttribution: '{{name}} ({{abbrev}}), dominio público.',
} satisfies Catalog<typeof en>;
