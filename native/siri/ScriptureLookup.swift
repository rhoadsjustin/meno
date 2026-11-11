// Answers "what does <reference> say?" for Siri, from text on this device.
//
// An App Intent runs when the app is launched in the background, and React
// Native only starts once a scene connects — so no JavaScript is running and
// services/bible cannot be asked. This file is that service's read-only
// native counterpart, and keeps its licensing rules (docs/02-architecture.md
// §5):
//
//   - bundled public-domain translations: read from the bundled database;
//   - ESV: the goal text the app already cached, else one call to the ESV
//     API, shown and spoken but never written anywhere;
//   - YouVersion Platform versions: not read here. The answer comes from a
//     bundled translation in the same language, and says so.
//
// What "the translation the user is memorizing in" means, the book names and
// the wording of every reply are decided in JavaScript and published as
// Documents/siri-context.json (src/services/siri).

import Foundation
import SQLite3

/// Documents/siri-context.json, as written by src/services/siri.
struct SiriContext: Codable, Sendable {
  struct Translation: Codable, Sendable {
    let id: String
    let abbrev: String
    let name: String
    /// `bundled`, `esv_api` or `youversion`.
    let source: String
    let attribution: String
  }

  /// Reply wording in the app's UI language. `{ref}`, `{abbrev}`, `{name}`,
  /// `{book}` and `{count}` are filled in here.
  struct Copy: Codable, Sendable {
    let unparsed: String
    let noChapter: String
    let chapterOutOfRange: String
    let notFound: String
    let substituted: String
    let unavailable: String
    let truncated: String
  }

  /// Bumped when a field changes meaning; a newer file than this code
  /// understands is treated as absent.
  static let supportedVersion = 1

  let version: Int
  /// The translation of the passage the user is memorizing.
  let translation: Translation
  /// A bundled translation in the same language, read when `translation`
  /// cannot be read from here. Nil when the language has none on the device.
  let fallback: Translation?
  /// File names under Documents/SQLite.
  let bundledDb: String
  let appDb: String
  /// Most verses one reply reads aloud.
  let maxVerses: Int
  let books: [SiriBook]
  let copy: Copy

  static func load(from documents: URL) -> SiriContext? {
    let url = documents.appendingPathComponent("siri-context.json")
    guard let data = try? Data(contentsOf: url),
      let context = try? JSONDecoder().decode(SiriContext.self, from: data),
      context.version == supportedVersion
    else { return nil }
    return context
  }
}

/// What Siri says and shows.
struct ScriptureAnswer: Sendable {
  enum Kind: Sendable {
    /// Verse text was found.
    case verses
    /// The reference could not be read; ask for it again.
    case askAgain
    /// Nothing to read (not found, or not available to Siri).
    case failed
  }

  let kind: Kind
  /// "John 3:16–18"; empty unless `kind == .verses`.
  let reference: String
  /// The verse text alone; empty unless `kind == .verses`.
  let text: String
  /// Abbreviation of the translation the text is from.
  let abbrev: String
  /// The translation's required notice, shown under the text.
  let attribution: String
  /// A sentence to say before the text (a substitution) or instead of it.
  let note: String
  /// A sentence to say after the text (that the reply stopped short).
  let trailer: String
}

struct ScriptureLookup: Sendable {
  typealias Verse = (chapter: Int, verse: Int, text: String)

  /// Fetches one ESV passage (plain text with `[n]` verse markers) or nil.
  typealias EsvFetch = @Sendable (_ query: String) async -> String?

  let context: SiriContext
  let documents: URL
  let fetchEsv: EsvFetch?

  private var sqliteDirectory: URL { documents.appendingPathComponent("SQLite") }

