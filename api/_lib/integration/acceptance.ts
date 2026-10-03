/**
 * Step 5 of the integration contract: the ONE synchronous call (POST /integration/v1/acceptances).
 *
 * The borrower side sends only the identity fields the borrower releases (assembled and audited in the App DB by
 * integration_prepare_acceptance); the portal never reads the borrower database on this path.
 * Retries are safe: an unfinished or failed attempt is re-sent IDENTICALLY with the SAME Idempotency-Key (the
 * consent_ref), so if the portal already accepted and only the reply was lost, it replays its stored answer.
 * Used by api/accept-bid.ts only when INTEGRATION_ACCEPTANCE_ENABLED=true.
 */
import { SIGNATURE_HEADER, sign, validateAcceptanceRequest, validateAcceptanceResponse } from "@ficium/contract";

export interface Prepared {
  anon_borrower_id: string;
  released_identity: Record<string, unknown>;
  consent_ref: string;
}

export type ReleaseOutcome = "accepted" | "refused" | "failed";

export interface AcceptanceDeps {
  prepare(clientId: string, requestId: string, bidId: string): Promise<Prepared>;
  complete(consentRef: string, outcome: ReleaseOutcome, institutionId: string | null): Promise<void>;
  fetchFn: typeof fetch;
  url: string;
  signingKey: string;
}

export interface AcceptanceResult {
  status: number;
  reveal?: Record<string, unknown>;
  error?: string;
}

const msg = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/** The exact flat shape the legacy endpoint returned, so the browser sees no difference. */
export function toLegacyReveal(r: any): Record<string, unknown> {
  return {
    institution_id: r.institution.institution_id,
    institution_name: r.institution.name,
    legal_name: r.institution.legal_name ?? null,
    contact_person: r.institution.contact_person ?? null,
    contact_email: r.institution.contact_email ?? null,
    contact_phone: r.institution.contact_phone ?? null,
    logo_url: r.institution.logo_url ?? null,
    pipeline_id: r.pipeline_id,
    rate: r.deal.rate,
    rate_type: r.deal.rate_type ?? "fixed",
    amount_offered: r.deal.amount,
    term_months: r.deal.term_months,
  };
}

export async function acceptViaContract(
  deps: AcceptanceDeps,
  clientId: string,
  requestId: string,
  bidId: string,
): Promise<AcceptanceResult> {
  let prep: Prepared;
  try {
    prep = await deps.prepare(clientId, requestId, bidId);
  } catch (e) {
    const m = msg(e);
    return { status: /not the request owner/.test(m) ? 403 : /not found/.test(m) ? 404 : 422, error: m };
  }

  const body = {
    bid_id: bidId,
    request_id: requestId,
    anon_borrower_id: prep.anon_borrower_id,
    released_identity: prep.released_identity,
    consent_ref: prep.consent_ref,
  };
  try {
    validateAcceptanceRequest(body);
  } catch (e) {
    await deps.complete(prep.consent_ref, "refused", null);
    return { status: 422, error: `contract: ${msg(e)}` };
  }

  const raw = JSON.stringify(body);
  let res: Response;
  try {
    res = await deps.fetchFn(deps.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [SIGNATURE_HEADER]: sign(raw, deps.signingKey),
        "Idempotency-Key": prep.consent_ref,
      },
      body: raw,
      signal: AbortSignal.timeout(20_000),
    });
  } catch (e) {
    await deps.complete(prep.consent_ref, "failed", null); // retry re-sends the same call
    return { status: 502, error: `portal unreachable: ${msg(e)}` };
  }

  const text = await res.text();
  if (!res.ok) {
    await deps.complete(prep.consent_ref, res.status >= 500 ? "failed" : "refused", null);
    return { status: res.status, error: text.slice(0, 500) };
  }
  let out: any;
  try {
    out = JSON.parse(text);
    validateAcceptanceResponse(out);
  } catch (e) {
    await deps.complete(prep.consent_ref, "failed", null);
    return { status: 502, error: `portal answer outside the contract: ${msg(e)}` };
  }
  await deps.complete(prep.consent_ref, "accepted", out.institution.institution_id);
  return { status: 200, reveal: toLegacyReveal(out) };
}
