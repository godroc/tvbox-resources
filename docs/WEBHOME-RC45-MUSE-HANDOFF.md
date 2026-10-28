# WebHome RC45 — Muse handoff

- Preview: https://tv.godroc.dpdns.org/next/previews/webhome-rc45-000eaf050325/main.json
- Entry: GG · 家庭资源库 [RC45], 157 sites, tv_tested false. Rollback: RC44 preview.
- Main SHA-256: ff6cf1625e43e93204525eb416213ee6f293cbd803df4755e3ffc46c1ce9c3b8
- Suggested tag: mirror-20261028-rc45-webhome (pushed directly by Muse via Oracle deploy key, per user decision 2026-10-28 09:59).

## Changes (all in discovery.js / core.js / discovery.css unless noted)

1. TMDB relay fallback (user reported: key entered on TV, no backdrop appeared).
   - Detail hero still tries direct `api.tmdb.org/3/search/multi?api_key=…` first.
   - On request failure it retries through the server relay
     `https://tv.godroc.dpdns.org/tmdb-api/3/search/multi?…`
     (tvbox-web nginx `^~ /tmdb-api/` → `https://api.tmdb.org/`, access_log off
     because the v3 key travels in the query string; backup of the previous
     nginx.conf: /opt/services/backups/tvbox-nginx-20261028-before-tmdb-relay.conf).
   - Backdrop image candidates, in order: imageSource(direct TMDB URL), direct
     TMDB URL, imageSource(relay image URL), relay image URL
     (`/tmdb-img/t/p/original…` → `https://image.tmdb.org/`); on exhaustion it
     reverts to the original cover (swap case) or removes the img (create case).
   - Relay base is derived from the page origin and only used when the page is
     served from godroc.dpdns.org; GitHub Pages / mirror loads keep direct-only
     behaviour. A wrong key still fails on both paths (same key, same 401).
   - Core helpers: `tmdbRelaySearchUrl(relayBase, directUrl)`,
     `tmdbRelayImageUrl(relayBase, path)`.
2. Sources float transparently over the hero artwork (user: 播放源的背景还是
   应该是海报，应该透明显示在海报上）.
   - Detail-modal `.discovery-sources`: background transparent, border removed,
     text-shadow added for readability over art.
   - Self rows (`.discovery-resource`) and ref rows (`.ref-auto-share`):
     background transparent, hairline border kept.
   - Inactive disk tabs: background transparent. Active tab keeps its filled
     style; focused row keeps its solid focus background + outline, so remote
     focus stays visible.
   - The full-screen shade gradient underneath is unchanged and still darkens
     the lower area for readability.

## Verification

- Unit: 42/42 (incl. 4 relay-helper tests).
- Browser simulation: 74/74 (71 carried + panel/row/ref transparency
  assertions; the row assertion checks a non-focused row, because the focused
  preselected row correctly keeps its focus background).
- Relay proven live from the VM: API relay with an invalid key returns TMDB's
  own 401 JSON; image relay returns TMDB's own File Not Found page for a fake
  path (both prove pass-through; a real image path returns image bytes).
- Server: 5 key files HTTP 200, main SHA matches build, 157 sites.
- Fixture/shot temp public dirs deleted after runs.

## Deferred (unchanged from RC44)

Real-TV acceptance (tv_tested false, stable still RC19); real-clarity probe;
detail unification (hero detail vs app share dialog); TMDB direct reachability
from the TV itself (now covered by the relay on server-served configs).
