/**
 * api/kyc-debug.ts  — GET /api/kyc-debug
 *
 * Diagnostic endpoint: checks env vars and AWS connectivity.
 * DELETE THIS FILE once the issue is resolved.
 */
export const config = { runtime: "nodejs" };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getEnv = (k: string) => (globalThis as any).process?.env?.[k] ?? "";

import { createHmac, createHash } from "crypto";

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
}
function hashHex(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}
function getSigningKey(secret: string, date: string, region: string, service: string): Buffer {
  return hmac(hmac(hmac(hmac("AWS4" + secret, date), region), service), "aws4_request");
}

async function testAws(region: string): Promise<{ ok: boolean; error?: string; ms: number }> {
  const accessKey = getEnv("AWS_ACCESS_KEY_ID")     || getEnv("VITE_AWS_ACCESS_KEY_ID");
  const secretKey = getEnv("AWS_SECRET_ACCESS_KEY") || getEnv("VITE_AWS_SECRET_ACCESS_KEY");
  if (!accessKey || !secretKey) return { ok: false, error: "Missing AWS credentials", ms: 0 };

  const t0      = Date.now();
  const now     = new Date();
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, "").slice(0, 15) + "Z";
  const dateStamp = amzDate.slice(0, 8);
  const host    = `rekognition.${region}.amazonaws.com`;
  const body    = JSON.stringify({ CollectionId: "ficium-kyc-faces" });
  const bodyHash = hashHex(body);
  const target  = "RekognitionService.DescribeCollection";
  const ch      = `content-type:application/x-amz-json-1.1\nhost:${host}\nx-amz-date:${amzDate}\nx-amz-target:${target}\n`;
  const sh      = "content-type;host;x-amz-date;x-amz-target";
  const cr      = ["POST", "/", "", ch, sh, bodyHash].join("\n");
  const cs      = `${dateStamp}/${region}/rekognition/aws4_request`;
  const sts     = ["AWS4-HMAC-SHA256", amzDate, cs, hashHex(cr)].join("\n");
  const sig     = hmac(getSigningKey(secretKey, dateStamp, region, "rekognition"), sts).toString("hex");
  const auth    = `AWS4-HMAC-SHA256 Credential=${accessKey}/${cs}, SignedHeaders=${sh}, Signature=${sig}`;

  try {
    const res = await fetch(`https://${host}/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-amz-json-1.1", "X-Amz-Date": amzDate, "X-Amz-Target": target, "Authorization": auth },
      body,
    });
    const ms = Date.now() - t0;
    if (res.ok) return { ok: true, ms };
    const text = await res.text();
    return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}`, ms };
  } catch (err) {
    return { ok: false, error: String(err), ms: Date.now() - t0 };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(_req: any, res: any) {
  const accessKey = getEnv("AWS_ACCESS_KEY_ID")     || getEnv("VITE_AWS_ACCESS_KEY_ID");
  const secretKey = getEnv("AWS_SECRET_ACCESS_KEY") || getEnv("VITE_AWS_SECRET_ACCESS_KEY");
  const supabaseUrl = getEnv("VITE_SUPABASE_URL")   || getEnv("SUPABASE_URL");
  const supabaseSrk = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  const anthropicKey = getEnv("ANTHROPIC_API_KEY");

  const awsTest = await testAws("ap-south-1");

  return res.status(200).json({
    env: {
      AWS_ACCESS_KEY_ID:      accessKey ? `✓ set (${accessKey.slice(0,8)}…)` : "✗ MISSING",
      AWS_SECRET_ACCESS_KEY:  secretKey ? "✓ set" : "✗ MISSING",
      SUPABASE_URL:           supabaseUrl ? `✓ set (${supabaseUrl.slice(0, 30)}…)` : "✗ MISSING",
      SUPABASE_SERVICE_ROLE:  supabaseSrk ? "✓ set" : "✗ MISSING",
      ANTHROPIC_API_KEY:      anthropicKey ? "✓ set" : "✗ MISSING",
    },
    aws: awsTest,
    node: process.version,
    region: process.env.VERCEL_REGION ?? "unknown",
  });
}
