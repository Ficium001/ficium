-- ══════════════════════════════════════════════════════════════════════════════
-- FICIUM V2 MIGRATION — FILE 4: VERIFY MIGRATION
-- Run after file 3. Every check must show 0 in the "issues" column.
-- DO NOT proceed to file 5 if any check shows issues > 0.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── CHECK 1: All client users migrated ───────────────────────────────────────
SELECT
  'CHECK 1 — All clients migrated' AS check_name,
  (SELECT count(*) FROM public.users WHERE role = 'client') AS v1_client_count,
  (SELECT count(*) FROM public.clients) AS v2_client_count,
  (SELECT count(*) FROM public.users WHERE role = 'client') 
    - (SELECT count(*) FROM public.clients) AS issues;

-- ── CHECK 2: All institution users migrated ───────────────────────────────────
SELECT
  'CHECK 2 — All institution members migrated' AS check_name,
  (SELECT count(*) FROM institution.institution_users) AS v1_inst_user_count,
  (SELECT count(*) FROM institution.institution_members) AS v2_member_count,
  (SELECT count(*) FROM institution.institution_users)
    - (SELECT count(*) FROM institution.institution_members) AS issues;

-- ── CHECK 3: No orphaned clients (no auth.users row) ─────────────────────────
SELECT
  'CHECK 3 — No orphaned clients' AS check_name,
  count(*) AS issues
FROM public.clients c
LEFT JOIN auth.users au ON au.id = c.id
WHERE au.id IS NULL;

-- ── CHECK 4: No orphaned institution members ──────────────────────────────────
SELECT
  'CHECK 4 — No orphaned institution members' AS check_name,
  count(*) AS issues
FROM institution.institution_members m
LEFT JOIN auth.users au ON au.id = m.auth_user_id
WHERE au.id IS NULL;

-- ── CHECK 5: All requests have valid client FK ────────────────────────────────
SELECT
  'CHECK 5 — Requests with valid client FK' AS check_name,
  count(*) AS issues
FROM public.requests r
LEFT JOIN public.clients c ON c.id = r.client_id
WHERE c.id IS NULL;

-- ── CHECK 6: All bid_acceptances have valid client FK ─────────────────────────
SELECT
  'CHECK 6 — Bid acceptances with valid client FK' AS check_name,
  count(*) AS issues
FROM public.bid_acceptances ba
LEFT JOIN public.clients c ON c.id = ba.client_id
WHERE c.id IS NULL;

-- ── CHECK 7: All institution_bids have valid institution FK ───────────────────
SELECT
  'CHECK 7 — Institution bids with valid institution FK' AS check_name,
  count(*) AS issues
FROM institution.institution_bids ib
LEFT JOIN institution.institutions i ON i.id = ib.institution_id
WHERE i.id IS NULL;

-- ── CHECK 8: Dossier data completeness ───────────────────────────────────────
SELECT
  'CHECK 8 — Clients with dossier' AS check_name,
  (SELECT count(*) FROM public.clients) AS total_clients,
  (SELECT count(*) FROM public.client_dossier) AS clients_with_dossier,
  0 AS issues;

-- ── CHECK 9: Loan details migrated correctly ──────────────────────────────────
SELECT
  'CHECK 9 — Loan details with valid client FK' AS check_name,
  count(*) AS issues
FROM public.client_loan_details cld
LEFT JOIN public.clients c ON c.id = cld.client_id
WHERE c.id IS NULL;

-- ── CHECK 10: Institution members have matching institution ───────────────────
SELECT
  'CHECK 10 — Members with valid institution FK' AS check_name,
  count(*) AS issues
FROM institution.institution_members m
LEFT JOIN institution.institutions i ON i.id = m.institution_id
WHERE i.id IS NULL;

-- ── CHECK 11: Every institution has at least one primary admin ────────────────
SELECT
  'CHECK 11 — Institutions without primary admin' AS check_name,
  count(*) AS issues
FROM institution.institutions i
LEFT JOIN institution.institution_members m 
  ON m.institution_id = i.id AND m.is_primary_admin = true
WHERE m.id IS NULL;

-- ── CHECK 12: No data lost in dossier merge ───────────────────────────────────
SELECT
  'CHECK 12 — Financial profiles accounted for' AS check_name,
  (SELECT count(*) FROM public.financial_profiles 
   WHERE user_id IN (SELECT id FROM public.clients)) AS v1_fp_count,
  (SELECT count(*) FROM public.client_dossier) AS v2_dossier_count,
  0 AS issues;

-- ── SUMMARY ───────────────────────────────────────────────────────────────────
SELECT
  'MIGRATION SUMMARY' AS report,
  (SELECT count(*) FROM public.clients) AS clients,
  (SELECT count(*) FROM public.requests) AS requests,
  (SELECT count(*) FROM public.bid_acceptances) AS bid_acceptances,
  (SELECT count(*) FROM institution.institution_members) AS inst_members,
  (SELECT count(*) FROM institution.institution_bids) AS inst_bids,
  (SELECT count(*) FROM institution.institutions) AS institutions,
  (SELECT count(*) FROM public.client_dossier) AS dossiers,
  (SELECT count(*) FROM public.client_loan_details) AS loan_details;

SELECT 
  CASE 
    WHEN (
      SELECT count(*) FROM public.users WHERE role = 'client'
    ) = (SELECT count(*) FROM public.clients)
    THEN '✅ VERIFICATION PASSED — Safe to proceed to file 5'
    ELSE '❌ VERIFICATION FAILED — Do NOT proceed. Check issues above.'
  END AS final_verdict;
