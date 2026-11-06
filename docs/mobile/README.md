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
**config check → native web bundle → Android debug APK → iOS simulator compile**.
iOS builds run on GitHub's macOS runners, so no Mac is needed for CI.

## Release flow (to be added once accounts exist)

```
tag vX.Y.Z → release workflow (manual approval)
  ├─ Android: signed AAB (upload key in GitHub secrets) → Play Console internal track
  └─ iOS:     signed IPA (App Store Connect API key) → TestFlight
→ internal testing → staged rollout
```

## One-time setup (owner)

1. **D-U-N-S number** for Ficium Ltd (free, up to about 2 weeks). This is a prerequisite for 2.
2. **Apple Developer Program**, organisation account ($99/yr). Note the **Team ID**.
3. **Google Play Console**, organisation account ($25 one-time). Complete the Financial Features declaration.
4. **GitHub repository variables** (Settings → Secrets and variables → Actions → *Variables*): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. Until they are set, CI compiles against placeholders and publishes no APK.
5. **Link verification files**, served from the `VITE_PUBLIC_APP_URL` host. Add them under `public/.well-known/` once 2 and 3 exist:
   - `apple-app-site-association` (no extension, `Content-Type: application/json`):
     ```json
     { "applinks": { "details": [ { "appIDs": ["<TEAM_ID>.net.ficium.app"], "components": [ { "/": "/auth/*" }, { "/": "/offers*" }, { "/": "/invite/*" } ] } ] } }
     ```
   - `assetlinks.json`:
     ```json
     [ { "relation": ["delegate_permission/common.handle_all_urls"],
         "target": { "namespace": "android_app", "package_name": "net.ficium.app",
                     "sha256_cert_fingerprints": ["<PLAY APP SIGNING SHA-256>"] } } ]
     ```
   Only the listed paths open the app. Everything else stays on the web.
6. **Supabase → Auth → URL configuration**: the reset link already targets `https://ficium.vercel.app/auth/reset-password`, so no change is needed while the domain stays the same.

If the public domain changes (for example to `app.ficium.net`), update all three places together: `.env.native`, `appLinkHost` in `android/app/build.gradle`, and `ios/App/App/App.entitlements`. `npm run check:native` enforces this.

## Roadmap

| Phase | Scope |
|---|---|
| 1 Foundation (this) | Shells, platform module, secure session, CORS, deep links, hardening, CI |
| 2 Native value | Biometric unlock (Face ID / fingerprint) gating the stored session, push notifications for new bids (APNs/FCM via the existing notification events), native camera for KYC/NIC scan, splash/icons, status bar |
| 3 Release | Signing, release workflow, store listings, privacy labels / Data safety form, iOS `PrivacyInfo.xcprivacy`, account deletion in-app (both stores require it) |
| 4 Hardening+ | Root/jailbreak signal, certificate pinning decision, R8/minify, Play Integrity / App Attest on sensitive endpoints, forced-update gate |
