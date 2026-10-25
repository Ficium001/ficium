-- Offers feed v1 (App DB wixfhjlsjkiwfvqewvmt)
-- Ficium staff curate offers in admin.*; borrowers read only public.offer_listing.
-- The ONLY path from admin to listing is admin.offer_publish (SECURITY DEFINER).
-- If admin moves to its own DB, that function becomes an integration event;
-- the borrower side does not change. Rules: no FKs from admin.* into public.*,
-- borrower app never reads admin.*, authenticated has no USAGE on admin.

BEGIN;

-- ── 1. Admin workflow table ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin.offer (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status              text NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','approved','published','withdrawn')),
  institution_name    text NOT NULL CHECK (length(btrim(institution_name)) BETWEEN 2 AND 80),
  category            text NOT NULL CHECK (category IN ('borrow','save','invest')),
  product_type        public.product_type NOT NULL,
  caption             text NOT NULL CHECK (length(btrim(caption)) BETWEEN 10 AND 400),
  headline            text NOT NULL CHECK (length(btrim(headline)) BETWEEN 2 AND 60),
  terms               text NOT NULL CHECK (length(btrim(terms)) BETWEEN 2 AND 120),
  image_tag           text CHECK (image_tag IS NULL OR length(image_tag) <= 40),
  image_url           text CHECK (image_url IS NULL OR image_url ~ '^https://'),
  image_alt           text CHECK (image_alt IS NULL OR length(image_alt) <= 200),
  is_launch           boolean NOT NULL DEFAULT false,
  launch_window_ends  timestamptz,
  expires_at          timestamptz NOT NULL,
  source_url          text CHECK (source_url IS NULL OR source_url ~ '^https://'),
  consent_ref         text CHECK (consent_ref IS NULL OR length(btrim(consent_ref)) >= 3),
  verified_at         timestamptz,
  created_by          text NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_by          text NOT NULL,
  updated_at          timestamptz NOT NULL DEFAULT now(),
  approved_by         text,
  approved_at         timestamptz,
  self_approved       boolean,          -- true while Ficium has one staff member; recorded, not hidden
  published_by        text,
  published_at        timestamptz,
  withdrawn_by        text,
  withdrawn_at        timestamptz,
  version             integer NOT NULL DEFAULT 1,
  CHECK (NOT is_launch OR launch_window_ends IS NOT NULL),
  CHECK (launch_window_ends IS NULL OR launch_window_ends <= expires_at)
);
ALTER TABLE admin.offer ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin.offer FORCE ROW LEVEL SECURITY;

