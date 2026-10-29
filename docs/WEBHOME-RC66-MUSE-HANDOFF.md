# WebHome RC66 — Muse handoff

## Trigger

User's real-TV review of RC65 (2026-10-29): the search submit button
搜索资源 should become a search-symbol icon button only. Everything else
stays exactly as RC65. (The user's Back/banner questions are under separate
diagnosis and are explicitly OUT of this RC.)

## Baseline and rollback

- Baseline: RC65, preview `webhome-rc65-4c690cdc49d9`, main SHA
  `2313d33e660fc05cc45f611f3a66a35e188eb3638a2faace5bbbf8cd97fb22f3`
  (verified from the server before any change), 157 sites.
- Rollback: the RC65 preview dir (kept, not deleted).
- Candidate only; stable stays RC19; tv_tested false.
- Workdir: `~/workspace/webhome-rc66/` (copied from RC65, bumped RC65→RC66;
  build_publish.py dirname template + base ref fixed separately because the
  lowercase `webhome-rc65-` / `preview-rc64-main.json` strings are not hit
  by the uppercase sed — same gotcha as RC61).

## What changed (only this)

- Search submit button `#searchButton` is now icon-only: content is the
  magnifier `⌕` only, `type="submit"` and form-submit behavior unchanged,
  `aria-label="搜索资源"` added.
- The left decorative `⌕` span inside `#searchForm` is removed from all
  three page variants (index.html, fixture.html, fixture-shot.html) — it
  would otherwise duplicate the new icon button.
- Dead CSS removed: `.searchbox>span` rule and `.searchbox button span`
  rule (no spans remain inside searchbox buttons).
- New rule `#searchButton{font-size:20px;line-height:1;min-width:44px;
  padding:0 12px}` (ID specificity beats the mobile
  `.searchbox button{font-size:10px;padding:12px}` rule, so the icon stays
  20px on small screens too).
- Unchanged: 原生搜索 button (secondary outlined, RC65), 44px row height,
  10px gaps, inset focus ring, 6x6 keyboard, source checkboxes, history/hot
  panel, direct 3-source suggestions (Tencent still an empty stub — no
  endpoint invented), 资源 rename, quality badges display-only, health dots,
  posters, RC62/RC63 optimizations, hidden topbar, favorites.
- NOT in this RC: no disk filter row, no 全站， no Back/banner behavior
  change, no JAR/backend/auth/proxy/network change.

## Verification (separate counts)

- Unit: `tests-rc66.cjs` — 139/139 (RC65's 138 + 1 new RC66 block:
  icon-only content + type=submit + aria-label + no span in form +
  native button unchanged + no `.searchbox>span` rule).
- Compat: `compat-scan.cjs` over the 14 app files + 3 pages — 0 errors
  (only pre-existing CSS min/max WARNs, same as RC65).
- Fixture: 232/232 on first run (RC65's 229 − 1 retired arrow assertion
  + 4 new icon assertions: icon-only ⌕, aria-label/submit, no decorative
  span, tappable width 44px). Geometry: gaps 10px/10px, heights 44/44/44.
  Fresh temp dir `tmp-rc66-fix1` (deleted after the run); proxy started
  before Chrome; WebGL policy file + SHA switches used (see Notes).
- Screenshots: 7 in `~/workspace/webhome-rc66/shots/`; 01-home +
  02-search eyeballed — search screen shows exactly one ⌕ action button
  (green pill) + the unchanged outlined 原生搜索 button, no duplicate
  magnifier; home normal, no regression.
- Server preview: `webhome-rc66-7691b9807b4b`, main SHA
  `f54c62b6805aa75439954d8070a693334072fe4189c63ccdd8d081a666ab9c44`
  (matches local build), main/index/app/discovery/discovery.css all 200,
  157 sites, GG entry `GG · 家庭资源库 [RC66]`.
- GitHub staging: (filled after builder run — see below.)

## GitHub staging (verified, NOT pushed)

- rc `rc66` (lowercase), tag `mirror-20261029-rc66-webhome`,
  pages_suffix `rc66-7691b9807b4b`, staged dir
  `/opt/services/tvbox-next/work-muse-rc66/` (main.json + 14 app files
  from the preview dir), temp clone `/tmp/tvbox-rc66-clone` left in place
  for the parent's push (git status shows ONLY `??` additions).
- fast↔raw diffs 72 / true 0 (all gh-proxy rewrites); version.json
  static_sha256 0 mismatches (fast + raw); tv_tested false; GG homePage
  = Pages URL in fast + raw; 157 sites in both.
- Secret scan on new files only: no eyJ tokens; the single UUID is the
  subscription's public `updateId` (identical in RC65's main.json, line
  357); all other hits are benign code identifiers (password field
  names, mipanToken / routeToken runtime variables).
- Links: server preview 200 (verified). Fast link
  `https://gh-proxy.com/https://raw.githubusercontent.com/godroc/tvbox-resources/refs/heads/main/rc66.json`
  returns 404 pre-push, as expected — it goes live only after the parent
  pushes main + tag; the parent must re-check fast/raw/Pages 200 after
  pushing (Pages may 404 ~1 min, re-check after ~75–85s).

## Notes for the next run

- Chrome gate (from RC65): rebuilt Hatch Chromium (155.0.8059.80) needs a
  WebGL domain policy — file first line `hatch-webgl-allowed-domains-v1`
  + one registrable domain per line (`godroc.dpdns.org`), launched with
  `--hatch-webgl-allowed-domains-file` + `--hatch-webgl-allowed-domains-sha256`;
  validate with both switches + `--hatch-validate-webgl-allowed-domains
  --version` (file-only validation errors out).
- Fixture temp dirs: fresh name every run, deleted after; proxy.js must run
  before Chrome's first page load; Chrome cleanup by PID, never pkill -f.
- Acceptance: real-TV-pending. The real TV still needs to confirm the icon
  button's tap/submit feel (simulation only proves markup, geometry, and
  click-submit). Rollback candidate: RC65 preview dir.
