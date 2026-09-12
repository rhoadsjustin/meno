# 05 — Widgets & Notifications

## 1. Widgets (expo-widgets, stable SDK 56)

Widgets are React components with the `'widget'` directive, rendered via Expo UI primitives, configured through the expo-widgets config plugin (which generates the Widget Extension target and App Group during prebuild). Data flows app → App Group storage → widget timeline. Note current limitation: **no image support** in widget Expo UI — design is typographic, which suits us perfectly.

### Data snapshot (published by `services/widgets` on app background + relevant state changes)

```ts
type WidgetSnapshot = {
  verseRef: string;            // "Philippians 4:6"
  // Every practice mode, precomputed — the widget picks one (see Configuration
  // below). All '' if the license forbids persisting text (02 §5).
  textFull: string;
  textBlanks25: string;
  textBlanks50: string;
  textBlanks75: string;
  textFirstLetters: string;    // "B a f n, b i e…"
  autoMode: WidgetPracticeMode; // what the tier ladder resolves to
  memorized: boolean;
  streak: number;
  dueCount: number;            // reviews due
  translationAbbrev: string;   // attribution
  updatedAt: string;
};
```

### Configuration (iOS 17+) — "Show verse as"

Every placed widget, home screen **and** Lock Screen, carries its own practice
mode. Long-press → **Edit Widget** (Lock Screen: Customize → tap the widget)
offers:

| Value | Shows |
|---|---|
| `auto` — "Match my progress" (default) | The tier-based dissolution below |
| `full` | Full verse text |
| `blanks25` / `blanks50` / `blanks75` | Verse with a quarter / half / three quarters of its words blanked |
| `firstLetters` | First letter of each word, monospaced |
| `reference` | Reference only — recall unaided |

Mechanics: `configuration.parameters.mode` in the expo-widgets plugin block of
`app.config.ts` generates a `WidgetConfigurationIntent`; WidgetKit stores the
per-instance choice and passes it to the layout as
`environment.configuration.mode`. **The app cannot read it** — which is why the
snapshot ships every rendering and the layout selects one. Switching modes is
then instant: no app launch, no timeline rebuild. Values are mirrored by
`WidgetPracticeMode` in `services/widgets/modes`; the two must stay in sync.

Any mode whose text is empty (license withheld, or the goal finished) falls
back to the reference-only presentation.

Note: `AppIntentConfiguration` requires iOS 17, so the widget is unavailable on
iOS 16.x even though the app's deployment target is 16.4.

### Widget family specs

| Family | Content | Tap target |
|---|---|---|
| systemSmall | Streak flame + count, due-count pill, verse reference | Today screen |
| systemMedium | **Current verse** at the configured mode, + streak in corner | `practice/[goalId]` |
| systemLarge | Verse (as medium) + this-week grid of practice days + due reviews list (up to 3 refs) | Today |
| accessoryRectangular (Lock Screen) | Reference + the verse at the configured mode | Today |
| accessoryCircular | Streak count | Today |
| accessoryInline | "Phil 4:6 · 12🔥" | Today |

- The tier-based obscuring is the signature, and stays the default (`auto`): full text (tiers 0–2) → 50% blanked (3–4) → first letters (5) → reference only (6/memorized — "you know this one"). The widget quietly tracks your mastery; text dissolves from the home screen as it solidifies in memory. Choosing an explicit mode overrides the ladder — useful for drilling one level, or for keeping a finished passage on the Lock Screen as a daily blank-fill.
- Timeline refresh policy: publish on app close; schedule one entry after local midnight so streak/day state rolls over without opening the app.
- Dark/tinted/clear rendering modes respected via WidgetEnvironment.

### Live Activity (stretch, post-v1)
During an active practice session: chunk progress dots + current accuracy in Dynamic Island. Nice demo, not core.

## 2. Notifications (expo-notifications, all local)

| Type | Default | Copy style | Deep link |
|---|---|---|---|
| Pop quiz (F4) | ≤2/day within 9am–9pm windows | "Pop quiz — Psalm 23:1. 30 seconds." | `review/[itemId]?source=popquiz` |
| Streak guard | 1, evening (only if no activity today) | "3 minutes keeps the streak at 12." | Today |
| Review pileup | Weekly max | "4 passages are fading. Quick rescue session?" | Review queue |
| Challenge events (Phase 2) | On join/completion | — | Challenge screen |

Rules:
- Quiet hours honored; all categories individually toggleable; sensible defaults chosen in onboarding ("Can we quiz you out of the blue? That's the secret sauce." Yes/Later).
- Never notify twice within 3 hours. Never guilt-based copy.
- Notification categories with actions: pop quiz gets a "Later today" action (reschedules once) alongside default open.
- Verse **text** in notification bodies only for license-permitting translations; otherwise reference only.
