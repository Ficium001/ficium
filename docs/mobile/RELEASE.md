# Releasing the Ficium apps

How a build gets from `main` to Google Play and the App Store. Architecture and
security controls are in [README.md](README.md); store text and privacy
declarations are in [STORE_LISTING.md](STORE_LISTING.md).

## The flow

```
main ──► Actions → "Mobile release" → Run workflow (version 1.0.0)
           ├─ web      tests + native bundle, built against real config
           ├─ android  signed AAB ──► Play Console: internal testing
           └─ ios      signed IPA ──► App Store Connect: TestFlight
         ──► you test on real phones
         ──► you promote to production in Play Console / App Store Connect
```

CI can only reach the **testing** channels. Going public is always a person
pressing a button in the store console. `scripts/play-upload.mjs` refuses any
track other than internal or closed testing.

The workflow runs from `main` only. Every input is validated before anything is
built, and a release is never built against placeholder config.

## Versions

| | Where it comes from | Rule |
|---|---|---|
| Version (`1.0.0`) | the `version` input | What users see. Raise it for every store release. |
| Build number | the workflow run number (or the `build_number` input) | Must always go up. Both stores reject a repeat. |

The same pair is stamped into both apps (`APP_VERSION_NAME` / `APP_VERSION_CODE`
on Android, `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` on iOS). Nothing in
the repository needs editing to cut a release.

If the workflow file is ever renamed its run number restarts at 1. Pass
`build_number` (higher than the last one used) for the first run after that.

## One-time setup

### 1. Accounts

1. **D-U-N-S number** for Ficium Ltd (free, up to about 2 weeks).
2. **Apple Developer Program**, as an organisation ($99 a year). Note the Team ID.
3. **Google Play Console**, as an organisation ($25 once). Organisation accounts
   are not subject to the "12 testers for 14 days" rule that applies to new
   personal accounts.

Register both in the legal name **Ficium Ltd**, with an email address and
website on a domain Ficium owns. Apple checks this for finance apps
(see "Review risks" in STORE_LISTING.md).

### 2. Android upload key

Create it once, on your own machine, and keep an offline backup. Play App
Signing holds the real signing key; this is only the upload key, and Google can
reset it if it is ever lost.

```sh
keytool -genkeypair -v -keystore ficium-upload.jks -alias ficium-upload \
  -keyalg RSA -keysize 4096 -validity 9125 \
  -dname "CN=Ficium Ltd, O=Ficium Ltd, C=MU"
base64 -w0 ficium-upload.jks   # paste the output into ANDROID_KEYSTORE_BASE64
```

### 3. Google Play API access

1. Play Console → create the app `net.ficium.app` (category: Finance).
2. Google Cloud → create a service account, create a JSON key.
3. Play Console → Users and permissions → invite the service account's email,
   with **Release to testing tracks** for this app only. Nothing wider.

### 4. App Store Connect API key

1. App Store Connect → create the app with bundle ID `net.ficium.app`.
2. Users and Access → Integrations → App Store Connect API → generate a team key
   with the **Admin** role (needed so Xcode can manage signing certificates and
   profiles; a lower role fails at the archive step). Download the `.p8` once.

No certificate or provisioning profile is stored in GitHub. Xcode creates and
renews them in the Apple account through this key.

### 5. GitHub configuration

Settings → Secrets and variables → Actions.

**Variables** (public values):

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | App database URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | App database publishable key |
| `APPLE_TEAM_ID` | Apple Team ID |

**Secrets**:

| Name | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | The upload keystore, base64 |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | `ficium-upload` |
| `ANDROID_KEY_PASSWORD` | Key password |
| `PLAY_SERVICE_ACCOUNT_JSON` | The service account JSON key, whole file |
| `ASC_KEY_ID` | App Store Connect key ID |
| `ASC_ISSUER_ID` | App Store Connect issuer ID |
| `ASC_PRIVATE_KEY` | Contents of the `.p8` file |

`FICIUM_SHARED_TOKEN` (already set) is also used, to install the private
contract package.

If the GitHub plan allows protected environments on private repositories,
move these secrets into an environment with a required reviewer and add
`environment:` to the two store jobs. That adds a second approval before any
signing key is used.

