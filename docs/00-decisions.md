# 00 — Decisions log

Answers to the open questions in `08-roadmap.md` §"Open questions for the human", plus other binding decisions. Newest last.

## 2026-08-26

1. **Bundle ID: `com.rhoadsdev.meno`** (iOS bundleIdentifier and Android package). The Family Controls entitlement request must use this App ID; plan extension IDs as `com.rhoadsdev.meno.shield-config`, `com.rhoadsdev.meno.shield-action`, `com.rhoadsdev.meno.activity-monitor` (M5).
2. **EAS project created and linked**: `@rhoadsjustin/meno`, projectId `6473c486-4b56-4c2c-9365-2ca7eeef6729` (in `app.config.ts` → `extra.eas.projectId`).
3. **Monetization: free.** No paid tier planned. This keeps the app eligible for Crossway's free non-commercial ESV API key (verify current terms when registering — see `02-architecture.md` §5).
4. **Licensed-translation priority: ESV first** (M6, Crossway's API). **Every other licensed translation comes from the YouVersion Platform** (decided 2026-10-25): NIV, NASB, NVI and the rest of its catalog, ephemeral by default (see `02-architecture.md` §5). API.Bible is not used. ESV, KJV, NLT, CSB and RVR1960 are not on the Platform.

### Still open
- Per-version license review before any Platform version becomes cacheable, including whether Blanks and First Letters count as modifying the text.
- Universal-link / challenge domain (currently `applinks:meno.app` as scaffold in app.config.ts — confirm or replace before M8). 2026-10-25: meno.app and meno.com are both taken by operating businesses; meno.bible is available. Findings and the custom-domain steps are in `docs/ship/domain-options.md`.
