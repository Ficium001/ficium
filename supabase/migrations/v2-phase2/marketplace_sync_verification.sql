-- =============================================================================
-- Marketplace sync verification helpers (APP DB — wixfhjlsjkiwfvqewvmt)
-- Read-only diagnostics over pg_net to confirm the sync is firing and landing.
--   SELECT * FROM marketplace_sync.health();        -- one-line status
--   SELECT * FROM marketplace_sync.recent_calls;    -- last 50 calls + outcomes
-- =============================================================================

CREATE OR REPLACE VIEW marketplace_sync.recent_calls AS
SELECT
  r.id, q.url, r.status_code,
  CASE
    WHEN r.timed_out             THEN 'TIMED_OUT'
    WHEN r.error_msg IS NOT NULL THEN 'ERROR'
    WHEN r.status_code = 200     THEN 'OK'
    WHEN r.status_code = 403     THEN 'AUTH_FAILED (check app_service_secret)'
    WHEN r.status_code = 503     THEN 'PORTAL_UNAVAILABLE'
    WHEN r.status_code IS NULL   THEN 'PENDING'
    ELSE 'HTTP_' || r.status_code::text
  END AS outcome,
  r.error_msg, LEFT(r.content, 300) AS response_preview, r.created
FROM net._http_response r
LEFT JOIN net.http_request_queue q ON q.id = r.id
WHERE q.url LIKE '%/marketplace/sync-requests' OR q.url IS NULL
ORDER BY r.created DESC
LIMIT 50;

CREATE OR REPLACE FUNCTION marketplace_sync.health()
RETURNS TABLE(last_call timestamptz, last_status int, last_outcome text,
              ok_last_hour bigint, failed_last_hour bigint, vault_configured boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = marketplace_sync, net, vault AS $$
  SELECT
    (SELECT max(created) FROM net._http_response r JOIN net.http_request_queue q ON q.id=r.id WHERE q.url LIKE '%/marketplace/sync-requests'),
    (SELECT status_code FROM net._http_response r JOIN net.http_request_queue q ON q.id=r.id WHERE q.url LIKE '%/marketplace/sync-requests' ORDER BY r.created DESC LIMIT 1),
    (SELECT CASE WHEN status_code=200 THEN 'OK' WHEN status_code=403 THEN 'AUTH_FAILED' WHEN status_code=503 THEN 'PORTAL_UNAVAILABLE' WHEN timed_out THEN 'TIMED_OUT' WHEN error_msg IS NOT NULL THEN 'ERROR' ELSE 'HTTP_'||status_code::text END
       FROM net._http_response r JOIN net.http_request_queue q ON q.id=r.id WHERE q.url LIKE '%/marketplace/sync-requests' ORDER BY r.created DESC LIMIT 1),
    (SELECT count(*) FROM net._http_response r JOIN net.http_request_queue q ON q.id=r.id WHERE q.url LIKE '%/marketplace/sync-requests' AND r.status_code=200 AND r.created > now()-interval '1 hour'),
    (SELECT count(*) FROM net._http_response r JOIN net.http_request_queue q ON q.id=r.id WHERE q.url LIKE '%/marketplace/sync-requests' AND (r.status_code <> 200 OR r.status_code IS NULL OR r.timed_out OR r.error_msg IS NOT NULL) AND r.created > now()-interval '1 hour'),
    (SELECT count(*)=2 FROM vault.decrypted_secrets WHERE name IN ('portal_api_url','app_service_secret'));
$$;
REVOKE ALL ON FUNCTION marketplace_sync.health() FROM PUBLIC;
