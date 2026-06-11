/**
 * api/kyc-biometric.ts
 * ─────────────────────────────────────────────────────────────
 * User-facing biometric operations (Rekognition + Liveness).
 * Routes by ?action= query param. Requires authenticated user.
 *
 * POST /api/kyc-biometric?action=faces.search   — duplicate face check
 * POST /api/kyc-biometric?action=faces.index    — index a verified face
 * POST /api/kyc-biometric?action=liveness.create — create liveness session
 * POST /api/kyc-biometric?action=liveness.result — get liveness session result
 * POST /api/kyc-biometric?action=setup           — create Rekognition collection
 *                                                  (requireService — one-time only)
 *
 * Merged from: kyc-faces.ts, kyc-liveness.ts, kyc-setup.ts
 */

export const config = { runtime: "nodejs" };

import { requireUser, requireOwnership, requireService, asAuthError } from "./_lib/auth";
import { rekognition, awsPost } from "./_lib/aws";

const COLLECTION_ID = "ficium-kyc-faces";

// ── Action handlers ───────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleFaces(req: any, res: any, userId: string): Promise<void> {
  const { action, imageB64, clientId } = req.body as {
    action:    "faces.search" | "faces.index";
    imageB64?: string;
    clientId?: string;
  };

  // IDOR guard — clientId must be the caller's own id.
  if (clientId) {
    try { requireOwnership({ id: userId, email: null, role: null }, clientId); }
    catch (e) {
      const ae = asAuthError(e);
      if (ae) { res.status(ae.status).json({ error: ae.message, code: ae.code }); return; }
      throw e;
    }
  }

  if (action === "faces.search") {
    if (!imageB64) { res.status(400).json({ error: "imageB64 required" }); return; }
    try {
      const data = await rekognition("RekognitionService.SearchFacesByImage", {
        CollectionId: COLLECTION_ID, Image: { Bytes: imageB64 },
        MaxFaces: 5, FaceMatchThreshold: 90,
      }) as { FaceMatches?: Array<{ Face: { ExternalImageId: string }; Similarity: number }> };

      const matches = (data.FaceMatches ?? []).filter(m => m.Face.ExternalImageId !== clientId);
      res.status(200).json({
        duplicate: matches.length > 0,
        matches:   matches.map(m => ({ clientId: m.Face.ExternalImageId, similarity: m.Similarity })),
      });
    } catch (err) {
      if (String(err).includes("ResourceNotFoundException")) {
        res.status(200).json({ duplicate: false, matches: [] }); return;
      }
      throw err;
    }
    return;
  }

  if (action === "faces.index") {
    if (!imageB64 || !clientId) {
      res.status(400).json({ error: "imageB64 and clientId required" }); return;
    }
    await rekognition("RekognitionService.IndexFaces", {
      CollectionId:    COLLECTION_ID, Image: { Bytes: imageB64 },
      ExternalImageId: clientId, MaxFaces: 1,
      QualityFilter:   "AUTO", DetectionAttributes: [],
    });
    res.status(200).json({ ok: true });
    return;
  }

  res.status(400).json({ error: "action must be faces.search | faces.index" });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleLiveness(req: any, res: any): Promise<void> {
  const { action, sessionId } = req.body as { action: "liveness.create" | "liveness.result"; sessionId?: string };

  if (action === "liveness.create") {
    const data = await awsPost(
      "rekognition",
      "RekognitionService.CreateFaceLivenessSession",
      { Settings: { AuditImagesLimit: 2 } },
    ) as { SessionId: string };
    res.status(200).json({ sessionId: data.SessionId });
    return;
  }

  if (action === "liveness.result") {
    if (!sessionId) { res.status(400).json({ error: "sessionId required" }); return; }
    const data = await awsPost(
      "rekognition",
      "RekognitionService.GetFaceLivenessSessionResults",
      { SessionId: sessionId },
    ) as { Status: string; Confidence: number; ReferenceImage?: { Bytes?: string } };

    res.status(200).json({
      passed:     data.Status === "SUCCEEDED" && data.Confidence >= 90,
      confidence: data.Confidence,
      status:     data.Status,
      imageB64:   data.ReferenceImage?.Bytes ?? null,
    });
    return;
  }

  res.status(400).json({ error: "action must be liveness.create | liveness.result" });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSetup(req: any, res: any): Promise<void> {
  // Service-only — one-time bootstrap.
  try { requireService(req); }
  catch (e) {
    const ae = asAuthError(e);
    if (ae) { res.status(ae.status).json({ error: ae.message, code: ae.code }); return; }
    throw e;
  }
  try {
    await rekognition("RekognitionService.CreateCollection", { CollectionId: COLLECTION_ID });
    res.status(200).json({ ok: true, message: `Collection '${COLLECTION_ID}' created` });
  } catch (err) {
    if (String(err).includes("ResourceAlreadyExistsException")) {
      res.status(200).json({ ok: true, message: "Collection already exists" }); return;
    }
    throw err;
  }
}

// ── Main handler ──────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  const action = (req.query?.action as string) ?? (req.body?.action as string) ?? "";

  // setup is service-only — handled inside handleSetup with requireService.
  if (action !== "setup") {
    try {
      const user = await requireUser(req);
      // Re-attach userId for IDOR check downstream.
      req._userId = user.id;
    } catch (e) {
      const ae = asAuthError(e);
      if (ae) { res.status(ae.status).json({ error: ae.message, code: ae.code }); return; }
      throw e;
    }
  }

  try {
    if (action.startsWith("faces."))    return void await handleFaces(req, res, req._userId as string);
    if (action.startsWith("liveness.")) return void await handleLiveness(req, res);
    if (action === "setup")             return void await handleSetup(req, res);
    res.status(400).json({ error: "action must be faces.search | faces.index | liveness.create | liveness.result | setup" });
  } catch (err) {
    console.error("[kyc-biometric]", err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