### 6. Link verification files

Password-reset and invitation links open the app only once the public site
serves these two files. Add them under `public/.well-known/`:

- `apple-app-site-association` (no file extension):
  ```json
  { "applinks": { "details": [ { "appIDs": ["<TEAM_ID>.net.ficium.app"], "components": [ { "/": "/auth/*" }, { "/": "/offers*" }, { "/": "/invite/*" } ] } ] } }
  ```
- `assetlinks.json`, with the **app signing** certificate fingerprint from Play
  Console → Setup → App signing (not the upload key's):
  ```json
  [ { "relation": ["delegate_permission/common.handle_all_urls"],
      "target": { "namespace": "android_app", "package_name": "net.ficium.app",
                  "sha256_cert_fingerprints": ["<PLAY APP SIGNING SHA-256>"] } } ]
  ```

`vercel.json` already serves the Apple file as JSON.

### 7. Server settings the stores depend on

- **Account deletion must be on.** Both stores require it. Set
  `ACCOUNT_CLOSURE_RETENTION_YEARS` (7 or more) in the production environment;
  until then the app tells users closure "isn't available yet", which fails
  review.
- **The legal pages must be final.** `LEGAL_DRAFT` in
  `src/features/legal/content.ts` is still `true`, so the Privacy Notice shows a
  "draft under legal review" banner. Both stores require a real privacy policy.

## The first release

Google Play will not accept an API upload for an app that has never had a
build, so the first Android build goes up by hand:

1. Run **Mobile release** with `upload` switched **off**. Download the
   `ficium-android-…` artifact (the signed `.aab`).
2. Play Console → Testing → Internal testing → create a release → upload the
   `.aab`. Accept Play App Signing when asked.
3. Complete the store listing, Data safety form and Financial features
   declaration from STORE_LISTING.md.
4. Add the app signing fingerprint to `assetlinks.json` (step 6 above).

iOS has no such restriction: the first run with `upload` on goes straight to
TestFlight. Processing takes 10 to 30 minutes before the build appears.

From the second release on, run the workflow with `upload` on. Keep
`play_status` at `draft` until Google has approved the app once; a draft is
released to testers with one click in Play Console.

## Forcing an update

`public/app-release.json` holds the lowest version of each app that is allowed
to run:

```json
{ "ios":     { "minVersion": "1.0.0", "storeUrl": "https://apps.apple.com/app/id<APPLE_ID>" },
  "android": { "minVersion": "1.0.0", "storeUrl": "https://play.google.com/store/apps/details?id=net.ficium.app" } }
```

Raise `minVersion` and deploy the web app. Each installed app below that
version shows a blocking "Update Ficium to continue" screen, with a button to
the store, the next time it is opened or brought back to the front (the file is
cached for 5 minutes and re-read at most every 10). Use it when an old version has a security
problem or can no longer talk to the API.

- Only raise it **after** the new version is live in the store, or users are
  blocked with nothing to update to.
- Fill in the iOS `storeUrl` once the app has its App Store ID.
- A broken or unreachable file never locks anyone out; a phone that has already
  seen a higher minimum keeps enforcing it offline.

The file is public and sent with `Access-Control-Allow-Origin: *`. That is
deliberate: it contains two version numbers and two store links, the app reads
it without credentials, and the API's strict origin allowlist is unchanged.

## If a release goes wrong

| Symptom | Cause |
|---|---|
| "release is never built against placeholders" | Repository variables from step 5 are missing. |
| "The release bundle is not signed" | Keystore secrets missing or wrong. |
| Play: `Upload bundle failed: HTTP 403` | The service account lacks access to this app. |
| Play: "Only releases with status draft may be created on draft app" | Use `play_status: draft` until the first review passes. |
| Play: version code already used | Build numbers must rise; pass a higher `build_number`. |
| iOS archive: "No profiles for 'net.ficium.app'" | The API key is not Admin, or the bundle ID is not registered. |
| A crash report shows `a.b.c()` | Download `mapping.txt` from that release's artifact and upload it in Play Console. |

Nothing is published to users by a failed or partial run. A Play upload is one
transaction and is discarded on any error.
