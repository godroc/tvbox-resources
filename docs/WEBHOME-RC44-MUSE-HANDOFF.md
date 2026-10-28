# WebHome RC44 — Muse handoff (candidate only, stable still RC19)

Preview: https://tv.godroc.dpdns.org/next/previews/webhome-rc44-66a8fe42c56d/main.json
Entry: GG · 家庭资源库 [RC44], 157 sites, main sha256 9efffa01af096351b779bdbd1ded4583d377d1719f74131c72473d944f64ba73
Rollback: RC43 preview. tv_tested false everywhere. Baseline: RC43.

## What changed (user reports 2026-10-28, all on real TV)

### A. Delete-confirm dialog fired on ordinary OK presses (user: 无缘无故会弹窗）
Root cause: the delete gate was a 500 ms Enter-hold in navigation.js plus a
pointer hold in discovery.js — a slightly long OK press on a remote (or a
delayed keyup) crossed 500 ms and opened the dialog instead of opening the
item. Worse, the dialog opened with focus on 删除， so one more confused OK
press could delete.
Fix:
- Both gates raised to 800 ms; navigation ignores repeat keydowns (no timer
  restart after a stray clear).
- openDeleteLayer guards against double-open while already visible.
- Dialog now focuses 取消 first (safe default); user moves left to 删除 to
  confirm.
- Redesign: overlay rgba(0,0,0,.45) + -webkit-backdrop-filter/backdrop-filter
  blur(12px) (progressive enhancement; WebView 66 falls back to translucent
  dark), panel is a centered soft card (max-width 560px, min-height 0,
  rgba(20,26,32,.88), 16px radius) instead of the full-height .discovery-detail
  slab that made it look heavy. 删除 is a soft-red pill, 取消 a neutral pill.

### B. Detail preselect pinned focus — user could not switch (user: 会被预选，不能切换）
Root cause (combined): runPreselect re-focused the best row on every timer
tick whenever focus sat on body/close/modal/preselected, so any focus loss
during streaming yanked focus back to row 1; and renderDiskTabs rebuilt all
tab buttons on every count change, dropping focus on a tab to body.
Fix:
- Preselect focuses the best row at most ONCE per detail open, only when
  focus is still on close/modal/body (one-click play preserved).
- renderDiskTabs records the focused tab's disk (new dataset.disk) and
  re-focuses the rebuilt button for that disk.
- The preselect timer restores focus if a rebuild/sort dropped it to body
  (only when the node is still connected and visible; never steals focus).

### C. TMDB stills configuration (user: TMBD如何配置）
- Settings gains a TMDB API Key field (password input, stored in device-local
  prefs only, never in files/chat). Open/close mirrors deviceKey handling
  (value cleared from the field on close, kept in prefs).
- Detail hero: when a row has no backdrop and a key is configured, the page
  searches TMDB (search/multi, zh-CN, year when known), picks the first
  result with a backdrop (year match preferred), swaps the hero backdrop to
  image.tmdb.org/t/p/original + path and upgrades the panel poster-only to
  has-art (full-screen landscape, centered copy). Failures (no key, no
  result, network/TMDB unreachable from the TV, image error) fall back
  silently to the original cover; the swap reverts on image error.
- core.js helpers: tmdbSearchUrl, tmdbBackdropUrl, tmdbPickBackdrop.
- In-memory per-title cache (tmdbCache) avoids refetch on reopen.
- No TMDB key is embedded anywhere; the reference project's embedded key was
  not copied. Live TV reachability of TMDB from the user's network is still
  untested (needs a real user key); if direct fetch fails, a proxy route is
  the follow-up, not part of this round.

### D. Suggestions did not appear while typing (user: 输入后不会出来词条，应该输入一个字符就更新）
Root cause: the TV letter keyboard can only type letters, but suggestions
matched literally only — pinyin initials never matched a Chinese title, so
from the first keystroke the strip was legitimately empty (remote Douban
suggest also returns nothing for initials).
Fix:
- core.js now ships a 20,902-char pinyin-first-letter table (U+4E00–U+9FA5,
  generated with pypinyin; INITIALS, with y/w-start syllables filled from
  the toneless reading so 影/与 map to y; 10 rare chars unknown).
- initialsOf(text) + rankSuggestions order: literal prefix, literal
  contains, initials prefix, initials contains (dedup, cap 8). Typing XZJCF
  now matches titles whose initials are XZJCF; typing X already narrows.
- Query input also refreshes suggestions on focus (blur-then-focus in
  fixture proves it); returning to the input after a search re-shows the
  strip for the current value.

## Verification
- Unit: 38/38 (new: TMDB URL/pick, initialsOf, rankSuggestions initials +
  literal-beats-initials).
- Browser simulation: 71/71 (new: long-press opens dialog + translucent
  rgba(0,0,0,0.45) + blur(12px) + 16px card + focus on 取消 + cancel closes
  and returns focus + quick tap opens nothing; initials suggestion; focus
  refresh; TMDB has-art + TMDB src + modal close).
- Screenshots: 7 (01 home, 02 search, 03 detail, 04 filters, 05 tabs,
  06 synopsis, 07 delete dialog NEW).
- Server: 5 key files HTTP 200, main SHA match, 157 sites, GG RC44 entry.
- Fixture/shot temp public dirs deleted after runs (verified 0 leftover).

## Deferred (unchanged)
Real-TV acceptance; real-clarity probe (none); detail unification (hero vs
app share dialog); TMDB live reachability from the TV (needs a user key);
multi-code primary-only trade-off; host history delete (page-local only).
