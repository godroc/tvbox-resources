# WebHome RC56 — Muse handoff

- Preview: https://tv.godroc.dpdns.org/next/previews/webhome-rc56-b00b7ec820f9/main.json
- Entry: GG · 家庭资源库 [RC56]
- Base: RC55 preview main (preview-rc55-main.json); rollback: RC55 preview
  (https://tv.godroc.dpdns.org/next/previews/webhome-rc55-259506eb2862/main.json)
- Stable unchanged: RC19, tv_tested false. RC56 is a candidate only.
- GitHub: （待推送）

## Trigger

User request 2026-10-28 evening: TMDB API Key 也应该像设备密钥一样可以保存和删除。

## Gap found (before this RC)

- Device key had a dedicated one-click delete: Settings → 清除本机密钥
  (clears credential + removes device-key.v1 + clears the field + resets the
  search cache + updates the badge, no form submit needed) and a visible
  topbar badge (已设置 / 未设置).
- TMDB key had neither: it was only saved as part of the whole Settings
  form submit (prefs.tmdbKey in gg.webhome.preferences.v1), with no
  separate delete button and no visible saved/unsaved state. The only way
  to remove it was to empty the field by hand and submit the whole form.

## Changes (app.js + index.html + fixture.html + fixture-shot.html)

1. New Settings button `清除 TMDB Key` (#clearTmdbKey, danger-text, in
   .settings-tools next to 清除本机密钥） on all three page variants.
   Click handler (mirrors clearKey semantics, acts immediately without a
   form submit): prefs.tmdbKey = '' + write preferences.v1 + clear the
   field + update the status line + toast “TMDB Key 已清除，详情改用原封面”.
   Other unsaved form edits are untouched (same as clearKey).
2. New status line #tmdbKeyStatus under the TMDB field (index.html +
   fixture.html; guarded in JS so the partial fixture-shot.html form,
   which has no tmdbKey field, cannot break mount):
   “TMDB Key 已保存（本机）” / “TMDB Key 未设置”.
   Updated by openSettings (after filling fields), saveSettings (after
   the prefs write), and the clear handler. closeModal only clears form
   fields, not this line, so the status survives a close/reopen cycle.
3. Save path unchanged (form submit writes trimmed tmdbKey into prefs);
   no format validation was added — TMDB key formats vary and the user
   did not ask for validation, so any trimmed string still saves.
   Clearing then submitting without re-entering is a no-op; clearing
   then closing without submitting already persisted (the clear handler
   writes prefs directly, same as clearKey).

## Verification

- Unit: 88/88 (no core.js change; count unchanged from RC55).
- Compat scan: 0 errors.
- Browser fixture: 141/141 (RC55's 128 + 13 new TMDB assertions):
  settings opens, tmdbKey input + clear button found, status shows
  已保存 with the seeded key, field filled from stored prefs on open,
  clear empties the field, status flips to 未设置， clear persists
  tmdbKey '' to prefs without a form submit, typing a new key +
  submitting closes settings, reopen refills the new key with status
  已保存， then restored to the seeded key (mock default) and settings
  closed, so later blocks see the seeded state.
- Screenshots: 7/7 saved (01-home, 02-search, 03-detail, 04-filter,
  05-detail-tabs, 06-detail-synopsis, 07-delete-dialog). No CSS changed
  in this RC; the 7 standard views are unchanged by design.
- Server preview: main/index/app 200; server main SHA matches the local
  build (002c19c18dc260e2c79bd98bb3065be72aea4d8d86a7043ae575b0ceba5628f9).
- Process note: during the preview upload the RC55 preview dir was
  deleted by mistake (the rollback to keep); it was immediately restored
  from the local RC55 publish/ output and re-verified (main 200, SHA
  46c27bd5da36fc2875548236b82a024b85dc4263aecd64c04024d8a77a71a6de,
  identical to the delivered RC55). RC54's dir was already absent, so
  nothing else was removed. Rollback for RC56 is the RC55 preview.

## Notes for the next RC

- The edit-mode delete icon style is still an open user decision: the
  user's reference is the original Douban homepage (long-press → centered
  white trash-bin icon → select + confirm to delete). RC55/RC56 use a
  top-right red × badge instead (does not cover the poster center).
  Muse flagged the difference; no switch was decided. Do not change the
  badge glyph unless the user asks.
- TMDB key state is page-local (prefs), same as the device key; it is
  never exported (export excludes keys) and never written to source files.
