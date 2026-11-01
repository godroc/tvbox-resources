# WEBHOME RC99 — Muse handoff (candidate only; stable stays RC19; tv_tested false)

- Baseline: Muse RC98 — preview `webhome-rc98-74cf3fa6cc37`, commit
  `90ce7c9`, tag `mirror-20261101-rc98-webhome`.
  RC98 preview main SHA `683c12ce2e44df0aef837d4fbd4264f423850336afdb82ed6d82c474109873ad`.
  Rollback = RC98 preview dir (kept, untouched).
- This release: preview `webhome-rc99-22483a91447a`, preview main SHA
  `71c525fd7227c432f4199fe295b80386d4489def3e59855beb7ad6fc32413bbf`,
  Pages `https://godroc.github.io/tvbox-resources/webhome/rc99-22483a91447a/index.html`,
  fast link (after push) `https://gh-proxy.com/https://raw.githubusercontent.com/godroc/tvbox-resources/refs/heads/main/rc99.json`,
  tag (push time) `mirror-20261101-rc99-webhome`.
- Digest note: the documented digest rule (first 12 hex of sha256 over sorted
  bareFilename+sha256hex concat of the 31 app files) gives `22483a91447a` for
  RC99 and was used consistently. RC97's own digest remains unreproducible
  by this rule (recorded in RC98 handoff, not papered over).
- Scope (user instruction 2026-11-01 19:46, after his 19:34 feedback on RC98):
  ONLY (a) all chips transparent, (b) status shown as 4 groups on both pages
  (Settings keeps the full 8), (c) gentle re-filter of expanded groups when
  checks land + detail status change refreshes groups directly. Sort button
  still deferred, nothing else touched.

## User feedback that drove RC99 (2026-11-01 19:34, verified in code)

1. 状态背景应与画质一样透明 — confirmed: quality chips were forced
   transparent by `resource-view.css:42` (`!important`); RC98 status chips
   got solid `#1b2530` in `styles.css:166` and were never added to that
   override. All BUTTON chips were already transparent via
   `resource-view.css:39` (`button{background:transparent!important}`).
2. 状态之前好像只有 4 个，现在怎么这么多 — confirmed: the internal filter
   model always had 8 states (`search-filters.js`: ok/bad/locked/pending/
   unknown/timeout/unsupported/rate_limited). The "4" he remembered = the card
   health DOT's 4 visible colors (ok green, locked yellow, uncertain/limited
   white, bad red; unsupported hidden). Before RC98 the 8 existed only as
   Settings checkboxes + 3 presets; RC98 surfaced all 8 as on-page chips.
   SDK raw check states are a separate set of 5
   (ok/bad/locked/unsupported/uncertain).
3. 展开后不按画质和状态重新筛选吗，感觉筛选不对 — mostly confirmed with
   three gaps: (a) check results arriving AFTER expansion did not re-filter
   (source-groups `onChecks` and discovery's shared-path handler only called
   `updateStatus`, dots/captions only); (b) quality is title-text-derived,
   rows with no quality tags pass when `keepUnknownQuality` is on (default),
   so quality filtering legitimately looks loose; (c) focused-card hold —
   `displayMatch` bypasses the filter for the currently focused card
   (caption appends "· 移开焦点后隐藏"), by design but reads as a bug.
   (b) was already stated in UI (quality control note "仅来源标注" +
   "保留未标注" checkbox, verified — no change). (c) is by design — no
   change. (a) is fixed by RC99.

## Exact changes (6 files + version labels)

1. `search-filters.js`: added + exported `statusGroups` — 4 groups partitioning
   the 8 states: ok→有效 [ok], locked→需提取码／锁定 [locked],
   unconfirmed→待确认 [pending, unknown, timeout, unsupported, rate_limited],
   bad→确认失效 [bad].
2. `resource-view.js` `createStatusControls`: new `o.groups` mode — parallel
   `members[]` arrays; `emit` expands checked groups to member states via
   `canon()` (sorted by `F.states` order, so grouped emit matches 8-chip
   storage byte-for-byte); sync rule: group checked ⟺ ALL its members are in
   the filter (strict-all); 全部 button → all members (= all 8). Default
   no-groups mode unchanged (8 chips, still used nowhere on-page after RC99
   but kept for Settings compatibility).
3. `app.js`: search status controls creation passes
   `groups:F.statusGroups` (legend 状态筛选 unchanged).
4. `discovery.js`: detail status control passes
   `groups:(root.GGSearchFilters&&root.GGSearchFilters.statusGroups)||null`;
   onChange now also calls `scope.groups.refresh()` directly after
   `setStatusFilter` (like quality). Line 174 `detailFilterHandler`
   (updateStatus only) deliberately left as-is — redundant but harmless.
5. `source-groups.js`: new `refilter()` — recomputes `visible=filtered(s)`
   for every group, preserves open state, clamps pagination window
   (start ≥ len → reset first page; limit > len → limit=len), renders
   (keyed reconciler preserves arrival order + focus). `onChecks` now =
   `updateStatus()` immediately + 150 ms debounced `refilter()` guarded by
   generation/alive. `refilterTimer` cleared in `reset()`/`pause()`/
   `destroy()`. Explicit `refresh()` (filter changes) still resets window
   to first page — unchanged.
