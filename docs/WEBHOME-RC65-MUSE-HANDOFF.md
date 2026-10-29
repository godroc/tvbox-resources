# WebHome RC65 — Muse handoff (candidate only; stable stays RC19; tv_tested false)

- Baseline: RC64 (preview `webhome-rc64-284f0b88641f`, commit `8fa6969`).
- Preview: `https://tv.godroc.dpdns.org/next/previews/webhome-rc65-4c690cdc49d9/main.json`
- Main SHA: `2313d33e660fc05cc45f611f3a66a35e188eb3638a2faace5bbbf8cd97fb22f3`
- Sites: 157. GG entry: `GG · 家庭资源库 [RC65]`.
- Rollback: RC64 preview dir (kept).
- GitHub staging: `/opt/services/tvbox-next/work-muse-rc65/` (main.json + 14 app files from the preview dir),
builder `/opt/services/tvbox-next/tools/build_github_release.py` with rc `rc65`,
tag `mirror-20261029-rc65-webhome`, pages_suffix `rc65-4c690cdc49d9`.
- **STAGED ONLY — NOT pushed. Parent performs git push + user delivery.**
- Fast link (after push): `https://gh-proxy.com/https://raw.githubusercontent.com/godroc/tvbox-resources/refs/heads/main/rc65.json`

## Trigger

User's real-TV review of RC64 (2026-10-29 12:35, with photos):
(1) the 从一次搜索开始 welcome section is unnecessary; (2) the two search
buttons look messy; (3) Back should exit the search screen on the first press;
(4) search cards have no posters; (5) no connection-status green dots.

## What changed

