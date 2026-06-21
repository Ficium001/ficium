# Ficium — API Documentation

> **Version:** 1.0 | **Base URL:** `https://ficium.net` (production) / `https://ficium.vercel.app` (staging)
> **Audience:** Developers, Technical Reviewers, QA Teams

---

## What Is an API?

An API (Application Programming Interface) is how different parts of the Ficium system talk to each other. Think of it like a waiter in a restaurant: you (the app screen) tell the waiter (the API) what you need, the waiter goes to the kitchen (the server/database), and brings back your order.

All Ficium APIs are **serverless functions** hosted on Vercel. Each one handles a specific job.

---

## Authentication & Security

All API endpoints run on Vercel's serverless platform. They use:

- **Supabase Service Role Key** — a master key that allows server-side database reads/writes (never exposed to users)
- **AWS Signature v4** — a secure handshake format that authenticates every request to AWS Rekognition
- **Resend API Key** — authorises sending emails
- **Anthropic API Key** — authorises calls to Claude AI

These keys are stored as **environment variables** on Vercel — they never appear in the app code that runs in a user's browser.

---

## Summary Table — All Endpoints

| Endpoint | Method | What It Does |
|---|---|---|
| `POST /api/kyc-verify` | POST | Verifies a client's identity documents using AI and fraud checks |
| `POST /api/kyc-notify` | POST | Sends KYC approval or rejection email to the client |
| `GET/POST /api/kyc-settings` | GET / POST | Reads or updates KYC verification toggles for admin |
| `POST /api/kyc-faces` | POST | Manages the face database used for duplicate detection |
| `POST /api/kyc-liveness` | POST | Runs a real-time liveness check (proves user is a live person, not a photo) |
| `GET/DELETE /api/kyc-admin-faces` | GET / DELETE | Admin tool to view or remove faces from the database |
| `POST /api/chat` | POST | Powers the AI Financial Advisor and journey affordability calculator |
| `POST /api/market` | POST | Powers the live market commentary and Q&A on the Markets page |
| `GET /api/intelligence` | GET | Returns live market rate statistics for the frontend |
| `POST /api/request-builder` | POST | Powers the conversational AI request builder |

---

---

## API 1 — KYC Verify

**Endpoint:** `POST /api/kyc-verify`

### What Is This?

This is the brain of Ficium's identity verification system. When a client submits their documents (ID photo, selfie, proof of address), this API runs a full pipeline of 13 automated checks to decide whether the person is who they say they are.

### In Plain English

Imagine a very thorough bank clerk who:
1. Reads all the text on your ID card
2. Looks at your face in the selfie
3. Compares your selfie to the photo on your ID
4. Checks your address document matches what you told us
5. Checks your ID hasn't been used by someone else
6. Checks you haven't submitted too many times in one day
7. Asks an AI to look at everything and spot anything suspicious

That's what this API does — automatically, in about 10–20 seconds.

### Request

**Method:** `POST`
**Content-Type:** `application/json`

**Body fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `idB64` | string | ✅ Yes | Your ID document photo, encoded in base64 format |
| `selfieB64` | string | ✅ Yes | Your selfie photo, encoded in base64 format |
| `poaB64` | string | ✅ Yes | Your proof of address document, encoded in base64 format |
| `clientId` | string | Recommended | Your Ficium user ID (used for fraud checks) |
| `fullName` | string | Recommended | Your full name as you entered it on the form |
| `documentNumber` | string | Recommended | Your ID or passport number |
| `dateOfBirth` | string | Recommended | Your date of birth in YYYY-MM-DD format |
| `country` | string | Recommended | Country of your ID document |
| `city` | string | Recommended | Your city |
| `addressLine1` | string | Recommended | First line of your address |
| `nationality` | string | Optional | Your nationality (if different from country) |
| `residenceStatus` | string | Optional | `citizen`, `permanent_resident`, `work_permit`, `student_permit`, or `other` |
| `sameNationalityResidence` | boolean | Optional | `true` if your nationality matches your residence country |
| `permitB64` | string | Optional | Work or student permit, encoded in base64 (required if residenceStatus is a permit) |
| `livenessSessionId` | string | Optional | Session ID from the liveness check API (if liveness was run) |
| `livenessConfidence` | number | Optional | Confidence score (0–100) from the liveness check |
| `poaMimeType` | string | Optional | The file type of your proof of address (e.g. `application/pdf`) |
| `poaFileName` | string | Optional | The filename of the proof of address (used to detect PDFs) |

### What Happens Inside (The 13 Checks)

**Tier 1 — Document & Biometric Checks**

| Check | What It Does | Risk Points If Failed |
|---|---|---|
| 1. ID OCR | Reads all text from the ID photo using AWS Rekognition | Up to 30 points |
| 2. MRZ Expiry Check | Reads the machine-readable zone on passports; checks expiry date | +40 if expired; +20 if tampered |
| 3. Face on ID | Confirms there is a face photo on the ID document | +10 if no face found |
| 4. Selfie Face Detection | Confirms there is a clear face in the selfie | +35 if no face; +15 if multiple faces |
| 5. Face Match | Compares the selfie face to the ID face (must match 90%+) | +40 if 0% match; +20 if below 80% |
| 6. Liveness Check | Confirms the person is real and present (not a printed photo) | +25 if failed |
| 7. Spoof Detection | Scans the selfie for signs it is a photo of a photo, a screen, or printed | +15–40 depending on severity |
| 8. Proof of Address OCR | Reads the address document and cross-checks city/address | +15 if unreadable |
| 9. ID Document Classification | Confirms the uploaded file actually looks like an ID document | +15 if not an ID |

