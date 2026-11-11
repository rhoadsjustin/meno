// Off-device checks for the Siri verse lookup: `npm run test:siri`
// (scripts/check-siri.sh). Not part of the app — plugins/withSiriIntents
// compiles only the Swift files directly in native/siri.
//
// argv[1] is a folder holding the contexts scripts/siri-fixtures.ts wrote
// and docs/SQLite/bundled.db, a copy of the bundled Bible database.

import Foundation
import SQLite3

let dir = URL(fileURLWithPath: CommandLine.arguments[1])
let docs = dir.appendingPathComponent("docs")
var failures = 0
@MainActor func check(_ ok: Bool, _ what: String) { if !ok { failures += 1; print("FAIL: \(what)") } }

@MainActor func ctx(_ name: String) -> SiriContext {
  try! FileManager.default.removeItemIfExists(docs.appendingPathComponent("siri-context.json"))
  try! FileManager.default.copyItem(at: dir.appendingPathComponent("\(name).json"), to: docs.appendingPathComponent("siri-context.json"))
  return SiriContext.load(from: docs)!
}
extension FileManager { func removeItemIfExists(_ u: URL) throws { if fileExists(atPath: u.path) { try removeItem(at: u) } } }

let web = ctx("web")
let parser = ScriptureReferenceParser(books: web.books)
@MainActor func idx(_ id: String) -> Int { web.books.firstIndex { $0.id == id }! }
@MainActor func r(_ id: String, _ c1: Int, _ v1: Int, _ c2: Int, _ v2: Int) -> ScriptureRange {
  ScriptureRange(bookIndex: idx(id), startChapter: c1, startVerse: v1, endChapter: c2, endVerse: v2)
}
let cases: [(String, ScriptureRange)] = [
  ("John 3:16", r("John", 3, 16, 3, 16)),
  ("john 3 16", r("John", 3, 16, 3, 16)),
  ("John chapter 3 verse 16", r("John", 3, 16, 3, 16)),
  ("John 3, 16", r("John", 3, 16, 3, 16)),
  ("What does John 3:16 say?", r("John", 3, 16, 3, 16)),
  ("the book of Romans 8:28", r("Rom", 8, 28, 8, 28)),
  ("1 John 3:16", r("1John", 3, 16, 3, 16)),
  ("First John 1:9", r("1John", 1, 9, 1, 9)),
  ("1st Corinthians 13:4-7", r("1Cor", 13, 4, 13, 7)),
  ("First Corinthians 13 verses 4 through 7", r("1Cor", 13, 4, 13, 7)),
  ("2 Timothy 3:16–17", r("2Tim", 3, 16, 3, 17)),
  ("John 3:16 to 18", r("John", 3, 16, 3, 18)),
  ("John 3:16 and 17", r("John", 3, 16, 3, 17)),
  ("John 3:16-4:2", r("John", 3, 16, 4, 2)),
  ("Psalm 23", r("Ps", 23, 1, 23, 999)),
  ("Psalms 23 through 24", r("Ps", 23, 1, 24, 999)),
  ("Jude 5", r("Jude", 1, 5, 1, 5)),
  ("Jude 1:5", r("Jude", 1, 5, 1, 5)),
  ("Jude 5-7", r("Jude", 1, 5, 1, 7)),
  ("Jude", r("Jude", 1, 1, 1, 999)),
  ("Philemon", r("Phlm", 1, 1, 1, 999)),
  ("Song of Solomon 2:1", r("Song", 2, 1, 2, 1)),
  ("Song of Songs 2:1", r("Song", 2, 1, 2, 1)),
  ("Revelations 21:4", r("Rev", 21, 4, 21, 4)),
  ("Juan 3:16", r("John", 3, 16, 3, 16)),
  ("1ra de Juan 4:8", r("1John", 4, 8, 4, 8)),
  ("Primera de Corintios 13, versículos 4 al 7", r("1Cor", 13, 4, 13, 7)),
  ("Génesis 1:1", r("Gen", 1, 1, 1, 1)),
  ("genesis 1 1", r("Gen", 1, 1, 1, 1)),
  ("Salmo 23 versículo 1", r("Ps", 23, 1, 23, 1)),
  ("Hechos 2:38", r("Acts", 2, 38, 2, 38)),
  ("3 John 4", r("3John", 1, 4, 1, 4)),
]
for (text, want) in cases {
  let got = try? parser.parse(text)
  check(got == want, "parse \(text) → \(String(describing: got))")
}
@MainActor func err(_ text: String) -> ScriptureReferenceError? {
  do { _ = try parser.parse(text); return nil } catch { return error as? ScriptureReferenceError }
}
check(err("hello there") == .noBook, "noBook")
check(err("") == .noBook, "empty")
check(err("John") == .noChapter(bookIndex: idx("John")), "noChapter")
check(err("John 40:1") == .chapterOutOfRange(bookIndex: idx("John")), "chapter range")
check(err("John 3:16-2") == .badRange, "bad range")
check(err("John 3:16-18-20-22") == .badRange, "too many")

@MainActor func run(_ name: String, _ q: String, esv: ScriptureLookup.EsvFetch? = nil) async -> ScriptureAnswer {
  await ScriptureLookup(context: ctx(name), documents: docs, fetchEsv: esv).answer(for: q)
}

