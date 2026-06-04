/**
 * api/kyc-admin-faces.ts
 * Admin-only endpoint to manage Rekognition face collection.
 * DELETE /api/kyc-admin-faces?clientId=xxx  — removes faces for a client
 * GET    /api/kyc-admin-faces?clientId=xxx  — lists faces for a client
 */
export const config = { runtime: "nodejs" };

import { createHmac, createHash } from "crypto";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getEnv = (k: string) => (globalThis as any).process?.env?.[k] ?? "";
const COLLECTION_ID = "ficium-kyc-faces";
const REGION        = "ap-south-1";

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
}
function hashHex(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}
function signingKey(secret: string, date: string, region: string, service: string): Buffer {
  return hmac(hmac(hmac(hmac("AWS4" + secret, date), region), service), "aws4_request");
}

async function awsPost(target: string, body: object): Promise<unknown> {
  const accessKey = getEnv("AWS_ACCESS_KEY_ID");
  const secretKey = getEnv("AWS_SECRET_ACCESS_KEY");
  const now       = new Date();
  const amzDate   = now.toISOString().replace(/[:\-]|\.\d{3}/g, "").slice(0, 15) + "Z";
  const dateStamp = amzDate.slice(0, 8);
  const host      = `rekognition.${REGION}.amazonaws.com`;
  const bodyStr   = JSON.stringify(body);
  const bodyHash  = hashHex(bodyStr);
  const ch        = `content-type:application/x-amz-json-1.1\nhost:${host}\nx-amz-date:${amzDate}\nx-amz-target:${target}\n`;
  const sh        = "content-type;host;x-amz-date;x-amz-target";
  const cr        = ["POST", "/", "", ch, sh, bodyHash].join("\n");
  const cs        = `${dateStamp}/${REGION}/rekognition/aws4_request`;
  const sts       = ["AWS4-HMAC-SHA256", amzDate, cs, hashHex(cr)].join("\n");
  const sig       = hmac(signingKey(secretKey, dateStamp, REGION, "rekognition"), sts).toString("hex");
  const auth      = `AWS4-HMAC-SHA256 Credential=${accessKey}/${cs}, SignedHeaders=${sh}, Signature=${sig}`;
  const res = await fetch(`https://${host}/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-amz-json-1.1", "X-Amz-Date": amzDate, "X-Amz-Target": target, "Authorization": auth },
    body: bodyStr,
  });
  if (!res.ok) throw new Error(`AWS ${res.status}: ${await res.text()}`);
  return res.json();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  // Simple admin check — require a secret header
  const adminSecret = getEnv("ADMIN_SECRET") || getEnv("VITE_ADMIN_SECRET");
  const provided    = req.headers["x-admin-secret"] ?? req.query?.secret;
  if (!adminSecret || provided !== adminSecret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const clientId = req.query?.clientId as string;
  if (!clientId) return res.status(400).json({ error: "clientId required" });

  try {
    // List all faces for this client (stored with ExternalImageId = clientId)
    const listResult = await awsPost("RekognitionService.ListFaces", {
      CollectionId: COLLECTION_ID,
      MaxResults:   20,
    }) as { Faces?: Array<{ FaceId: string; ExternalImageId?: string }> };

    const clientFaces = (listResult.Faces ?? [])
      .filter(f => f.ExternalImageId === clientId)
      .map(f => f.FaceId);

    if (req.method === "GET") {
      return res.status(200).json({ clientId, faceCount: clientFaces.length, faceIds: clientFaces });
    }

    if (req.method === "DELETE") {
      if (clientFaces.length === 0) {
        return res.status(200).json({ clientId, deleted: 0, message: "No faces found for this client" });
      }
      await awsPost("RekognitionService.DeleteFaces", {
        CollectionId: COLLECTION_ID,
        FaceIds:      clientFaces,
      });
      return res.status(200).json({ clientId, deleted: clientFaces.length, faceIds: clientFaces });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
}