**Tier 2 — Fraud Signals**

| Check | What It Does | Risk Points If Failed |
|---|---|---|
| 10. Velocity Check | Flags if the same user has submitted more than 3 times in 24 hours | +20 if too many attempts |
| 11. Document Reuse | Checks if the document number is already on another account | +50 if found |
| 12. Duplicate Face | Searches all verified faces to see if the selfie matches another client's account | +60 if match found |

**Tier 3 — AI Analysis**

| Check | What It Does | Risk Points If Failed |
|---|---|---|
| 13. Claude AI Review | Claude AI looks at the OCR text and ID image for subtle inconsistencies (name mismatch, tampered fonts, suspicious details) | +8 to +25 depending on confidence |

### How the Risk Score Works

Each failed check adds points to a **risk score** (0–100):
- **Score 0–29:** Low risk → can be auto-verified
- **Score 30–99:** Medium/High risk → goes to admin review queue
- **Score 100 (or hard reject triggers):** Hard rejection

**Hard reject triggers (instant failure, no review):**
- No face detected in selfie
- Selfie face does not match ID face (0% similarity)
- Selfie detected as a photo of a screen/printed image
- Document number already used by another account
- Same face found on another account
- ID document has expired (MRZ detected this)
- AI detects a clear name mismatch with high confidence

### Response

**Success (ok: true — passed or needs review)**

```json
{
  "ok": true,
  "referenceId": "aws-1717600000000",
  "riskScore": 15,
  "flags": ["Date of birth not found in ID"],
  "needsReview": false,
  "details": {
    "idOcr": { "textExtracted": "...", "penalty": 0, "flags": [], "passed": true, "nameMatchScore": 92 },
    "mrz": { "found": true, "valid": true, "docNumber": "A1234567", "nationality": "MUS", "expiry": { "checked": true, "expired": false, "expiry": "2028-03" } },
    "idFaceCheck": { "count": 1, "passed": true },
    "faceDetection": { "count": 1, "confidence": 99.5, "passed": true },
    "faceMatch": { "similarity": 95.2, "passed": true },
    "liveness": { "checked": true, "passed": true, "confidence": 97.0 },
    "spoofCheck": { "penalty": 0, "passed": true, "labels": ["Person (99%)", "Face (98%)"] },
    "poaOcr": { "passed": true, "skipped": false, "penalty": 0, "flags": [] },
    "docClassification": { "isIdDoc": true, "confidence": 96.0 },
    "fraudChecks": {
      "velocity": { "tooMany": false, "count": 1 },
      "documentReuse": { "flagged": false },
      "duplicateFace": { "duplicate": false }
    },
    "aiAnalysis": { "suspicious": false, "confidence": "high", "flags": [], "summary": "Document appears genuine." }
  }
}
```

**Hard Rejection (ok: false)**

```json
{
  "ok": false,
  "referenceId": "aws-1717600000001",
  "riskScore": 90,
  "flags": ["Selfie does not match face on ID", "Face matches another account (94% similarity)"],
  "reason": "Selfie does not match face on ID",
  "details": { ... }
}
```

**Server Error**

```json
{
  "ok": false,
  "referenceId": "aws-1717600000002",
  "riskScore": 50,
  "flags": [],
  "reason": "Pipeline error: AWS credentials not configured"
}
```

### Flowchart

```
Client submits ID + Selfie + Proof of Address
                    ↓
        POST /api/kyc-verify called
                    ↓
        Load KYC settings from database
        (which checks are enabled/disabled)
                    ↓
      Run all checks simultaneously (parallel):
      ┌─────────────────────────────────────┐
      │ OCR: Read ID text                   │
      │ OCR: Read Proof of Address text     │
      │ Detect faces in selfie              │
      │ Detect faces in ID photo            │
      │ Detect labels in selfie (spoof)     │
      │ Detect labels in ID (classification)│
      │ Compare selfie face vs ID face      │
      │ Search face collection (duplicates) │
      │ Check submission velocity (24h)     │
      │ Check document number reuse         │
      └─────────────────────────────────────┘
                    ↓
      Run Claude AI analysis on results + ID image
                    ↓
      Calculate total risk score (0–100)
                    ↓
              Hard reject?
             /            \
           Yes              No
            ↓               ↓
      Return ok:false   Risk score ≥ 30?
      with reason       /           \
                      Yes             No
                       ↓               ↓
               needsReview:true   needsReview:false
               → Admin queue      → Auto-verified
                    ↓                   ↓
              Index face into       Index face into
              collection            collection
                    ↓                   ↓
              Return ok:true        Return ok:true
              needsReview:true      needsReview:false
```

### Test Scenarios

| Scenario | Expected Response |
|---|---|
| Clear ID, clear selfie, face match 97% | `ok: true`, `needsReview: false`, low risk score |
| Good documents but submitted 4 times today | `ok: true`, `needsReview: true`, velocity flag added |
| Selfie is a photo of a printed photo | `ok: false`, spoof detection penalty ≥ 40 → hard reject |
| Passport expiry date in the past | `ok: false`, MRZ expired flag → hard reject |
| Document number already on another account | `ok: false`, document reuse flag → hard reject |
| Same selfie face already on another account | `ok: false`, duplicate face flag (60 pts) → hard reject |
| Missing `idB64` in request body | HTTP 400: "idB64, selfieB64, poaB64 required" |
| AWS credentials missing | HTTP 503: "AWS credentials not configured" |

---

