# Marriage certificate verification — spec addendum

Extends `docs/joint-finance/invitation-spec.md`. Covers how Ficium confirms the
relationship behind a joint (couple) request: OCR-driven name matching against
an uploaded marriage certificate, layered on the existing KYC vault/OCR pipeline.

**Scope decision (current):** couple only. Every joint request with two
consented participants requires a marriage certificate. Other relationship
types (family, business co-applicants) are deferred — not modeled yet.

---

## 1. Why OCR name-matching, not just "a document exists"

Uploading *any* marriage certificate proves nothing on its own — it has to be
tied to the two specific verified identities on the request. The gate is: did
OCR find **both** participants' verified `clients.full_name` values on the
document text. That's what stops someone attaching an unrelated certificate to
inflate a stranger's application.

Reuses infrastructure you already have: `client_vault_document` +
`vault_extract_status` is the same OCR/Textract pipeline used for KYC
documents. Marriage certificates just flow through it with a new `doc_type`.

## 2. New objects (applied to App DB `wixfhjlsjkiwfvqewvmt`)

- `vault_doc_type` enum gains `'marriage_certificate'`.
- `relationship_match_status`: `pending | both_matched | partial_match | no_match`
- `relationship_doc_status`: `pending_ocr | verified | rejected`
- `public.request_relationship_document` — one row per request (unique
  `request_id`), links to the uploaded `client_vault_document`, stores the
  raw extracted text, per-participant match booleans + trigram similarity
  scores, and the resulting `verification_status`.
- `pg_trgm` extension enabled for fuzzy scoring (handles OCR scan noise).

## 3. Matching logic

1. **Normalize**: lowercase, strip non-letters, collapse whitespace
   (`public.normalize_name`).
2. **Containment check** (primary): does the normalized OCR text contain the
   normalized participant name as a substring. Names on certificates are
   printed near-verbatim, so this is the main signal.
3. **Trigram similarity** (secondary, informational): `pg_trgm` similarity
   score stored alongside, for future tuning/audit — not currently a hard gate.
4. **Outcome**:
   - both names found → `both_matched` / **verified** (auto-cleared, no human
     step required)
   - one name found → `partial_match` / **rejected**, reason logged
   - neither found → `no_match` / **rejected**, reason logged
5. Both participants get a notification of the result either way.
6. Re-upload is supported — `submit_relationship_document` upserts on
   `request_id`, clearing any prior manual `reviewed_by` override.

`reviewed_by` / `reviewed_at` columns exist for a future manual-override path
(a human clears a false negative) but are not wired into any UI yet — OCR is
the sole authority for now, per current scope.

## 4. Release gate

`public.can_release_request(request_id)`:
- 1 participant (solo request) → `true` once consented, unaffected by any of
  this.
- 2 participants → requires all consented **and**
  `request_relationship_document.verification_status = 'verified'`.

This function is the single source of truth the release step (moving a
request from `awaiting_consent` → `open`) must check. That release step
itself is not yet built — see open items.

## 5. Flow

```
Both consent (awaiting_consent)
        │
        ▼
Either party uploads marriage certificate
   → client_vault_document (doc_type='marriage_certificate')
   → Textract OCR runs (existing pipeline)
        │
        ▼
App calls submit_relationship_document(request_id, vault_document_id,
                                        uploader_client_id, extracted_text)
        │
        ├── both names found  → verified  → can_release_request = true
        └── else               → rejected → participants notified, re-upload
```

## 6. Open items (not yet built)

- The actual **release step** wiring `can_release_request` into
  `awaiting_consent → open` in `ficium-portal-api`.
- **App-side OCR call**: invoking Textract on the vault document and passing
  the extracted text into `submit_relationship_document` (mirrors your
  existing KYC Textract call).
- **Frontend**: certificate upload step in the joint request wizard, and a
  status card (verified / rejected + reason / pending).
- **Foreign certificates**: apostille/consular-legalization requirements are
  a compliance/legal question for MCB and counsel — not decided here.
- **Manual override UI**: if OCR produces a false negative on a legitimate
  certificate (poor scan quality, unusual name order), decide whether/how a
  human reviewer can override — schema supports it (`reviewed_by`), UI does
  not exist.
