-- =============================================================================
-- Ficium Vault — Client Document Storage & Enrichment
-- APP DB (wixfhjlsjkiwfvqewvmt)
--
-- Architecture:
--   1. client_vault_document  — one row per uploaded file, tracks extraction state
--   2. client_vault_property  — structured property records (from title deeds + valuations)
--   3. Trigger on INSERT       → calls vault_extract.dispatch() fire-and-forget
--   4. Extraction results      → written back by Vercel /api/vault-extract
--   5. Attestation             → updates client_financial_snapshot verified fields
--
-- Documents NEVER leave Ficium. Institutions only see attested data points
-- from client_financial_snapshot, not raw files.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Document type enum
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE vault_doc_type AS ENUM (
    -- Identity
    'nic', 'passport', 'birth_certificate', 'driving_licence',
    -- Property
    'title_deed', 'valuation_report', 'land_registry_extract',
    -- Income
    'payslip', 'employment_letter', 'tax_return',
    -- Banking / liabilities
    'bank_statement', 'loan_statement', 'credit_card_statement',
    -- Business
    'brn_certificate', 'audited_accounts',
    -- Insurance
    'insurance_policy',
    -- Other
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE vault_extract_status AS ENUM (
    'pending',      -- just uploaded, queued for extraction
    'processing',   -- extraction in flight
    'extracted',    -- data pulled, awaiting attestation
    'attested',     -- written into financial snapshot
    'failed',       -- extraction failed (see extract_error)
    'manual_review' -- AI confidence too low, needs human check
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Main vault document table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_vault_document (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  -- Storage
  doc_type        vault_doc_type NOT NULL,
  storage_path    text NOT NULL,          -- path in 'documents' bucket
  file_name       text NOT NULL,
  file_size_bytes integer,
  mime_type       text,

  -- Extraction lifecycle
  extract_status  vault_extract_status NOT NULL DEFAULT 'pending',
  extract_job_id  text,                  -- Vercel invocation id for tracing
  extracted_at    timestamptz,
  attested_at     timestamptz,
  extract_error   text,
  extract_raw     jsonb,                 -- raw AI output (for audit / reprocessing)
  confidence      numeric(4,3),          -- 0.000–1.000 AI confidence score

  -- Document metadata (filled by extraction)
  doc_date        date,                  -- date on document (payslip period, deed date etc)
  doc_ref         text,                  -- document reference number
  expires_at      date,                  -- for passports, insurance policies etc

  -- DPA / AML retention
  retain_until    date,                  -- max(5yr from upload, 5yr from relationship end)
  deleted_at      timestamptz,           -- soft delete (actual storage deletion is separate)

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vault_doc_client     ON public.client_vault_document(client_id);
CREATE INDEX IF NOT EXISTS idx_vault_doc_status     ON public.client_vault_document(extract_status);
CREATE INDEX IF NOT EXISTS idx_vault_doc_type       ON public.client_vault_document(doc_type);

-- RLS: clients see only their own documents
ALTER TABLE public.client_vault_document ENABLE ROW LEVEL SECURITY;

CREATE POLICY vault_doc_owner ON public.client_vault_document
  FOR ALL USING (client_id = auth.uid());

CREATE POLICY vault_doc_service ON public.client_vault_document
  FOR ALL USING (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- Property records table (structured output from title deed + valuation)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_vault_property (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  -- Links to source documents
  deed_document_id    uuid REFERENCES public.client_vault_document(id),
  valuation_doc_id    uuid REFERENCES public.client_vault_document(id),

  -- Property details (extracted)
  address             text,
  land_area_sqm       numeric,
  property_type       text,              -- 'land', 'apartment', 'villa', 'commercial'
  registered_owner    text,              -- as on deed (may differ from client name)
  deed_date           date,
  deed_ref            text,              -- Registrar General reference

  -- Valuation (from valuation report, not deed)
  market_value        numeric,
  valuation_date      date,
  valuer_name         text,
  valuation_currency  text DEFAULT 'MUR',

  -- Mortgage encumbrance (extracted from deed or loan statement)
  is_mortgaged        boolean DEFAULT false,
  mortgage_lender     text,
  mortgage_balance    numeric,

  verified            boolean DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vault_prop_client ON public.client_vault_property(client_id);

ALTER TABLE public.client_vault_property ENABLE ROW LEVEL SECURITY;

CREATE POLICY vault_prop_owner ON public.client_vault_property
  FOR ALL USING (client_id = auth.uid());

CREATE POLICY vault_prop_service ON public.client_vault_property
  FOR ALL USING (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- Audit log — every file access (signed URL generation = an access)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_vault_access_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.client_vault_document(id),
  client_id   uuid NOT NULL,
  action      text NOT NULL,   -- 'upload', 'view', 'delete', 'extract'
  actor_id    uuid,            -- null = system (extraction job)
  ip_address  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vault_log_doc ON public.client_vault_access_log(document_id);

-- Append-only: no UPDATE/DELETE
ALTER TABLE public.client_vault_access_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY vault_log_owner_read ON public.client_vault_access_log
  FOR SELECT USING (client_id = auth.uid());
CREATE POLICY vault_log_service ON public.client_vault_access_log
  FOR ALL USING (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- Verified fields on client_financial_snapshot
-- Add attestation columns if they don't exist
-- ---------------------------------------------------------------------------
ALTER TABLE public.client_financial_snapshot
  ADD COLUMN IF NOT EXISTS income_verified        boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS income_verified_at     timestamptz,
  ADD COLUMN IF NOT EXISTS income_verified_source text,   -- 'payslip' | 'tax_return' | 'bank_statement'
  ADD COLUMN IF NOT EXISTS property_verified      boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS property_verified_at   timestamptz,
  ADD COLUMN IF NOT EXISTS liabilities_verified   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS liabilities_verified_at timestamptz;

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
CREATE TRIGGER set_vault_doc_updated_at
  BEFORE UPDATE ON public.client_vault_document
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_vault_prop_updated_at
  BEFORE UPDATE ON public.client_vault_property
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- vault_extract schema — async dispatch to Vercel extraction endpoint
-- mirrors marketplace_sync pattern exactly
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS vault_extract;

CREATE OR REPLACE FUNCTION vault_extract.dispatch(p_document_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = vault_extract, public, extensions, vault AS $$
DECLARE
  v_url    text;
  v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_url    FROM vault.decrypted_secrets WHERE name = 'portal_api_url';
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'app_service_secret';
  IF v_url IS NULL OR v_secret IS NULL THEN
    RAISE NOTICE 'vault_extract.dispatch: vault keys not configured, skipping';
    RETURN;
  END IF;

  -- Mark as processing immediately so UI can show spinner
  UPDATE public.client_vault_document
  SET extract_status = 'processing', updated_at = now()
  WHERE id = p_document_id;

  -- Fire-and-forget to Vercel extraction endpoint
  -- Uses APP_SERVICE_SECRET for auth (same pattern as marketplace sync)
  PERFORM net.http_post(
    url     := 'https://ficium.vercel.app/api/vault-extract',
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'X-Service-Secret', v_secret
    ),
    body    := jsonb_build_object('document_id', p_document_id),
    timeout_milliseconds := 25000
  );
END; $$;
REVOKE ALL ON FUNCTION vault_extract.dispatch(uuid) FROM PUBLIC;

-- Trigger: fires after INSERT on client_vault_document
CREATE OR REPLACE FUNCTION vault_extract.on_document_upload()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = vault_extract, public AS $$
BEGIN
  BEGIN
    PERFORM vault_extract.dispatch(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'vault_extract dispatch failed (non-fatal): %', SQLERRM;
  END;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_vault_extract ON public.client_vault_document;
CREATE TRIGGER trg_vault_extract
  AFTER INSERT ON public.client_vault_document
  FOR EACH ROW EXECUTE FUNCTION vault_extract.on_document_upload();
