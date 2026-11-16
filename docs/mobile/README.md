# Ficium mobile apps (iOS & Android)

One codebase. The borrower web app is packaged into native iOS and Android
shells with [Capacitor](https://capacitorjs.com). Everything that differs between
the browser and the app lives in **`src/shared/platform`**. Feature modules
never import `@capacitor/*` directly (enforced by ESLint).

## Architecture

```
src/ (React SPA)  ──vite build --mode native──►  dist/  ──cap sync──►  ios/  android/
       │                                                                  │
       └── shared/platform/                                               └── native shells
            runtime.ts        web vs ios vs android (single source of truth)
            endpoints.ts      apiUrl() / publicUrl(): every absolute URL
            secureStorage.ts  Supabase session in Keychain / Keystore
            deepLinks.ts      universal / App Links, auth-link exchange
            navigation.ts     openExternal(): system browser, never the WebView
            deviceAuth.ts     Face ID / fingerprint / passcode verification
            lockPolicy.ts     when the app locks itself
            releasePolicy.ts  forced-update gate (minimum supported version)
            appInfo.ts        installed version and build number
            bootstrap.ts      native-only startup wiring (no-op on web)
```

| Concern | Web | App |
|---|---|---|
| Origin | `https://ficium.vercel.app` | `capacitor://localhost` (iOS), `https://localhost` (Android) |
| `/api` calls | same-origin, relative | absolute to `VITE_API_BASE_URL`, CORS allowlisted |
| Session storage | localStorage (Supabase default) | iOS Keychain / Android Keystore |
| CSP | `vercel.json` header | `<meta>` injected by the native build |
| Auth email links | `detectSessionInUrl` | OS opens the app → `deepLinks.ts` exchanges tokens |

## Security controls

App (client):
- Session tokens live in the Keychain/Keystore. On iOS they are accessible only while the device is unlocked, never synced to iCloud, and never migrated to another device.
- A strict CSP is injected into the bundled `index.html`, and `connect-src` covers only the API and Supabase.
- Deep links are accepted only as `https` from the configured app origin. Custom schemes and look-alike hosts are ignored, and auth tokens are stripped before routing.
- Foreign sites open in the system browser and never inside the app's WebView.
- Android: `FLAG_SECURE` (no screenshots, screen recording or recents thumbnail), backups and device-transfer disabled, cleartext disabled, system CAs only (user-installed CAs rejected), App Links `autoVerify`.
- iOS: the app is blurred in the app switcher, it runs portrait only, and associated domains are used for universal links.

API (server):
- CORS uses an exact-match allowlist (`capacitor://localhost`, `https://localhost`, or `CORS_ALLOWED_ORIGINS`). It never uses `*`, never reflects an arbitrary origin, and never allows credentials. Auth is a Bearer token, so CSRF does not apply. CORS is not authentication; every route keeps its own auth gate.

Build:
- `vite build --mode native` fails if any of `VITE_API_BASE_URL`, `VITE_PUBLIC_APP_URL`, `VITE_SUPABASE_URL` or `VITE_SUPABASE_PUBLISHABLE_KEY` is missing or not https.
- `npm run check:native` fails if the link domain or app id drifts between `.env.native`, Android and iOS.
- Native dependencies are pinned exactly, and CI actions are pinned to commit SHAs.

## Build flow

```
npm run build:native   # typecheck → vite --mode native → cap sync
npm run android        # build + open Android Studio
npm run ios            # build + open Xcode (macOS only)
```

`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` come from your environment (Doppler). Public, non-secret native config is in `.env.native`.

CI (`.github/workflows/mobile.yml`) runs on every PR:
**config check → native web bundle → Android debug APK and release bundle (R8) → iOS simulator compile**.
iOS builds run on GitHub's macOS runners, so no Mac is needed for CI.

## Release flow

```
Actions → "Mobile release" → Run workflow (from main, by hand)
  ├─ Android: signed AAB (upload key in GitHub secrets) → Play Console internal testing
  └─ iOS:     signed IPA (App Store Connect API key)    → TestFlight
→ test on real phones → promote to production in the store consoles
```

CI reaches the testing channels only. Setup, secrets, the first release and
forced updates are in [RELEASE.md](RELEASE.md). Store text, privacy
declarations and review risks are in [STORE_LISTING.md](STORE_LISTING.md).

## One-time setup (owner)

Accounts, keys, GitHub secrets and the link verification files are listed step
by step in [RELEASE.md](RELEASE.md).

If the public domain changes (for example to `app.ficium.net`), update all three places together: `.env.native`, `appLinkHost` in `android/app/build.gradle`, and `ios/App/App/App.entitlements`. `npm run check:native` enforces this.

## Release hardening

- Android release builds are shrunk and renamed by R8, with unused resources
  removed. The mapping file is kept with each release for crash de-obfuscation.
- Version and build number are injected at build time; nothing is edited by hand.
- The release bundle is checked to be signed with the upload key, never a debug key.
- `ios/App/App/PrivacyInfo.xcprivacy` declares collected data and API use. No
  tracking, no advertising or analytics SDK.
- iPhone only. The layout is a portrait phone layout.
- Forced update: staff set the lowest version allowed to run in the app admin
  site (four-eyes). Older installs are blocked until updated
  (`shared/platform/releasePolicy`, `public.app_release_policy`).
- Version monitoring: a signed-in app reports its platform, version and build
  once a day (`app/AppClientReporter`). The admin site shows totals per version.
  Nothing about the device is sent.

- Error reporting: a signed-in app reports JavaScript errors it hits, scrubbed
  of personal-looking data (`app/ErrorReporter`, `shared/lib/errorReport`). The
  admin site shows the most widespread errors per app version. Crashes in the
  native shell itself still appear only in Play Console and App Store Connect.

## Changing the server without breaking installed apps

An installed app keeps using the API and the database as they were when it was
built. Three guards hold that line:

- **Database:** `scripts/check-migrations.mjs` (CI) refuses a migration that
  drops or renames something, or changes a column's type, unless it carries a
  `-- compat:` line saying why installed apps are unaffected. Add first, remove
  later: ship the app that no longer needs it, raise the minimum version in the
  admin site, then drop.
- **API routes:** `api/_tests/mobile-surface.test.ts` lists the routes released
  apps call. Removing one fails the tests until it is retired the same way.
- **Applied, not just merged:** every migration records itself in the
  database's ledger. The deployed app compares the ledger with the migrations it
  was built with, and the scheduled keepalive check fails when one is missing.

These catch removals and renames. They do not catch a route that keeps its name
but changes what it returns: that still needs care in review.

## Web and app: one product

The phone apps are the same React code as the web app, packaged in a native
shell, talking to the same API and database. There is no data to sync: neither
keeps data on the device (only the sign-in session, in the Keychain/Keystore).

What differs is how code ships. A web deploy reaches every browser at once. The
apps carry their screens inside the installed binary, so a change reaches phones
only through a store release, and older versions stay in use for weeks. Two
rules follow:

- The API must keep working for every app version at or above the minimum.
  A breaking API change ships in three steps: release the app that handles
  both, raise the minimum, then remove the old behaviour.
- Server-side changes (API, database, policies) still reach the apps at once.

## Decisions

**Certificate pinning: not used.** The app talks to Vercel and Supabase, whose
certificates are issued and rotated by them, not by Ficium. Pinning to
certificates we do not control turns a routine rotation on their side into an
outage for every installed app, recoverable only by a store release. The risk
pinning addresses (interception with a rogue certificate) is already narrowed:
Android trusts system CAs only and rejects user-installed ones, and both
platforms refuse cleartext. Revisit if the API moves behind a Ficium-owned
domain with certificates Ficium controls.

**Root / jailbreak detection: not done in the client.** A check that runs
inside the app is bypassed by the same tools that root the phone, so on its own
it adds little. The control that works is server-verified attestation (Play
Integrity on Android, App Attest on iOS), where the server refuses sensitive
calls from a device the platform will not vouch for. It needs the Google Cloud
and Apple accounts, so it is the first hardening item after the store accounts
exist.

## Roadmap

| Phase | Scope | Status |
|---|---|---|
| 1 Foundation | Shells, platform module, secure session, CORS, deep links, hardening, CI | Done |
| 2 Native value | Biometric app lock, device verification for sensitive actions, icon and splash, offline banner | Done |
| 3 Release | Signing, release workflow, privacy manifest, R8, forced-update gate, in-app account closure, store listing pack | Done in code; needs the store accounts and secrets (RELEASE.md) |
| 4 After the accounts exist | Push notifications for new offers (APNs / FCM), Play Integrity and App Attest on sensitive endpoints, link verification files | Not started |
