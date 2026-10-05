-- Applied to the App DB AFTER the portal receiver (ficium-portal-api#59) was deployed. This is what starts the events.
-- The publisher functions never raise (see integration_requests_v1.sql), so a fault cannot block a borrower's request.
DROP TRIGGER IF EXISTS integration_request_events ON public.requests;
CREATE TRIGGER integration_request_events AFTER INSERT OR UPDATE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION integration.trg_requests_emit();
DROP TRIGGER IF EXISTS integration_allocation_events ON public.request_allocations;
CREATE TRIGGER integration_allocation_events AFTER INSERT OR UPDATE OR DELETE ON public.request_allocations
  FOR EACH ROW EXECUTE FUNCTION integration.trg_allocations_emit();
-- then, once:  SELECT integration.backfill_request_events();
