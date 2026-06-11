/**
 * api/_lib/aws.ts
 * ─────────────────────────────────────────────────────────────
 * AWS Signature v4 helper shared by KYC serverless functions.
 * Keeps the Rekognition credential-signing logic in one place.
 */
import { createHmac, createHash } from "crypto";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getEnv = (k: string): string => (globalThis as any).process?.env?.[k] ?? "";

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
}
function hashHex(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}
function signingKey(secret: string, date: string, region: string, service: string): Buffer {
  return hmac(hmac(hmac(hmac("AWS4" + secret, date), region), service), "aws4_request");
}

/** Generic Sig v4 POST to any AWS service. */
export async function awsPost(
  service: string,
  target: string,
  body: object,
  region = "ap-south-1",
): Promise<unknown> {
  const accessKey = getEnv("AWS_ACCESS_KEY_ID")     || getEnv("VITE_AWS_ACCESS_KEY_ID");
  const secretKey = getEnv("AWS_SECRET_ACCESS_KEY") || getEnv("VITE_AWS_SECRET_ACCESS_KEY");
  const now       = new Date();
  const amzDate   = now.toISOString().replace(/[:\-]|\.\d{3}/g, "").slice(0, 15) + "Z";
  const dateStamp = amzDate.slice(0, 8);
  const host      = `${service}.${region}.amazonaws.com`;
  const bodyStr   = JSON.stringify(body);
  const bodyHash  = hashHex(bodyStr);
  const ch = `content-type:application/x-amz-json-1.1\nhost:${host}\nx-amz-date:${amzDate}\nx-amz-target:${target}\n`;
  const sh = "content-type;host;x-amz-date;x-amz-target";
  const cr = ["POST", "/", "", ch, sh, bodyHash].join("\n");
  const cs = `${dateStamp}/${region}/${service}/aws4_request`;
  const sts = ["AWS4-HMAC-SHA256", amzDate, cs, hashHex(cr)].join("\n");
  const sig = hmac(signingKey(secretKey, dateStamp, region, service), sts).toString("hex");
  const auth = `AWS4-HMAC-SHA256 Credential=${accessKey}/${cs}, SignedHeaders=${sh}, Signature=${sig}`;

  const res = await fetch(`https://${host}/`, {
    method: "POST",
    headers: {
      "Content-Type":    "application/x-amz-json-1.1",
      "X-Amz-Date":      amzDate,
      "X-Amz-Target":    target,
      "Authorization":   auth,
    },
    body: bodyStr,
  });
  if (!res.ok) throw new Error(`AWS ${service} ${target} ${res.status}: ${await res.text()}`);
  return res.json();
}

/** Convenience wrapper for Rekognition (service = "rekognition"). */
export const rekognition = (target: string, body: object) =>
  awsPost("rekognition", target, body);
