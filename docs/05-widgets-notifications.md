# 05 — Widgets & Notifications

## 1. Widgets (expo-widgets, stable SDK 56)

Widgets are React components with the `'widget'` directive, rendered via Expo UI primitives, configured through the expo-widgets config plugin (which generates the Widget Extension target and App Group during prebuild). Data flows app → App Group storage → widget timeline. Note current limitation: **no image support** in widget Expo UI — design is typographic, which suits us perfectly.

### Data snapshot (published by `services/widgets` on app background + relevant state changes)

```ts
type WidgetSnapshot = {
  verseRef: string;            // "Philippians 4:6"
  verseText: string | null;    // null if license forbids persisting (02 §5)
  firstLetters: string;        // "B a f n, b i e…"
  tier: number;                // drives obscuring level
  streak: number;
  dueCount: number;            // reviews due
  translationAbbrev: string;   // attribution
  updatedAt: string;
};
```

### Widget family specs

| Family | Content | Tap target |
|---|---|---|
| systemSmall | Streak flame + count, due-count pill, verse reference | Today screen |
| systemMedium | **Current verse**, shown per-tier: full text (tiers 0–2), 50% blanked (3–4), first letters (5), reference only (6/memorized — "you know this one"), + streak in corner | `practice/[goalId]` |
| systemLarge | Verse (as medium) + this-week grid of practice days + due reviews list (up to 3 refs) | Today |
| accessoryRectangular (Lock Screen) | Reference + first-letters line | Today |
| accessoryCircular | Streak count | Today |
| accessoryInline | "Phil 4:6 · 12🔥" | Today |

- The tier-based obscuring is the signature: the widget quietly tracks your mastery — text dissolves from the home screen as it solidifies in memory.
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
