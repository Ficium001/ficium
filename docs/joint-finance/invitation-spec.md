# Joint request — invitation record spec

Module: `joint_finance` (borrower App DB, `wixfhjlsjkiwfvqewvmt`).
Scope of this doc: the **invitation record** — states, token, expiry, and how it resolves into participation.

Grounded in the live schema: the "individual" is `public.clients` (`id`, `email`, `phone`, `kyc_status`), the objective is `public.requests` (`id`, `client_id`, `status`), and in-app pings use `public.notifications`. All new objects live in `public.*` to match convention (enums, `gen_random_uuid()`, `timestamptz`).

---

## 1. How the pieces relate

```
clients (A)  ──inviter──┐
                        ▼
                request_invitation ──accept──▶ request_participant ──▶ requests
                        ▲                          (consent layer)
clients (B)  ──invitee──┘
```

- `request_invitation` — the secure, expiring delivery artifact. Can exist **before** the invitee has an account (holds a contact, not necessarily a `client_id`).
- `request_participant` — the durable membership + consent. Created only on acceptance, once the invitee is a verified `client`.
- `requests` — stays the shared objective. It does not reach the market until every participant is `consented` (see §8, new `awaiting_consent` state).

Separating the two is what lets you invite someone who isn't on Ficium yet — the invitation carries the contact and proposed terms; the participant is minted after signup + KYC.

---

## 2. New enums

```sql
create type public.participant_role   as enum ('primary','co_applicant','guarantor');
create type public.liability_type     as enum ('joint_and_several','several','guarantor');
create type public.consent_state      as enum ('invited','consented','declined','revoked');
create type public.invitation_status  as enum ('pending','accepted','declined','expired','revoked');
create type public.invitation_channel as enum ('email','sms');
```

## 3. Participation layer (companion table)

```sql
create table public.request_participant (
  id             uuid primary key default gen_random_uuid(),
  request_id     uuid not null references public.requests(id) on delete cascade,
  client_id      uuid not null references public.clients(id),
  role           public.participant_role not null default 'co_applicant',
  liability_type public.liability_type,                 -- loans
  ownership_bps  integer check (ownership_bps between 0 and 10000), -- investments
  consent_state  public.consent_state not null default 'invited',
  is_initiator   boolean not null default false,
  consented_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (request_id, client_id)
);
```

The request creator is inserted here immediately as `role='primary'`, `is_initiator=true`, `consent_state='consented'`.

---

## 4. The invitation record

```sql
create table public.request_invitation (
  id                     uuid primary key default gen_random_uuid(),
  request_id             uuid not null references public.requests(id) on delete cascade,
  inviter_client_id      uuid not null references public.clients(id),

  -- invitee: contact is always known; account may not exist yet
  invited_email          text not null,                       -- store lowercased
  invited_phone          text,                                -- E.164, optional
  channel                public.invitation_channel not null default 'email',
  invited_client_id      uuid references public.clients(id),  -- set if matched to an existing user

  -- proposed terms, copied verbatim into request_participant on accept
  proposed_role          public.participant_role not null default 'co_applicant',
  proposed_liability     public.liability_type,
  proposed_ownership_bps integer check (proposed_ownership_bps between 0 and 10000),

  -- secure token: the raw token lives ONLY in the emailed link; the DB stores its hash
  token_hash             bytea not null unique,               -- digest(raw_token, 'sha256')

  status                 public.invitation_status not null default 'pending',
  expires_at             timestamptz not null default (now() + interval '7 days'),

  sent_at                timestamptz not null default now(),
  responded_at           timestamptz,
  revoked_at             timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  constraint no_self_invite check (
    invited_client_id is null or invited_client_id <> inviter_client_id
  )
);

-- at most one live invite per (request, email)
create unique index request_invitation_active_uniq
  on public.request_invitation (request_id, invited_email)
  where status = 'pending';

create index request_invitation_token_idx   on public.request_invitation (token_hash);
create index request_invitation_request_idx on public.request_invitation (request_id);

alter table public.request_invitation enable row level security;
alter table public.request_invitation force  row level security;  -- PII (email/phone), matches your PII-table policy
```

---

## 5. Token design

Same posture as your SHA-256 API-key auth: **the secret never touches the database.**

1. API generates 32 random bytes → base64url = `raw_token`.
2. Store only `token_hash = digest(raw_token, 'sha256')` (`pgcrypto`).
3. Emailed/SMS link: `${VERCEL_APP_URL}/invite/{raw_token}` — this is also the trigger to finally set `VERCEL_APP_URL` on Railway (open backlog item).
4. Lookup is always by `token_hash`; the raw token is unrecoverable from the DB.
5. Single-use: acceptance/decline/revoke moves `status` off `pending`, and the partial unique index prevents a second live invite to the same contact.

## 6. Expiry

- `expires_at` defaults to `now() + 7 days`.
- Lazy check: the accept path rejects (and flips to `expired`) if `expires_at < now()`.
- Hygiene sweep via `pg_cron` (the `cron` schema is already installed):

```sql
select cron.schedule(
  'expire-request-invitations',
  '*/15 * * * *',
  $$update public.request_invitation
       set status='expired', updated_at=now()
     where status='pending' and expires_at < now();$$
);
```

---

## 7. State machine

| From      | To         | Trigger                          |
|-----------|------------|----------------------------------|
| —         | `pending`  | inviter creates + sends          |
| `pending` | `accepted` | invitee consents (after KYC)     |
| `pending` | `declined` | invitee declines                 |
| `pending` | `revoked`  | inviter cancels                  |
| `pending` | `expired`  | system (lazy or cron)            |

