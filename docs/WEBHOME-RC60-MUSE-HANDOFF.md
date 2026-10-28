# WebHome RC60 — Muse handoff (2026-10-28, candidate only, stable still RC19)

Preview: https://tv.godroc.dpdns.org/next/previews/webhome-rc60-5923ac205e45/main.json
Rollback: RC59 preview (webhome-rc59-99be0c28cb69). RC59 entry stays usable.
Trigger: user's 21:28–21:40 batch — (1) Back must cancel delete mode,
(2) home rails 6-per-row bigger, top tabs bigger, (3) suggestions STILL missing
on the real TV, (4) app topbar too tall, (5) topbar hidden by default, revealed
by Back / Up-at-top.

## Changes (all in this RC)
1. **Favorites done button (Back-cancel, click fallback)**: `.result-actions`
   gains `#favoritesDone` (完成， hidden unless favorites edit mode).
   renderResults toggles it; click exits edit mode exactly like the onBack
   exit (focus first card). Back-cancel paths themselves unchanged (fixture
   proves both Back exits still work). Reason: on his TV, Back keydown may
   never reach the page (long-press evidence), so favorites edit mode must
   never depend on Back alone. History already had 管理/完成 since RC59.
2. **Home/history rails are 6-column grids**: `.discovery-rail-track` is now
   `display:grid; repeat(6,1fr); gap 12px`; rail cards `width:100%`;
   `.discovery-poster` is `height:0; padding-bottom:150%` (was fixed 216px).
   At 1280px viewport cards are 190px wide, posters 190x285 (was 144x216).
   Small screens: 3-col grids (was fixed 108px cards). The >=1550px rail
   overrides are deleted (grid scales on its own). Browse grid stays 8 cols.
   Note: rails no longer scroll horizontally; TV navigation is vertical
   (navigation.js geometric moves) — no JS change needed.
3. **App topbar tightened + hidden by default**: `.gg-tv .topbar` 50→40px
   (both discovery.css and the higher-specificity `body.gg-tv .topbar` rule
   in styles.css line 18), brand-mark 34→28px, iconbutton 24→22px,
   brand 14→13px. Body starts with class `gg-topbar-hidden`
   (`body.gg-topbar-hidden .topbar{display:none!important}` in styles.css).
   Reveal: any Back key (doc-capture listener registered before navigation
   mount, never consumes the event), ArrowUp when focus is at the topmost
   (no focus, in .discovery-types, or first-row rail card), mouse to the
   top edge (desktop only). Hide again: focusin outside topbar/tabs hides,
   focusin inside shows; closing a modal restores the bar if focus returns
   to a topbar button. Hidden topbar buttons are excluded from arrow
   navigation automatically (navigation.js focusables() filters visible()).
   Discovery tabs stay always visible.
4. **Category tabs bigger**: `.discovery-type` 14→18px, padding 9x13→10x16,
   active underline inset 13→16px; small screens 13→16px.
5. **push_agent badge**: core.js sourceNameForKey maps `push_agent` → 网盘
   (his real history shows raw `push_agent` badges; providers map has no
   such key). Unit test added.
6. **Suggestions: direct + relay + visible failure**: updateSuggestions no
   longer goes through the 2-slot schedule queue — new `directGet`
   (waitSdk + fm.req GET, timeout 8) calls subject_suggest directly; on
   failure it calls the server relay
   `https://tv.godroc.dpdns.org/douban-suggest/?q=...` (nginx location
   added 2026-10-28, proxy to movie.douban.com/j/subject_suggest, Referer
   + UA set, access_log off, backup
   /opt/services/backups/tvbox-nginx-20261028-before-douban-suggest.conf;
   verified: relay returns full JSON for 哪吒, and 甄嬛传 returns [] on
   BOTH direct and relay, i.e. Douban-side). If both fail and local is
   empty, the strip shows a non-clickable note
   “建议暂不可用，点“搜索资源”直接搜” (new `.suggest-note`, not a
   .suggest-item, so ArrowDown focus skips it) instead of silent blank.
   The old direct retry is replaced by the relay attempt.

## Verification
- Unit 99/99 (incl. new push_agent test), compat 0 errors.
- Fixture 184/184: 6-per-row geometric, 190px cards, poster ratio 1.5,
  tab font 18px, topbar hidden by default / Back reveals / Up-at-top
  reveals / content focus hides again, TV topbar 40/28/22px, relay
  fallback after direct failure, failure note when both fail, favorites
  done button show/exit/hide/keep, both Back exits.
- 7 screenshots all pass; 01-home eyeballed (topbar hidden, tabs first,
  big grid cards) + 02-search (suggestion chips visible).
- Fixture incident fixed in-test: the note test left query ZZZ, which made
  the later suggest-item click fall back to searching ZZZ and starved the
  initials test of its recent-search seed; the note test now re-types SH
  before finishing. Do not remove that re-type.
- Server preview: main/index/app/discovery/discovery.css 200, main SHA
  == build. Fast/raw/Pages checks + commit below.

## Still open (unchanged)
- Real-TV acceptance (tv_tested false); old history records recover their
  poster only on next play (cache, not retroactive).
- Suggestions on his TV: if RC60 still shows nothing, the note tells us
  both sources failed; if suggestions appear, the direct-or-relay question
  is answered by whether they appear at all.
- Back-on-search-input blur-first, RC53 chrome re-assert, RC55 source
  badges on real native keys, 盘搜自建 key check, native-search jump
  decision, delete-icon glyph decision — all still pending his answers.