---

## API 2 — KYC Notify

**Endpoint:** `POST /api/kyc-notify`

### What Is This?

After a Ficium admin reviews a KYC submission and makes a decision (approve or reject), this API sends a branded email to the client telling them the outcome.

### In Plain English

Think of this as the official letter from Ficium. If you're approved, it says "Welcome — you can now post requests." If you're rejected, it tells you why and gives you a button to resubmit.

### Request

**Method:** `POST`
**Content-Type:** `application/json`

| Field | Type | Required | Description |
|---|---|---|---|
| `userId` | string | ✅ Yes | The Ficium client ID to notify |
| `decision` | string | ✅ Yes | Either `"approved"` or `"rejected"` |
| `note` | string | Optional | An optional personal note from the admin (e.g. "Congratulations! Your documents were very clear.") |

### What Happens Inside

1. Looks up the client's email and name from the Supabase database
2. Builds a branded HTML email (Ficium colours, logo, clear message)
3. Sends the email via the **Resend** email service
4. Returns the Resend email ID for tracking

### Response

**Success**

```json
{
  "ok": true,
  "emailId": "re_abc123xyz"
}
```

**Errors**

| Situation | HTTP Code | Message |
|---|---|---|
| `RESEND_API_KEY` not set | 503 | "RESEND_API_KEY not set" |
| User not found in database | 404 | "User not found" |
| Resend email API failed | 502 | "Email failed" + detail |
| Missing `userId` or `decision` | 400 | "userId and decision required" |

### Email Templates

**Approved email contains:**
- Ficium logo and branding (cobalt blue header)
- "Identity verified ✓" heading
- Personal message: "Hi [Name], your identity has been verified..."
- Optional admin note (shown in a green box)
- "Post your first request →" button linking to ficium.net/requests/new

**Rejected email contains:**
- Ficium logo and branding
- "Verification unsuccessful" heading
- Clear reason for rejection (shown in a red box)
- "Resubmit documents →" button linking to the KYC page

### Flowchart

```
Admin approves or rejects KYC in admin panel
              ↓
   POST /api/kyc-notify called with userId + decision
              ↓
   Fetch client email + name from Supabase database
              ↓
   Build branded HTML email (approved or rejected template)
              ↓
   Send via Resend API (from: onboarding@ficium.net)
              ↓
         Email delivered?
          /         \
        Yes           No
         ↓             ↓
   Return ok:true   Return 502 error
   + emailId        + Resend error detail
```

### Test Scenarios

| Scenario | Expected Result |
|---|---|
| Valid userId, decision "approved" | Email sent; `ok: true` returned |
| Valid userId, decision "rejected", note provided | Email with red rejection box + reason |
| Non-existent userId | HTTP 404: "User not found" |
| Resend API key missing | HTTP 503: "RESEND_API_KEY not set" |
| Resend API returns error | HTTP 502: "Email failed" |

---

---

## API 3 — KYC Settings

**Endpoint:** `GET /api/kyc-settings` | `POST /api/kyc-settings`

### What Is This?

This API lets Ficium admins turn individual KYC checks on or off without changing any code. For example, if a specific check is causing too many false rejections, an admin can disable it temporarily.

### In Plain English

Think of this as a control panel with 10 on/off switches — each switch controls one part of the identity verification process.

### Available Settings (Toggles)

| Setting Key | What It Controls | Default |
|---|---|---|
| `face_match` | Compare selfie to ID face | ON |
| `duplicate_face` | Search for faces on other accounts | ON |
| `ocr_name_match` | Check name on ID matches account name | ON |
| `proof_of_address` | Run OCR on proof of address | ON |
| `velocity_check` | Block too many submissions in 24h | ON |
| `document_reuse` | Block a document number used on another account | ON |
| `liveness_check` | Include liveness session result in scoring | ON |
| `mrz_validation` | Read and validate machine-readable zone | ON |
| `ai_analysis` | Run Claude AI review on documents | ON |
| `permit_check` | Validate work/student permit document | ON |

### GET Request — Read Current Settings

**Method:** `GET`
**No body required**

**Response:**

```json
{
  "id": 1,
  "face_match": true,
  "duplicate_face": true,
  "ocr_name_match": true,
  "proof_of_address": true,
  "velocity_check": true,
  "document_reuse": true,
  "liveness_check": true,
  "mrz_validation": true,
  "ai_analysis": true,
  "permit_check": true,
  "updated_at": "2025-06-01T09:00:00.000Z"
}
```

### POST Request — Update a Setting

**Method:** `POST`
**Content-Type:** `application/json`

| Field | Type | Required | Description |
|---|---|---|---|
| `key` | string | ✅ Yes | The name of the setting to change (e.g. `"ai_analysis"`) |
| `value` | boolean | ✅ Yes | `true` to enable, `false` to disable |

**Example body:**
```json
{
  "key": "mrz_validation",
  "value": false
}
```

**Response:**

```json
{
  "id": 1,
  "mrz_validation": false,
  "updated_at": "2025-06-06T10:30:00.000Z"
}
```

### Flowchart

```
Admin visits KYC Settings panel
        ↓
GET /api/kyc-settings → loads current toggle state
        ↓
Admin toggles a check (e.g. disables AI analysis)
        ↓
POST /api/kyc-settings { key: "ai_analysis", value: false }
        ↓
Supabase database updated
        ↓
Next KYC submission will skip AI analysis
```

### Test Scenarios

