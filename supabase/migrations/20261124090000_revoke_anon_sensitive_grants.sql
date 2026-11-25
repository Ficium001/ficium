-- The anon role (a visitor who is not signed in) held table privileges it never needs on
-- client-owned tables: SELECT/INSERT/UPDATE/DELETE on requests, notifications, bid_acceptances,
-- kyc_settings and the finance tables. RLS already refuses anon on every one of them (each policy
-- needs auth.uid() or an admin/service check), so nothing reads or writes through these grants
-- today. They are removed so a future policy mistake cannot turn into an anonymous data leak.
--
-- Left as is, on purpose: anon SELECT on public reference data the signed-out app shows
-- (app_features, app_release_policy, market_*), and finance.holding_prices.
--
-- Audit: Ficium database audit, 2026-11-24.

BEGIN;

REVOKE ALL ON TABLE
  public.requests,
  public.notifications,
  public.bid_acceptances,
  public.kyc_settings,
  finance.accounts,
  finance.holdings,
  finance.net_worth_history
FROM anon;

SELECT admin.migration_applied('20261124090000_revoke_anon_sensitive_grants');

COMMIT;
