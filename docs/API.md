# Ficium — API Reference

_Last updated: June 2026_

All API endpoints are Vercel serverless functions under `/api/`. They are server-side only — the Anthropic API key and Supabase service role key are never exposed to the browser.

---

## Conventions

### Request format
All POST requests send `Content-Type: application/json`.

### Response format
All responses return JSON in one of two shapes:

```typescript
// Success
{ ok: true, data: T }

// Error
{ ok: false, error: string, code?: string }
```

### Streaming responses
Streaming endpoints (`/api/chat`) emit Server-Sent Events:
```
data: {"text":"Hello"}\n\n
data: {"text":" world"}\n\n
data: [DONE]\n\n
```

Error in stream:
```
data: {"error":"Something went wrong"}\n\n
```

---

## Endpoints

---

### `POST /api/chat`

**AI Financial Coach** — streams a personalised financial response.

Also handles journey calculation via `?action=journey-calculate`.

#### Request body

```typescript
{
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  userId?: string;       // Supabase user ID — used to fetch live profile data
  journeyCtx?: string;   // Optional: pre-built context string
}
```

#### Behaviour

1. Fetches the user's `client_profile_view` row using the service role
2. Fetches current market intelligence via `IntelligenceService.getSummary()`
3. Builds a system prompt that includes profile data and live market rates
4. Streams Claude's response as SSE tokens

#### Limits
- Max 20 messages per call (last 20 messages used if more are sent)
- Max 4,000 chars per message
- Max 20,000 total chars across all messages → 413 if exceeded

#### Example

```typescript
const res = await fetch("/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    messages: [{ role: "user", content: "Can I afford a Rs 3M mortgage?" }],
    userId: "abc-123",
  }),
});
// Stream SSE tokens
```

---

### `POST /api/chat?action=journey-calculate`

**Journey affordability calculator** — evaluates a specific financial journey.

#### Request body

```typescript
{
  userId:  string;          // Supabase user ID
  type:    string;          // "mortgage" | "vehicle" | "education" | etc.
  answers: Record<string, unknown>; // Journey wizard answers
}
```

---

### `GET /api/intelligence`

**Market intelligence** — returns anonymised market data for frontend consumption.

Cached at the edge (CDN) for 5 minutes. Zero-downtime fallback returns an empty shell if the DB is unavailable.

#### Response

```typescript
{
  ok: true,
  data: {
    generatedAt:     string;          // ISO timestamp
    marketRates:     MarketRate[];     // Average rates by product type
    requestPatterns: RequestPattern[]; // Demand patterns
    acceptanceIntel: AcceptanceIntel[];// Winning bid patterns
    competitiveness: MarketCompetitiveness[]; // Bids per request
    summary:         string;           // Claude-ready text summary
  }
}
```

#### `MarketRate`

```typescript
{
  product_type:  string;   // "personal_loan" | "mortgage" | etc.
  bid_count:     number;
  request_count: number;
  min_rate_pct:  number;
  max_rate_pct:  number;
  avg_rate_pct:  number;
  p25_rate_pct:  number;   // 25th percentile (IQR low)
  p75_rate_pct:  number;   // 75th percentile (IQR high)
}
```

#### Cache headers

```
Cache-Control: public, max-age=300, stale-while-revalidate=60
```

---

### `POST /api/kyc-verify`

**KYC verification** — submits identity documents for verification.

Uses Smile ID (in-house provider) or falls back to manual review.

#### Request body

```typescript
{
  userId:   string;
  idType:   "national_id" | "passport" | "drivers_license";
  idNumber: string;
  idImage:  string;  // Base64 JPEG
  selfie:   string;  // Base64 JPEG
}
```

#### Response

```typescript
{
  ok:          boolean;
  referenceId: string;
  riskScore:   number;   // 0–100
  reason?:     string;   // if ok: false
  flags?:      string[]; // any flags from the provider
}
```

---

### `POST /api/kyc-liveness`

**Liveness check** — verifies the selfie is a live person (not a photo of a photo).

#### Request body

```typescript
{
  userId: string;
  selfie: string;  // Base64 JPEG
}
```

---

### `POST /api/kyc-faces`

**Face matching** — matches selfie against ID document face.

---

### `DELETE /api/kyc-admin-faces`

**Admin: reset KYC** — removes face data from Rekognition collection. Requires `x-admin-secret` header.

```
DELETE /api/kyc-admin-faces?clientId=<uuid>
x-admin-secret: <VITE_ADMIN_SECRET>
```

---

### `POST /api/kyc-notify`

**KYC status notification** — sends email notification when KYC status changes.

---

### `POST /api/market`

**Market data** — fetches current market data (rates, FX, deposits, lending).

---

### `POST /api/request-builder`

**AI request builder** — helps users describe their financial request in plain language.

---

### `POST /api/journey-calculate`

**Journey calculation** — affordability analysis for a specific journey type. (Also available via `/api/chat?action=journey-calculate`.)

---

## Error codes

| Code | HTTP | Meaning |
|---|---|---|
| `INVALID_BODY` | 400 | Missing or malformed request body |
| `PAYLOAD_TOO_LARGE` | 413 | Request body exceeds size limit |
| `UNAUTHORIZED` | 401 | Missing or invalid auth |
| `FORBIDDEN` | 403 | Authenticated but not permitted |
| `NOT_FOUND` | 404 | Resource not found |
| `METHOD_NOT_ALLOWED` | 405 | Wrong HTTP method |
| `RATE_LIMITED` | 429 | Too many requests |
| `SERVICE_ERROR` | 500 | Internal error — check logs |

---

## Rate limits

Vercel Hobby plan limits:

| Resource | Limit |
|---|---|
| Serverless function duration | 30 seconds (configured in vercel.json) |
| Concurrent executions | 1000 |
| Functions per deployment | 12 (current usage: 8) |

Claude API limits (Anthropic):

| Tier | Requests/min | Tokens/min |
|---|---|---|
| Free | 50 | 40,000 |
| Tier 1 | 500 | 200,000 |

---

## Adding a new endpoint

1. Create `api/<name>.ts`
2. Import shared utilities:
   ```typescript
   import { Env }            from "./_lib/env.js";
   import { getServiceDb }   from "./_lib/db.js";
   import { Response }       from "./_lib/response.js";
   import { ServerCache }    from "./_lib/cache.js";
   ```
3. Export `config = { runtime: "nodejs" }` and a default handler
4. If the function needs `_lib/` files, add to `vercel.json`:
   ```json
   "api/<name>.ts": { "includeFiles": "api/_lib/**" }
   ```