| Scenario | Expected Result |
|---|---|
| GET with valid credentials | Returns full settings object |
| POST `{ key: "face_match", value: false }` | face_match disabled; confirmed in response |
| POST with non-boolean value | HTTP 400: "key and value required" |
| POST with unknown key | Supabase may ignore or store — no error thrown |

---

---

## API 4 — KYC Faces

**Endpoint:** `POST /api/kyc-faces`

### What Is This?

Manages a private database of verified client face biometrics (stored in AWS Rekognition). This database is how Ficium detects if two different accounts are using the same person's face — a common fraud pattern.

### In Plain English

Imagine a filing cabinet where every verified client has a card with their unique face measurements (not an actual photo — just the mathematical pattern of their face). When someone new submits a selfie, the system checks this cabinet: "Has this face appeared before under a different name?"

### Actions

The `action` field in the request body determines what happens:

#### Action: `create`

Sets up the face collection for the first time. Run once when first deploying Ficium.

**Request:**
```json
{ "action": "create" }
```

**Response:**
```json
{ "ok": true, "message": "Collection created" }
```

#### Action: `search`

Checks whether a face already exists in the collection (without adding it).

**Request:**
```json
{
  "action": "search",
  "imageB64": "<base64 encoded selfie>",
  "clientId": "abc-123-uuid"
}
```

**Response (no match):**
```json
{ "duplicate": false }
```

**Response (match found):**
```json
{
  "duplicate": true,
  "matchedClientId": "xyz-456-uuid",
  "similarity": 97.3
}
```

#### Action: `index`

Adds a verified face to the collection so future submissions can be compared against it.

**Request:**
```json
{
  "action": "index",
  "imageB64": "<base64 encoded selfie>",
  "clientId": "abc-123-uuid"
}
```

**Response:**
```json
{ "ok": true }
```

### Flowchart

```
Client submits KYC (kyc-verify runs automatically)
        ↓
kyc-verify calls SearchFacesByImage internally
        ↓
      Match found?
       /        \
     Yes          No
      ↓            ↓
  +60 risk pts  Continue with other checks
  Hard reject       ↓
                  Passed with clean score?
                   /                  \
                 Yes                   No
                  ↓                     ↓
         IndexFaces adds          Face not indexed
         verified face            (keeps collection clean)
         to collection
```

### Test Scenarios

| Scenario | Expected Result |
|---|---|
| Create collection when it doesn't exist | `ok: true` |
| Create collection when it already exists | AWS returns ResourceInUseException; handle gracefully |
| Search with a unique selfie | `duplicate: false` |
| Search with a selfie matching another client | `duplicate: true` + matched client ID |
| Index a verified face | Face stored; future searches will find it |

---

---

## API 5 — KYC Liveness

**Endpoint:** `POST /api/kyc-liveness`

### What Is This?

Runs a real-time liveness check using AWS Rekognition FaceLiveness. The user is shown a challenge on screen (e.g. move your face, blink) to prove they are a real, live person — not someone holding up a photo or using a deepfake video.

### In Plain English

It's like the challenge some websites show: "Move your head left" or "Blink now." It's designed to be something a photo cannot do. AWS measures how confident it is that a real human is present.

### Two-Step Process

**Step 1 — Create a session**

The server creates a session and gives the frontend a `sessionId`. The frontend uses this ID to launch the AWS liveness challenge UI. AWS keys never touch the browser.

**Step 2 — Get the result**

After the user completes the challenge, the frontend sends the `sessionId` back to the server. The server asks AWS: "Did this person pass, and how confident are you?"

### Request: Create Session

```json
{ "action": "create" }
```

**Response:**
```json
{ "sessionId": "abc123-def456-ghi789" }
```

### Request: Get Result

```json
{
  "action": "result",
  "sessionId": "abc123-def456-ghi789"
}
```

**Response:**
```json
{
  "status": "SUCCEEDED",
  "confidence": 97.5
}
```

**Confidence interpretation:**
- **90%+** → Liveness passed (real person)
- **Below 90%** → Liveness failed (+25 risk points in KYC verify)

### Flowchart

```
Client opens KYC form
        ↓
POST /api/kyc-liveness { action: "create" }
        ↓
AWS creates liveness session → returns sessionId
        ↓
Frontend loads AWS liveness challenge UI using sessionId
        ↓
Client completes face challenge (blink, move, smile)
        ↓
POST /api/kyc-liveness { action: "result", sessionId: "..." }
        ↓
AWS returns: SUCCEEDED or FAILED + confidence %
        ↓
sessionId + confidence stored locally
        ↓
Passed to /api/kyc-verify as livenessSessionId + livenessConfidence
        ↓
        Confidence ≥ 90%?
         /              \
       Yes               No
        ↓                 ↓
   Liveness passed    +25 risk points
   No penalty         added to KYC score
```

### Test Scenarios

| Scenario | Expected Result |
|---|---|
| Create session | Returns valid `sessionId` |
| Complete challenge successfully | `confidence: 95`, `status: SUCCEEDED` |
| Hold up a printed photo | AWS detects it; `confidence` likely < 50 |
| Get result with invalid sessionId | AWS returns error; server returns 500 |

---

---

## API 6 — KYC Admin Faces

**Endpoint:** `GET /api/kyc-admin-faces` | `DELETE /api/kyc-admin-faces`

### What Is This?

An admin-only tool for managing the Rekognition face collection directly. Admins can look up which face records exist for a client, or delete them (e.g. if a client needs to resubmit after a false duplicate match).

### Security

Every request must include a secret header:

```
x-admin-secret: [your ADMIN_SECRET value]
```

Without this, the API returns `HTTP 401 Unauthorized`.

