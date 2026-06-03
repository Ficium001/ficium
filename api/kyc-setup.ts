/**
 * api/kyc-setup.ts
 * POST /api/kyc-setup
 *
 * One-time setup endpoint — creates the Rekognition face collection.
 * Call once after deployment. Protected by a setup secret.
 */

import { createHmac, createHash } from "crypto";

export const config = { runtime: "nodejs" };

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
  const amzDate   = now.toISOString().replace(/[:\-]|\.\d{3}/g, "").slice(0, 15) + "Z";
  const dateStamp = amzDate.slice(0, 8);
  const host      = `rekognition.${AWS_REGION}.amazonaws.com`;
  const bodyStr   = JSON.stringify(body);
  const bodyHash  = hashHex(bodyStr);
  const ch        = `content-type:application/x-amz-json-1.1\nhost:${host}\nx-amz-date:${amzDate}\nx-amz-target:${target}\n`;
  const sh        = "content-type;host;x-amz-date;x-amz-target";
  const cr        = ["POST", "/", "", ch, sh, bodyHash].join("\n");
  const cs        = `${dateStamp}/${AWS_REGION}/rekognition/aws4_request`;
  const sts       = ["AWS4-HMAC-SHA256", amzDate, cs, hashHex(cr)].join("\n");
  const sig       = hmac(getSigningKey(secretKey, dateStamp, AWS_REGION, "rekognition"), sts).toString("hex");
  const auth      = `AWS4-HMAC-SHA256 Credential=${accessKey}/${cs}, SignedHeaders=${sh}, Signature=${sig}`;
  const res = await fetch(`https://${host}/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-amz-json-1.1", "X-Amz-Date": amzDate, "X-Amz-Target": target, "Authorization": auth },
    body: bodyStr,
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`${target} ${res.status}: ${t}`); }
  return res.json();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const secret = getEnv("KYC_SETUP_SECRET");
  if (secret && req.headers["x-setup-secret"] !== secret)
    return res.status(401).json({ error: "Unauthorized" });

  try {
    await awsPost("RekognitionService.CreateCollection", { CollectionId: COLLECTION_ID });
    return res.status(200).json({ ok: true, message: `Collection '${COLLECTION_ID}' created in ${AWS_REGION}` });
  } catch (err) {
    if (String(err).includes("ResourceAlreadyExistsException"))
      return res.status(200).json({ ok: true, message: "Collection already exists" });
    return res.status(500).json({ error: String(err) });
  }
}
