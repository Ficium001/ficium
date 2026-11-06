/**
 * @module shared/platform/deepLinks
 * Universal links (iOS) / App Links (Android) into the native app.
 *
 * Only https links from the configured public app origin are honoured; the OS
 * verifies domain ownership (apple-app-site-association / assetlinks.json)
 * and this re-checks it, so a custom scheme or a look-alike host can never
 * drive navigation or plant a session.
 *
 * Supabase auth links (password reset) carry tokens in the URL fragment. On
 * web `detectSessionInUrl` consumes them; in the app it is off, so they are
 * exchanged here and stripped before the router ever sees the URL.
 */
import { supabase } from "@/shared/lib/supabase";
import { trustedLinkOrigin } from "./endpoints";

/** The slice of the data router this module needs (keeps it testable). */
export type AppRouter = { navigate(to: string, opts?: { replace?: boolean }): Promise<void> | void };

async function consumeAuthFragment(hash: string): Promise<"ok" | "error" | "none"> {
  if (!hash) return "none";
  const params = new URLSearchParams(hash.slice(1));
  if (params.get("error") || params.get("error_code")) return "error";
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (!access_token || !refresh_token) return "none";
  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  return error ? "error" : "ok";
}

export async function handleDeepLink(rawUrl: string, router: AppRouter): Promise<void> {
  const trusted = trustedLinkOrigin();
  let url: URL;
  try { url = new URL(rawUrl); } catch { return; }
  if (!trusted || url.protocol !== "https:" || url.origin !== trusted) return;

  const auth = await consumeAuthFragment(url.hash);
  if (auth === "error") {
    await router.navigate("/auth/reset-password", { replace: true });
    return;
  }
  // Tokens never reach router state or history.
  const keepHash = auth === "none" && !url.hash.includes("token") ? url.hash : "";
  await router.navigate(`${url.pathname}${url.search}${keepHash}`, { replace: auth === "ok" });
}
