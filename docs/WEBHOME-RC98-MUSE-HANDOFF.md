# WEBHOME RC98 — Muse handoff (candidate only; stable stays RC19; tv_tested false)

- Baseline: Codex RC97 — preview `webhome-rc97-c60af6aeba4b`, commit
  `540f67c14cb697e45d2773f88e720277f34101c9`, tag `mirror-20261031-rc97-webhome`.
  RC97 preview main SHA `9c0795c81085acfb31f904574415f700849b3918c9269e13c11facac87017d13`.
  Rollback = RC97 preview dir (kept, untouched).
- This release: preview `webhome-rc98-74cf3fa6cc37`, preview main SHA
  `683c12ce2e44df0aef837d4fbd4264f423850336afdb82ed6d82c474109873ad`,
  Pages `https://godroc.github.io/tvbox-resources/webhome/rc98-74cf3fa6cc37/index.html`,
  fast link (after push) `https://gh-proxy.com/https://raw.githubusercontent.com/godroc/tvbox-resources/refs/heads/main/rc98.json`,
  tag (push time) `mirror-20261101-rc98-webhome`.
- Digest note: the documented digest rule (first 12 hex of sha256 over sorted
  bareFilename+sha256hex concat of the 31 app files) gives `74cf3fa6cc37` for RC98
  and was used consistently. The same rule does NOT reproduce RC97's own digest
  (`61139ca57e06` computed vs `c60af6aeba4b` actual) — same situation as RC91,
  recorded, not papered over. Internal consistency holds (preview dir = digest =
  manifest/version records).
- Scope (user instruction 2026-11-01, parent decisions under the standing autonomy
  grant): ONLY (A) real-time status filtering on both pages, (B) posters on search
  cards consistent with detail. Sort button deferred, nothing else touched.

## RC97 baseline state (measured, not assumed)

- Status filtering:
  - Search page: filtering by check status EXISTED in code but had NO on-page
    per-state chips. Surfaces were: Settings search panel (8 state checkboxes,
    `data-gg-check-filter`) + preset buttons (`全部/隐藏失效/仅有效`) in the
    quickHost above `#searchGroups` and in Settings. State persisted as
    `search-check-filter.v1`, default all states (RC94).
  - Home side: QUALITY controls only (`GGResourceView.createQualityControls`,
    synced via `setSharedFilters`). NO status UI on home rails, browse grid,
    or detail.
  - Home rails and browse grid carry Douban subjects with NO check data, so no
    health statuses exist there. The home-side status filter therefore belongs
    on the DETAIL screen entered from home — the only home-side surface with
    health statuses (shared source groups with dots).
  - Key design fact: both pages ALREADY shared ONE filter model. The search
    mount filter and the detail `filterSharedRows` both run `groupFilter`,
    which applies `displayMatch` (quality + `checkFilter` via
    `F.category(row, GGCheckLedger)`). RC98 adds UI + a refresh trigger on top
    of this model, NOT a new model.
- Posters:
  - Search cards (`GGResourceView.create`) were poster-free: health dot + title +
    quality badges + source + date + check-caption, NO `<img>`.
  - Detail: hero poster div (`discovery-detail-poster`, `row.image` or `暂无海报`)
    + shared root artwork layer (`GGSourceArtwork`: `row.backdrop || row.image`,
    else TMDB search by cleaned title + device key with relay fallback, 10s
    rotation, 7s timeouts). Detail group rows inherit `item.image` but render
    no thumbnail.
  - RC93's search-background deletion is untouched by RC98 (card posters only,
    no background shell restored).

## Exact changes (5 files + version labels)

1. `core.js`: added `tmdbPickPoster(results, title, year)` — mirrors `tmdbPickTitle`
   matching (title-key equality + year gate, exactly one match) but returns
   `poster_path` and does NOT require `backdrop_path`. Exported.
