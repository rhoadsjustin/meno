/**
 * Protestant 66-book canon with OSIS ids and chapter counts.
 * Pure data — no React Native imports (usable from build scripts and tests).
 */
export type Book = {
  /** OSIS id — the only book identifier passed between modules. */
  id: string;
  name: string;
  chapters: number;
  /** 'ot' | 'nt' */
  testament: 'ot' | 'nt';
  /** Source-file slug in the world-english-bible dataset. */
  webSlug: string;
};

export const BOOKS: readonly Book[] = [
  { id: 'Gen', name: 'Genesis', chapters: 50, testament: 'ot', webSlug: 'genesis' },
  { id: 'Exod', name: 'Exodus', chapters: 40, testament: 'ot', webSlug: 'exodus' },
  { id: 'Lev', name: 'Leviticus', chapters: 27, testament: 'ot', webSlug: 'leviticus' },
  { id: 'Num', name: 'Numbers', chapters: 36, testament: 'ot', webSlug: 'numbers' },
  { id: 'Deut', name: 'Deuteronomy', chapters: 34, testament: 'ot', webSlug: 'deuteronomy' },
  { id: 'Josh', name: 'Joshua', chapters: 24, testament: 'ot', webSlug: 'joshua' },
  { id: 'Judg', name: 'Judges', chapters: 21, testament: 'ot', webSlug: 'judges' },
  { id: 'Ruth', name: 'Ruth', chapters: 4, testament: 'ot', webSlug: 'ruth' },
  { id: '1Sam', name: '1 Samuel', chapters: 31, testament: 'ot', webSlug: '1samuel' },
  { id: '2Sam', name: '2 Samuel', chapters: 24, testament: 'ot', webSlug: '2samuel' },
  { id: '1Kgs', name: '1 Kings', chapters: 22, testament: 'ot', webSlug: '1kings' },
  { id: '2Kgs', name: '2 Kings', chapters: 25, testament: 'ot', webSlug: '2kings' },
  { id: '1Chr', name: '1 Chronicles', chapters: 29, testament: 'ot', webSlug: '1chronicles' },
  { id: '2Chr', name: '2 Chronicles', chapters: 36, testament: 'ot', webSlug: '2chronicles' },
  { id: 'Ezra', name: 'Ezra', chapters: 10, testament: 'ot', webSlug: 'ezra' },
  { id: 'Neh', name: 'Nehemiah', chapters: 13, testament: 'ot', webSlug: 'nehemiah' },
  { id: 'Esth', name: 'Esther', chapters: 10, testament: 'ot', webSlug: 'esther' },
  { id: 'Job', name: 'Job', chapters: 42, testament: 'ot', webSlug: 'job' },
  { id: 'Ps', name: 'Psalms', chapters: 150, testament: 'ot', webSlug: 'psalms' },
  { id: 'Prov', name: 'Proverbs', chapters: 31, testament: 'ot', webSlug: 'proverbs' },
  { id: 'Eccl', name: 'Ecclesiastes', chapters: 12, testament: 'ot', webSlug: 'ecclesiastes' },
  { id: 'Song', name: 'Song of Solomon', chapters: 8, testament: 'ot', webSlug: 'songofsolomon' },
  { id: 'Isa', name: 'Isaiah', chapters: 66, testament: 'ot', webSlug: 'isaiah' },
  { id: 'Jer', name: 'Jeremiah', chapters: 52, testament: 'ot', webSlug: 'jeremiah' },
  { id: 'Lam', name: 'Lamentations', chapters: 5, testament: 'ot', webSlug: 'lamentations' },
  { id: 'Ezek', name: 'Ezekiel', chapters: 48, testament: 'ot', webSlug: 'ezekiel' },
  { id: 'Dan', name: 'Daniel', chapters: 12, testament: 'ot', webSlug: 'daniel' },
  { id: 'Hos', name: 'Hosea', chapters: 14, testament: 'ot', webSlug: 'hosea' },
  { id: 'Joel', name: 'Joel', chapters: 3, testament: 'ot', webSlug: 'joel' },
  { id: 'Amos', name: 'Amos', chapters: 9, testament: 'ot', webSlug: 'amos' },
  { id: 'Obad', name: 'Obadiah', chapters: 1, testament: 'ot', webSlug: 'obadiah' },
  { id: 'Jonah', name: 'Jonah', chapters: 4, testament: 'ot', webSlug: 'jonah' },
  { id: 'Mic', name: 'Micah', chapters: 7, testament: 'ot', webSlug: 'micah' },
  { id: 'Nah', name: 'Nahum', chapters: 3, testament: 'ot', webSlug: 'nahum' },
  { id: 'Hab', name: 'Habakkuk', chapters: 3, testament: 'ot', webSlug: 'habakkuk' },
  { id: 'Zeph', name: 'Zephaniah', chapters: 3, testament: 'ot', webSlug: 'zephaniah' },
  { id: 'Hag', name: 'Haggai', chapters: 2, testament: 'ot', webSlug: 'haggai' },
  { id: 'Zech', name: 'Zechariah', chapters: 14, testament: 'ot', webSlug: 'zechariah' },
  { id: 'Mal', name: 'Malachi', chapters: 4, testament: 'ot', webSlug: 'malachi' },
  { id: 'Matt', name: 'Matthew', chapters: 28, testament: 'nt', webSlug: 'matthew' },
  { id: 'Mark', name: 'Mark', chapters: 16, testament: 'nt', webSlug: 'mark' },
  { id: 'Luke', name: 'Luke', chapters: 24, testament: 'nt', webSlug: 'luke' },
  { id: 'John', name: 'John', chapters: 21, testament: 'nt', webSlug: 'john' },
  { id: 'Acts', name: 'Acts', chapters: 28, testament: 'nt', webSlug: 'acts' },
  { id: 'Rom', name: 'Romans', chapters: 16, testament: 'nt', webSlug: 'romans' },
  { id: '1Cor', name: '1 Corinthians', chapters: 16, testament: 'nt', webSlug: '1corinthians' },
  { id: '2Cor', name: '2 Corinthians', chapters: 13, testament: 'nt', webSlug: '2corinthians' },
  { id: 'Gal', name: 'Galatians', chapters: 6, testament: 'nt', webSlug: 'galatians' },
  { id: 'Eph', name: 'Ephesians', chapters: 6, testament: 'nt', webSlug: 'ephesians' },
  { id: 'Phil', name: 'Philippians', chapters: 4, testament: 'nt', webSlug: 'philippians' },
  { id: 'Col', name: 'Colossians', chapters: 4, testament: 'nt', webSlug: 'colossians' },
  { id: '1Thess', name: '1 Thessalonians', chapters: 5, testament: 'nt', webSlug: '1thessalonians' },
  { id: '2Thess', name: '2 Thessalonians', chapters: 3, testament: 'nt', webSlug: '2thessalonians' },
  { id: '1Tim', name: '1 Timothy', chapters: 6, testament: 'nt', webSlug: '1timothy' },
  { id: '2Tim', name: '2 Timothy', chapters: 4, testament: 'nt', webSlug: '2timothy' },
  { id: 'Titus', name: 'Titus', chapters: 3, testament: 'nt', webSlug: 'titus' },
  { id: 'Phlm', name: 'Philemon', chapters: 1, testament: 'nt', webSlug: 'philemon' },
  { id: 'Heb', name: 'Hebrews', chapters: 13, testament: 'nt', webSlug: 'hebrews' },
  { id: 'Jas', name: 'James', chapters: 5, testament: 'nt', webSlug: 'james' },
  { id: '1Pet', name: '1 Peter', chapters: 5, testament: 'nt', webSlug: '1peter' },
  { id: '2Pet', name: '2 Peter', chapters: 3, testament: 'nt', webSlug: '2peter' },
  { id: '1John', name: '1 John', chapters: 5, testament: 'nt', webSlug: '1john' },
  { id: '2John', name: '2 John', chapters: 1, testament: 'nt', webSlug: '2john' },
  { id: '3John', name: '3 John', chapters: 1, testament: 'nt', webSlug: '3john' },
  { id: 'Jude', name: 'Jude', chapters: 1, testament: 'nt', webSlug: 'jude' },
  { id: 'Rev', name: 'Revelation', chapters: 22, testament: 'nt', webSlug: 'revelation' },
];

const byId = new Map(BOOKS.map((b) => [b.id, b]));
const orderById = new Map(BOOKS.map((b, i) => [b.id, i]));

export function getBook(bookId: string): Book {
  const book = byId.get(bookId);
  if (!book) throw new Error(`Unknown OSIS book id: ${bookId}`);
  return book;
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
