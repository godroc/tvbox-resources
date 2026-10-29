# WebHome RC64 — Muse handoff (candidate only; stable stays RC19)

- **Baseline:** published RC63 files from server preview
  `webhome-rc63-96185ff5bf38` (NOT RC61). RC62/RC63 optimizations kept
  by definition: TV topbar 36px, home title 21px, rail heading 26px,
  category 22px, RC63 native-key entry button + separate-key explanation,
  RC63 missing-key folder + vod_name=exact query, RC63 JAR
  (MD5 4ecfbf94c84bd1f889ceaebfe26a2bda). JAR/backend/auth/proxy/
  network untouched.
- **Owner change 2026-10-29:** user reassigned RC64 from Codex to Muse
  ("你来开发", Codex waiting). Codex's plan file and work-codex-*
  directories were NOT touched. Codex started no code (plan + backup only).
- **Server preview:** `https://tv.godroc.dpdns.org/next/previews/webhome-rc64-284f0b88641f/main.json`
  — main SHA `ab276c5a584aebd0d327c1bb34284f951c8cc7341ce9ef78383b2c890bbbcdb1`,
  157 sites, GG entry `GG · 家庭资源库 [RC64]`, tv_tested false.
  Rollback: RC63 preview dir (kept).
- **GitHub staging:** staged dir `/opt/services/tvbox-next/work-muse-rc64/`
  (main.json + 14 app files from the preview dir), builder
  `/opt/services/tvbox-next/tools/build_github_release.py` with rc `rc64`,
  tag `mirror-20261029-rc64-webhome`, pages_suffix `rc64-284f0b88641f`.
  **STAGED ONLY — NOT pushed. Parent performs git push + user delivery.**
  Fast link (after push): `https://gh-proxy.com/https://raw.githubusercontent.com/godroc/tvbox-resources/refs/heads/main/rc64.json`

## What changed (brief items 1–14)

1. **Search layout rebuilt:** TV left column = input row + 6x6 A-Z/0-9
   keyboard + 退格/清空 (7 rows: 6,6,6,6,6,6,2 = 38 keys); right column =
   suggestion panel; mobile stacks (media query ≤760px). Left sidebar /
   Search Tools panel removed entirely.
