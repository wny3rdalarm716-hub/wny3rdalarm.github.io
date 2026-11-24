# WNY 3RD ALARM app V2.3.3

This standalone app lives under `/app/` and does not alter the existing website, Active911 integration, Firebase, or workflows. Paths are relative so it works under the GitHub Pages project path. The app icons reproduce the existing website's text wordmark.

## Manual deployment

Extract the ZIP at the repository root to replace the previous `app/` files, review the changes, and deploy through the repository's established process. Keep the existing root `images/` directory: three gallery photos use those existing JPEGs. Three other photographs were PNG data with `.jpg` filenames in the repository; exact copies are included under `app/media/` with `.png` extensions so servers send the correct media type. Credits remain in the gallery.

CSS, JavaScript and service worker caches are versioned. The updated worker activates once its static assets are ready and removes older app caches without touching other caches. The app identity, scope and start URL remain unchanged, so an installation can update without reinstalling; reload an already open app after an update. Settings includes an update check. Test installation, swipe and sharing on real Android and iPhone devices over HTTPS.

The install control is hidden in standalone mode and after an installation event. Browsers do not always reveal an installation to an ordinary browser tab. Sharing uses the native share sheet where available, then clipboard or a selectable link.

## Reviewed incident summaries

The app reads only `app/reviewed-incidents.json`, which starts empty. It never reads the automatically published Active911 feed. It displays only explicitly marked records in the fixed general fire-category allowlist from the last 24 hours, with a fixed Western New York region and review time. No free-form notes are displayed. See [PUBLISHING.md](PUBLISHING.md) for the required manual review, safe local preparation, independent approval and repository access controls. A review marker alone is not proof of review; the app and helper cannot enforce GitHub permissions or prevent sensitive content committed directly to a public file. An administrator must configure branch protection and deploy restrictions before using this process. **Never commit private source material or unreviewed notes.**

## Weather and preferences

Weather uses official NWS observations from a named nearby station, county alerts, and a representative point forecast; the station or forecast point may not represent every location in a county. The app displays up to ten forecast periods and labels a forecast used as a fallback for a missing observation description. County and notification preferences are saved locally when storage is available. Category preferences do not activate automatic push delivery or request notification permission. For safety-critical decisions, use official NWS sources directly. Weather and incident responses are never stored in the app's service-worker cache.

## Offline and notifications

The service worker is limited to `/app/`, caches only explicitly listed static assets, and shows a fallback page when navigation is offline. Gallery photos, incidents and weather require network access. Remote test registration is implemented; automatic push delivery is not. Any future delivery service must use explicit opt-in, separate credentials and a separately reviewed public payload; never include Active911 credentials or sensitive information in push messages.

## V2.3.1 push registration (test stage)
Deploy the app directory over the existing app directory. Open Settings and enable notifications. Copy the private device token for an authorized FCM HTTP v1 sender. Send a data-only message with `data: {"kind":"test"}` to that token. No service account key belongs in the website, ZIP, or public repository. The existing Firebase voting configuration is reused without changing its database or rules. Automatic incident/weather delivery and server-side preference storage are not implemented; toggles remain local. Use Disable notifications to delete the FCM registration. Test on an actual installed device after deployment. The SDK is loaded from Google's CDN. If the module cannot load, the rest of the app remains usable. Do not use this app as an emergency warning system.

V2.3.1: accepts Firebase Console notification payloads and data-only test pushes; foreground messages also request a system notification. Actual device delivery must be tested.

## V2.3.2
- Preserves the V2.3.1 layout, gallery, installation identity, and Firebase configuration.
- Settings has a fictional incident preview and a local OS notification test, separate from remote Firebase testing.
- Reviewed feed refreshes on reconnect and when returning to the foreground; requests have a 12-second timeout. The status shows the number of displayed reviewed summaries.
- The public reviewed feed is intentionally separate from the website's automatic feed. Only concluded, independently reviewed general summaries belong there. No automatic publication or remote incident/weather delivery is included.
- Existing installations: Settings > Check for updates, then reload. Test on actual devices.
- For a patch-only deployment, replace only the files included in the V2.3.2 patch ZIP under app/. Do not overwrite your existing reviewed-incidents.json, root website files or voting configuration.

## V2.3.3 weather hotfix
- If the latest station report lacks a recent numeric temperature or cannot be retrieved, search up to 24 station observations and show the newest valid measurement no older than three hours. Show its timestamp and identify fallback readings. If no valid measurement exists, report temperature unavailable; do not substitute a forecast high.
- Replace the files in this patch under app/. The service worker cache version is bumped. No changes to reviewed feed, photos, Firebase settings, or root website.