### GET — List Faces for a Client

**URL:** `GET /api/kyc-admin-faces?clientId=abc-123-uuid`

**Response:**
```json
{
  "clientId": "abc-123-uuid",
  "faces": [
    { "FaceId": "face-uuid-1", "ExternalImageId": "abc-123-uuid", "Confidence": 99.9 }
  ]
}
```

### DELETE — Remove Faces for a Client

**URL:** `DELETE /api/kyc-admin-faces?clientId=abc-123-uuid`

Removes all face records for that client from the collection. Useful when a client needs to re-verify after a false positive match.

**Response:**
```json
{ "ok": true, "deleted": 1 }
```

### Flowchart

```
Admin suspects a false positive duplicate face match
        ↓
GET /api/kyc-admin-faces?clientId=xxx
  (verify which face records exist)
        ↓
Confirm these should be deleted
        ↓
DELETE /api/kyc-admin-faces?clientId=xxx
        ↓
Face records removed from Rekognition collection
        ↓
Client can resubmit KYC — will no longer hit duplicate flag
```

### Test Scenarios

| Scenario | Expected Result |
|---|---|
| Valid admin secret, valid clientId (GET) | Returns list of face records |
| Valid admin secret, valid clientId (DELETE) | Faces deleted; `ok: true` |
| Missing or wrong admin secret | HTTP 401: "Unauthorized" |
| ClientId with no faces | Empty faces array |

---

---

## API 7 — Chat (AI Financial Advisor + Journey Calculator)

**Endpoint:** `POST /api/chat`

**Two routes in one file (selected via `?action=` query parameter):**
- `POST /api/chat` → AI Financial Advisor
- `POST /api/chat?action=journey-calculate` → Journey Affordability Calculator

---

### Route A: AI Financial Advisor

### What Is This?

Powers the conversational AI chat on the Advisor page. The user asks a financial question in plain English, and the AI responds with personalised advice based on their real Ficium profile data.

### In Plain English

Think of it as having a personal financial adviser available 24/7 who already knows your income, debts, savings, and health score — and can give you specific, number-based advice instantly.

### Request

**Method:** `POST`
**URL:** `/api/chat`
**Content-Type:** `application/json`

| Field | Type | Required | Description |
|---|---|---|---|
| `messages` | array | ✅ Yes | Conversation history — array of `{ role, content }` objects |
| `userId` | string | Recommended | Client's user ID (used to load their financial profile) |
| `journeyCtx` | string | Optional | Extra context about which journey the user is on |

**Example request:**
```json
{
  "userId": "abc-123-uuid",
  "messages": [
    { "role": "user", "content": "Am I ready to apply for a mortgage?" }
  ]
}
```

### What Happens Inside

1. Fetches the client's full financial profile from Supabase (`client_profile_view`)
2. Fetches live market intelligence (current rates, bid data)
3. Builds a system prompt that includes:
   - Ficium AI personality and rules
   - The client's real financial data (income, debt, net worth, health score)
   - Live market rates
4. Sends everything to Claude AI (`claude-sonnet-4-6`)
5. Returns the AI's response

### Response

```json
{
  "ok": true,
  "reply": "Based on your income of MUR 120,000/month and current mortgage rates averaging 6.2% on Ficium, you could afford a property around MUR 8–10M. Your debt-to-income ratio of 28% is within bank requirements. Your main gap is the 10% deposit — you currently have MUR 600K in savings, which covers a MUR 6M property. I'd recommend either saving for 6 more months or targeting properties in that range.",
  "usage": {
    "input_tokens": 850,
    "output_tokens": 120
  }
}
```

### Context the AI Knows About the User

The AI is given these real numbers (not made-up):

| Data Point | Where It Comes From |
|---|---|
| Name, employment status | Client profile |
| Monthly income, expenses, loan payments, savings | Financial dossier |
| Total assets (cash, property, investments, vehicle) | Net Worth tracker |
| Total liabilities (mortgage, loans, credit cards) | Net Worth tracker |
| Net worth | Calculated |
| Debt-to-income ratio | Calculated |
| Health score (0–100) | Calculated |
| KYC status | Profile |
| Live market rates | Marketplace intelligence |

### Limits

- Maximum conversation length: 20,000 characters total
- Only the last 20 messages are sent to the AI (older messages trimmed)
- Maximum per-message length: 4,000 characters
- AI response is capped at 800 tokens (~600 words)

---

### Route B: Journey Affordability Calculator

### What Is This?

When a client is working through a Financial Journey (e.g. "Buy my first home"), this API calculates whether they can afford it — using their real financial data and the answers they gave in the journey wizard.

### Request

**Method:** `POST`
**URL:** `/api/chat?action=journey-calculate`
**Content-Type:** `application/json`

| Field | Type | Required | Description |
|---|---|---|---|
| `userId` | string | ✅ Yes | Client's user ID |
| `type` | string | ✅ Yes | Journey type (e.g. `"mortgage"`, `"vehicle"`, `"personal_loan"`) |
| `answers` | object | ✅ Yes | The answers the client gave in the journey wizard |

**Example request:**
```json
{
  "userId": "abc-123-uuid",
  "type": "mortgage",
  "answers": {
    "propertyValue": 5000000,
    "depositAmount": 500000,
    "preferredTerm": 240
  }
}
```

### Response

