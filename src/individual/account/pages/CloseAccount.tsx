/**
 * Close account (Apple requires in-app account deletion).
 *
 * What happens is decided and enforced on the server (api/account.ts and
 * public.close_account); this page explains it plainly, asks for the password
 * again and, in the phone app, Face ID / fingerprint as well.
 */
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { supabase } from "@/shared/lib/supabase";
import { PageShell, Button, Field, Input } from "@/shared/ui";
import { confirmSensitiveAction } from "@/shared/platform";
import { closeAccount, getClosureStatus, reauthenticate } from "../api/account";

export default function CloseAccount() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const status = useQuery({ queryKey: ["account", "closure-status"], queryFn: getClosureStatus });

  const [password, setPassword] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const years = status.data?.retentionYears ?? null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user?.email || busy) return;
    setError(null);
    setBusy(true);
    try {
      if (!(await confirmSensitiveAction("Confirm closing your Ficium account"))) {
        setError("Not confirmed. Your account is still open.");
        return;
      }
      if (!(await reauthenticate(user.email, password))) {
        setError("That password isn't right. Your account is still open.");
        return;
      }
      const result = await closeAccount();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      // The server has already ended every session; clear this device too.
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
      navigate("/login", { replace: true, state: { accountClosed: true } });
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell>
      <div className="max-w-[560px] mx-auto px-4 sm:px-6 py-8">
        <Link to="/profile" className="inline-flex items-center gap-1.5 text-[13px] text-muted no-underline hover:text-ink mb-6">
          <ArrowLeft size={14} aria-hidden /> Profile
        </Link>

        <h1 className="font-display text-2xl font-bold text-ink mb-2">Close your account</h1>

        {status.isLoading && <p className="text-muted text-[14px]">Loading…</p>}

        {status.isError && (
          <p role="alert" className="text-[14px] text-red-700">
            We couldn't load this page. Check your connection and try again.
          </p>
        )}

        {status.data && !status.data.closureAvailable && (
          <p className="text-[14px] text-muted leading-relaxed">
            Closing your account in the app isn't available yet. To close it now, contact Ficium
            support and we'll do it for you.
          </p>
        )}

        {status.data?.closureAvailable && (
          <>
            <div className="space-y-3 text-[14px] text-ink leading-relaxed mb-8">
              <p>If you close your account:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>You're signed out on every device and can't sign in again.</li>
                <li>Requests still waiting for offers are withdrawn, and the banks are told.</li>
                <li>Your advisor chats, money tracker and alerts are deleted straight away.</li>
                <li>
                  By law we must keep your identity checks, requests and the offers you received
                  for {years} years. After that they're erased.
                </li>
                <li>
                  An offer you've already accepted is between you and that bank. Contact the bank
                  about it directly.
                </li>
              </ul>
              <p className="font-semibold">This can't be undone.</p>
            </div>

            <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
              <Field label="Your password" htmlFor="close-password">
                <Input
                  id="close-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Field>

              <label className="flex items-start gap-3 text-[14px] text-ink">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-red-600"
                  checked={understood}
                  onChange={(e) => setUnderstood(e.target.checked)}
                />
                I understand my account will be closed permanently.
              </label>

              {error && (
                <div role="alert" className="px-4 py-3 rounded-xl border bg-red-50 border-red-200 text-red-800 text-[14px]">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                variant="danger"
                fullWidth
                loading={busy}
                disabled={!understood || password.length === 0}
              >
                Close my account
              </Button>
            </form>
          </>
        )}
      </div>
    </PageShell>
  );
}
