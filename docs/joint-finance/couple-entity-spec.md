# Couple as a persistent entity — spec addendum

Supersedes the request-scoped verification in
`marriage-certificate-verification-spec.md`. Applied to App DB
(`wixfhjlsjkiwfvqewvmt`).

## What changed and why

Originally, marriage certificate verification was scoped to a single
`request_id`. That meant a couple would need to re-upload and re-OCR their
certificate for every new joint request or investment — poor UX for
something that doesn't change.

**Pivot:** the relationship is now its own entity, `couple_link`, independent
of any request. Verify once; every future joint request just references the
already-verified couple.

**Requirement driving this:** the couple must be visible from **both
partners' profiles**, symmetrically — not owned by whoever sent the
invitation. `couple_link` is stored as an ordered pair (`client_a_id <
client_b_id`) so the same row is returned regardless of who looks it up or
who initiated it. `get_or_create_couple_link(x, y, initiated_by)` is
order-independent — calling it `(A, B)` or `(B, A)` always resolves to the
same row (verified directly: two calls with reversed argument order produced
exactly one row).

## New objects

- `couple_status` enum: `pending_verification | verified | dissolved`
- `public.couple_link` — `client_a_id`, `client_b_id` (ordered, unique pair),
  `status`, `initiated_by_client_id`, `verified_at`, `dissolved_at`. RLS:
  selectable by either `client_a_id` or `client_b_id` — i.e. both profiles.
- `public.is_couple_member(couple_id, client_id)` — RLS/authorization helper.
- `public.get_or_create_couple_link(client_x, client_y, initiated_by)` —
  idempotent, order-independent. Called automatically from
  `accept_request_invitation` so a couple link forms the moment an invite is
  accepted, in `pending_verification` until the certificate clears.
- `public.couple_relationship_document` — replaces
  `request_relationship_document` (dropped, no production data existed).
  Same OCR fields, now unique on `couple_link_id` instead of `request_id`.
- `public.submit_couple_relationship_document(...)` — same name-matching
  logic as before (containment + trigram similarity via `normalize_name`),
  now resolves the two names from `couple_link.client_a_id` /
  `client_b_id` instead of request participants. On both-matched, also
  flips `couple_link.status → verified`.

## Updated logic

- `accept_request_invitation` — now also calls `get_or_create_couple_link`
  after minting the participant, so acceptance both joins the request *and*
  establishes (or reuses) the couple relationship.
- `can_release_request(request_id)` — for 2-participant requests, no longer
  checks a request-scoped document. It looks up the `couple_link` for that
  exact pair (order-independent via `least`/`greatest`) and requires
  `status = 'verified'`. Solo requests unaffected.

## Frontend implication (not yet built)

A `/couple` page, reachable from **either** partner's Profile page (not
nested under one request), showing: partner identity, verification badge,
certificate status, and every joint request/holding linked to the couple.
Because `couple_link` and its RLS policy are symmetric, both partners'
sessions query the exact same record — no special-casing for "who invited
whom." A UI mockup was reviewed and approved as the direction; not yet
implemented as real React code.

## Still open

- `/couple` route + page in `ficium` (borrower app), linked from `Profile.tsx`
  for both parties.
- `ficium-portal-api` endpoints: get couple, upload/submit certificate,
  dissolve.
- Textract wiring for the certificate upload.
- `awaiting_consent → open` release step calling `can_release_request`.
- Dissolution flow (`status → dissolved`) — separation handling, deferred.
