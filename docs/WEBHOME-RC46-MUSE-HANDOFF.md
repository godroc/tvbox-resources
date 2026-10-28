# WebHome RC46 — Muse handoff

- Preview: https://tv.godroc.dpdns.org/next/previews/webhome-rc46-0a151e42fa6f/main.json
- Entry: GG · 家庭资源库 [RC46], 157 sites, tv_tested false. Rollback: RC45 preview.
- Main SHA-256: 8a8de9a3dc42210566786d2814273e753caad01eae97e030b765e40493505d5f
- Suggested tag: mirror-20261028-rc46-webhome (pushed directly by Muse via Oracle deploy key, per user decision 2026-10-28 09:59).

## Changes (user decision 2026-10-28 10:31: all four items together)

User comparison feedback (RC45 detail vs reference detail for the same title):
resources felt few, no Dolby/4K marks, backdrop never rotated; plus
"盘搜 觅搜 的资源怎么没显示出来…还应该接入我们的网盘搜的网站接口" and
"盘搜和觅搜不一定只有这两个，首先还有我们的自建搜索…加入多了是不是
会太乱？夸克资源如果链接一样的，可以去重".

1. Quality badge pills on resource rows (display-only; never feeds preselect,
   per the 2026-10-27 decision that title claims do not count as verified
   clarity). Core helper `qualityBadges(title)`: 杜比视界 if 杜比/DV,
   HDR if HDR, highest resolution only (4K if 4K/2160 else 1080P else 720P).
   Self rows (discovery.js resourceButton), ref rows (reference-search.js
   renderAutoResolve) and pan/mipan rows all render `.gg-quality-badge` spans.
   Ref rows have no per-share title in providers.js, so the display title
   falls back to the card's `row.title`, and a `.discovery-resource-url` line
   is appended when the title does not already contain the URL.
2. TMDB stills slideshow. Core helpers `tmdbPickTitle` (movie|tv only;
   title +2, exact-or-contains only when query length >= 2, year +3,
   backdrop +1; null when the best has no backdrop) and `tmdbImagesUrl`
   (`/3/{movie|tv}/{id}/images`). Detail fetches search (direct, relay on
   failure) then `/images`, keeps up to 6 unique backdrops, and crossfades
   every 10 s (new img inserted before the shade, opacity transition .6 s,
   old img removed after 700 ms; guards stop the chain on close/reopen).
   The RC45 applyBackdrop cascade (imageSource/direct/imageSource-relay/
   relay, revert on total failure) is unchanged.
3. Synopsis button replaces double-click. The centered hint pill and the head
   dblclick listener are removed. Sources heading now holds, left to right:
   播放源， 简介 button (`.discovery-synopsis-btn`, label 显示简介/隐藏简介,
   single click toggles `show-synopsis`), 查看全部来源. Modal-scoped heading
   uses `justify-content:flex-start` with 10 px gaps.
4. Detail mode tabs: 资源（含自建） / 盘搜 / 觅搜. One mode visible at a time;
   pan modes lazy-load on first activation; each mode loads/counts/fails
   independently. Pan search: POST `{kw}` to the public no-auth TV PanSou
   instance `https://pstv.godroc.dpdns.org/api/search` (direct, no
   Authorization) via the new `postRequest` mount option; mipan: GET
   `https://www.mipan.so/api/token` then POST `/api/search` with
   `X-Mipan-Token` (token per-open, in-memory only, one retry with a fresh
   token on failure). Both normalize through `core.js` (`groupResultsByDisk`
   for results arrays). Pan rows render disk tabs (post-dedup counts),
   health dots (one-shot check via `checkLinksOpen`, POST to the same public
   pstv `/api/check/links`, no Authorization, falls back to all-unknown),
   and click through `onSelfRow`. No preselect/auto-focus in pan modes.
   Resource mode keeps self + ref + disk tabs + preselect; switching back
   to 资源 resumes the throttled check pipeline.
5. Dedup (user requirement). Within a mode, the same normalized URL
   (`dedupKey`: strips pwd/password/utm) appears once. 资源： self-wins-over-ref
   (existing) plus NEW ref-vs-ref dedup (`refSeen` set in shareFilter) and
   late-arriving self rows remove already-rendered ref buttons with the
   same key. Pan modes dedup before grouping; disk-tab counts are
   post-dedup displayed counts.
6. nginx PanSou relay tried and REVERTED. A `^~ /pansou-tv-api/` → 8892
   block returned 502 (the tvbox-web container cannot reach host-loopback-
   published ports; 8892 listens only on 127.0.0.1). The previous nginx.conf
   was restored (backup
   /opt/services/backups/tvbox-nginx-20261028-before-pansou-relay.conf);
   main + clash.yaml verified 200 after restore. Same-origin buys nothing
   here: pstv is already public and no-auth, and fm.req handles cross-domain
   (the reference's 盘搜 does exactly this). fetchPan/checkLinksOpen are
   direct-only.

## Bug fixed during verification (root cause, not a workaround)

Fixture run 2 (81/87): ref shares never rendered, progress showed 参考 0.
Bisection with row-level debug logs in a temp fixture copy proved execution
stopped between the label append and the badges block in
renderAutoResolve. Cause: reference-search.js uses a two-argument UMD
wrapper whose factory is a separate function expression — it does NOT
lexically receive the IIFE's `root` parameter, so `root` inside the factory
is an undefined global and the first `root.GGCore` reference throws
ReferenceError, which pump's `.then(success, error)` handler swallows as a
handled rejection (no console error, no exception event). The file never
used `root` before RC46, so the bug was dormant; discovery.js is unaffected
(its factory IS the IIFE body, so `root` is a real parameter). Fix: use
`win` (mount scope, `doc.defaultView || window`, already used for
localStorage in the same file) instead of `root` in the badges block.
No UMD change, no other file touched by the fix.

## Verification

- Unit: 56/56 (RC45's 42 + qualityBadges 6, tmdbPickTitle 3,
  tmdbImagesUrl, tmdbRelaySearchUrl on an images URL, groupResultsByDisk).
- Browser simulation: 87/87 (incl. cross-source ref share shown, second ref
  site shown, ref-vs-ref duplicate shown once, ref share health dot,
  self/pan badges, synopsis button group + toggle, mode tabs + pan 3
  deduped + mipan 2 + switch back, TMDB stills armed with 3 stills).
  Fixture note: the detail mount reads selected sites from STORE at mount
  time, so the run sets STORE to ['wanou','muou'] just before opening the
  detail and restores ['wanou'] after the detail block (keeps the earlier
  search-page scope test valid).
- Screenshots: detail (mode tabs + synopsis button + transparency) and
  sources tabs (disk tabs + health dots + badges + ref URL line) captured
  from the shot page and visually confirmed.
- Server: 5 key files HTTP 200, main SHA matches build, 157 sites.
- Fixture/shot temp public dirs deleted after runs (fixture-diag removed
  during the re-upload; fixture-rc46 + shot-rc46 removed after publish).

## Deferred (unchanged from RC45)

Real-TV acceptance (tv_tested false, stable still RC19); real-clarity probe;
detail unification (hero detail vs app share dialog); configurable PanSou
URL in settings / more ref-site definitions (post-RC46, not authorized yet);
盘搜/觅搜 on the TV itself (fm.req cross-domain + public pstv, needs the
user's TV retest).
