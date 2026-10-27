# WebHome RC37 — recent history survives navigation refreshes

Date: 2026-10-27 (Asia/Shanghai)

## Finding

RC36 clears and rebuilds the discovery page on each `home()` call, then fetches `fm.history()` again. Its category buttons change pages on focus, so quickly moving between the home/recommendation tabs or leaving and returning can create overlapping native history requests. Every new `home()` increments the generation and discards older responses. A transient empty/error response from the newest request therefore leaves the recent-history rail absent. The history loader also let one null record throw while mapping the whole array.

## RC37 changes

- Coalesce simultaneous `fm.history()` calls so tab changes share one native request.
- Keep the last valid history snapshot in memory for a 15-second tab-transition window; temporary empty/error results use it. A sustained empty result replaces the snapshot.
- Skip malformed records individually and de-duplicate entries by history key.
- Treat Home and For You as the same already-loaded discovery view; changing focus between these two tabs updates navigation state without clearing/reloading the page.
- No history data is written to persistent storage. Local hide choices still apply on every render.

## Candidate and rollback

- RC36 remains immutable; stable pointers are unchanged.
- RC37 is a new immutable GitHub candidate. Source/config path and accelerated URL are recorded after push in the task handoff.
- Rollback: re-import the existing RC36 configuration. No server service, Cloudflare, firewall, device key, or backend was changed.
- Real TV and phone acceptance remain pending; JavaScript syntax and focused recent-history regression checks are not a substitute for device validation.
