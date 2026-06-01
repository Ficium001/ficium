-- ══════════════════════════════════════════════════════════════════════════════
-- FICIUM V2 MIGRATION — FILE 1: PRE-MIGRATION BACKUP
-- Run this FIRST before any other migration file
-- Creates snapshot tables so you can restore if anything goes wrong
-- ══════════════════════════════════════════════════════════════════════════════

-- Create backup schema
CREATE SCHEMA IF NOT EXISTS backup_v1;

-- ── public schema backups ─────────────────────────────────────────────────────
CREATE TABLE backup_v1.users                AS SELECT * FROM public.users;
CREATE TABLE backup_v1.requests             AS SELECT * FROM public.requests;
CREATE TABLE backup_v1.client_requests      AS SELECT * FROM public.client_requests;
CREATE TABLE backup_v1.bid_acceptances      AS SELECT * FROM public.bid_acceptances;
CREATE TABLE backup_v1.bids                 AS SELECT * FROM public.bids;
CREATE TABLE backup_v1.notifications        AS SELECT * FROM public.notifications;
CREATE TABLE backup_v1.client_dossiers      AS SELECT * FROM public.client_dossiers;
CREATE TABLE backup_v1.financial_profiles   AS SELECT * FROM public.financial_profiles;
CREATE TABLE backup_v1.asset_details        AS SELECT * FROM public.asset_details;
CREATE TABLE backup_v1.loan_details         AS SELECT * FROM public.loan_details;
CREATE TABLE backup_v1.employment_details   AS SELECT * FROM public.employment_details;
CREATE TABLE backup_v1.compliance_details   AS SELECT * FROM public.compliance_details;
CREATE TABLE backup_v1.bank_profiles        AS SELECT * FROM public.bank_profiles;

-- ── institution schema backups ────────────────────────────────────────────────
CREATE TABLE backup_v1.institutions              AS SELECT * FROM institution.institutions;
CREATE TABLE backup_v1.institution_users         AS SELECT * FROM institution.institution_users;
CREATE TABLE backup_v1.institution_bids          AS SELECT * FROM institution.institution_bids;
CREATE TABLE backup_v1.pending_actions           AS SELECT * FROM institution.pending_actions;
CREATE TABLE backup_v1.audit_events              AS SELECT * FROM institution.audit_events;
CREATE TABLE backup_v1.products                  AS SELECT * FROM institution.products;
CREATE TABLE backup_v1.product_families          AS SELECT * FROM institution.product_families;
CREATE TABLE backup_v1.product_rate_config       AS SELECT * FROM institution.product_rate_config;
CREATE TABLE backup_v1.product_documents         AS SELECT * FROM institution.product_documents;
CREATE TABLE backup_v1.product_eligibility       AS SELECT * FROM institution.product_eligibility;
CREATE TABLE backup_v1.product_parameters        AS SELECT * FROM institution.product_parameters;
CREATE TABLE backup_v1.product_sla_defaults      AS SELECT * FROM institution.product_sla_defaults;
CREATE TABLE backup_v1.institution_product_config AS SELECT * FROM institution.institution_product_config;
CREATE TABLE backup_v1.institution_sla_config    AS SELECT * FROM institution.institution_sla_config;
CREATE TABLE backup_v1.institution_webhooks      AS SELECT * FROM institution.institution_webhooks;
CREATE TABLE backup_v1.webhook_events            AS SELECT * FROM institution.webhook_events;
CREATE TABLE backup_v1.institution_api_keys      AS SELECT * FROM institution.institution_api_keys;

-- ── admin schema backups ──────────────────────────────────────────────────────
CREATE TABLE backup_v1.admin_users       AS SELECT * FROM admin.admin_users;
CREATE TABLE backup_v1.platform_config   AS SELECT * FROM admin.platform_config;

-- ── Verify backup counts ──────────────────────────────────────────────────────
SELECT 
  schemaname,
  tablename,
  (SELECT count(*) FROM backup_v1.users)                    AS users,
  (SELECT count(*) FROM backup_v1.requests)                 AS requests,
  (SELECT count(*) FROM backup_v1.institutions)             AS institutions,
  (SELECT count(*) FROM backup_v1.institution_users)        AS inst_users,
  (SELECT count(*) FROM backup_v1.institution_bids)         AS inst_bids,
  (SELECT count(*) FROM backup_v1.products)                 AS products
FROM pg_tables
WHERE schemaname = 'backup_v1'
LIMIT 1;

SELECT 'Backup complete — ' || count(*) || ' tables snapshotted in backup_v1 schema' AS status
FROM pg_tables WHERE schemaname = 'backup_v1';
