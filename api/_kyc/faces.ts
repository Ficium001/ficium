/**
 * api/kyc-faces.ts
 * POST /api/kyc-faces
 *
 * Manages the Rekognition face collection for cross-user duplicate detection.
 * Actions:
 *   - search: check if a face already exists in the collection
 *   - index:  add a verified face to the collection
 *   - create: initialise the collection (run once)
 */

import { createHmac, createHash } from "crypto";


// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getEnv = (k: string) => (globalThis as any).process?.env?.[k] ?? "";

const AWS_REGION    = "ap-south-1";
const COLLECTION_ID = "ficium-kyc-faces";

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
}
function hashHex(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}
function getSigningKey(secret: string, date: string, region: string, service: string): Buffer {
  return hmac(hmac(hmac(hmac("AWS4" + secret, date), region), service), "aws4_request");
}

async function awsPost(target: string, body: object): Promise<unknown> {
  const accessKey = getEnv("AWS_ACCESS_KEY_ID")     || getEnv("VITE_AWS_ACCESS_KEY_ID");
  const secretKey = getEnv("AWS_SECRET_ACCESS_KEY") || getEnv("VITE_AWS_SECRET_ACCESS_KEY");
  const now       = new Date();
  const amzDate   = now.toISOString().replace(/[:-]|\.\d{3}/g, "").slice(0, 15) + "Z";
  const dateStamp = amzDate.slice(0, 8);
  const host      = `rekognition.${AWS_REGION}.amazonaws.com`;
  const bodyStr   = JSON.stringify(body);
  const bodyHash  = hashHex(bodyStr);
  const canonicalHeaders =
    `content-type:application/x-amz-json-1.1\nhost:${host}\nx-amz-date:${amzDate}\nx-amz-target:${target}\n`;
  const signedHeaders    = "content-type;host;x-amz-date;x-amz-target";
  const canonicalRequest = ["POST", "/", "", canonicalHeaders, signedHeaders, bodyHash].join("\n");
  const credentialScope  = `${dateStamp}/${AWS_REGION}/rekognition/aws4_request`;
  const stringToSign     = ["AWS4-HMAC-SHA256", amzDate, credentialScope, hashHex(canonicalRequest)].join("\n");
  const signature        = hmac(getSigningKey(secretKey, dateStamp, AWS_REGION, "rekognition"), stringToSign).toString("hex");
  const authHeader       = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const res = await fetch(`https://${host}/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-amz-json-1.1", "X-Amz-Date": amzDate, "X-Amz-Target": target, "Authorization": authHeader },
    body: bodyStr,
  });
  if (!res.ok) { const text = await res.text(); throw new Error(`AWS rekognition ${target} ${res.status}: ${text}`); }
  return res.json();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function facesHandler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { action, imageB64, clientId } = req.body as {
    action:    "create" | "search" | "index";
    imageB64?: string;
    clientId?: string;
  };

  try {
    if (action === "create") {
      // Initialise collection — call once
      await awsPost("RekognitionService.CreateCollection", { CollectionId: COLLECTION_ID });
      return res.status(200).json({ ok: true, message: "Collection created" });

    } else if (action === "search") {
      if (!imageB64) return res.status(400).json({ error: "imageB64 required" });

      const data = await awsPost("RekognitionService.SearchFacesByImage", {
        CollectionId:        COLLECTION_ID,
        Image:               { Bytes: imageB64 },
        MaxFaces:            5,
        FaceMatchThreshold:  90,
      }) as { FaceMatches?: Array<{ Face: { ExternalImageId: string }; Similarity: number }> };

      const matches = (data.FaceMatches ?? []).filter(m => m.Face.ExternalImageId !== clientId);

      return res.status(200).json({
        duplicate:  matches.length > 0,
        matches:    matches.map(m => ({
          clientId:   m.Face.ExternalImageId,
          similarity: m.Similarity,
        })),
      });

    } else if (action === "index") {
      if (!imageB64 || !clientId) return res.status(400).json({ error: "imageB64 and clientId required" });

      await awsPost("RekognitionService.IndexFaces", {
        CollectionId:    COLLECTION_ID,
        Image:           { Bytes: imageB64 },
        ExternalImageId: clientId,   // store clientId so we can identify who it is
        MaxFaces:        1,
        QualityFilter:   "AUTO",
        DetectionAttributes: [],
      });

      return res.status(200).json({ ok: true });

    } else {
      return res.status(400).json({ error: "action must be create | search | index" });
    }
  } catch (err: unknown) {
    // Collection already exists — not an error
    if (action === "create" && String(err).includes("ResourceAlreadyExistsException")) {
      return res.status(200).json({ ok: true, message: "Collection already exists" });
    }
    // Collection doesn't exist yet for search — not a duplicate
    if (action === "search" && String(err).includes("ResourceNotFoundException")) {
      return res.status(200).json({ duplicate: false, matches: [] });
    }
    console.error("[kyc-faces]", err);
    return res.status(500).json({ error: String(err) });
  }
}
