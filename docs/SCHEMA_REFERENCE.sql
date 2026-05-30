-- =============================================================================
-- FICIUM 3 — EXECUTABLE SCHEMA REFERENCE & DATA DICTIONARY
-- =============================================================================
-- This file is a complete, annotated reference of the Ficium database.
-- It is organized A–Z by schema and object. Each block documents purpose,
-- columns, constraints, and relationships.
--
-- It also doubles as a set of INSPECTION QUERIES you can run against a live
-- database to verify the schema matches this reference.
--
-- Version: 3.0  |  Updated: 2026-05-30  |  Project: wixfhjlsjkiwfvqewvmt
-- =============================================================================


-- =============================================================================
-- SECTION 0 — INSPECTION QUERIES (run these to audit a live DB)
-- =============================================================================

-- 0.1 List every schema
SELECT schema_name FROM information_schema.schemata
WHERE schema_name IN ('public','institution','admin')
ORDER BY schema_name;

-- 0.2 List every table per schema
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema IN ('public','institution','admin')
  AND table_type = 'BASE TABLE'
ORDER BY table_schema, table_name;

-- 0.3 List every view
SELECT table_schema, table_name
FROM information_schema.views
WHERE table_schema IN ('public','institution','admin')
ORDER BY table_schema, table_name;

-- 0.4 Full column dictionary for any table (parameterize :schema, :table)
SELECT column_name, data_type, udt_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = :'schema' AND table_name = :'table'
ORDER BY ordinal_position;

-- 0.5 List every RLS policy
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname IN ('public','institution','admin')
ORDER BY schemaname, tablename, policyname;

-- 0.6 List every function
SELECT n.nspname AS schema, p.proname AS function, pg_get_function_arguments(p.oid) AS args
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname IN ('public','institution','admin')
ORDER BY schema, function;

-- 0.7 List every trigger
SELECT event_object_schema, event_object_table, trigger_name, event_manipulation
FROM information_schema.triggers
WHERE event_object_schema IN ('public','institution','admin','auth')
ORDER BY event_object_schema, event_object_table;

-- 0.8 List every enum and its values
SELECT t.typname AS enum_type, string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS values
FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
GROUP BY t.typname
ORDER BY t.typname;


-- =============================================================================
-- SECTION 1 — ENUM TYPES (public schema)
-- =============================================================================

-- user_role        : client | bank | admin
-- kyc_status       : pending | submitted | verified | rejected
-- request_status   : open | closed | cancelled
-- bid_status       : submitted | accepted | rejected | withdrawn
-- product_type     : personal_loan | housing_loan | vehicle_loan | business_loan | ...
-- title_type       : mr | mrs | ms | dr | prof
-- gender_type      : male | female | other | prefer_not_to_say
-- id_document_type : national_id | passport | residence_permit


-- =============================================================================
-- SECTION 2 — PUBLIC SCHEMA
-- =============================================================================

-- ─────────────────────────────────────────────────────────────
-- public.users  — profile mirror of auth.users
-- PK: id (= auth.users.id)
-- RLS: own row (auth.uid() = id); admin via JWT claim
-- ─────────────────────────────────────────────────────────────
--   id                    uuid         PK, FK auth.users.id
--   email                 text         NOT NULL
--   full_name             text         default ''
--   first_name            text         default ''
--   middle_name           text         default ''
--   last_name             text         default ''
--   phone                 text         default ''
--   title                 title_type
--   role                  user_role    NOT NULL default 'client'
--   kyc_status            kyc_status   NOT NULL default 'pending'
--   user_type             text         default 'individual'
--   company_name          text
--   company_registration  text
--   date_of_birth         date
--   gender                gender_type
--   id_document_type      id_document_type
--   created_at            timestamptz  NOT NULL default now()
--   updated_at            timestamptz  NOT NULL default now()

-- ─────────────────────────────────────────────────────────────
-- public.requests  — client financing requests
-- PK: id   FK: client_id → users.id
-- RLS: clients full CRUD own; institutions SELECT open if approved+active
-- ─────────────────────────────────────────────────────────────
--   id                     uuid            PK
--   client_id              uuid            NOT NULL FK users.id
--   product_type           product_type    NOT NULL
--   status                 request_status  NOT NULL default 'open'
--   amount                 numeric         NOT NULL
--   purpose                text
--   preferred_term_months  integer
--   max_rate               numeric
--   decision_deadline      timestamptz
--   anonymized_brief       text
--   created_at             timestamptz     NOT NULL default now()

-- ─────────────────────────────────────────────────────────────
-- public.bids  — LEGACY bid table (retained for compat)
-- PK: id   FK: request_id → requests.id, bank_id → users.id
-- NOTE: rate stored as PERCENTAGE (8.5). New bids use institution schema.
-- ─────────────────────────────────────────────────────────────
--   id          uuid        PK
--   request_id  uuid        NOT NULL FK requests.id
--   bank_id     uuid        NOT NULL FK users.id
--   rate        numeric     NOT NULL    -- percentage
--   terms       text
--   status      bid_status  NOT NULL default 'submitted'
--   created_at  timestamptz NOT NULL default now()

-- ─────────────────────────────────────────────────────────────
-- public.bid_acceptances  — client accepts an institution bid
-- PK: id   FK: bid_id, request_id, client_id, institution_id
-- Trigger on_bid_accepted fires AFTER INSERT.
-- ─────────────────────────────────────────────────────────────
--   id                   uuid        PK
--   bid_id               uuid        NOT NULL
--   request_id           uuid        NOT NULL FK requests.id
--   client_id            uuid        NOT NULL FK users.id
--   institution_id       uuid        NOT NULL
--   los_reference        text
--   crm_reference        text
--   core_banking_ref     text
--   disbursement_status  text        default 'pending'
--   accepted_at          timestamptz NOT NULL default now()

