# WebHome RC61 — Muse handoff

Preview: https://tv.godroc.dpdns.org/next/previews/webhome-rc61-9fe46e042d48/
Rollback: RC60 preview (kept). Stable still RC19. tv_tested false.

## Trigger
User 2026-10-28 22:05–22:11: (1) home posters fine, fonts still too small;
(2) search page too ugly — rebuild it around OUR search features
(盘搜/觅搜/趣盘， source selection, disk filter) following a mature solution;
(3) no setting parameters on the search screen — settings go in a
Settings-page tab; (4) UI as simple as possible: clean, intuitive,
easy to operate, feature-complete.

## Changes
1. Home fonts one more step up (RC61 fonts, verified before the search work):
   card titles 17→19px, rail headings 21→24px, category tabs 18→20px,
   year 13→14px, rating 12→13px, status 13→14px, source badge 12→13px,
   topbar brand 13→15px, navlink 16px; small screens tabs 16→18px,
   rail headings 17→19px. Poster sizes untouched.
2. Search screen minimal rebuild (app.js + 3 page variants + styles.css):
   - New mode tabs under the input (built by JS): 全部 / 参考 / 盘搜 /
     觅搜 / 趣盘 / 原生. 原生 is an action (jumps to host search), not a
     mode. Mode persists in gg.webhome.search-mode.v1.
   - Results grouped by source: 盘搜 · 自建 / 盘搜 · 公共 / 觅搜 / 趣盘,
     each with count + per-group retry. Reference results stay in the
     existing #referenceResults section (reference-search module untouched).
   - One disk-chip row above the groups (single-select, configured disks
     first, counts from current rows). Empty groups hide under a filter.
   - One query fetches all four pan-family groups in parallel and renders
     progressively; mode switching is a local re-render only (no refetch),
     so pan↔mipan/qupan dedup (by GGCore.dedupKey) stays correct in every
     mode. This was a real bug found by the fixture: single-mode fetch
     left pan rows empty and mipan showed the duplicate.
   - Charts are empty-state only now (hidden once a query exists).
   - Removed from the search screen: scope chips, native lane, the whole
     .filters block (provider/quality/sort/since/minSize/exclude/
     keepUnknown/reset), groupView + disk-group grid. Favorites still use
     the flat grid + pagination (unchanged path in renderResults).
3. Settings gains a tab row (设备连接 / 搜索设置):
   - Search tab holds: 参考站点 (NEW synced selector — writes BOTH
     prefs.searchRef AND the gg-reference-search-sites-v1 store, so the
     search page and detail stop disagreeing), 优先显示网盘， 仅显示已选网盘，
     详情预查盘搜/觅搜， 网盘优先顺序， 每页数量， and the moved
     搜索默认值 (quality/sort/since/minSize/exclude/keepUnknown/reset —
     same ids, same changeFilters wiring, same filters.v1 persistence).
   - 搜索后先显示网盘分组 checkbox removed (dead: source grouping is
     always on now). prefs.grouped key left untouched in stored data.
   - Settings opens on the device tab with the device key focused.
   - Sidebar source buttons now switch search mode (all/pan) instead of
     the removed state.source filter; favorites path keeps old behavior.
4. Removals (dead code, verified by grep): runProvider, setProvider,
   renderNativeLane, renderScopeChips, updateNativeLabels, fetchNativeCount,
   renderDiskFilters, makeGroup/updateGroup, groupView + providerFilter
   wiring, prefs.searchSelf/searchNative init, startGrouped UI.

## Verification
- Unit 99/99, compat 0 errors, fixture 200/200 (was 184/184; new blocks:
  mode tabs, settings-tab ref sync, 9-row group totals, disk filter
  9→5→9, mipan-only mode count 1, all-mode restore, native tab jump,
  settings tab switching, search-group card in topbar focus pick).
- 7 screenshots; 01-home + 02-search eyeballed (bigger fonts, one clean
  mode-tab row, no clutter).
- Server preview: main SHA matches local build, 5/5 URLs 200, 157 sites,
  GG · 家庭资源库 [RC61].

## Known limitations (unchanged)
- History deletion is page-local only; no real-clarity probe; link-check
  never live-verified with a real device key; tv_tested false.
- Disk chips filter pan-family groups only, not the reference section
  (reference-search module owns its rendering).
- Sidebar counts in reference mode show the pan groups total (0 when no
  pan groups fetched for display); cosmetic, desktop chrome only.

## GitHub
- Fast link: (filled after push)
- Commit: (filled after push)
- Tag: mirror-20261028-rc61-webhome
