/**
 * Protestant 66-book canon with OSIS ids and chapter counts.
 * Pure data — no React Native imports (usable from build scripts and tests).
 */
export type Book = {
  /** OSIS id — the only book identifier passed between modules. */
  id: string;
  /** USFM/Paratext id (`JHN`, `1CO`) — what the YouVersion Platform API speaks. */
  usfm: string;
  name: string;
  chapters: number;
  /** 'ot' | 'nt' */
  testament: 'ot' | 'nt';
  /** Source-file slug in the world-english-bible dataset. */
  webSlug: string;
};

export const BOOKS: readonly Book[] = [
  { id: 'Gen', usfm: 'GEN', name: 'Genesis', chapters: 50, testament: 'ot', webSlug: 'genesis' },
  { id: 'Exod', usfm: 'EXO', name: 'Exodus', chapters: 40, testament: 'ot', webSlug: 'exodus' },
  {
    id: 'Lev',
    usfm: 'LEV',
    name: 'Leviticus',
    chapters: 27,
    testament: 'ot',
    webSlug: 'leviticus',
  },
  { id: 'Num', usfm: 'NUM', name: 'Numbers', chapters: 36, testament: 'ot', webSlug: 'numbers' },
  {
    id: 'Deut',
    usfm: 'DEU',
    name: 'Deuteronomy',
    chapters: 34,
    testament: 'ot',
    webSlug: 'deuteronomy',
  },
  { id: 'Josh', usfm: 'JOS', name: 'Joshua', chapters: 24, testament: 'ot', webSlug: 'joshua' },
  { id: 'Judg', usfm: 'JDG', name: 'Judges', chapters: 21, testament: 'ot', webSlug: 'judges' },
  { id: 'Ruth', usfm: 'RUT', name: 'Ruth', chapters: 4, testament: 'ot', webSlug: 'ruth' },
  { id: '1Sam', usfm: '1SA', name: '1 Samuel', chapters: 31, testament: 'ot', webSlug: '1samuel' },
  { id: '2Sam', usfm: '2SA', name: '2 Samuel', chapters: 24, testament: 'ot', webSlug: '2samuel' },
  { id: '1Kgs', usfm: '1KI', name: '1 Kings', chapters: 22, testament: 'ot', webSlug: '1kings' },
  { id: '2Kgs', usfm: '2KI', name: '2 Kings', chapters: 25, testament: 'ot', webSlug: '2kings' },
  {
    id: '1Chr',
    usfm: '1CH',
    name: '1 Chronicles',
    chapters: 29,
    testament: 'ot',
    webSlug: '1chronicles',
  },
  {
    id: '2Chr',
    usfm: '2CH',
    name: '2 Chronicles',
    chapters: 36,
    testament: 'ot',
    webSlug: '2chronicles',
  },
  { id: 'Ezra', usfm: 'EZR', name: 'Ezra', chapters: 10, testament: 'ot', webSlug: 'ezra' },
  { id: 'Neh', usfm: 'NEH', name: 'Nehemiah', chapters: 13, testament: 'ot', webSlug: 'nehemiah' },
  { id: 'Esth', usfm: 'EST', name: 'Esther', chapters: 10, testament: 'ot', webSlug: 'esther' },
  { id: 'Job', usfm: 'JOB', name: 'Job', chapters: 42, testament: 'ot', webSlug: 'job' },
  { id: 'Ps', usfm: 'PSA', name: 'Psalms', chapters: 150, testament: 'ot', webSlug: 'psalms' },
  { id: 'Prov', usfm: 'PRO', name: 'Proverbs', chapters: 31, testament: 'ot', webSlug: 'proverbs' },
  {
    id: 'Eccl',
    usfm: 'ECC',
    name: 'Ecclesiastes',
    chapters: 12,
    testament: 'ot',
    webSlug: 'ecclesiastes',
  },
  {
    id: 'Song',
    usfm: 'SNG',
    name: 'Song of Solomon',
    chapters: 8,
    testament: 'ot',
    webSlug: 'songofsolomon',
  },
  { id: 'Isa', usfm: 'ISA', name: 'Isaiah', chapters: 66, testament: 'ot', webSlug: 'isaiah' },
  { id: 'Jer', usfm: 'JER', name: 'Jeremiah', chapters: 52, testament: 'ot', webSlug: 'jeremiah' },
  {
    id: 'Lam',
    usfm: 'LAM',
    name: 'Lamentations',
    chapters: 5,
    testament: 'ot',
    webSlug: 'lamentations',
  },
  { id: 'Ezek', usfm: 'EZK', name: 'Ezekiel', chapters: 48, testament: 'ot', webSlug: 'ezekiel' },
  { id: 'Dan', usfm: 'DAN', name: 'Daniel', chapters: 12, testament: 'ot', webSlug: 'daniel' },
  { id: 'Hos', usfm: 'HOS', name: 'Hosea', chapters: 14, testament: 'ot', webSlug: 'hosea' },
  { id: 'Joel', usfm: 'JOL', name: 'Joel', chapters: 3, testament: 'ot', webSlug: 'joel' },
  { id: 'Amos', usfm: 'AMO', name: 'Amos', chapters: 9, testament: 'ot', webSlug: 'amos' },
  { id: 'Obad', usfm: 'OBA', name: 'Obadiah', chapters: 1, testament: 'ot', webSlug: 'obadiah' },
  { id: 'Jonah', usfm: 'JON', name: 'Jonah', chapters: 4, testament: 'ot', webSlug: 'jonah' },
  { id: 'Mic', usfm: 'MIC', name: 'Micah', chapters: 7, testament: 'ot', webSlug: 'micah' },
  { id: 'Nah', usfm: 'NAM', name: 'Nahum', chapters: 3, testament: 'ot', webSlug: 'nahum' },
  { id: 'Hab', usfm: 'HAB', name: 'Habakkuk', chapters: 3, testament: 'ot', webSlug: 'habakkuk' },
  {
    id: 'Zeph',
    usfm: 'ZEP',
    name: 'Zephaniah',
    chapters: 3,
    testament: 'ot',
    webSlug: 'zephaniah',
  },
  { id: 'Hag', usfm: 'HAG', name: 'Haggai', chapters: 2, testament: 'ot', webSlug: 'haggai' },
  {
    id: 'Zech',
    usfm: 'ZEC',
    name: 'Zechariah',
    chapters: 14,
    testament: 'ot',
    webSlug: 'zechariah',
  },
  { id: 'Mal', usfm: 'MAL', name: 'Malachi', chapters: 4, testament: 'ot', webSlug: 'malachi' },
  { id: 'Matt', usfm: 'MAT', name: 'Matthew', chapters: 28, testament: 'nt', webSlug: 'matthew' },
  { id: 'Mark', usfm: 'MRK', name: 'Mark', chapters: 16, testament: 'nt', webSlug: 'mark' },
  { id: 'Luke', usfm: 'LUK', name: 'Luke', chapters: 24, testament: 'nt', webSlug: 'luke' },
  { id: 'John', usfm: 'JHN', name: 'John', chapters: 21, testament: 'nt', webSlug: 'john' },
  { id: 'Acts', usfm: 'ACT', name: 'Acts', chapters: 28, testament: 'nt', webSlug: 'acts' },
  { id: 'Rom', usfm: 'ROM', name: 'Romans', chapters: 16, testament: 'nt', webSlug: 'romans' },
  {
    id: '1Cor',
    usfm: '1CO',
    name: '1 Corinthians',
    chapters: 16,
    testament: 'nt',
    webSlug: '1corinthians',
  },
  {
    id: '2Cor',
    usfm: '2CO',
    name: '2 Corinthians',
    chapters: 13,
    testament: 'nt',
    webSlug: '2corinthians',
  },
  { id: 'Gal', usfm: 'GAL', name: 'Galatians', chapters: 6, testament: 'nt', webSlug: 'galatians' },
  { id: 'Eph', usfm: 'EPH', name: 'Ephesians', chapters: 6, testament: 'nt', webSlug: 'ephesians' },
  {
    id: 'Phil',
    usfm: 'PHP',
    name: 'Philippians',
    chapters: 4,
    testament: 'nt',
    webSlug: 'philippians',
  },
  {
    id: 'Col',
    usfm: 'COL',
    name: 'Colossians',
    chapters: 4,
    testament: 'nt',
    webSlug: 'colossians',
  },
  {
    id: '1Thess',
    usfm: '1TH',
    name: '1 Thessalonians',
    chapters: 5,
    testament: 'nt',
    webSlug: '1thessalonians',
  },
  {
    id: '2Thess',
    usfm: '2TH',
    name: '2 Thessalonians',
    chapters: 3,
    testament: 'nt',
    webSlug: '2thessalonians',
  },
  { id: '1Tim', usfm: '1TI', name: '1 Timothy', chapters: 6, testament: 'nt', webSlug: '1timothy' },
  { id: '2Tim', usfm: '2TI', name: '2 Timothy', chapters: 4, testament: 'nt', webSlug: '2timothy' },
  { id: 'Titus', usfm: 'TIT', name: 'Titus', chapters: 3, testament: 'nt', webSlug: 'titus' },
  { id: 'Phlm', usfm: 'PHM', name: 'Philemon', chapters: 1, testament: 'nt', webSlug: 'philemon' },
  { id: 'Heb', usfm: 'HEB', name: 'Hebrews', chapters: 13, testament: 'nt', webSlug: 'hebrews' },
  { id: 'Jas', usfm: 'JAS', name: 'James', chapters: 5, testament: 'nt', webSlug: 'james' },
  { id: '1Pet', usfm: '1PE', name: '1 Peter', chapters: 5, testament: 'nt', webSlug: '1peter' },
  { id: '2Pet', usfm: '2PE', name: '2 Peter', chapters: 3, testament: 'nt', webSlug: '2peter' },
  { id: '1John', usfm: '1JN', name: '1 John', chapters: 5, testament: 'nt', webSlug: '1john' },
  { id: '2John', usfm: '2JN', name: '2 John', chapters: 1, testament: 'nt', webSlug: '2john' },
  { id: '3John', usfm: '3JN', name: '3 John', chapters: 1, testament: 'nt', webSlug: '3john' },
  { id: 'Jude', usfm: 'JUD', name: 'Jude', chapters: 1, testament: 'nt', webSlug: 'jude' },
  {
    id: 'Rev',
    usfm: 'REV',
    name: 'Revelation',
    chapters: 22,
    testament: 'nt',
    webSlug: 'revelation',
  },
];

const byId = new Map(BOOKS.map((b) => [b.id, b]));
const byUsfm = new Map(BOOKS.map((b) => [b.usfm, b]));
const orderById = new Map(BOOKS.map((b, i) => [b.id, i]));

export function getBook(bookId: string): Book {
  const book = byId.get(bookId);
  if (!book) throw new Error(`Unknown OSIS book id: ${bookId}`);
  return book;
}

/** The book behind a USFM id, or null for one outside the 66-book canon (deuterocanon). */
export function getBookByUsfm(usfm: string): Book | null {
  return byUsfm.get(usfm.toUpperCase()) ?? null;
}

export function isValidBookId(bookId: string): boolean {
  return byId.has(bookId);
}

/** Canonical order index (Gen=0 … Rev=65). */
export function bookOrder(bookId: string): number {
  const order = orderById.get(bookId);
  if (order === undefined) throw new Error(`Unknown OSIS book id: ${bookId}`);
  return order;
}