2. `resource-view.js`: added `createStatusControls(doc, o)` — fieldset
   `status-filter-controls` with legend, one checkbox chip per state
   (`data-gg-status-chip`, labels identical to the Settings `checkNames`),
   a `全部` button, returns `{node, sync}`. Exported. Mirrors the existing
   `createQualityControls` checkbox-chip pattern (same focusable, TV-proven shape).
3. `app.js`:
   - Added `getStatusFilter()` / `setStatusFilter(list)` — the single funnel for
     ALL status changes: update `checkFilter` + write `search-check-filter.v1` +
     `syncFilterControls()` + `renderFilterViews()` + unconditional
     `gg-shared-filters-changed` dispatch (covers detail opened from the search
     view, where `renderFilterViews` alone does not dispatch). `setStatusPreset`,
     the Settings checkboxes, and the Settings reset button now delegate to it
     (behavior identical, plus the dispatch).
   - Search chip row `#searchStatusChips` (`createStatusControls`, legend
     `状态筛选`) inserted before `#searchGroups`; syncs on
     `gg-shared-filters-changed`, so Settings, presets, search chips, and detail
     chips stay one model.
   - Added `makeSearchCard(row)` wrapper: `makeGroupCard` + a fixed 48×72 poster
     slot (letter fallback = title first letter) + `attachSearchPoster`.
     The search mount `create`, the mix grid, and the legacy list now use it.
     Detail `makeSharedResource` stays `makeGroupCard` (detail rows unchanged).
   - Poster lookup (`lookupSearchPoster` / `attachSearchPoster` / `setPosterImg`):
     `row.image` first via `imageSource()`; else cleaned title
     (`cleanSearchTitle` → `{title, year}`) with a year-aware cache key;
     TMDB search (device key) via `tmdbPickPoster` (w342) → Douban
     subject_suggest direct → server relay; image candidates direct → alt host
     (`images.tmdb.org`) → relay, each through `imageSource()`, 10s watchdog per
     candidate; schedule-bounded (max 2, low priority, same queue as search);
     generation-guarded; failure leaves the letter placeholder — a card is
     NEVER removed or reordered for artwork reasons (RC94 arrival-order +
     keyed reconciler respected).
   - Discovery mount options gained `getStatusFilter` / `setStatusFilter`.
4. `discovery.js`: the detail `sharedFilters` row gains status controls (legend
   `状态`, same component, values from `o.getStatusFilter()`, onChange →
   `o.setStatusFilter()`); a `detailStatusHandler` syncs them on
   `gg-shared-filters-changed`; removed in `close()` and in the `open()`
   prologue alongside the existing handlers.
5. `styles.css`: `.gg-search-poster` (flex `0 0 48px`, 48×72, absolute centered
   letter + absolute cover img, so load/failure causes zero layout shift) +
   `.status-filter-controls` / `.status-options` chip styles +
   `#searchStatusChips` margin + ≤600px rules.
6. Version labels: `GGApp.version` and the index.html brand label RC97 → RC98.
   No other file touched. No backend, Docker, service, or credential changes.
   Stable RC19 untouched. No Codex plan files or `work-codex-*` dirs touched.

## Two real bugs found and fixed during this round

1. `cleanSearchTitle` returns an OBJECT `{title, year}`, not a string. The first
   poster implementation used it as a string: every cache key collapsed to
   `"[object Object]"` and every TMDB/Douban query carried that garbage, so no
   poster could ever resolve. Fixed: destructure `.title` / `.year`, year-aware
   cache key, year passed to TMDB search + pick + Douban year preference.
2. `create()` runs BEFORE `insertBefore`: at `attachSearchPoster` time the new
   card is still detached, so `doc.contains(slot)` is false and the schedule
   `current()` check rejected every poster job deterministically (slots existed,
   zero poster requests ever fired). Fixed: schedule/run guards are
   generation-only; `setPosterImg` tolerates a detached slot with a bounded
   retry (50ms × 20) and still refuses to touch a removed node.