  func answer(for request: String) async -> ScriptureAnswer {
    let copy = context.copy
    let parser = ScriptureReferenceParser(books: context.books)
    let range: ScriptureRange
    do {
      range = try parser.parse(request)
    } catch let error as ScriptureReferenceError {
      switch error {
      case .noBook, .badRange:
        return message(.askAgain, copy.unparsed)
      case .noChapter(let index):
        return message(.askAgain, fill(copy.noChapter, ["book": context.books[index].name]))
      case .chapterOutOfRange(let index):
        return message(
          .failed, fill(copy.chapterOutOfRange, ["book": context.books[index].name]))
      }
    } catch {
      return message(.askAgain, copy.unparsed)
    }

    let asked = context.translation
    var verses: [Verse] = []
    switch asked.source {
    case "bundled":
      verses = bundledVerses(translationId: asked.id, range: range)
    case "esv_api":
      verses = await esvVerses(range: range)
    default:
      break
    }
    if !verses.isEmpty {
      return versesAnswer(verses, range: range, translation: asked, note: "")
    }
    if asked.source == "bundled" {
      return message(
        .failed,
        fill(copy.notFound, ["ref": display(range, verses: []), "abbrev": asked.abbrev]))
    }

    // Licensed text that is not on this device: read the bundled translation
    // in the same language, and say that it is a different one.
    guard let fallback = context.fallback else {
      return message(
        .failed,
        fill(copy.unavailable, ["ref": display(range, verses: []), "abbrev": asked.abbrev]))
    }
    let substitute = bundledVerses(translationId: fallback.id, range: range)
    guard !substitute.isEmpty else {
      return message(
        .failed,
        fill(copy.notFound, ["ref": display(range, verses: []), "abbrev": fallback.abbrev]))
    }
    let note = fill(copy.substituted, ["abbrev": asked.abbrev, "name": fallback.name])
    return versesAnswer(substitute, range: range, translation: fallback, note: note)
  }

  // MARK: Replies

  private func message(_ kind: ScriptureAnswer.Kind, _ text: String) -> ScriptureAnswer {
    ScriptureAnswer(
      kind: kind, reference: "", text: "", abbrev: "", attribution: "", note: text, trailer: "")
  }

  private func versesAnswer(
    _ found: [Verse], range: ScriptureRange, translation: SiriContext.Translation, note: String
  ) -> ScriptureAnswer {
    let limit = max(1, context.maxVerses)
    let verses = Array(found.prefix(limit))
    let truncated = found.count > verses.count
    return ScriptureAnswer(
      kind: .verses,
      reference: display(range, verses: truncated ? verses : []),
      text: verses.map(\.text).joined(separator: " "),
      abbrev: translation.abbrev,
      attribution: translation.attribution,
      note: note,
      trailer: truncated ? fill(context.copy.truncated, ["count": String(verses.count)]) : "")
  }

  /// "John 3:16", "John 3:16–18", "John 3:16–4:2", "Psalm 23". When `verses`
  /// is given (a reply cut short), the reference covers just those.
  func display(_ range: ScriptureRange, verses: [Verse]) -> String {
    let book = context.books[range.bookIndex]
    if let first = verses.first, let last = verses.last {
      return book.name + " "
        + span(first.chapter, first.verse, last.chapter, last.verse)
    }
    if range.wholeChapters {
      if book.chapters == 1 { return book.name }
      return range.startChapter == range.endChapter
        ? "\(book.name) \(range.startChapter)"
        : "\(book.name) \(range.startChapter)–\(range.endChapter)"
    }
    return book.name + " "
      + span(range.startChapter, range.startVerse, range.endChapter, range.endVerse)
  }

  private func span(_ c1: Int, _ v1: Int, _ c2: Int, _ v2: Int) -> String {
    if c1 == c2 { return v1 == v2 ? "\(c1):\(v1)" : "\(c1):\(v1)–\(v2)" }
    return "\(c1):\(v1)–\(c2):\(v2)"
  }

  private func fill(_ template: String, _ values: [String: String]) -> String {
    var out = template
    for (key, value) in values {
      out = out.replacingOccurrences(of: "{\(key)}", with: value)
    }
    return out
  }

  // MARK: Text on this device

  private func bundledVerses(translationId: String, range: ScriptureRange) -> [Verse] {
    readVerses(
      database: sqliteDirectory.appendingPathComponent(context.bundledDb),
      translationId: translationId, range: range)
  }