2. **Home Search + homepage Search quick action open OUR webpage search**
   (RC62's native entry reverted as default). Exactly one jump-to-native
   button remains on the search screen (`原生搜索`, existing nativeSearch /
   fm.search direct action). Search never auto-jumps to native.
3. **Sources as checkboxes** in the left column under the keyboard:
   master 全选 + 资源 / 盘搜 / 觅搜 / 趣盘， all checked by default
   (= old 全部 behavior). Persisted in `gg.webhome.search-sources.v1`.
   Checking filters groups LOCALLY only — every query always fetches all
   four pan-family groups in parallel (RC61 lesson: single-mode fetch
   breaks pan↔mipan/qupan dedup), then filters locally. Unchecking all
   sources shows `未选来源：请在左侧勾选至少一个来源`.
4. **Disk row removed from the search screen.** Search groups respect
   Settings disk prefs (`displayDisks` / `displayDisksOnly` / `diskOrder`):
   displayDisksOnly on → only those disks; otherwise all disks, ordered by
   diskOrder. Settings search tab disk settings kept (RC61).
5. **Right panel:** empty input shows 历史搜索 (recent.v1, ≤8) on top +
   热门搜索 below (titles from the same Douban hot collections RC58 charts
   used: hot-tv/hot-movie/hot-variety, dedup, cap 12), both as chips,
   click → immediate search. Typing switches the panel to 联想建议.
   Clearing the input switches back.
6. **Suggestions: iQiyi + Tencent + Douban, ALL DIRECT via fm.req**
   (directGet-style, no queue). Server relay NEVER used (no
   douban-suggest relay, no fallback). Parallel, 8s timeout each, first
   arrival renders, slow sources never block. Per-source cap 4, total cap
   12, round-robin interleave Douban → iQiyi → Tencent, dedup by title
   (keep first arrival). One source failing never affects the others,
   no error popup; all three failing AND local empty shows the existing
   non-clickable `建议暂不可用，点“搜索资源”直接搜` note (not a
   suggestion item, arrow keys skip it). Local matches (recent +
   favorites + pinyin-initials via initialsOf/rankSuggestions) render
   immediately. 250ms debounce + generation guards; stale responses never
   overwrite current input. Input search icon submits; suggestion click
   searches immediately.
   - iQiyi endpoint VALIDATED from the server 2026-10-29:
     `https://suggest.video.iqiyi.com/?if=mobile&key=…` returns
     `{"code":"A00000","data":[{"name":…}]}`; A00004 = empty (treated as
     no-items, not an error).
   - **DEVIATION — Tencent is a documented empty stub:** no public
     unauthenticated Tencent suggestion endpoint could be validated
     (probes: s.video.qq.com/smartbox → empty/timeout;
     node.video.qq.com/x/api/search_suggest → 404; web search found no
     usable endpoint). The slot resolves `[]` with per-source isolation,
     so it cannot affect Douban/iQiyi. No Tencent URL was invented or
     shipped. The fail note therefore triggers when both LIVE sources
     (Douban + iQiyi) fail + local empty + no remote items; the stub
     counts as neither live success nor live failure.
   - Douban: `https://movie.douban.com/j/subject_suggest` direct, 8s,
     Referer + UA headers.
7. **Suggestion chips show TITLE ONLY** — no source tags anywhere on
   suggestions or results.
8. **Rename:** every user-visible 参考 → 资源 (checkbox label, group
   headings `资源 · 玩偶`, settings text, detail progress `资源 3`).
   Internal keys/STORE names unchanged (`gg-reference-search-sites-v1`,
   `searchRef`, `ref` group key).
9. **Quality badges on ALL search result cards** (资源/盘搜/觅搜/趣盘）
   via the existing qualityBadges helper. DISPLAY-ONLY: badges never feed
   preselect or ranking (preselect stays REAL clarity + detection status;
   title claims never count).
10. RC62/RC63 optimizations kept (see baseline above).
11. **Artwork:** provided source artwork kept. Search cards without an
    image get async enrichment with EXACT title (+year when known) match
    only — device TMDB key when present (directGet tmdbSearchUrl →
    tmdbPickPoster → imageSource), else Douban direct (subject_suggest →
    doubanSuggestPoster → imageSource). Never blocks rendering, never
    guesses, placeholder on uncertainty/failure. Per-title cache (cap 200)
    + per-card enriched guard.
12. Kept: hidden topbar + reveal rules (RC60), category tabs row always
    visible, favorites flat grid + pagination + edit mode + 完成 button,
    detail behavior, history artwork cache, push_agent→网盘 mapping.
13. **全站 (all 157 subscription sites) NOT implemented as an in-page
    source — explicit note:** no API returns aggregated native results to
    the page, and faking that scope is forbidden (RC64 plan). There is NO
    全站 checkbox. The 原生搜索 button is the all-subscription path
    (native search polls subscription sites flagged searchable; the pan
    family is excluded by quickSearch 0, per the user's own 2026-10-28
    TV finding). Mockup v5–v8 showed a 全站 checkbox with fake site
    names; that was mockup-only and was deliberately NOT built.
14. Result cards: 6 per row at 1280 (195px, gap 14px); small screens 3 per
    row. No settings parameters on the search screen (they live in
    Settings tabs).

## Removed (grep-verified dead code)

renderSearchDiskChips, renderSearchModeTabs, applySearchMode, searchMode,
renderRecent, renderSearchCharts, applySourceOrder, openNativeSearchInput,
sidebar `.source` wiring, `.search-scope-chips`, `#groupGrid`, `.filters`
block on the search screen. `state.disk` kept always '' (inspect shape
stable). All three page variants (index.html, fixture.html,
fixture-shot.html) carry every element app.js wires at mount
(webSearchFallback + nativeKeySetup were added to the fixture modals,
which predated them) + `body class="gg-topbar-hidden"`.

## Verification (all gates pass)

- Unit: **124/124** (tests-rc64.cjs; +25 new: merge interleave/caps/
  dedup/blanks/nulls, both suggest parsers incl. A00004 empty + bad JSON,
  visibleSearchGroups, tmdbPickPoster exact/year-mismatch/near-title,
  doubanSuggestPoster exact/year-mismatch/non-http, qualityBadges
  4K/1080P/plain).
- compat-scan.cjs: **0 errors**.
- Fixture: **208/208** (fixture-run.js rewritten for the new search
  screen; first run 205/208 on timing flakes only — hot-chips wait now
  async-aware, focus test passed on the fresh re-run; no code change).
  Covers: 6x6 keyboard (38 keys, 7 rows), source checkboxes, history/hot
  panel, 3-source suggestions, douban-fail isolation (iQiyi survives),
  all-fail note, side-by-side geometry (panelLeft 684 ≥ kbRight 664),
  groups total 9 (panSelf 3 + panPub 3 + mipan 1 + qupan 2 after dedup),
  displayDisksOnly → count 2, uncheck 盘搜 → count 3 locally (dedup
  lifts, no refetch), uncheck all → 未选来源， master 全选 → count 9,
  badges on search cards (4 of 9 badged) + pan cards (4K/1080P),
  6-per-row geometry (189.8px cards), 资源 rename, native button,
  initials `cs` → SH测试影片， plus all kept non-search blocks
  (home 6-col, fonts 21/22px, topbar 36px, favorites/history edit,
  chrome re-assert, TMDB settings).
- Screenshots: 7 saved (`shots/` in the workdir); 01-home + 02-search
  eyeballed — home: hidden topbar, tabs first, 6-col rails, 玩偶 badge;
  search: 6x6 keyboard + source checkboxes left, title-only suggestion
  chips right, exactly one 原生搜索 button, no disk row/mode tabs/sidebar.
  (Shot-page footer text fixed to RC64 after the shots; footer is
  fixture-only, never shipped.)
- Server preview verified: main/index/app/discovery/discovery.css 200,
  main SHA matches local build, 157 sites, GG name [RC64].
- GitHub staging verified (see staging section below; parent pushes).
  Staging verification 2026-10-29: clone git status shows ONLY `??`
  additions; fast↔raw diffs 72 / true 0 (all gh-proxy rewrites);
  version.json static_sha256 0 mismatches vs staged files; tv_tested
  false; GG homePage = Pages URL in both fast and raw; secret scan
  scoped to new files shows only benign code identifiers (password field
  names, mipanToken runtime variable, routeToken, Bearer identifier).

## Files

- Workdir: `~/workspace/webhome-rc64/` (14 app files + tests-rc64.cjs +
  build_publish.py + fixture files + compat-scan.cjs + shots/).
- Payload: `/opt/services/tvbox-next/work-muse-rc64/` (staged, NOT pushed).
- This handoff: `/opt/services/tvbox-next/docs/WEBHOME-RC64-MUSE-HANDOFF.md`.
- DEPLOYMENT.md: RC64 build entry appended (staging status; parent adds
  the push commit after pushing).

## Known limitations carried over

tv_tested false; stable RC19; history deletion is page-local suppression
only; link-check wiring never live-verified with a real device key; no
real-clarity probe; preselect only considers rendered candidates;
pan-mode health re-sort not implemented; fm.cache migration for prefs
not done (only the artwork map); pre-RC59 history icons recover on next
play, not retroactively; episode-1 resume may be App push-chain progress
(question pending with user); Tencent suggestions are a stub until a
validated endpoint exists (see deviation above).