## Verification (separate counts, no screenshots)

- Unit: **29/29** (`tests-rc98.cjs` in the workdir: tmdbPickPoster 9,
  status category 9, status match 2, createStatusControls 9).
- Compat: **0 errors** in RC98's new code (forbidden-token grep over the changed
  files; the single whole-file hit is pre-existing pinyin table data at
  `core.js:162`, not new code). `node --check` passes on all 20 JS files.
- Browser driver (mock bridge + CDP, Chromium 155, 1280×2000 viewport,
  temp preview dirs, deleted after): **full pass** —
  mount, search chip row + legend `状态筛选`, search view, 3 search cards
  (panSelf open; panPub closed by existing design, then expanded), check dots
  `ok+bad`, dot states ok/ok/bad, poster slots 3, poster imgs 2 (TMDB +
  title-cache), letter-only failure card, order + count stable across
  check/artwork updates, Douban-path card found with poster img present AND
  loaded (same-origin stub, `naturalWidth > 0`), search chips 8 all checked,
  uncheck `bad` → 3 cards with the bad card hidden immediately (no navigation),
  re-check → 4 cards restored, home card, detail open, detail chips 8 with
  legend `状态`, detail hero present, detail chip toggle syncs the search chips
  (one model), JS errors 0.
- Build: preview-main diff vs RC97 exactly **2 lines** (GG name + homePage);
  fast↔raw **0 true diffs** (full rewrite rule); archive sha
  `3e2554c3df122449e3bab0a8a4a3576629ec75e78e52cbef3ffbaa5b056cf671`.
- Server preview: **33 files**, main SHA matches the local build, key files
  (main/index/app/discovery/discovery.css) **200**, **157 sites**, GG entry
  `GG · 家庭资源库 [RC98]`.
- No screenshots this round (no `shot.js` in the workdir copy; driver + CDP
  covered verification — RC93/RC94 precedent). None claimed.
- Driver mock notes (mock fidelity, NOT product bugs): the device-key preset
  must be JSON-stringified (`read()` JSON-parses); check rows must carry
  `checked_at`/`expires_at` or the ledger's verifiable rule downgrades ok/bad
  to unknown; visible-only checking (RC95) means a short viewport checks only
  the first cards — the driver used a 2000px viewport.

## Deliberately NOT changed

- Sort button (deferred per user: sorting comes later via a button).
- RC93 search-background deletion (kept).
- Disk filter (still Settings-only per the v7 decision; NOT added to the search
  page — status ≠ disk).
- Detail hero/artwork behavior (verified unchanged).
- Home rails / browse grids (no status UI — they carry no check data).
- Settings checkboxes + presets (kept; same model, three synced surfaces).
- Mix (`综合推荐`) cards gain posters too via the shared `makeSearchCard`
  wrapper — same code path, not a separate change.

## Limitations / real-TV acceptance still pending (tv_tested false)

- Real-TV confirmation needed: chips filter immediately on both pages with
  identical interaction; search posters consistent with detail; no
  flicker/reorder/collapse on the real TV; detail posters unchanged.
- Driver used canned mock data + same-origin stub images, not real TMDB/Douban
  images, provider network, native IME, or real-remote focus. Chip navigation
  mirrors the existing quality-chip pattern but real-remote behavior is
  unconfirmed.
- Poster lookup needs a TMDB key (device settings) or Douban suggest
  reachability from the TV; without either, cards show letter placeholders by
  design (never removed).
- Checks are visible-only by design: below-fold cards stay pending until
  scrolled into view, so their filter state reads as pending until checked.
- Workdir: `~/workspace/webhome-rc98/` (31 app files, `tests-rc98.cjs`,
  `build-publish.cjs`, driver files, `publish/`). Staged dir:
  `/opt/services/tvbox-next/work-muse-rc98/` (NOT pushed — parent pushes).
