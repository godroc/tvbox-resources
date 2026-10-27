# WebHome RC39: full-screen film artwork and direct resource selection

2026-10-27 Asia/Shanghai. Owner: Codex. Independent candidate; physical-TV and native playback acceptance remain pending.

## User request and reference

The user wants the film screen reached from a homepage poster to resemble the full-screen artwork treatment in the privately supplied Wanou 53.0 reference, with no icons or second selection dialog for individual resources. The reference file was studied only; its HTML and credentials were not copied into this release.

## Changes

- Replace RC38's dim, blurred, top-only detail backdrop with a full-viewport unblurred artwork layer and a readability gradient. Center the film title, metadata and short description over it; put the resource list below. Prefer existing backdrop when available, otherwise enlarge the existing poster; a portrait source may be cropped and is not a real landscape still. Keep a visible placeholder when no image exists.
- Remove disk icon chips from resource buttons. In the homepage film detail, hide the intermediate reference-site result cards and present matching extracted share links directly. Matching detail requests run progressively, with at most two in flight per reference site; the existing shared request scheduler remains in place. Duplicate links from one reference site are suppressed.
- A selected self-hosted or reference share is sent to the existing host playback interface without a second WebHome detail dialog. For a merged result with conflicting extraction codes, pass its primary/first available code; an incorrect code can still require another resource or the original app flow. The host retains responsibility for authentication, file selection and playback.
- Current disk filter/order, reference-site selection, native all-sources action, device authorization, and RC38 recent-history changes remain. Search outside the homepage detail retains its normal result cards.

## Evidence and limits

- Chromium fixtures at 1280×720 and 390×844 cover a poster-backed detail, missing-art fallback, two matching results from one reference site, icon-free direct choices, source callbacks, keyboard down/Enter, closing and restoring focus. The standalone direct-play fixture exercises a conflicting-code row with a mocked host.
- RC38 history regression passes against RC39; nine JS files passed syntax checks. These fixtures do not establish actual Android WebView compatibility, real network results, source health, or playback.
- Static assets `docs/webhome/rc39-231cd5093517`; manifest `webhome-rc39-manifest.json`; tag `mirror-20261027-rc39-poster-detail`.
- Candidate accelerated configuration: `https://gh-proxy.com/https://raw.githubusercontent.com/godroc/tvbox-resources/mirror-20261027-rc39-poster-detail/fast/releases/v0.1.0-rc39/main.json`. Validate Pages deployment and hashes before use.
- Rollback to RC38: `https://gh-proxy.com/https://raw.githubusercontent.com/godroc/tvbox-resources/mirror-20261027-rc38-history-fix/fast/releases/v0.1.0-rc38/main.json`. Stable and protected services are unchanged.
