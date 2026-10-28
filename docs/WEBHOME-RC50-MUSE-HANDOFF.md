# WebHome RC50 — Muse handoff (2026-10-28)

Candidate only. Stable stays RC19. tv_tested false. Rollback: RC49 preview
`webhome-rc49-c57113b6621e`.

Preview: https://tv.godroc.dpdns.org/next/previews/webhome-rc50-6f727b18309f/index.html
Entry: GG · 家庭资源库 [RC50]. Main sha256:
`60510ca30e05621ac1efd4cef1ec744db9be5e5d0e5cbbad0a73a6285758d011`. 157 sites.

## Why (user reports 2026-10-28 14:53 and 14:56)

1. Detail 资源 tab showed our own PanSou results, identical to the 盘搜 tab.
   User: 资源 should show only 资源 (reference) results.
2. User asked whether 盘搜自建 (our backend) and 盘搜 (public pool) should be
   kept apart, because he was not sure which is faster.

## Changes vs RC49

1. 资源 mode is reference-only. Detail self search, self groups, self disk
   tabs content, self progress count, and the self-suppression of ref rows
   are all removed. The combined disk-tab bar is kept but now fed with ref
   counts only, so it filters ref rows by disk. Progress reads
   “已找到 N 条（参考 N）”. Preselect now ranks ref rows only (disk-first +
   health tiebreak, unchanged logic). Home-search self scope is untouched
   (search page, not detail tabs).
2. 盘搜 mode is two labelled sections, rendered independently (one slow
   source never blocks the other):
   - 盘搜自建： device-authed gateway (keyed only; keyless shows the
     “需要设备密钥” note, not an error). app.js `searchPanSelf`.
   - 盘搜公共： public pool `https://so.252035.xyz/api/search`, no key.
     app.js `searchPanPublic`. Either section failing leaves the other
     visible.
   Each section header shows count + its own fetch time, e.g.
   “盘搜自建：3 条 · 0.1 秒”, so speed is comparable on the TV itself.
3. No cross-section dedup (duplicates across 自建/公共 are intentional, for
   comparison). Within-section dedup unchanged. 觅搜 still hides rows already
   in either pan section (union of both sections' URLs).
4. Prefetch fetches both pan sections together and stashes each separately;
   the 盘搜 tab renders both immediately from stash. Dead code removed:
   `resourceLabel`/`resourceButton` (self-row builders), `sortSelfGroups`,
   `ensureSelfGroup`, `updateSelfStatus`, `addSelfResult`, detail
   `searchSelf` call, app.js `selfLookup` and old combined `searchPan`.

## Speed measurement (server side, 2026-10-28, kw 嫁金钗)

- Self backend (loopback 8892): 0.09 / 0.07 / 0.07 s, 626 rows every time.
- Public pool (so.252035.xyz): 30 s timeout, then 18.7 s / 176 rows, then
  HTTP 400 on an identical repeat (rate-limit-like). Earlier probe gave 99
  rows, so the public pool is non-deterministic and much slower from the
  server. TV-side latency was not measured directly; the per-section timer
  in the 盘搜 tab is the on-device comparison.

## Verification

- Unit tests-rc50.cjs: 78/78 (unchanged helpers).
- Compat scan: 0 errors.
- Browser fixture: 100/100 (fixture run; first attempt timed out at the
  120 s reader cap with an empty report, reload run completed 100/101 with
  one stale assertion about removed self rows, assertion removed, re-run
  100/100). Key assertions: resource mode has no self groups + 3 ref rows;
  progress ref-only; ref dup123 now visible (self suppression gone);
  ref-vs-ref dup shown once; pan self + public sections prefetched with
  timing; quark tabs 2 per section; mipan still 1 row hiding the pan dup.
- Screenshots: 7 regenerated; 05-detail-tabs visually confirmed (ref-only
  资源， preselect badge on the focused row, no self groups).
- Server: main SHA verified via public URL; temp fixture dirs deleted.

## Known gaps (unchanged)

- tv_tested false; real-TV acceptance pending.
- Pan-mode health re-sort not wired (pan dots are painted by check, rows do
  not re-sort on check completion).
- fm.cache migration not done; prefs still localStorage.
- No real-clarity probe; title badges never feed preselect.
- tgsearch container + gateway /device/tg/ route still running but uncalled
  since RC49 (can be stopped later in one step).
- Public pool latency/rate-limit is third-party behaviour, not ours.

## Frontend note (same session, separate task)

PanSou frontend is live on the server behind tvbox-web (hostname
`pansou-admin.godroc.dpdns.org`, root pansou-spa, /api/ → pansou-tv:8888):
SPA 200 + title “PanSou 盘搜”, /api/health OK, proxied /api/search 626 rows.
Public use still needs the user to add the Cloudflare tunnel hostname and a
Cloudflare Access application (see DEPLOYMENT.md entry of this date).
Root cause of the earlier 404s: the container's bind-mounted nginx.conf was
stale (host file had the block twice, container file had none); fixed by
deduping the host file and restarting tvbox-web.
