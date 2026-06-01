-- ══════════════════════════════════════════════════════════════════════════════
-- FICIUM V2 MIGRATION — FILE 2: CREATE NEW V2 TABLES
-- Creates new V2 tables alongside existing V1 tables (non-destructive)
-- V1 tables remain untouched until file 6_drop_old.sql
-- ══════════════════════════════════════════════════════════════════════════════

-- ── ENUMS (add missing ones) ──────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.user_type_enum AS ENUM ('individual', 'business');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE institution.inst_role AS ENUM ('admin', 'analyst', 'viewer', 'compliance');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.outcome_type AS ENUM ('success', 'rejected', 'expired', 'error');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- PUBLIC SCHEMA — Clients ONLY
-- ══════════════════════════════════════════════════════════════════════════════

-- Client identity (replaces public.users for client rows only)
CREATE TABLE IF NOT EXISTS public.clients (
  id                   uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                text NOT NULL UNIQUE,
  full_name            text NOT NULL DEFAULT '',
  first_name           text,
  middle_name          text,
  last_name            text,
  title                public.title_type,
  phone                text,
  user_type            text NOT NULL DEFAULT 'individual'
                       CHECK (user_type IN ('individual','business')),
  -- Business fields
  company_name         text,
  company_registration text,
  -- KYC
  kyc_status           public.kyc_status NOT NULL DEFAULT 'pending',
  date_of_birth        date,
  gender               text,
  id_document_type     text,
  id_document_number   text,
  id_document_path     text,
  selfie_path          text,
  -- Address
  address_line_1       text,
  address_line_2       text,
  city                 text,
  postal_code          text,
  country              text DEFAULT 'MU',
  -- Timestamps
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  -- Business constraint
  CONSTRAINT clients_business_fields CHECK (
    user_type = 'individual'
    OR (company_name IS NOT NULL AND company_registration IS NOT NULL)
  )
);

-- Unified client dossier (merges client_dossiers + financial_profiles)
CREATE TABLE IF NOT EXISTS public.client_dossier (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id             uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  -- Employment (from employment_details)
  employment_status     text,
  employer_name         text,
  monthly_income        numeric(15,2),
  additional_income     numeric(15,2),
  -- Financial (from financial_profiles)
  total_net_worth       numeric(15,2),
  has_existing_loans    boolean DEFAULT false,
  pep_declaration       boolean DEFAULT false,
  tax_residency         text,
  source_of_wealth      text,
  -- Scores (from financial_profiles)
  health_score          integer,
  risk_score            integer,
  affordability_score   integer,
  -- Timestamps
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

-- Asset details (stays in public — client owns it)
-- Already exists, just adding FK to clients in V2
-- Will be updated via ALTER in file 5

-- Loan details (moving from institution → public)
CREATE TABLE IF NOT EXISTS public.client_loan_details (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  loan_type         text,
  outstanding_amount numeric(15,2),
  monthly_repayment  numeric(15,2),
  bank_name         text,
  remaining_months  integer,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Compliance details (stays in public — client owns it)
-- Already exists, no structural change needed

-- Employment details (stays in public — client owns it)
-- Already exists, no structural change needed

-- ══════════════════════════════════════════════════════════════════════════════
-- INSTITUTION SCHEMA — Institution staff identity + membership
-- ══════════════════════════════════════════════════════════════════════════════

-- Institution members (replaces institution_users + adds full identity)
-- Institution staff identity lives HERE not in public.users
CREATE TABLE IF NOT EXISTS institution.institution_members (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Links directly to auth.users — NOT to public.users
  auth_user_id     uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id   uuid NOT NULL REFERENCES institution.institutions(id) ON DELETE CASCADE,
  -- Identity stored here (not in public schema)
  email            text NOT NULL,
  full_name        text NOT NULL DEFAULT '',
  title            text,
  phone            text,
  -- Institution role
  role             institution.inst_role NOT NULL DEFAULT 'analyst',
  is_primary_admin boolean NOT NULL DEFAULT false,
  -- Status
  active           boolean NOT NULL DEFAULT true,
  invited_by       uuid REFERENCES institution.institution_members(id),
  joined_at        timestamptz NOT NULL DEFAULT now(),
  deactivated_at   timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(auth_user_id, institution_id)
);

-- ── PHASE 2 PLACEHOLDER — Audit tables per schema ────────────────────────────
-- TODO Phase 2: Add audit tables to public and admin schemas
--
-- public.audit_events    → client actions (KYC submissions, request creation,
--                          bid acceptances, profile changes)
--
-- admin.audit_events     → platform admin actions (institution approvals,
--                          suspensions, config changes)
--
-- institution.audit_events already exists — no change needed
--
-- All audit tables will be WORM (INSERT-only RLS, no UPDATE/DELETE)
-- Schema will mirror institution.audit_events with schema-specific actor types
-- ─────────────────────────────────────────────────────────────────────────────

-- ══════════════════════════════════════════════════════════════════════════════
-- ADMIN SCHEMA — no new tables needed
-- admin.admin_users and admin.platform_config are already correct
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Verify new tables created ─────────────────────────────────────────────────
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_name IN ('clients','client_dossier','client_loan_details','institution_members')
AND table_schema IN ('public','institution')
ORDER BY table_schema, table_name;

SELECT 'V2 tables created successfully' AS status;