  /// Same query as services/bible `getPassage`. One more row than a reply
  /// may read is fetched, so a cut-short reply can say so.
  private func readVerses(database: URL, translationId: String, range: ScriptureRange) -> [Verse] {
    guard FileManager.default.fileExists(atPath: database.path) else { return [] }
    var handle: OpaquePointer?
    guard sqlite3_open_v2(database.path, &handle, SQLITE_OPEN_READONLY, nil) == SQLITE_OK else {
      sqlite3_close(handle)
      return []
    }
    defer { sqlite3_close(handle) }
    sqlite3_busy_timeout(handle, 1000)

    let sql = """
      SELECT chapter, verse, text FROM verses
      WHERE translationId = ?1 AND bookId = ?2
        AND (chapter > ?3 OR (chapter = ?3 AND verse >= ?4))
        AND (chapter < ?5 OR (chapter = ?5 AND verse <= ?6))
      ORDER BY chapter, verse
      LIMIT ?7
      """
    var statement: OpaquePointer?
    guard sqlite3_prepare_v2(handle, sql, -1, &statement, nil) == SQLITE_OK else { return [] }
    defer { sqlite3_finalize(statement) }

    // SQLITE_TRANSIENT: SQLite copies the string before the call returns.
    let transient = unsafeBitCast(-1, to: sqlite3_destructor_type.self)
    sqlite3_bind_text(statement, 1, translationId, -1, transient)
    sqlite3_bind_text(statement, 2, context.books[range.bookIndex].id, -1, transient)
    sqlite3_bind_int(statement, 3, Int32(range.startChapter))
    sqlite3_bind_int(statement, 4, Int32(range.startVerse))
    sqlite3_bind_int(statement, 5, Int32(range.endChapter))
    sqlite3_bind_int(statement, 6, Int32(range.endVerse))
    sqlite3_bind_int(statement, 7, Int32(max(1, context.maxVerses) + 1))

    var verses: [Verse] = []
    while sqlite3_step(statement) == SQLITE_ROW {
      guard let text = sqlite3_column_text(statement, 2) else { continue }
      verses.append(
        (
          chapter: Int(sqlite3_column_int(statement, 0)),
          verse: Int(sqlite3_column_int(statement, 1)),
          text: String(cString: text)
        ))
    }
    return verses
  }

  // MARK: ESV

  /// The app caches a goal's ESV verses (02 §5), so a verse being memorized
  /// reads offline. Anything else is asked of the ESV API once and held only
  /// for this reply.
  private func esvVerses(range: ScriptureRange) async -> [Verse] {
    if !range.wholeChapters, range.startChapter == range.endChapter {
      let cached = readVerses(
        database: sqliteDirectory.appendingPathComponent(context.appDb),
        translationId: context.translation.id, range: range)
      // Use the cache only when it holds the whole request.
      if cached.count == range.endVerse - range.startVerse + 1 { return cached }
    }
    guard let fetchEsv, let passage = await fetchEsv(esvQuery(range)) else { return [] }
    return ScriptureLookup.parseEsvPassage(passage, startChapter: range.startChapter)
  }

  /// The ESV API's `q` for a range. A one-chapter book is asked for by name
  /// alone: the API reads "Jude 1" as Jude 1:1 (services/bible/esv.ts).
  func esvQuery(_ range: ScriptureRange) -> String {
    let book = context.books[range.bookIndex]
    if range.wholeChapters {
      if book.chapters == 1 { return book.query }
      return range.startChapter == range.endChapter
        ? "\(book.query) \(range.startChapter)"
        : "\(book.query) \(range.startChapter)-\(range.endChapter)"
    }
    let span =
      range.startChapter == range.endChapter
      ? (range.startVerse == range.endVerse
        ? "\(range.startChapter):\(range.startVerse)"
        : "\(range.startChapter):\(range.startVerse)-\(range.endVerse)")
      : "\(range.startChapter):\(range.startVerse)-\(range.endChapter):\(range.endVerse)"
    return "\(book.query) \(span)"
  }

  /// Splits ESV API text (`include-verse-numbers=true`) at its `[n]` markers,
  /// as services/bible/esv.ts `parseEsvPassage` does. A verse number that
  /// goes down marks the next chapter.
  static func parseEsvPassage(_ passage: String, startChapter: Int) -> [Verse] {
    var verses: [Verse] = []
    var chapter = startChapter
    var current: Int?
    var buffer = ""

    func flush() {
      guard let verse = current else { return }
      let text = buffer.split(whereSeparator: \.isWhitespace).joined(separator: " ")
      if !text.isEmpty { verses.append((chapter: chapter, verse: verse, text: text)) }
    }

    var rest = Substring(passage)
    while let open = rest.firstIndex(of: "[") {
      let afterOpen = rest.index(after: open)
      guard let close = rest[afterOpen...].firstIndex(of: "]") else { break }
      if let number = Int(rest[afterOpen..<close]) {
        buffer += rest[..<open]
        flush()
        if let previous = current, number <= previous { chapter += 1 }
        current = number
        buffer = ""
      } else {
        // A bracket that is not a verse marker is part of the text.
        buffer += rest[...close]
      }
      rest = rest[rest.index(after: close)...]
    }
    buffer += rest
    flush()
    return verses
  }
}