-- Append-only change log (same model as admin.kyc_settings_change)
CREATE TABLE IF NOT EXISTS admin.offer_change (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  offer_id    uuid NOT NULL,
  changed_at  timestamptz NOT NULL DEFAULT now(),
  actor       text NOT NULL,
  action      text NOT NULL CHECK (action IN ('create','edit','approve','publish','withdraw','reverify')),
  reason      text,
  snapshot    jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS offer_change_offer_idx ON admin.offer_change (offer_id, changed_at DESC);
CREATE OR REPLACE FUNCTION admin._offer_change_worm() RETURNS trigger
LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN RAISE EXCEPTION 'admin.offer_change is append-only' USING ERRCODE = '42501'; END $$;
DROP TRIGGER IF EXISTS offer_change_worm ON admin.offer_change;
CREATE TRIGGER offer_change_worm BEFORE UPDATE OR DELETE OR TRUNCATE ON admin.offer_change
  FOR EACH STATEMENT EXECUTE FUNCTION admin._offer_change_worm();
ALTER TABLE admin.offer_change ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin.offer_change FORCE ROW LEVEL SECURITY;

-- ── 2. Borrower read model ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.offer_listing (
  id                  uuid PRIMARY KEY,          -- same id as admin.offer, no FK by design
  institution_name    text NOT NULL,
  category            text NOT NULL CHECK (category IN ('borrow','save','invest')),
  product_type        public.product_type NOT NULL,
  caption             text NOT NULL,
  headline            text NOT NULL,
  terms               text NOT NULL,
  image_tag           text,
  image_url           text,
  image_alt           text,
  is_launch           boolean NOT NULL,
  launch_window_ends  timestamptz,
  published_at        timestamptz NOT NULL,
  verified_at         timestamptz NOT NULL,
  live_until          timestamptz NOT NULL       -- least(expires_at, verified_at + 30 days)
);
CREATE INDEX IF NOT EXISTS offer_listing_live_idx ON public.offer_listing (live_until, published_at DESC);
ALTER TABLE public.offer_listing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_listing FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS offer_listing_read_live ON public.offer_listing;
CREATE POLICY offer_listing_read_live ON public.offer_listing
  FOR SELECT TO authenticated
  USING (live_until > now());

-- RLS alone grants nothing: explicit grants (lesson of the finance/esign incidents)
REVOKE ALL ON public.offer_listing FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.offer_listing TO authenticated;
REVOKE ALL ON admin.offer, admin.offer_change FROM PUBLIC, anon, authenticated;

-- ── 3. Functions: the only write paths ────────────────────────────────────
CREATE OR REPLACE FUNCTION admin._offer_actor(p_actor text) RETURNS text
LANGUAGE plpgsql IMMUTABLE SET search_path TO '' AS $$
BEGIN
  IF coalesce(btrim(p_actor), '') !~ '^[^@\s]+@[^@\s]+$' THEN
    RAISE EXCEPTION 'actor must be a staff email' USING ERRCODE = '22023';
  END IF;
  RETURN lower(btrim(p_actor));
END $$;

CREATE OR REPLACE FUNCTION admin._offer_log(p_id uuid, p_actor text, p_action text, p_reason text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO '' AS $$
  INSERT INTO admin.offer_change (offer_id, actor, action, reason, snapshot)
  SELECT o.id, p_actor, p_action, nullif(btrim(p_reason), ''), to_jsonb(o)
  FROM admin.offer o WHERE o.id = p_id;
$$;

-- Create (p_id null) or edit. Any edit sends the offer back to draft and
-- clears approval; a published offer stays live until republished or withdrawn.
CREATE OR REPLACE FUNCTION admin.offer_save(p_id uuid, p_data jsonb, p_actor text, p_expected_version integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE a text := admin._offer_actor(p_actor); r admin.offer;
BEGIN
  IF p_id IS NULL THEN
    INSERT INTO admin.offer (institution_name, category, product_type, caption, headline, terms,
      image_tag, image_url, image_alt, is_launch, launch_window_ends, expires_at,
      source_url, consent_ref, verified_at, created_by, updated_by)
    VALUES (p_data->>'institution_name', p_data->>'category', (p_data->>'product_type')::public.product_type,
      p_data->>'caption', p_data->>'headline', p_data->>'terms',
      p_data->>'image_tag', p_data->>'image_url', p_data->>'image_alt',
      coalesce((p_data->>'is_launch')::boolean, false), (p_data->>'launch_window_ends')::timestamptz,
      (p_data->>'expires_at')::timestamptz, p_data->>'source_url', p_data->>'consent_ref',
      (p_data->>'verified_at')::timestamptz, a, a)
    RETURNING * INTO r;
    PERFORM admin._offer_log(r.id, a, 'create', NULL);
  ELSE
    UPDATE admin.offer SET
      institution_name = p_data->>'institution_name', category = p_data->>'category',
      product_type = (p_data->>'product_type')::public.product_type,
      caption = p_data->>'caption', headline = p_data->>'headline', terms = p_data->>'terms',
      image_tag = p_data->>'image_tag', image_url = p_data->>'image_url', image_alt = p_data->>'image_alt',
      is_launch = coalesce((p_data->>'is_launch')::boolean, false),
      launch_window_ends = (p_data->>'launch_window_ends')::timestamptz,
      expires_at = (p_data->>'expires_at')::timestamptz,
      source_url = p_data->>'source_url', consent_ref = p_data->>'consent_ref',
      verified_at = (p_data->>'verified_at')::timestamptz,
      status = CASE WHEN status = 'withdrawn' THEN 'withdrawn' ELSE 'draft' END,
      approved_by = NULL, approved_at = NULL, self_approved = NULL,
      updated_by = a, updated_at = now(), version = version + 1
    WHERE id = p_id AND version = p_expected_version
    RETURNING * INTO r;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'offer changed since you opened it, or does not exist' USING ERRCODE = '40001';
    END IF;
    PERFORM admin._offer_log(r.id, a, 'edit', NULL);
  END IF;
  RETURN to_jsonb(r);
END $$;

CREATE OR REPLACE FUNCTION admin.offer_approve(p_id uuid, p_actor text, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE a text := admin._offer_actor(p_actor); r admin.offer;
BEGIN
  SELECT * INTO r FROM admin.offer WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'offer not found' USING ERRCODE = '22023'; END IF;
  IF r.status <> 'draft' THEN RAISE EXCEPTION 'only a draft can be approved' USING ERRCODE = '22023'; END IF;
  IF r.image_url IS NULL OR r.image_alt IS NULL THEN RAISE EXCEPTION 'image and image description are required' USING ERRCODE = '22023'; END IF;
  IF r.source_url IS NULL THEN RAISE EXCEPTION 'source link is required' USING ERRCODE = '22023'; END IF;
  IF r.consent_ref IS NULL THEN RAISE EXCEPTION 'bank consent reference is required' USING ERRCODE = '22023'; END IF;
  IF r.verified_at IS NULL OR r.verified_at < now() - interval '30 days' OR r.verified_at > now() THEN
    RAISE EXCEPTION 'rates must be verified within the last 30 days' USING ERRCODE = '22023';
  END IF;
  IF r.expires_at <= now() THEN RAISE EXCEPTION 'expiry is in the past' USING ERRCODE = '22023'; END IF;
  IF length(coalesce(btrim(p_reason), '')) < 10 THEN RAISE EXCEPTION 'a reason of at least 10 characters is required' USING ERRCODE = '22023'; END IF;
  UPDATE admin.offer SET status = 'approved', approved_by = a, approved_at = now(),
    self_approved = (a = r.updated_by), version = version + 1
  WHERE id = p_id RETURNING * INTO r;
  PERFORM admin._offer_log(p_id, a, 'approve', p_reason);
  RETURN to_jsonb(r);
END $$;

CREATE OR REPLACE FUNCTION admin.offer_publish(p_id uuid, p_actor text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE a text := admin._offer_actor(p_actor); r admin.offer;
BEGIN
  SELECT * INTO r FROM admin.offer WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'offer not found' USING ERRCODE = '22023'; END IF;
  IF r.status <> 'approved' THEN RAISE EXCEPTION 'only an approved offer can be published' USING ERRCODE = '22023'; END IF;
  IF r.expires_at <= now() OR r.verified_at < now() - interval '30 days' THEN
    RAISE EXCEPTION 'offer is expired or needs re-verification' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.offer_listing (id, institution_name, category, product_type, caption, headline, terms,
    image_tag, image_url, image_alt, is_launch, launch_window_ends, published_at, verified_at, live_until)
  VALUES (r.id, r.institution_name, r.category, r.product_type, r.caption, r.headline, r.terms,
    r.image_tag, r.image_url, r.image_alt, r.is_launch, r.launch_window_ends, now(), r.verified_at,
    least(r.expires_at, r.verified_at + interval '30 days'))
  ON CONFLICT (id) DO UPDATE SET
    institution_name = EXCLUDED.institution_name, category = EXCLUDED.category,
    product_type = EXCLUDED.product_type, caption = EXCLUDED.caption, headline = EXCLUDED.headline,
    terms = EXCLUDED.terms, image_tag = EXCLUDED.image_tag, image_url = EXCLUDED.image_url,
    image_alt = EXCLUDED.image_alt, is_launch = EXCLUDED.is_launch,
    launch_window_ends = EXCLUDED.launch_window_ends, published_at = EXCLUDED.published_at,
    verified_at = EXCLUDED.verified_at, live_until = EXCLUDED.live_until;
  UPDATE admin.offer SET status = 'published', published_by = a, published_at = now(), version = version + 1
  WHERE id = p_id RETURNING * INTO r;
  PERFORM admin._offer_log(p_id, a, 'publish', NULL);
  RETURN to_jsonb(r);
END $$;

CREATE OR REPLACE FUNCTION admin.offer_withdraw(p_id uuid, p_actor text, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE a text := admin._offer_actor(p_actor); r admin.offer;
BEGIN
  IF length(coalesce(btrim(p_reason), '')) < 10 THEN RAISE EXCEPTION 'a reason of at least 10 characters is required' USING ERRCODE = '22023'; END IF;
  DELETE FROM public.offer_listing WHERE id = p_id;
  UPDATE admin.offer SET status = 'withdrawn', withdrawn_by = a, withdrawn_at = now(), version = version + 1
  WHERE id = p_id RETURNING * INTO r;
  IF NOT FOUND THEN RAISE EXCEPTION 'offer not found' USING ERRCODE = '22023'; END IF;
  PERFORM admin._offer_log(p_id, a, 'withdraw', p_reason);
  RETURN to_jsonb(r);
END $$;

-- Re-verify rates with the bank without a full re-approval cycle.
CREATE OR REPLACE FUNCTION admin.offer_reverify(p_id uuid, p_actor text, p_verified_at timestamptz, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE a text := admin._offer_actor(p_actor); r admin.offer;
BEGIN
  IF p_verified_at IS NULL OR p_verified_at > now() OR p_verified_at < now() - interval '30 days' THEN
    RAISE EXCEPTION 'verification date must be within the last 30 days' USING ERRCODE = '22023';
  END IF;
  IF length(coalesce(btrim(p_reason), '')) < 10 THEN RAISE EXCEPTION 'a reason of at least 10 characters is required' USING ERRCODE = '22023'; END IF;
  UPDATE admin.offer SET verified_at = p_verified_at, version = version + 1
  WHERE id = p_id RETURNING * INTO r;
  IF NOT FOUND THEN RAISE EXCEPTION 'offer not found' USING ERRCODE = '22023'; END IF;
  UPDATE public.offer_listing SET verified_at = p_verified_at,
    live_until = least(r.expires_at, p_verified_at + interval '30 days')
  WHERE id = p_id;
  PERFORM admin._offer_log(p_id, a, 'reverify', p_reason);
  RETURN to_jsonb(r);
END $$;

-- ── 4. Function privileges: nobody but the admin app role ──────────────────
REVOKE ALL ON FUNCTION admin._offer_change_worm(), admin._offer_actor(text), admin._offer_log(uuid,text,text,text),
  admin.offer_save(uuid,jsonb,text,integer), admin.offer_approve(uuid,text,text),
  admin.offer_publish(uuid,text), admin.offer_withdraw(uuid,text,text),
  admin.offer_reverify(uuid,text,timestamptz,text)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION admin.offer_save(uuid,jsonb,text,integer), admin.offer_approve(uuid,text,text),
  admin.offer_publish(uuid,text), admin.offer_withdraw(uuid,text,text),
  admin.offer_reverify(uuid,text,timestamptz,text) TO ficium_admin_app;

-- Admin app may read (not write) its own tables
GRANT SELECT ON admin.offer, admin.offer_change TO ficium_admin_app;
DROP POLICY IF EXISTS admin_app_read ON admin.offer;
CREATE POLICY admin_app_read ON admin.offer FOR SELECT TO ficium_admin_app USING (true);
DROP POLICY IF EXISTS admin_app_read ON admin.offer_change;
CREATE POLICY admin_app_read ON admin.offer_change FOR SELECT TO ficium_admin_app USING (true);

COMMIT;