-- ─────────────────────────────────────────────────────────────
-- public.bank_profiles  — DEPRECATED legacy institution profile
-- Superseded by institution.institutions. Kept only for trigger compat.
-- ─────────────────────────────────────────────────────────────
--   id, user_id (unique), institution_name, institution_type,
--   license_number, regulatory_body, approved (deprecated gate),
--   plan_tier, subscription, win_rate, total_bids, deals_closed

-- ─────────────────────────────────────────────────────────────
-- public.notifications  — in-app notifications
-- PK: id   FK: user_id → users.id
-- ─────────────────────────────────────────────────────────────
--   id, user_id, title, body, read_at, created_at


-- =============================================================================
-- SECTION 3 — INSTITUTION SCHEMA (17 tables)
-- =============================================================================

-- CORE
--   institution.institutions          — org record (name, type, deployment, modules, approval)
--   institution.institution_users     — user↔institution membership + role
--
-- BIDDING
--   institution.institution_bids      — canonical bids (rate stored as DECIMAL 0.085)
--   institution.pending_actions       — maker-checker queue
--
-- CATALOGUE
--   institution.product_families      — credit | deposits_savings | investments
--   institution.products              — 17 products
--   institution.product_parameters    — per-product config params
--   institution.product_documents     — required docs per product
--   institution.product_rate_config   — platform rate/amount/term caps
--   institution.product_sla_defaults  — default bid window / auto-withdraw
--   institution.product_eligibility   — eligibility rules + required module
--   institution.institution_product_config — per-institution limit overrides
--
-- INTEGRATION
--   institution.institution_webhooks  — outbound endpoints
--   institution.institution_api_keys  — API keys (hash only)
--   institution.institution_sla_config — per-product SLA overrides
--
-- AUDIT
--   institution.audit_events          — append-only WORM log
--   institution.webhook_events        — delivery queue + history

-- Full column definitions: see FICIUM_DOCUMENTATION.md §7.

-- RLS helper functions (institution schema):
--   get_my_institution_id() returns uuid   — caller's institution
--   is_ficium_admin()        returns bool   — JWT ficium_admin claim
--   has_role(text)           returns bool   — caller has institution role
--   is_active()              returns bool   — institution approved + not suspended
--   has_module(text)         returns bool   — institution licenses module


-- =============================================================================
-- SECTION 4 — ADMIN SCHEMA
-- =============================================================================

--   admin.platform_config   — key/value platform config (11 entries)
--   admin.admin_users        — Ficium staff
--
-- VIEWS:
--   admin.institution_overview     — institutions + user/bid/webhook counts
--   admin.unified_audit            — cross-schema audit with institution names
--   admin.pending_approvals        — all pending maker-checker actions
--   admin.webhook_delivery_stats   — delivery success/failure rates


-- =============================================================================
-- SECTION 5 — CROSS-SCHEMA VIEWS (institution schema)
-- =============================================================================
-- All created WITH (security_invoker = false) so they bypass the caller's
-- RLS on public.requests and read with owner privileges.

--   institution.marketplace_requests — open requests + product join + hashed client_ref
--   institution.my_bids              — institution bids + request/product join
--   institution.accepted_bids        — won deals (bid_acceptances join)

-- Canonical definition of marketplace_requests:
/*
CREATE VIEW institution.marketplace_requests
WITH (security_invoker = false) AS
SELECT
  r.id, r.product_type::text AS product_type, r.status::text AS status,
  r.amount, 'MUR' AS currency, r.preferred_term_months AS term_months,
  r.purpose, NULL::jsonb AS financial_snapshot,
  r.decision_deadline AS bid_window_closes_at, r.created_at,
  encode(digest(r.client_id::text,'sha256'),'hex') AS client_ref,
  'individual' AS client_type,
  p.id AS product_id, p.label AS product_label, pf.label AS family_label
FROM public.requests r
LEFT JOIN institution.products p  ON p.code = r.product_type::text
LEFT JOIN institution.product_families pf ON pf.id = p.family_id
WHERE r.status::text = 'open'
  AND (r.decision_deadline IS NULL OR r.decision_deadline > now());
*/


-- =============================================================================
-- SECTION 6 — RPC FUNCTIONS (callable via supabase.rpc)
-- =============================================================================
--   institution.submit_for_approval(category, resource_type, resource_id, payload) → uuid
--   institution.approve_action(action_id, note)  → void   (enforces maker ≠ checker)
--   institution.reject_action(action_id, note)   → void   (note mandatory)
--   institution.execute_approved_action(action_id) → void (internal)
--   public.handle_new_user()                      → trigger
--   public.claim_webhook_batch()                  → webhook batch


-- =============================================================================
-- SECTION 7 — TRIGGERS
-- =============================================================================
--   on_auth_user_created  ON auth.users           AFTER INSERT → handle_new_user()
--   on_bid_accepted       ON public.bid_acceptances AFTER INSERT → acceptance handler
--   trg_audit_row_change  ON institution.*          AFTER I/U   → audit logger
--   trg_set_updated_at    ON tables w/ updated_at   BEFORE UPDATE → set_updated_at()


-- =============================================================================
-- END OF SCHEMA REFERENCE
-- =============================================================================
