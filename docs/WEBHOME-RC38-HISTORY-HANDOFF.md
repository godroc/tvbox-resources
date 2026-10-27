# WebHome RC38: recent history lifecycle

2026-10-27 Asia/Shanghai. Owner: Codex. Candidate only; TV acceptance remains pending.

## Evidence and limitations

- The user reports the recent-history section sometimes disappears when switching. The exact physical-TV trigger has not yet been captured.
- RC36 rebuilds the homepage on focus changes and discards responses from older view generations. RC37 reduces those reloads, but its player-return handler only probes the bridge, so the displayed history does not refresh after playback. Its short-lived fallback can also show records from an earlier configuration.
- In the referenced Silent1566 WebHTV source, `HomeWebBridge.history()` returns `History.get()`; the WebHome SDK documentation describes `fm.history()` as history for the current on-demand configuration and exposes `fm.config().id` for the configuration. Compatibility must still be checked separately on other clients.
- In the browser fixture, closing the history-delete confirmation while the page changes caused two `history.go` calls and navigation to `about:blank`. This was reproduced and addressed; it is not evidence that every TV has the same failure.

## Changes

- Refresh recent history after `fmresume`, `pageshow`, and returning to the WebHome view; use a view/request generation to discard late responses.
- Check the configuration ID before and after `fm.history()` when the host supports `fm.config()`. Discard a response if the ID changed mid-request. A successful empty list is authoritative; there is no cross-configuration fallback cache.
- Keep existing cards and focus during same-configuration refreshes; show loading, empty, or retry status where appropriate. Locally hidden items remain filtered after a refresh. Do not replace a card while its delete dialog is open.
- Avoid repeated browser-history navigation while a previous overlay close is still waiting for `popstate`.
- Continue using a separate immutable candidate and keep RC36/RC37 and stable unchanged.

## Verification and recovery

- `work/test_rc38_history.cjs`: Chromium fixture covering tab focus, player resume, empty new configuration, stale response order, same-configuration error/recovery, focus, switching configuration during a request, and hiding a record. This fixture mocks `fm` and does not prove native SDK or physical-TV behavior.
- Existing overlay-history browser checks: 5/5 passed against the updated script. JavaScript syntax checks passed.
- Candidate assets: `docs/webhome/rc38-af412f927ef5`; public manifest: `webhome-rc38-manifest.json`; tag `mirror-20261027-rc38-history-fix`.
- Rollback: import the unchanged RC36 accelerated configuration at `https://gh-proxy.com/https://raw.githubusercontent.com/godroc/tvbox-resources/mirror-20261027-rc36-webhome/fast/releases/v0.1.0-rc36/main.json`.
- TV validation: play a title, return to WebHome, switch Home/For You and a category then return, switch configurations if desired, and long-press a record to hide it. Record the App and WebView versions and whether focus, displayed history, and the return path behave correctly.