```json
{
  "affordability": 72,
  "eligibility": 80,
  "monthlyRepayment": 38200,
  "depositGap": 0,
  "fundingGap": null,
  "projectedValue": null,
  "banksMatched": 4,
  "summary": "You can afford a MUR 5M mortgage — estimated repayment MUR 38,200/month, within your budget.",
  "actionPlan": [
    "Increase your deposit to 15% to improve your rate",
    "Pay off your credit card balance to lower DTI",
    "Post your request on Ficium to get competing bank offers"
  ],
  "warnings": []
}
```

**Response fields explained:**

| Field | Meaning |
|---|---|
| `affordability` (0–100) | How affordable the repayments are given your income |
| `eligibility` (0–100) | How likely banks are to approve you |
| `monthlyRepayment` | Estimated monthly payment in MUR |
| `depositGap` | How much more deposit you need (0 = sufficient) |
| `fundingGap` | For savings goals — how far you are from your target |
| `projectedValue` | For investment journeys — projected future value |
| `banksMatched` | Estimate of how many Ficium banks would bid on this |
| `summary` | One plain-English sentence summarising the result |
| `actionPlan` | 3 specific steps you can take to improve |
| `warnings` | Any red flags (e.g. "DTI too high for most banks") |

### Flowchart (Both Routes)

```
User sends message OR submits journey answers
              ↓
POST /api/chat (or ?action=journey-calculate)
              ↓
Load client's financial profile from Supabase
              ↓
Load live market intelligence
              ↓
Build prompt with user data + market data + rules
              ↓
Send to Claude AI (claude-sonnet-4-6)
              ↓
     Journey calculate?
      /             \
    Yes               No (chat)
     ↓                 ↓
Parse JSON         Return reply text
response           as plain message
     ↓
Return affordability
scores + action plan
```

### Test Scenarios

| Scenario | Expected Result |
|---|---|
| Chat: "What is my health score?" | AI returns actual score from profile |
| Chat: Very long conversation (>20 messages) | Oldest messages trimmed; last 20 kept |
| Chat: No `userId` provided | AI responds generically (no personalised data) |
| Journey: Mortgage with sufficient deposit | `depositGap: 0`, good eligibility |
| Journey: Income too low for requested amount | `eligibility` < 50, `warnings` populated |
| Journey: AI returns non-JSON | HTTP 500: "AI_PARSE_ERROR" |

---

---

## API 8 — Market

**Endpoint:** `POST /api/market`

**Two routes:**
- `POST /api/market?action=summary` → One-line AI market summary
- `POST /api/market?action=ask` → AI answers a market question

### What Is This?

Powers two AI features on the Markets page:
1. A **daily one-sentence summary** of what's happening in Mauritius financial markets (written in plain English for everyday people)
2. A **Q&A chat** where users can ask anything about market data (e.g. "What does it mean if USD/MUR goes up?")

Both use **streaming** — the response arrives word by word in real time, like ChatGPT.

### In Plain English

Route A (summary): Like a financial news headline written for your neighbour, not a banker.

Route B (ask): Like asking a knowledgeable friend: "What does today's news mean for my loan?"

---

### Route A: Market Summary

**Method:** `POST /api/market?action=summary`

**Request body — live market snapshot:**

| Field | Type | Description |
|---|---|---|
| `repoRate` | string | Bank of Mauritius repo rate (e.g. `"4.50%"`) |
| `usdMur` | number | USD to MUR exchange rate |
| `usdChange` | number | % change in USD/MUR today |
| `eurMur` | number | EUR to MUR exchange rate |
| `gbpMur` | number | GBP to MUR exchange rate |
| `semdex` | number | Stock Exchange of Mauritius index value |
| `semdexChange` | number | % change in SEMDEX today |
| `inflation` | string | Latest inflation rate (YoY %) |
| `inflationChange` | number | Change in inflation |

**Example request:**
```json
{
  "repoRate": "4.50%",
  "usdMur": 46.2,
  "usdChange": 0.3,
  "eurMur": 50.1,
  "gbpMur": 58.4,
  "semdex": 12850,
  "semdexChange": -0.8,
  "inflation": "4.1%",
  "inflationChange": -0.2
}
```

**Response (streaming):**

The response streams as Server-Sent Events (SSE). Each chunk contains:
```json
{ "text": "Rates are stable " }
{ "text": "this week — " }
{ "text": "a good time to lock in a loan before..." }
```

Final event:
```json
{ "done": true }
```

**Example completed summary:**
> "Rates are stable this week — a good time to lock in a home loan before the next Bank of Mauritius review."

---

### Route B: Market Q&A

**Method:** `POST /api/market?action=ask`

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `question` | string | ✅ Yes | The user's question (e.g. "What does it mean if inflation goes up?") |
| `snapshot` | object | Recommended | Current market data (same format as summary) |
| `history` | array | Optional | Previous messages in the conversation (last 6 kept) |

**Example request:**
```json
{
  "question": "If USD/MUR goes up, is that good or bad for my savings?",
  "snapshot": {
    "usdMur": 46.2,
    "repoRate": "4.50%"
  },
  "history": []
}
```

**Response (streaming SSE):**

> "If USD/MUR goes up, it means the rupee has weakened — one dollar now buys more rupees. If you have savings in USD or foreign currency, they're worth more rupees right now. But imported goods become more expensive, which can push inflation higher."

### AI Rules (for Market Answers)

- Max 80 words per answer (unless user asks for more)
- Always references Mauritius context (MUR, BOM, SEM, FSC)
- Never recommends a specific bank
- Never guarantees returns
- Redirects off-topic questions gently

### Flowchart

