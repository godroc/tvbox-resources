# WebHome RC59 — Muse handoff

- Preview: https://tv.godroc.dpdns.org/next/previews/webhome-rc59-99be0c28cb69/main.json
- Entry: GG · 家庭资源库 [RC59]; rollback: RC58 preview.
- Stable unchanged (RC19, tv_tested false). Candidate only.
- Verified: unit 98/98, compat 0 errors, fixture 173/173, 7 screenshots.

## What changed (user's 2026-10-28 evening batch + artwork follow-up)

1. **Filters hidden on tab switch.** browse() and the discovery default now set
   filtersVisible=false. Filters appear only when the user presses the button
   (OK/click on the already-active tab toggles them). Same-tab toggle kept.
2. **Home gains a 豆瓣推荐 rail.** discovery-data.mixedRecommend() merges
   rexxar movie/recommend (tags=电影， sort=T) + tv/recommend (tags=电视剧，
   sort=T), interleaves movie/tv, dedups by id, caps 20, 45 s cache keyed by
   request identity. Home order: 最近观看 → 豆瓣推荐 → 猜你喜欢
   (renderRail inserts douban-recommend before the for-you rail). One side
   failing still renders the other; both failing renders the error rail with
   a working retry (mixedRecommend path, not the recommendations path).
3. **Search suggestions fixed on the TV side.** Douban subject_suggest was
   verified alive from the server, so the TV failure was the 3 s timeout
   (proxy slowness) plus an empty local pool for new titles. Timeout 3→8 s,
   one retry after 500 ms on failure, and search-chart hot titles join the
   local pool (discoveryTitles now also reads .search-chart-chip).
   Native-search jump NOT implemented: the user asked whether it is possible,
   and the answer (in the delivery) is: jumping is doable via the existing
   fm.search direct call, but it would lose our multi-source search
   (reference + 盘搜/觅搜/趣盘 are excluded from native aggregation, his own
   2026-10-28 19:45 finding); modifying the native search screen is NOT
   possible (App-native UI, no SDK injection point).
4. **Recently-watched episode staleness.** renderHistory's no-op signature
   now includes the full raw history item, so an App-side update that keeps
   id/title/poster identical still re-renders. Playback-return refresh
   already existed (fmresume → probeBridge → refreshHistory on home).
   Honest boundary: the progress store itself lives in the App; if reopening
   still resumes episode 1, that is the App's push-chain progress, not our
   rail — the delivery asks which entry he reopens (our card vs App history).
5. **Long-press in 最近观看 still dead on the real TV (500 ms hypothesis
   FALSIFIED).** The keydown timer path is intact in code and passes the
   fixture, but the TV evidently does not deliver raw Enter keydown/keyup
   for OK holds (all click-based features work; all keydown-based ones are
   unconfirmed on his TV). Added click-based fallbacks that do not depend
   on key events: a 管理/完成 button in the history rail heading, and a
   contextmenu listener on history cards (and favorite cards). Long-press
   listeners kept as-is.
6. **History artwork: netdisk plays no longer save the disk default icon.**
   Root cause (app-guide 21.2): fm.pan.play's pic/wallPic go ONLY to the
   player page and never enter the history record, so push records keep the
   share's own default icon. Fix per the devkit contract: before every
   pan.play, cachePushArtwork() writes URL→{pic, wallPic, title} to
   fm.cache (async get/set, App-native prefs, origin-independent) plus a
   localStorage mirror (same key, capped 100 entries, FIFO prune);
   loadHistory restores each row from that map (match by URL, vodId, key,
   then title) and prefers the cached poster over the record's vodPic;
   openHistory passes the restored wallPic as fm.vod's 5th-arg options.
   Also fixed: playShareDirect lost the detail poster through normalize()
   (normalize only reads row.images[], not row.image) — image is now
   re-attached like wallPic was. Limitation: entries already saved with
   the default icon recover on the next play of that title, not retroactively.

## Files touched

- discovery-data.js: mixedRecommend + export.
- discovery.js: filtersVisible default false, browse() false, renderRail
  douban-recommend insert + retry branch, home() gotRecommend, renderHistory
  full-item signature + 管理 button, card() contextmenu.
- discovery.css: no change (rail heading already flex; button aligns right).
- app.js: suggest timeout 8 + retry, discoveryTitles chart chips,
  cachePushArtwork/loadPushArtworkMap, play()/playDirect() cache writes,
  playShareDirect image re-attach, loadHistory artwork restore,
  openHistory wallPic, makeResource contextmenu.
- core.js: artworkMapSet/artworkForItem (pure, unit-tested).
- tests-rc59.cjs: +10 (artwork 6, mixedRecommend 4).
- fixture-run.js: filter-toggle rewrite, home waits ≥3, 推荐 rail + order +
  manage + artwork assertions, suggest retry test.
- fixture-mock.js: artwork mirror seed, __suggestFailNext one-shot failure.
- shot.js: home waits ≥3.

## Fixture lesson

The first two fixture runs failed the same 2 TMDB backdrop assertions, not
because of RC59 code but because the temp-dir upload omitted shot-poster.svg
(mock fm.res maps TMDB images to that relative file). Re-uploading the 3
shot files fixed it (173/173). Temp upload checklist now: fixture files
(6) + 14 app files.

## GitHub

- Commit: (filled after push)
- Tag: mirror-20261028-rc59-webhome
- Fast/raw 200 immediately; Pages 200 after propagation (~85 s).
