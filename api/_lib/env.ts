/**
 * api/_lib/env.ts
 * ─────────────────────────────────────────────────────────────
 * Centralised environment variable access for all API routes.
 * One place to change, one place to audit.
 * Works in both Node.js (Vercel serverless) and Edge runtimes.
 */

function getEnv(key: string): string {
  // Node.js runtime (Vercel serverless / local)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodeVal = (globalThis as any).process?.env?.[key];
  if (nodeVal) return nodeVal;
  // Edge runtime (Vercel Edge Functions)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const edgeVal = (globalThis as any)[key];
  if (edgeVal) return edgeVal;
  return "";
}

export const Env = {
  anthropicApiKey:    () => getEnv("ANTHROPIC_API_KEY"),
  supabaseUrl:        () => getEnv("VITE_SUPABASE_URL") || getEnv("SUPABASE_URL"),
  supabaseServiceKey: () => getEnv("SUPABASE_SERVICE_ROLE_KEY"),
  resendApiKey:       () => getEnv("RESEND_API_KEY"),
  awsAccessKeyId:     () => getEnv("VITE_AWS_ACCESS_KEY_ID")     || getEnv("AWS_ACCESS_KEY_ID"),
  awsSecretAccessKey: () => getEnv("VITE_AWS_SECRET_ACCESS_KEY") || getEnv("AWS_SECRET_ACCESS_KEY"),
  isProduction:       () => getEnv("NODE_ENV") === "production",
} as const;

/** Throws at startup if a required var is missing — fail fast, fail loud */
export function requireEnv(...keys: Array<keyof typeof Env>): void {
  const missing = keys.filter((k) => !Env[k]());
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
}