```
User visits Markets page
        ↓
Frontend fetches live market data (exchange rates, SEMDEX, etc.)
        ↓
POST /api/market?action=summary with snapshot data
        ↓
Claude AI writes one-sentence summary
        ↓
Summary streams to page word by word
        ↓
User types a question in the chat box
        ↓
POST /api/market?action=ask with question + snapshot + history
        ↓
Claude AI reads live data + formulates plain-English answer
        ↓
Answer streams to chat box word by word
```

### Test Scenarios

| Scenario | Expected Result |
|---|---|
| Summary with valid snapshot | Streams a 1-sentence market commentary |
| Summary without `repoRate` | HTTP 400: "market snapshot required" |
| Ask: "What does inflation mean?" | Plain-English explanation in ≤80 words |
| Ask: very long history (>6 messages) | Only last 6 messages included |
| Invalid action (e.g. `?action=foo`) | HTTP 400: "unknown action" |

---

---

## API 9 — Intelligence

**Endpoint:** `GET /api/intelligence`

### What Is This?

Returns anonymised market intelligence data calculated from real Ficium marketplace activity. This is what powers the rate tiles on the dashboard, the market hints in the New Request wizard, and the competitor data in the bank's marketplace view.

### In Plain English

Ficium looks at all the bids that have been placed on the platform and calculates averages. This API gives the app those averages so users can see: "What are banks charging right now? What rate do the winning bids have?"

No personal data is returned — only aggregate statistics.

### Request

**Method:** `GET` or `POST`
**No body required**

### Response

```json
{
  "generatedAt": "2025-06-06T10:00:00.000Z",
  "marketRates": [
    {
      "product_type": "personal_loan",
      "avg_rate_pct": 10.5,
      "min_rate_pct": 8.0,
      "max_rate_pct": 14.0,
      "bid_count": 47
    },
    {
      "product_type": "mortgage",
      "avg_rate_pct": 6.2,
      "min_rate_pct": 4.5,
      "max_rate_pct": 8.0,
      "bid_count": 23
    }
  ],
  "requestPatterns": [
    {
      "product_type": "personal_loan",
      "avg_amount": 350000,
      "avg_term_months": 42,
      "request_count": 31
    }
  ],
  "acceptanceIntel": [
    {
      "product_type": "personal_loan",
      "avg_winning_rate_pct": 9.8,
      "avg_winning_term_months": 36
    }
  ],
  "competitiveness": [
    {
      "product_type": "personal_loan",
      "avg_bids_per_request": 3.4
    }
  ],
  "summary": "Personal loan rates average 10.5% this week. Mortgage competition is highest with 23 active bids."
}
```

**Response fields explained:**

| Section | What It Tells You |
|---|---|
| `marketRates` | Average, min, and max rates currently being offered per product type |
| `requestPatterns` | Typical amount and term requested per product (useful for "is my request typical?") |
| `acceptanceIntel` | What the winning bids (offers clients accepted) looked like |
| `competitiveness` | Average number of bank bids per client request |
| `summary` | One AI-generated sentence summarising the market |

### Caching

This endpoint is cached:
- **Browser/CDN cache:** Fresh for 5 minutes (`Cache-Control: max-age=300`)
- **Stale-while-revalidate:** Old data can be served for 1 extra minute while the fresh version is fetched in the background
- **In-process cache:** The server itself caches results for 5 minutes to reduce database load

### Graceful Degradation

If the database is unavailable, the API returns an empty shell with a message — it never returns an error that crashes the app:

```json
{
  "generatedAt": "2025-06-06T10:00:00.000Z",
  "marketRates": [],
  "requestPatterns": [],
  "acceptanceIntel": [],
  "competitiveness": [],
  "summary": "Market intelligence temporarily unavailable."
}
```

### Flowchart

```
App loads (dashboard, request wizard, bank marketplace)
        ↓
GET /api/intelligence
        ↓
Is result cached? (< 5 min old)
   /          \
 Yes            No
  ↓              ↓
Return         Query Supabase database
cached         (aggregate bid + request data)
result              ↓
                Store in cache
                    ↓
               Return fresh data
```

### Test Scenarios

| Scenario | Expected Result |
|---|---|
| No bids on platform | All arrays empty; `summary` says "no data" |
| 50 bids across 3 products | Full rates, patterns, and competitiveness returned |
| Database unavailable | Empty shell returned; no 500 error |
| Called within 5 minutes of last call | Cached response returned instantly |

---

---

## API 10 — Request Builder

**Endpoint:** `POST /api/request-builder`

### What Is This?

Powers the **conversational AI request builder** — an alternative to the step-by-step form. Instead of filling in a form, the client has a natural conversation with the AI, which collects all the needed information through questions and then posts the request on their behalf.

### In Plain English

Instead of filling in boxes, you chat with the AI:
- "I need a loan"
- "How much?" → "Around 500,000"
- "What's it for?" → "I want to renovate my kitchen"
- "Over how long?" → "3 years"
- "Got it — here's what I'll post to the banks. Shall I go ahead?"
- "Yes" → Request posted automatically.

### Request

**Method:** `POST`
**Content-Type:** `application/json`

| Field | Type | Required | Description |
|---|---|---|---|
| `messages` | array | ✅ Yes | Conversation history `[{ role, content }]` |
| `profile` | object | Optional | Client's financial profile for context |

**Profile fields (optional but helpful):**

| Field | Description |
|---|---|
| `healthScore` | Client's financial health score (0–100) |
| `monthlyIncome` | Monthly income in MUR |
| `netWorth` | Net worth in MUR |
| `employment` | Employment status |

### How the AI Collects Information

