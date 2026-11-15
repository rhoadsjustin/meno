/**
 * Abbreviated book names for one-line surfaces (the inline Lock Screen
 * widget, docs/05 §1: "Phil 4:6 · 12"). Pure — no React Native imports.
 *
 * English uses the OSIS id itself, which is the SBL abbreviation ("Phil",
 * "1 Cor" once the leading number is spaced). Spanish follows the
 * Reina-Valera 1960 list.
 */
import { language } from '@/i18n';
import { getBook } from '@/services/bible/canon';
import { refEquals } from '@/services/bible/refs';
import type { RefRange } from '@/services/bible/types';

export const BOOK_ABBREVIATIONS_ES: Readonly<Record<string, string>> = {
  Gen: 'Gn',
  Exod: 'Éx',
  Lev: 'Lv',
  Num: 'Nm',
  Deut: 'Dt',
  Josh: 'Jos',
  Judg: 'Jue',
  Ruth: 'Rt',
  '1Sam': '1 S',
  '2Sam': '2 S',
  '1Kgs': '1 R',
  '2Kgs': '2 R',
  '1Chr': '1 Cr',
  '2Chr': '2 Cr',
  Ezra: 'Esd',
  Neh: 'Neh',
  Esth: 'Est',
  Job: 'Job',
  Ps: 'Sal',
  Prov: 'Pr',
  Eccl: 'Ec',
  Song: 'Cnt',
  Isa: 'Is',
  Jer: 'Jer',
  Lam: 'Lm',
  Ezek: 'Ez',
  Dan: 'Dn',
  Hos: 'Os',
  Joel: 'Jl',
  Amos: 'Am',
  Obad: 'Abd',
  Jonah: 'Jon',
  Mic: 'Mi',
  Nah: 'Nah',
  Hab: 'Hab',
  Zeph: 'Sof',
  Hag: 'Hag',
  Zech: 'Zac',
  Mal: 'Mal',
  Matt: 'Mt',
  Mark: 'Mr',
  Luke: 'Lc',
  John: 'Jn',
  Acts: 'Hch',
  Rom: 'Ro',
  '1Cor': '1 Co',
  '2Cor': '2 Co',
  Gal: 'Gá',
  Eph: 'Ef',
  Phil: 'Fil',
  Col: 'Col',
  '1Thess': '1 Ts',
  '2Thess': '2 Ts',
  '1Tim': '1 Ti',
  '2Tim': '2 Ti',
  Titus: 'Tit',
  Phlm: 'Flm',
  Heb: 'He',
  Jas: 'Stg',
  '1Pet': '1 P',
  '2Pet': '2 P',
  '1John': '1 Jn',
  '2John': '2 Jn',
  '3John': '3 Jn',
  Jude: 'Jud',
  Rev: 'Ap',
};

/** A book's abbreviation in the UI language ("Phil", "Fil"). */
export function bookAbbreviation(bookId: string): string {
  const book = getBook(bookId); // throws on unknown book
  if (language() === 'es') return BOOK_ABBREVIATIONS_ES[book.id] ?? book.id;
  return book.id.replace(/^(\d)/, '$1 ');
}

/** `formatRange` with the book abbreviated, e.g. "1 Thess 5:16–18". */
export function formatRangeShort(range: RefRange): string {
  const { start, end } = range;
  const name = bookAbbreviation(start.bookId);
  const from = `${name} ${start.chapter}:${start.verse}`;
  if (refEquals(start, end)) return from;
  if (start.bookId === end.bookId) {
    return start.chapter === end.chapter
      ? `${from}–${end.verse}`
      : `${from}–${end.chapter}:${end.verse}`;
  }
  return `${from} – ${bookAbbreviation(end.bookId)} ${end.chapter}:${end.verse}`;
}
