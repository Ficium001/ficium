import { useEffect } from "react";

/**
 * Sends the visitor to the Ficium Portal (separate app for institutions).
 * Institution registration, login, and onboarding all live in ficium-portal
 * now — the consumer app only points the way.
 *
 * Set VITE_PORTAL_URL in the environment, e.g.
 *   VITE_PORTAL_URL=https://ficium-portal.vercel.app
 */
export default function PortalRedirect({ to = "" }: { to?: string }) {
  const base = import.meta.env.VITE_PORTAL_URL ?? "https://ficium-portal.vercel.app";

  useEffect(() => {
    window.location.replace(`${base}${to}`);
  }, [base, to]);

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="w-8 h-8 rounded-full border-2 border-ficium border-t-transparent animate-spin" />
      <p className="text-ink/70 text-sm">Taking you to the Ficium institution portal…</p>
      <a href={`${base}${to}`} className="text-ficium text-sm font-semibold underline">
        Continue if you're not redirected
      </a>
    </div>
  );
}