`accepted / declined / expired / revoked` are terminal. Only `pending` is actionable. A "resend" creates a new row (new token + expiry) and revokes the prior pending one.

## 8. Guards

- **No self-invite** — check constraint above.
- **One live invite per contact per request** — partial unique index.
- **KYC gate** — invitee must be `clients.kyc_status = 'verified'` before a participant is minted (enforced in the accept function, not just the UI).
- **Ownership sums to 100%** — for investment products, participants' `ownership_bps` must total `10000`; validate on the request before it leaves `awaiting_consent`.
- **Request stays off-market until consent is unanimous** — add `awaiting_consent` to `request_status`; joint requests sit there instead of `open`. Solo requests keep going straight to `open`, so nothing about the existing flow changes.

---

## 9. Acceptance function (SECURITY DEFINER)

Mirrors the `bid_acceptances` accept pattern: one transaction, all guards, writes the participant + notification.

```sql
create or replace function public.accept_request_invitation(
  p_token_hash bytea,
  p_client_id  uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.request_invitation;
  v_kyc public.kyc_status;
  v_participant_id uuid;
begin
  select * into v_inv
  from public.request_invitation
  where token_hash = p_token_hash
  for update;

  if not found              then raise exception 'invitation_not_found';  end if;
  if v_inv.status <> 'pending' then raise exception 'invitation_not_pending'; end if;

  if v_inv.expires_at < now() then
    update public.request_invitation set status='expired', updated_at=now() where id=v_inv.id;
    raise exception 'invitation_expired';
  end if;

  select kyc_status into v_kyc from public.clients where id = p_client_id;
  if v_kyc is distinct from 'verified'::public.kyc_status then
    raise exception 'kyc_required';
  end if;

  insert into public.request_participant
    (request_id, client_id, role, liability_type, ownership_bps, consent_state, consented_at)
  values
    (v_inv.request_id, p_client_id, v_inv.proposed_role, v_inv.proposed_liability,
     v_inv.proposed_ownership_bps, 'consented', now())
  on conflict (request_id, client_id) do update
    set consent_state='consented', consented_at=now(), updated_at=now()
  returning id into v_participant_id;

  update public.request_invitation
    set status='accepted', invited_client_id=p_client_id, responded_at=now(), updated_at=now()
    where id = v_inv.id;

  insert into public.notifications (user_id, kind, title, link, metadata)
  values (v_inv.inviter_client_id, 'joint_invitation_accepted',
          'Your co-applicant accepted',
          '/requests/' || v_inv.request_id,
          jsonb_build_object('request_id', v_inv.request_id, 'participant_id', v_participant_id));

  -- TODO: write to public.audit_events (existing trail)
  -- TODO: if every participant is now consented, move request awaiting_consent -> open

  return v_participant_id;
end;
$$;
```

`decline` and `revoke` are simpler siblings: guard `pending`, set the terminal status + `responded_at`/`revoked_at`, notify, and (for decline) mark the request blocked.

## 10. RLS (sketch — uses `auth.uid() = clients.id`)

- Inviter/participants may `select` invitations for requests they belong to.
- An invitee may `select` a `pending` invitation where `invited_email = their email` or `invited_client_id = their id`.
- No client-role `insert/update/delete` — all mutations go through the `SECURITY DEFINER` functions so the token hash and transitions stay controlled (consistent with your RPC → definer-function migration).

---

## 11. API surface (`/v1/`, ficium-portal-api conventions)

| Method + path                                            | Actor    | Notes                                             |
|----------------------------------------------------------|----------|---------------------------------------------------|
| `POST /v1/requests/{id}/invitations`                     | inviter  | body: email/phone, role, liability, ownership_bps. Generates token, emails link. Returns invitation id + status — **never** the raw token. |
| `GET  /v1/invitations/{token}`                           | public   | Preview screen: request summary, inviter display name, proposed terms. No PII beyond inviter name. |
| `POST /v1/invitations/{token}/accept`                    | invitee  | Auth + KYC required. Calls `accept_request_invitation`. |
| `POST /v1/invitations/{token}/decline`                   | invitee  |                                                   |
| `POST /v1/requests/{id}/invitations/{invId}/revoke`      | inviter  |                                                   |
| `POST /v1/requests/{id}/invitations/{invId}/resend`      | inviter  | New token + expiry, supersedes prior pending. Rate-limited. |

## 12. Webhook events (HMAC dispatcher)

`invitation.sent`, `invitation.accepted`, `invitation.declined`, `invitation.expired`, `invitation.revoked`.

## 13. Frontend surfaces (module rule: every feature has UI)

- **Invite step** in the joint request wizard: add co-applicant (email/phone), pick role + liability, ownership slider for investments.
- **Pending invitations panel** on the request: status chips, resend / revoke.
- **Acceptance page** at `/invite/:token`: unauth → login/signup → not verified → KYC → review terms → consent / decline.
- **Notifications**: reuses the existing `notifications` table + live unread badge.

---

## 14. Decisions to confirm before building

1. **Cold invite vs existing-user-only.** Spec supports cold (email/phone, invitee onboards on the way in) — recommended for the referral loop. Say the word if you'd rather restrict to existing verified users.
2. **`awaiting_consent`** added to `request_status` (keeps joint requests off-market until unanimous; solo flow untouched).
3. **Ownership enforcement** for investment `product_type`s (`fixed_deposit`, `savings_account`, `investment_account`, `business_account`) vs liability-only for loans (`personal_loan`, `mortgage`, `sme_loan`).
4. **Resend limits**: token TTL (default 7d) and max active invites per request.
