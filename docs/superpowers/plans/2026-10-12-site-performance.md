# Prymeira site performance implementation plan

Goal: reduce initial bytes and idle CPU while preserving typography, artwork, agent selection and lead submission. User approved the proposed optimization and publication on 2026-10-12.

Architecture: local WOFF2 fonts with the same outlines and full glyph coverage; responsive WebP derivatives for sized illustrations; lazy loading below the first screen; event-driven page motion; public Nginx gzip and revalidated asset cache. Clarity remains cookieless and masked on every public HTML page. Hub remains isolated.

- [ ] Capture the current public site source in the task's before directory. Preserve original hero sky and original image fallbacks.
- [ ] Convert regular fonts to WOFF2 without glyph subsetting; self-host the current Google italic variants with their unicode ranges. Remove duplicate external font stylesheet. Compare font outlines/metrics after conversion.
- [ ] Generate 640/960/1440 pixel illustration derivatives at high quality, preserving alpha and intrinsic aspect ratio. Set accurate sizes and lazy loading below the hero; prioritize the original hero sky.
- [ ] Move the inline animation loop to an isolated scheduler, which runs during scrolling and easing and pauses when idle/hidden. Resume on team changes, resize, font completion and body resize. Skip the unused video loop when no videos exist.
- [ ] Add gzip and 7-day revalidated public asset caching, with no-cache HTML/runtime configuration. Preserve public security headers and inject Clarity only into HTML.
- [ ] Test idle/resume motion behavior, font metrics, image aspect/alpha and native browser desktop/mobile comparisons. Test valid/invalid submission and failure fallback against an isolated local webhook; never create a production lead for the test.
- [ ] Validate actual Nginx responses in CI, create draft PR, build and publish image, update only the Hub service through Services and compare environment values without printing them.
- [ ] Re-run mobile performance captures in the same calibrated Chrome conditions as the baseline and retain before/after artifacts. Save factual local brain report.
