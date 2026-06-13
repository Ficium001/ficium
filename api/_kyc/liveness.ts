/**
 * api/kyc-liveness.ts
 *
 * POST /api/kyc-liveness/session  → create a liveness session
 * POST /api/kyc-liveness/result   → get result of a completed session
 *
 * Uses AWS Rekognition FaceLiveness API.
 * The frontend renders the liveness challenge via @aws-amplify/ui-react-liveness.
 * Server creates the session and validates the result — keys never touch the browser.
 */

import { createHmac, createHash } from "crypto";


// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getEnv = (k: string) => (globalThis as any).process?.env?.[k] ?? "";

const AWS_REGION = "ap-south-1";

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
}
function hashHex(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}
function getSigningKey(secret: string, date: string, region: string, service: string): Buffer {
  return hmac(hmac(hmac(hmac("AWS4" + secret, date), region), service), "aws4_request");
}

async function awsPost(service: string, target: string, body: object): Promise<unknown> {
  const accessKey = getEnv("AWS_ACCESS_KEY_ID")     || getEnv("VITE_AWS_ACCESS_KEY_ID");
  const secretKey = getEnv("AWS_SECRET_ACCESS_KEY") || getEnv("VITE_AWS_SECRET_ACCESS_KEY");
  const now       = new Date();
  const amzDate   = now.toISOString().replace(/[:\-]|\.\d{3}/g, "").slice(0, 15) + "Z";
  const dateStamp = amzDate.slice(0, 8);
  const host      = `${service}.${AWS_REGION}.amazonaws.com`;
  const bodyStr   = JSON.stringify(body);
  const bodyHash  = hashHex(bodyStr);
  const canonicalHeaders =
    `content-type:application/x-amz-json-1.1\nhost:${host}\nx-amz-date:${amzDate}\nx-amz-target:${target}\n`;
  const signedHeaders    = "content-type;host;x-amz-date;x-amz-target";
  const canonicalRequest = ["POST", "/", "", canonicalHeaders, signedHeaders, bodyHash].join("\n");
  const credentialScope  = `${dateStamp}/${AWS_REGION}/${service}/aws4_request`;
  const stringToSign     = ["AWS4-HMAC-SHA256", amzDate, credentialScope, hashHex(canonicalRequest)].join("\n");
  const signature        = hmac(getSigningKey(secretKey, dateStamp, AWS_REGION, service), stringToSign).toString("hex");
  const authHeader       = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const res = await fetch(`https://${host}/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-amz-json-1.1", "X-Amz-Date": amzDate, "X-Amz-Target": target, "Authorization": authHeader },
    body: bodyStr,
  });
  if (!res.ok) { const text = await res.text(); throw new Error(`AWS ${service} ${target} ${res.status}: ${text}`); }
  return res.json();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function livenessHandler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { action, sessionId } = req.body as { action: "create" | "result"; sessionId?: string };

  try {
    if (action === "create") {
      // Create a new FaceLiveness session
      const data = await awsPost(
        "rekognition",
        "RekognitionService.CreateFaceLivenessSession",
        { Settings: { OutputConfig: { S3Bucket: undefined }, AuditImagesLimit: 2 } }
      ) as { SessionId: string };

      return res.status(200).json({ sessionId: data.SessionId });

    } else if (action === "result") {
      if (!sessionId) return res.status(400).json({ error: "sessionId required" });

      const data = await awsPost(
        "rekognition",
        "RekognitionService.GetFaceLivenessSessionResults",
        { SessionId: sessionId }
      ) as {
        Status:           string;
        Confidence:       number;
        ReferenceImage?:  { Bytes?: string };
      };

      const passed    = data.Status === "SUCCEEDED" && data.Confidence >= 90;
      const imageB64  = data.ReferenceImage?.Bytes ?? null;

      return res.status(200).json({
        passed,
        confidence: data.Confidence,
        status:     data.Status,
        imageB64,   // return liveness-captured selfie for face match
      });

    } else {
      return res.status(400).json({ error: "action must be 'create' or 'result'" });
    }
  } catch (err) {
    console.error("[kyc-liveness]", err);
    return res.status(500).json({ error: String(err) });
  }
}
