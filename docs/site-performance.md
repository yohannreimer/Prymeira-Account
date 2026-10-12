# Public site performance

The public site keeps the original artwork and complete regular font glyph coverage. Regular EBGaramond and Geist are losslessly wrapped as WOFF2; their cmap, hmtx and every glyf outline were compared to the original TTFs. Italic Google Fonts v33 subsets are served locally with their existing unicode ranges. Font licenses are in `site/fonts/*-OFL.txt`.

Hero sky remains the original resolution and has high fetch priority. Sized illustrations use high-quality 640/960/1440px WebP candidates only when smaller than the original; original files remain the largest fallback. Below-hero images use native lazy loading. CSS positions, intrinsic dimensions and aspect ratios remain unchanged.

`page-motion.js` keeps the original scroll/team targets and easing, pauses after convergence, resumes on scroll/resize/team changes/font completion/body size changes, and avoids repeated writes of unchanged styles. Scrollcraft does not start its video seek loop without video playheads. Form submission and Talk payload are unchanged.

Only the public Nginx server enables gzip and seven-day static asset caching. HTML, runtime configuration and the shared Clarity loader remain no-cache. The build runs `scripts/version-site-assets.mjs`, adding a content hash query to local static assets referenced in HTML, so changed assets are fetched immediately after publication. Compression and asset locations inherit the existing security headers. The Hub server remains isolated.

Verification: `node --test scripts/test-site-analytics.mjs scripts/test-page-motion.mjs scripts/test-site-assets.mjs`; the publish workflow also tests actual Nginx HTML injection, gzip, cache headers and Hub isolation. Native browser QA compared 1440x900 desktop and 360x800 mobile captures and tested agent selection, invalid form validation, successful local webhook submission, FAQ and HTTP failure/WhatsApp fallback. No production leads were created for this verification.

Baseline performance and the new production measurements are retained in the task artifacts. Lab profiles represent CPU/network classes, not physical handset models. Clarity remains cookieless and form masking remains enabled.