The AI must collect these fields through conversation:

| Field | Description |
|---|---|
| `productType` | What type of product (loan, mortgage, deposit, etc.) |
| `amount` | Amount in MUR (minimum MUR 1,000) |
| `purpose` | What the money is for (3–500 characters; banks see this) |
| `preferredTermMonths` | How long (1–360 months) |
| `maxRate` | (Optional) Maximum acceptable interest rate % |
| `decisionDeadline` | (Optional) Date by when the client needs an answer |

### The READY Signal

When all required fields are collected and the client confirms, the AI outputs a special line:

```
READY:{"productType":"personal_loan","amount":500000,"purpose":"Kitchen renovation and home improvements","preferredTermMonths":36,"maxRate":null,"decisionDeadline":null}
```

The frontend watches for this `READY:` line and automatically submits the request to the marketplace.

### Response (Streaming SSE)

The response streams word by word (same as the Markets API):
```json
{ "text": "Great! " }
{ "text": "So you need a personal loan " }
{ "text": "of MUR 500,000..." }
```

Or, when ready to post:
```json
{ "text": "READY:{\"productType\":\"personal_loan\",...}" }
{ "done": true }
```

### AI Rules

- One question at a time (never overwhelms the user)
- Under 80 words per response
- Uses live market data to give rate guidance
- Never asks for personal identity information
- Never guarantees approval
- Waits for explicit confirmation before outputting READY

### Flowchart

```
User opens Request Builder chat
        ↓
POST /api/request-builder with first message
        ↓
AI asks first question: "What are you looking for?"
        ↓
User responds → AI asks next question
        ↓
Repeat until all required fields collected:
  productType → amount → purpose → term
        ↓
AI summarises: "Here's what I'll post: [details]. Shall I go ahead?"
        ↓
User confirms ("Yes" / "Go ahead" / "Post it")
        ↓
AI outputs READY:{...json...} in response
        ↓
Frontend detects READY line
        ↓
Frontend posts request to Supabase marketplace
        ↓
"Request posted!" confirmation shown
```

### Test Scenarios

| Scenario | Expected Result |
|---|---|
| User sends "I need a personal loan" | AI asks about amount |
| User says "maybe 300K" | AI confirms amount; asks about term |
| User hasn't confirmed yet | AI does NOT output READY |
| User says "yes post it" | AI outputs READY:{...} with all fields |
| Conversation > 30 messages | Oldest messages trimmed; last 30 kept |
| Profile provided | AI uses real income/health data to give tailored guidance |

---

---

## Environment Variables Reference

All APIs rely on these environment variables configured in Vercel:

| Variable | Used By | Description |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | kyc-verify, kyc-faces, kyc-liveness, kyc-admin-faces | AWS IAM key for Rekognition access |
| `AWS_SECRET_ACCESS_KEY` | kyc-verify, kyc-faces, kyc-liveness, kyc-admin-faces | AWS IAM secret |
| `VITE_SUPABASE_URL` | All | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | All | Supabase master key for server-side access |
| `RESEND_API_KEY` | kyc-notify | Resend email API key |
| `ANTHROPIC_API_KEY` | chat, market, request-builder, kyc-verify (AI analysis) | Claude AI API key |
| `ADMIN_SECRET` | kyc-admin-faces | Protects admin-only endpoints |

---

## Error Codes Reference

| HTTP Code | Meaning | Common Cause |
|---|---|---|
| 200 | Success | Request processed normally |
| 400 | Bad Request | Missing required fields or invalid values |
| 401 | Unauthorized | Wrong or missing admin secret |
| 403 | Forbidden | Action not permitted |
| 404 | Not Found | User or resource doesn't exist |
| 405 | Method Not Allowed | Using GET when POST is required (or vice versa) |
| 413 | Payload Too Large | Conversation history exceeds 20,000 characters |
| 500 | Server Error | Internal processing error (check logs) |
| 502 | Bad Gateway | External API (Resend, Supabase) returned an error |
| 503 | Service Unavailable | Required API key or config is missing |

---

## AWS Services Used

| Service | Purpose | Region |
|---|---|---|
| **Rekognition DetectText** | OCR — reads text from ID documents and proof of address | ap-south-1 (Mumbai) |
| **Rekognition DetectFaces** | Detects and analyses faces in photos | ap-south-1 |
| **Rekognition CompareFaces** | Checks if selfie matches ID photo face | ap-south-1 |
| **Rekognition DetectLabels** | Identifies objects in images (for spoof detection) | ap-south-1 |
| **Rekognition SearchFacesByImage** | Searches face collection for duplicates | ap-south-1 |
| **Rekognition IndexFaces** | Adds a verified face to the collection | ap-south-1 |
| **Rekognition FaceLiveness** | Real-time liveness challenge | ap-south-1 |

All AWS calls use **Signature Version 4 (Sig v4)** authentication — a secure signed request format that verifies the caller's identity without sending keys in the request itself.

---

## Third-Party Services

| Service | Role | Documentation |
|---|---|---|
| **AWS Rekognition** | Face detection, OCR, liveness | aws.amazon.com/rekognition |
| **Supabase** | Database, auth, storage | supabase.com/docs |
| **Resend** | Transactional email | resend.com/docs |
| **Anthropic Claude** | AI advisor, market commentary, fraud analysis | docs.anthropic.com |
| **Vercel** | API hosting (serverless functions) | vercel.com/docs |

---

*This document covers all Ficium API endpoints as of Version 1.0. Endpoints may be updated — refer to the `/api` folder in the repository for the latest source.*