1. **Welcome removed:** `<section id="welcome">` (heading 从一次搜索开始 + 3 cards)
deleted from index.html, fixture.html, fixture-shot.html; the JS toggle
(`$('welcome').hidden=!landing`) removed from setMode; settingsOpen re-wired
alone (`$('settingsOpen').onclick=openSettings`) so mount cannot die on a
null welcomeSettings. All `.welcome-grid`/`.welcome-card` CSS removed.
The dead `all('[data-suggest]')` wiring line remains as a harmless no-op.
2. **Searchbox layout:** input + buttons now have real gaps (input
margin-right 10px, 原生搜索 margin-left 10px — margins, not flex gap, for
WebView 66); all three fixed 44px height; ↗ margin 17px → 4px (attached to
the 搜索资源 label); focus ring is inset (`outline:2px solid var(--accent);
outline-offset:-2px` inside `.searchbox`, beating the global 3px/3px rule by
specificity). 搜索资源 stays primary accent fill; 原生搜索 is now secondary
outlined (transparent fill, 1px #39434d border). Both remain clearly tappable.
3. **Single Back returns home:** navigation.js Back branch — new branch BEFORE
the text-entry blur branch: when `options.isSearchView()` is true, Back
calls `options.onBack` (no stopPropagation added, matching the existing
onBack branch). app.js mounts `isSearchView` from `C.isSearchView(viewMode)`
and its keyNavigation fallback has the same search-view branch BEFORE its
blur branch. Modal-close-first (layer branch) and favorites-edit-exit-first
are untouched in both files. Home/detail/favorites Back behavior unchanged.
4. **Search-card posters (root cause fixed):** new `C.cleanSearchTitle(raw)` →
`{title, year}` in core.js: strips parenthesized year suffixes (half- and
full-width, captured as year), bracket characters, trailing 更至…/更新…/
第N期 markers (季/season deliberately KEPT), 全集/完结/连载中 markers,
trailing disk names, trailing/leading quality tokens, trailing separators.
Enrichment caches by CLEANED title, so all rows of one show share one
lookup (bounded: max 2 concurrent, 200-entry cap, failed titles cached-empty
for the session, never blocks rendering, letter-tile placeholder on no match).
Lookup order: TMDB key present → direct TMDB search, on failure/no-match →
`/tmdb-api/` relay; no key → Douban subject_suggest direct, on failure/
no-match → `/douban-suggest/` relay. Exact/credible match only
(`tmdbPickPoster`/`doubanSuggestPoster`); `tmdbPickPoster` gained a credible
season-marker second pass (remainder must be ONLY 第N季/season N/s N, same
year gate; a disk word like 夸克 never matches). TMDB-key change clears the
cache (saveSettings + clearTmdbKey). Parser fix found by the fixture: the
TMDB/Douban response parsers now accept object bodies as well as strings
(the mock's TMDB branch returns objects; the old blind JSON.parse threw and
silently emptied every TMDB result). Favorites cards and detail artwork
unchanged.
5. **Health dots on search cards:** makeGroupCard appends
`<span class="card-health-dot" data-state="...">` into the card poster
(top-right; detail-identical colors: ok #3ddc84, locked #f5b942,
uncertain/limited grey-white, bad #e5484d, unsupported hidden).
`runSearchChecks(rows)` runs after each search group renders, reusing
checkLinks + parseCheckResults + healthDotState, chunked at 40 (gateway
limit), generation-guarded, progressive in-place dot updates, never blocks
rendering, never affects ordering (search has no preselect). Respects
getCheckMode: no checks (and no dots, by design) when the App's 网盘检测
switch is off. `search()` resets the check maps so each query gets fresh
checks. Favorites cards (makeResource path) get no dots.

## Kept verbatim from RC64

6x6 keyboard, source checkboxes （全选/资源/盘搜/觅搜/趣盘）, history/hot panel,
direct 3-source suggestions (Tencent stays a documented empty stub — no endpoint
invented), 资源 rename, quality badges display-only, RC62/RC63 optimizations,
hidden topbar rules, favorites behavior. NO disk filter row added (pending the
user's answer — disks stay in Settings per his v7 decision). NO 全站 in-page
(no return API; never faked — 原生搜索 button remains the all-subscription path).

## Verification (all gates pass)

- Unit: **138/138** (tests-rc65.cjs; +14 new: title-cleaning cases incl.
/全集/更至…/year suffixes + season kept, cache-key sharing, TMDB season
fallback + year gate + non-season rejection, healthDotState mapping,
isSearchView predicate, welcome absence from all 3 page variants + styles).
- compat-scan.cjs: **0 errors**.
- Fixture: **229/229** (fixture-run.js rewritten for the changes; first run
225/228 — two real issues, both fixed, not papered over: (a) TMDB parsers
now accept object bodies (see §4); (b) the new Back block leaves the topbar
revealed by design, so it re-hides it via content focus to restore the
topbar block's precondition). Covers: welcome absent; header settings button
still opens/closes settings; searchbox geometry (gaps 10px/10px, heights
44/44/44, arrow margin 4px, secondary outlined native button, inset -2px
focus ring); single Back from #query AND from a letter key returns home
(mode=home) + modal-close-first + edit-exit-first still hold; posters via
TMDB relay (6 posters, cleaned titles) + dots all ok + dot colors probed
(green/amber/grey-white/red/hidden); Douban path after key cleared (relay
delta 4 for the 4 distinct cleaned titles, 6 posters) + TMDB path restored
after key re-set (6 posters); all other RC64 blocks still pass.
- Screenshots: 7 saved (`shots/` in the workdir); 01-home + 02-search eyeballed
— home: hidden topbar, tabs first, 玩偶 badge; search: NO welcome section,
tidy buttons (primary 搜索资源↗ + outlined 原生搜索, clear gaps), 6x6
keyboard, source checkboxes, suggestion panel, no disk row.
- Server preview: main/index/app/discovery/discovery.css 200, main SHA matches
local build, 157 sites, GG name [RC65].
- GitHub staging: staged dir + builder run (see header); fast↔raw diffs all
proxy rewrites with 0 true diffs, version.json static_sha256 0 mismatches,
tv_tested false, GG homePage = Pages URL in fast + raw, secret scan on NEW
files only (see builder verification output).

## Notes for the next run

- Chrome gate (new in this session): the rebuilt Hatch Chromium
(155.0.8059.80) refuses to start without a WebGL domain policy. Working
recipe: policy file with first line `hatch-webgl-allowed-domains-v1` followed
by one REGISTRABLE domain per line (e.g. `godroc.dpdns.org` — a subdomain
like `tv.godroc.dpdns.org` is rejected as non-registrable), then launch with
`--hatch-webgl-allowed-domains-file=<path>
--hatch-webgl-allowed-domains-sha256=<sha256 of the file>`. Validate first
with `--hatch-validate-webgl-allowed-domains --version`. The policy file used
here is `/tmp/webgl-policy.txt` (ephemeral — recreate if missing).
- Fixture lessons re-confirmed: changed files need a FRESH temp dir name every
upload (edge cache); the mock's TMDB branch returns object bodies while
Douban returns strings — production parsers must handle both.
