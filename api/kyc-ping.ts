export const config = { runtime: "nodejs" };

import { createHmac, createHash } from "crypto";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getEnv = (k: string) => (globalThis as any).process?.env?.[k] ?? "";

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
}
function hashHex(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}
function getSigningKey(secret: string, date: string, region: string, service: string): Buffer {
  return hmac(hmac(hmac(hmac("AWS4" + secret, date), region), service), "aws4_request");
}

async function testRekognition(): Promise<{ ok: boolean; error?: string; ms: number }> {
  const accessKey = getEnv("AWS_ACCESS_KEY_ID");
  const secretKey = getEnv("AWS_SECRET_ACCESS_KEY");
  const region = "ap-south-1";
  const t0 = Date.now();

  // Minimal 1x1 white JPEG base64
  const tinyJpeg = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k=";

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, "").slice(0, 15) + "Z";
  const dateStamp = amzDate.slice(0, 8);
  const host = `rekognition.${region}.amazonaws.com`;
  const target = "RekognitionService.DetectFaces";
  const body = JSON.stringify({ Image: { Bytes: tinyJpeg }, Attributes: ["DEFAULT"] });
  const bodyHash = hashHex(body);
  const ch = `content-type:application/x-amz-json-1.1\nhost:${host}\nx-amz-date:${amzDate}\nx-amz-target:${target}\n`;
  const sh = "content-type;host;x-amz-date;x-amz-target";
  const cr = ["POST", "/", "", ch, sh, bodyHash].join("\n");
  const cs = `${dateStamp}/${region}/rekognition/aws4_request`;
  const sts = ["AWS4-HMAC-SHA256", amzDate, cs, hashHex(cr)].join("\n");
  const sig = hmac(getSigningKey(secretKey, dateStamp, region, "rekognition"), sts).toString("hex");
  const auth = `AWS4-HMAC-SHA256 Credential=${accessKey}/${cs}, SignedHeaders=${sh}, Signature=${sig}`;

  try {
    const res = await fetch(`https://${host}/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-amz-json-1.1", "X-Amz-Date": amzDate, "X-Amz-Target": target, "Authorization": auth },
      body,
    });
    const ms = Date.now() - t0;
    const text = await res.text();
    if (res.ok) return { ok: true, ms };
    return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 300)}`, ms };
  } catch (err) {
    return { ok: false, error: String(err), ms: Date.now() - t0 };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method === "GET") {
    // Test AWS Rekognition directly
    const result = await testRekognition();
    return res.status(200).json({ rekognition: result });
  }
  // Echo body for POST tests
  const body = req.body;
  return res.status(200).json({
    method: req.method,
    bodyType: typeof body,
    bodyKeys: body && typeof body === "object" ? Object.keys(body) : [],
    bodyLength: typeof body === "string" ? body.length : JSON.stringify(body ?? "").length,
    contentType: req.headers["content-type"] ?? "none",
  });
}
