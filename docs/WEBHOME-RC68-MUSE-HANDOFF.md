# WebHome RC68 — Muse handoff

## Trigger
User-confirmed on real TV 2026-10-29: on RC67, pressing Back on the search view
STILL only shows the App's purple header banner (the App intercepts Back to exit
immersive mode; the page never receives the key). RC67's visible ← 返回首页
button works but sits below the fold (under the source checkboxes), so the user
did not find it. Same day, second user report folded into this RC: 最近观看
delete-mode misfires (see history items below).

## Changes (baseline RC67, rollback RC67 preview dir)
1. **Home button moved**: `<button id="searchHomeBtn">← 返回首页</button>` moved
   from under `#sourceChecks` to a compact row (`.search-home-row`) DIRECTLY
   ABOVE the searchbox, in all three page variants. Exactly one instance.
   Click behavior unchanged from RC67: onBack home path
   (state.favorites=false, setMode('home'), focus homeNav) PLUS an explicit
   reassertChrome() call. The setMode visibility toggle is unchanged
   (button hidden when mode !== 'search'; searchArea is also visible in
   favorites mode, so the toggle still gates on mode).
   Searchbox row geometry (RC66), topbar auto-hide rules, and Back handling
   are untouched.
2. **ArrowUp from #query reaches the home button** (navigation.js): the
   direction branch used to return early for any text entry (cursor
   movement). For the single-line search input, vertical arrows have no
   cursor function, so ArrowUp from `#query` now focuses the visible
   `#searchHomeBtn` when one exists. Left/Right cursor behavior and all
   other inputs are unaffected.
3. **History edit mode** (discovery.js, user instruction):
   - 管理/完成 button DELETED from the 最近观看 rail heading (heading keeps
     just the h2). No `.discovery-history-manage` CSS rule existed, so
     nothing to remove in CSS.
   - Discovery key handler now recognizes DOM key `'Back'` in addition to
     Escape/BrowserBack/GoBack (+keyCode 4 map), so Back exits history edit
     mode even when the App forwards it without keyCode 4. Order kept:
     historyEdit exit FIRST, before modal close, with
     stopImmediatePropagation.
   - 500ms mousedown/touchstart hold trigger REMOVED (startHold, hold
     timer, suppressClick machinery, all six hold listeners). Entry paths
     kept: gg-longpress and contextmenu.
   - AUTO-EXIT: exitHistoryEdit() is now called at the start of browse()
     and open(), so edit mode cannot get stuck across navigation (no-op
     when not editing).
   - WARNING (user instruction acknowledged): after deleting the button,
     entry relies on long-press/contextmenu, which are unreliable on this
     TV per RC59. If the user cannot enter delete mode, a different
     explicit entry must be added then.
4. Nothing else changed: no disk filter row, no 全站， no
   suggestions/keyboard/groups/dots/posters/icon-button changes, no
   JAR/backend/auth/proxy/network changes. Codex files and stable RC19
   untouched.

## Verification (four separate counts)
- Unit: 155/155 (`tests-rc68.cjs` — RC67's 148 + 7 new: button placement
  above searchbox/exactly-one/none-after-sourceChecks in 3 variants, row
  + button CSS rules, manage-button/hold removal guards, discovery Back
  guard, browse/open auto-exit guards, navigation #query-Up guard).
- Compat: 0 errors (explicit file list; only pre-existing CSS min/max
  WARNs).
- Fixture: 249/249 on the first run of the final code (fresh temp dir
  tmp-rc68-fix2, deleted after the run; proxy started before Chrome;
  cleanup in a separate step before the run). New/changed blocks: button
  above searchbox within first viewport (btnTop=21, btnBottom=63,
  formTop=73, vh=719), exactly one button, ArrowUp from input reaches the
  button, no manage button in history heading, heading has no buttons,
  contextmenu enters edit mode, Back key exits edit mode, 600ms hold does
  NOT enter edit mode, browse navigation exits edit mode, detail open
  exits edit mode — plus all RC67 blocks still passing (button click
  returns home + re-applies chrome, hidden on home/favorites, Back key
  returns home from search view).
  - First fixture run on the pre-history code was 244/245: the only
    failure was "arrow up from input reaches home button" — root cause
    was the navigation.js text-entry early return (see change 2), fixed
    in product code, not by weakening the test.
- Screenshots: 7 saved in the workdir shots/; 01-home + 02-search
  eyeballed — 02-search shows ← 返回首页 directly above the searchbox
  with the searchbox untouched; 01-home shows no button and the 最近观看
  heading without 管理.

## Publication
- Server preview: webhome-rc68-f25e535022f8, main SHA
  7b714e16ae137cff3377cf0f1fc066750f562dcc129992fa66c603e4b97ffe6f,
  157 sites, GG entry `GG · 家庭资源库 [RC68]`.
- GitHub staging: rc68, tag mirror-20261029-rc68-webhome,
  pages_suffix rc68-f25e535022f8, staged dir
  /opt/services/tvbox-next/work-muse-rc68/. Fast link is 404 pre-push
  (expected); preview link verified 200.
- Rollback: RC67 preview dir (kept). Stable stays RC19, tv_tested false.

## Acceptance (per verification skill)
Real-TV-pending — never claimed from simulation. The real TV still needs
to confirm: the top home button is visible without scrolling and its tap
returns home AND dismisses the App banner; history delete mode entry
(long-press/contextmenu) still reachable after the button deletion.
