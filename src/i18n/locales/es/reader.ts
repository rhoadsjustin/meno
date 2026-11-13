import type { Catalog } from '@/i18n/catalog';
import type en from '@/i18n/locales/en/reader';

export default {
  title: '{{book}} {{chapter}}',
  chapter: 'Capítulo {{chapter}}',
  screenTitle: 'Lectura',
  chapterMenu: 'Capítulos y tamaño del texto',
  textSize: 'Tamaño del texto',
  textSmaller: 'Más pequeño',
  textLarger: 'Más grande',
  textDefault: 'Tamaño predeterminado',
  previousChapter: 'Capítulo anterior',
  nextChapter: 'Capítulo siguiente',
  nextChapterNamed: 'Siguiente: {{chapter}}',
  resume: 'Continuar desde {{chapter}}',
  memorize: 'Memorizar esto…',
  previousPage: 'Página anterior',
  nextPage: 'Página siguiente',
  page: 'Página {{page}}',
  pageSpoken: 'Página {{page}}.',
  verseSpoken: 'Versículo {{verse}}.',
  verse: 'Versículo {{verse}}. {{text}}',
  loadFailed: 'No se pudo cargar {{chapter}}.',
  loadFailedTitle: 'Este capítulo no se cargó',
  loadingChapter: 'Cargando {{chapter}}',
  badLinkTitle: 'No se pudo abrir este pasaje',
  badLinkMessage: 'El enlace no nombra un libro y capítulo de la Biblia.',
  goToToday: 'Ir a Hoy',
  // A catalog version whose details haven't loaded; named by number only.
  placeholderAbbrev: 'Biblia {{n}}',
  placeholderName: 'Traducción {{n}} (detalles aún sin cargar)',
  publicDomainAttribution: '{{name}} ({{abbrev}}), dominio público.',
} satisfies Catalog<typeof en>;