var a = await run("web", "John 3:16")
check(a.kind == .verses && a.reference == "John 3:16" && a.abbrev == "WEB" && a.text.hasPrefix("For God so loved"), "web john 3:16")
a = await run("kjv", "First Corinthians 13 4 through 7")
check(a.kind == .verses && a.reference == "1 Corinthians 13:4–7" && a.abbrev == "KJV" && a.text.contains("Charity"), "kjv 1cor")
a = await run("web", "Psalm 23")
check(a.kind == .verses && a.reference == "Psalms 23" && a.note.isEmpty && a.text.hasSuffix("forever."), "psalm 23")
a = await run("web", "John 3")
check(a.kind == .verses && a.reference == "John 3:1–30" && a.note.isEmpty && a.trailer == "Those are the first 30 verses.", "truncate")
a = await run("web", "John 3:16-4:2")
check(a.kind == .verses && a.reference == "John 3:16–4:2", "cross chapter")
a = await run("web", "John 3:99")
check(a.kind == .failed && a.note == "I couldn’t find John 3:99 in the WEB.", "not found")
a = await run("web", "John 99")
check(a.kind == .failed && a.note == "John doesn’t have that chapter.", "chapter oor")
a = await run("web", "umm")
check(a.kind == .askAgain, "ask again")
a = await run("web", "Romans")
check(a.kind == .askAgain && a.note == "Which chapter and verse of Romans?", "no chapter")
a = await run("niv", "John 3:16")
check(a.kind == .verses && a.abbrev == "WEB" && a.note.contains("NIV") && a.note.contains("World English Bible"), "niv substitute")
a = await run("nvi", "Juan 3:16")
check(a.kind == .failed && a.note.contains("NVI") && a.note.contains("Juan 3:16"), "nvi unavailable")
a = await run("web-es", "Juan 3:16 al 17")
check(a.kind == .verses && a.reference == "Juan 3:16–17", "spanish ui")

// ESV: API path, offline path, and parser.
let queries = Queries()
final class Queries: @unchecked Sendable { var seen: [String] = [] }
a = await run("esv", "John 3:16-17", esv: { q in queries.seen.append(q); return "  [16] “For God so loved the world,\n\n  that he gave [his] only Son.” [17] For God did not send his Son.\n" })
check(a.kind == .verses && a.abbrev == "ESV" && a.reference == "John 3:16–17" && a.text == "“For God so loved the world, that he gave [his] only Son.” For God did not send his Son." && a.attribution.contains("Crossway") && a.note.isEmpty, "esv api")
a = await run("esv", "Jude", esv: { q in queries.seen.append(q); return "[1] One. [2] Two." })
a = await run("esv", "Psalm 23", esv: { q in queries.seen.append(q); return "[1] One." })
a = await run("esv", "Psalms 23 to 24", esv: { q in queries.seen.append(q); return "[1] One. [2] Two. [1] Next." })
check(a.reference == "Psalms 23–24", "esv chapters ref \(a.reference)")
a = await run("esv", "John 3:16-4:2", esv: { q in queries.seen.append(q); return "[16] a" })
check(queries.seen == ["John 3:16-17", "Jude", "Psalms 23", "Psalms 23-24", "John 3:16-4:2"], "esv queries")
let multi = ScriptureLookup.parseEsvPassage("[35] a [36] b [1] c [2] d", startChapter: 3)
check(multi.map { "\($0.chapter):\($0.verse)" } == ["3:35", "3:36", "4:1", "4:2"], "esv chapter rollover")
a = await run("esv", "John 3:16", esv: { _ in nil })
check(a.kind == .verses && a.abbrev == "WEB" && a.note.contains("ESV"), "esv offline substitute")
a = await run("esv", "John 3:16")
check(a.kind == .verses && a.abbrev == "WEB", "esv no key")

// Missing bundled database → not found, no crash. Missing/newer context → nil.
try! FileManager.default.moveItem(at: docs.appendingPathComponent("SQLite"), to: docs.appendingPathComponent("SQLite.off"))
a = await run("web", "John 3:16"); check(a.kind == .failed, "no db")
try! FileManager.default.moveItem(at: docs.appendingPathComponent("SQLite.off"), to: docs.appendingPathComponent("SQLite"))
check(SiriContext.load(from: dir.appendingPathComponent("nowhere")) == nil, "no context")

// The app database's licensed cache: a goal's ESV verses (02 §5).
do {
  var db: OpaquePointer?
  sqlite3_open(docs.appendingPathComponent("SQLite/meno.db").path, &db)
  sqlite3_exec(
    db,
    """
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS verses(translationId TEXT, bookId TEXT, chapter INT, verse INT, text TEXT);
    DELETE FROM verses;
    INSERT INTO verses VALUES ('esv', 'Phil', 4, 6, 'CACHED six'), ('esv', 'Phil', 4, 7, 'CACHED seven');
    """, nil, nil, nil)
  sqlite3_close(db)
}
a = await run("esv", "Philippians 4:6-7", esv: { _ in "[6] API" })
check(a.text == "CACHED six CACHED seven" && a.abbrev == "ESV", "esv cache whole")
a = await run("esv", "Philippians 4:6-8", esv: { _ in "[6] API" })
check(a.text == "API", "esv cache partial goes to api")
print(failures == 0 ? "ALL PASSED" : "\(failures) FAILURES")
exit(failures == 0 ? 0 : 1)
