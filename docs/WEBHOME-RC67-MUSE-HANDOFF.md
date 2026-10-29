# WebHome RC67 — Muse handoff

- Baseline: RC66 (commit 965ba76, preview webhome-rc66-7691b9807b4b, main SHA f54c62b6805aa75439954d8070a693334072fe4189c63ccdd8d081a666ab9c44 — verified from the server before any change).
- Rollback: RC66 preview dir (kept). Stable stays RC19. tv_tested false. Candidate only.
- Trigger: user-confirmed on real TV 2026-10-29 — pressing Back on the search view shows ONLY the App's purple header banner and does NOT return home. RC65/RC66 Back logic itself is correct (search-view branch calls onBack → setMode('home'), does not stop propagation, so the chrome-reassert listener still runs) — conclusion: the App intercepted Back to exit immersive mode and the page never received the key. A pure key-handler change cannot fix a key the page never gets.

## Changes (only these)

1. Visible home button on the search view: `<button id="searchHomeBtn" type="button" class="search-home-btn">← 返回首页</button>` in the search view's left column directly UNDER `#sourceChecks`, in all three page variants. Click = exactly the onBack home path (`state.favorites=false; setMode('home'); homeNav.focus()`) PLUS an explicit `reassertChrome()` call (a click produces no keydown, so without this the App header would stay even after going home). Searchbox row geometry (RC66) untouched; topbar auto-hide rules untouched; existing Back behavior untouched.
2. Search-view-only visibility: the button lives inside `#searchArea`, but `setMode` also toggles it (`hidden = mode !== 'search'`) because `searchArea` is ALSO visible in favorites mode (`hidden = home || sites`) — markup placement alone would have leaked the button into favorites view. This is a deliberate, documented deviation from "hidden by markup alone".
3. Back-key hardening: DOM key `'Back'` is now a Back key in both `navigation.js` `isBack` and the app.js chrome-reassert keydown listener, in case the App forwards Back with key `'Back'` and keyCode 0 (no keyCode 4). All existing Back keys (Escape/BrowserBack/GoBack/keyCode 4/27) work exactly as before.
4. CSS: `.search-home-btn` rule appended (block, full left-column width, 12px top margin, secondary outlined style, 14px). No other style changes.

Nothing else changed: no disk filter row, no 全站， no suggestions/keyboard/groups/dots/posters/icon-button changes (RC66's icon button verbatim), no JAR/backend/auth/proxy/network changes. Codex files and stable RC19 untouched.

## Verification (four separate counts)

- Unit: 148/148 (`tests-rc67.cjs` — RC66's 139 + 9 new: button markup in all 3 variants after sourceChecks, CSS rule present, reassert-listener `'Back'` source guard, and a REAL `isBack` test via `navigation.js` mounted on a stub document: `'Back'`/keyCode 0, `'Escape'`, `'BrowserBack'` all trigger onBack; non-Back key does not). Note on split: mount behavior (click → home + chrome, arrow reachability, Back-key end-to-end) is proven in the fixture, not the unit file — same split as prior RCs.
- Compat: 0 errors (`compat-scan.cjs` over the 14 app files + 3 pages, explicit file list; only pre-existing CSS min/max WARNs).
- Fixture: 243/243 on first run, no transient errors, no rerun needed. Fresh temp dir `tmp-rc67-fix1` (deleted after the run); proxy started before Chrome; process cleanup done in a separate step before the run. New RC67 assertions (11): button exists, label + type, visible on search view, ArrowDown from last source checkbox reaches the button, click returns home, hidden on home view, click re-applies chrome (3 → 4), `'Back'` key returns home from search view, `'Back'` key re-applies chrome (4 → 5), hidden in favorites view (searchArea visible there), topbar re-hide restore. All prior blocks still pass.
- Screenshots: 7 saved in `~/workspace/webhome-rc67/shots/`; 01-home + 02-search eyeballed — 02-search shows the ← 返回首页 button under the source checkboxes with the RC66 searchbox untouched; 01-home shows no button and no regression.

## Publication

- Server preview: `webhome-rc67-c9bb3152b9c7`, main SHA `5c993727942be5839c4e36307f8a00e9b12d584de8b7516177ed40e4dbd95fa3` (matches local build), 157 sites, GG entry `GG · 家庭资源库 [RC67]`.
- GitHub staging: rc `rc67`, tag `mirror-20261029-rc67-webhome`, pages_suffix `rc67-c9bb3152b9c7`, staged dir `/opt/services/tvbox-next/work-muse-rc67/`.
- Fast link is 404 pre-push (expected — it goes live only after the parent pushes main + tag).

## Acceptance (per the verification skill)

Real-TV-pending — never claimed from simulation. The real TV still needs to confirm: the home button tap returns home AND dismisses the App banner, and Back behavior on the search view. Rollback candidate: RC66 preview dir.
