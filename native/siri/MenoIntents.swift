// Siri and Shortcuts: "Look up a verse in Meno" → "Which verse?" → the text,
// read aloud in the translation the user is memorizing in.
//
// Compiled into the app target by plugins/withSiriIntents. The lookup itself
// is in ScriptureLookup.swift; this file is the App Intents surface.

import AppIntents
import Foundation
import SwiftUI

struct LookUpVerseIntent: AppIntent {
  static let title: LocalizedStringResource = "Look Up a Verse"
  static let description: IntentDescription? = IntentDescription(
    "Reads a verse or passage in the translation you are memorizing in.",
    categoryName: "Scripture")

  @Parameter(
    title: "Reference",
    description: "A verse or passage, like John 3:16 or Psalm 23.",
    requestValueDialog: IntentDialog("Which verse?"))
  var reference: String

  static var parameterSummary: some ParameterSummary {
    Summary("Look up \(\.$reference)")
  }

  func perform() async throws
    -> some IntentResult & ReturnsValue<String> & ProvidesDialog & ShowsSnippetView
  {
    guard
      let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first,
      let context = SiriContext.load(from: documents)
    else {
      // The app writes the context on launch; a fresh install has none yet.
      let note = String(localized: "Open Meno once, then ask me again.")
      return .result(
        value: "", dialog: IntentDialog(stringLiteral: note), view: VerseSnippet(note: note))
    }

    let lookup = ScriptureLookup(context: context, documents: documents, fetchEsv: EsvClient.fetch)
    let answer = await lookup.answer(for: reference)

    switch answer.kind {
    case .askAgain:
      throw $reference.needsValueError(IntentDialog(stringLiteral: answer.note))
    case .failed:
      return .result(
        value: "", dialog: IntentDialog(stringLiteral: answer.note),
        view: VerseSnippet(note: answer.note))
    case .verses:
      let heading = "\(answer.reference), \(answer.abbrev)."
      let spoken = [answer.note, heading, answer.text, answer.trailer]
        .filter { !$0.isEmpty }
        .joined(separator: " ")
      return .result(
        value: answer.text,
        dialog: IntentDialog(stringLiteral: spoken),
        view: VerseSnippet(
          reference: answer.reference, abbrev: answer.abbrev, text: answer.text,
          attribution: answer.attribution, note: answer.note))
    }
  }
}

/// The phrases Siri listens for without any setup. A phrase can't carry the
/// reference itself (App Shortcut phrases only take a fixed list of values),
/// so Siri asks for it next. The iOS 16 initializer is used on purpose: the
/// app still deploys to 16.4.
struct MenoShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: LookUpVerseIntent(),
      phrases: [
        "Look up a verse in \(.applicationName)",
        "Look up a verse with \(.applicationName)",
        "Ask \(.applicationName) for a verse",
        "Read a verse with \(.applicationName)",
        "\(.applicationName) verse lookup",
      ])
  }
}

/// The card Siri shows with the reply: the verse and, as everywhere verse
/// text appears, its translation's notice (docs/02 §5).
struct VerseSnippet: View {
  var reference = ""
  var abbrev = ""
  var text = ""
  var attribution = ""
  var note = ""

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      if !note.isEmpty {
        Text(note)
          .font(text.isEmpty ? .body : .footnote)
          .foregroundStyle(text.isEmpty ? .primary : .secondary)
      }
      if !text.isEmpty {
        Text("\(reference) · \(abbrev)")
          .font(.headline)
        Text(text)
          .font(.body)
        if !attribution.isEmpty {
          Text(attribution)
            .font(.caption2)
            .foregroundStyle(.secondary)
        }
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding()
  }
}

/// One ESV passage for one reply. Nothing is cached or written: text outside
/// a goal is display-only under the ESV API terms (docs/02 §5). The key is
/// the app's own (EXPO_PUBLIC_ESV_API_KEY), put in Info.plist by
/// plugins/withSiriIntents.
enum EsvClient {
  static let fetch: ScriptureLookup.EsvFetch = { query in
    guard
      let key = Bundle.main.object(forInfoDictionaryKey: "MenoEsvApiKey") as? String,
      !key.isEmpty,
      var components = URLComponents(string: "https://api.esv.org/v3/passage/text/")
    else { return nil }
    components.queryItems = [
      URLQueryItem(name: "q", value: query),
      URLQueryItem(name: "include-passage-references", value: "false"),
      URLQueryItem(name: "include-verse-numbers", value: "true"),
      URLQueryItem(name: "include-first-verse-numbers", value: "true"),
      URLQueryItem(name: "include-footnotes", value: "false"),
      URLQueryItem(name: "include-headings", value: "false"),
      URLQueryItem(name: "include-short-copyright", value: "false"),
      URLQueryItem(name: "include-selahs", value: "true"),
      URLQueryItem(name: "indent-poetry", value: "false"),
      URLQueryItem(name: "indent-paragraphs", value: "0"),
    ]
    guard let url = components.url else { return nil }
    var request = URLRequest(url: url)
    // Siri waits on this; answer from the bundled text rather than stall.
    request.timeoutInterval = 6
    request.setValue("Token \(key)", forHTTPHeaderField: "Authorization")

    struct Reply: Decodable { let passages: [String]? }
    guard
      let (data, response) = try? await URLSession.shared.data(for: request),
      (response as? HTTPURLResponse)?.statusCode == 200,
      let reply = try? JSONDecoder().decode(Reply.self, from: data)
    else { return nil }
    return reply.passages?.first
  }
}
