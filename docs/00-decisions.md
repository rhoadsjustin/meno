# 00 — Decisions log

Answers to the open questions in `08-roadmap.md` §"Open questions for the human", plus other binding decisions. Newest last.

## 2026-08-26

1. **Bundle ID: `com.rhoadsdev.meno`** (iOS bundleIdentifier and Android package). The Family Controls entitlement request must use this App ID; plan extension IDs as `com.rhoadsdev.meno.shield-config`, `com.rhoadsdev.meno.shield-action`, `com.rhoadsdev.meno.activity-monitor` (M5).
2. **EAS project created and linked**: `@rhoadsjustin/meno`, projectId `6473c486-4b56-4c2c-9365-2ca7eeef6729` (in `app.config.ts` → `extra.eas.projectId`).
3. **Monetization: free.** No paid tier planned. This keeps the app eligible for Crossway's free non-commercial ESV API key (verify current terms when registering — see `02-architecture.md` §5).
4. **Licensed-translation priority: ESV first** (M6). NIV/API.Bible follows later after terms review.

### Still open
- Universal-link / challenge domain (currently `applinks:meno.app` as scaffold in app.config.ts — confirm or replace before M8).
