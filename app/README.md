# WNY 3RD ALARM app V2.0

This standalone app lives under `/app/` and does not alter the existing website. Its paths are relative so it works under the GitHub Pages project path. The icons reproduce the existing website's text wordmark; no separate logo image is present in the repository.

## Manual deployment

Extract the ZIP at the repository root so its `app/` directory replaces the previous standalone app files. Keep the existing root `images/` directory and `incidents.json`: the app references them without changing them. Commit the app changes for review before deploying. The service worker cache is versioned; an existing installation picks up the updated worker after its older app tabs are closed. Installation and native sharing should also be checked on real Android and iPhone devices over HTTPS.

The install control is hidden in standalone mode and immediately after an installation event. A regular browser tab cannot always detect an installation made elsewhere. Sharing uses the native share sheet where available, then clipboard or a selectable link.

## Incident review

The app requests `../incidents.json` without browser or service-worker caching. The current Active911 workflow publishes automatically and does **not** mark items as reviewed. Accordingly, the app will show an empty state until a separate editorial process supplies `reviewed: true` on an item. A marker must only be added after a human has reviewed the item for public release. The app does not change the feed or establish such a process. It additionally requires a recent valid timestamp and an exact match to the small fire category allowlist in `app.js`. It renders only a fixed category label, the general region, and time; it never renders free-form titles, addresses or medical call details. Do not add a review marker automatically or treat publication in the existing feed as review.

## Offline and installation

The service worker's scope is limited to `/app/`. It caches only explicitly named static app assets and a standalone offline page; navigations always use the network and show the offline page if unavailable. Incident and weather requests are never cached by the service worker. iPhone users install from Safari's Share menu; Android browsers may present the install prompt or their install menu. HTTPS is required outside localhost. Test on real devices after deployment.

## Future notifications

No push subscription, notification permission, credentials, or push event handler is enabled. A future implementation should use a separately reviewed public notification feed and opt-in UI, a server-side subscription service and VAPID keys, an explicit retention policy, and service worker `push`/`notificationclick` handlers scoped to this app. Never put Active911 credentials or sensitive incident data in a push payload. Add these only after the publishing and privacy workflows are approved.