6. CSS: `styles.css:166` status chips `background:#1b2530` → `transparent`;
   `resource-view.css:42` override extended to
   `.filter-chip,.quality-options>.filter-chip,.status-options>.filter-chip,.source-check,.source-check-all`
   (all `background:transparent!important`).
7. Version labels: `GGApp.version` RC98→RC99 (app.js), index.html brand
   `WEBHOME · RC99`.
8. Driver only (not shipped): `driver-assert.js` gains a settle wait after
   the home-nav click (see "harness race" below).

## Harness race found and fixed during this round (NOT a product bug)

- Symptom: detail modal opened from a home card closed by itself within ~3 s
  in the driver; `detailRows=false`, `detailBadRestored=false`.
- Root cause (proven with close-stack + overlay-history tracing, debug runs
  dbg3–dbg7): the driver clicked discovery tabs while the app was in SEARCH
  mode (searchArea + resultsSection back-layers, history depth 2), then the
  mode switch to home ran `history.go(-2)`; the home-card click's `open()`
  landed in the ~70 ms window before that `go(-2)`'s popstate delivered, so
  `closeToDepth(0)` clicked the just-opened modal's close button.
- Why it cannot happen on a real TV: hidden discovery tabs are unreachable
  by remote navigation — the driver used `.click()` on hidden elements, an
  impossible input. On TV the mode switch settles long before any card can
  be opened (seconds, not milliseconds).
- Fix (driver only): after the home-nav click, wait for `discoverySection`
  visible + `searchArea` hidden, then sleep 600 ms, before searching for home
  cards. Full driver then passes with genuine (non-vacuous) detail
  assertions. No product code changed for this.

## Verification (separate counts, no screenshots)

- Unit: **41/41** (`tests-rc99.cjs`: RC98's 29 kept + 12 new — statusGroups
  keys/labels/partition of the 8 states; grouped control chip count 4 +
  全部 = 5 children, values [ok,locked,unconfirmed,bad], sync all-members
  rule, partial-members → unchecked, unconfirmed toggle emits its 5
  members, 全部 emits all 8). One test expectation was corrected during the
  run (canonical order puts `bad` before `locked`) — implementation was
  right, test was wrong.
- Compat: **0 errors** in RC99's new code (forbidden-token grep over the
  changed files). `node --check` passes on all 21 JS files.
- Browser driver (mock bridge + CDP, headless shell 156, 1280×2000,
  temp fixture dirs, deleted after): **full pass** — mount, search chip row
  + legend 状态筛选, search view, presetHideBad, gentleBadRemoved=true with
  gentleCards=2 (bad-test rendered as pending, then vanished when its check
  landed bad, with NO filter toggle — the core RC99 fix), restoredBad,
  restoredCards=3, dotStates ok/ok/bad, poster slots 3, poster imgs 2 (TMDB +
  title-cache), letter-only = 测试影片, stableOrder + stableCount, Douban
  card + poster loaded (naturalWidth > 0), searchChips=4 values
  [ok,locked,unconfirmed,bad] all checked, afterBadOff=3/badHidden,
  afterBadOn=4/badRestored, homeCard, detailOpen, detailChips=4 values
  [ok,locked,unconfirmed,bad] legend 状态, detailHero, detailRows=true,
  detailBadHidden=true, detailBadRestored=true, detailToggleSyncsSearch=true
  (all genuine now — modal stayed open, container-scoped queries real),
  chipBg every sampled chip class computed `rgba(0, 0, 0, 0)` (quality/
  status/settings filter-chips, source-check, disk/scope/chart/
  discovery-filter/detail-filter chips incl. .active, realStatusChips ×4),
  jsErrors=[].
- Build: preview-main diff vs RC98 exactly **2 lines** (GG name + homePage);
  fast↔raw **0 true diffs**; archive sha
  `24cda9d80690c3a205c8bf276e4f7209c9cf4856e67e2c0f8c7b20079f2d03ee`.
- Server preview: **33 files**, main SHA matches the local build, key files
  (main/index/app/discovery/discovery.css) **200**, **157 sites**, GG entry
  `GG · 家庭资源库 [RC99]`.
- No screenshots this round (driver + CDP covered verification — RC93/RC94
  precedent). None claimed.

## Deliberately NOT changed

- Sort button (still deferred).
- RC93 search-background deletion (kept).
- Quality unknown-pass rule + focused-card hold (by design, see above).
- Settings checkboxes (still full 8 — the grouped 4 is a display grouping
  only; stored filter values remain the 8 member states).
- Detail hero/artwork behavior, home rails / browse grids (no status UI —
  they carry no check data), disk filter (Settings-only), mix cards.
- Stable RC19 untouched. No backend, Docker, service, or credential changes.

## Limitations / real-TV acceptance still pending (tv_tested false)

- Real-TV confirmation needed: 4-group chips consistent on both pages;
  check-arrival re-filter visible on TV (a pending card that turns bad
  disappears without touching any filter); all chips transparent on TV;
  no flicker/reorder.
- Driver used canned mock data + same-origin stub images, not real
  TMDB/Douban images, provider network, native IME, or real-remote focus.
- Checks are visible-only by design: below-fold cards stay pending until
  scrolled into view.
- Workdir: `~/workspace/webhome-rc99/` (31 app files, `tests-rc99.cjs`,
  `build-publish.cjs`, driver files, `publish/`). Staged dir:
  `/opt/services/tvbox-next/work-muse-rc99/` (NOT pushed — parent pushes).
