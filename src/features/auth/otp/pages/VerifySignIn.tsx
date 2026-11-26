/**
 * Second sign-in step: a one-time code by email, SMS or WhatsApp.
 */
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Mail, MessageSquare, MessageCircle, ShieldCheck, ArrowLeft } from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { FiciumLogo } from "@/shared/ui/FiciumLogo";
import { Button } from "@/shared/ui";
import { sendOtp, verifyOtp, type OtpChannel, type OtpChannelOption, type OtpSent } from "../api/otp";
import { useOtpStatus } from "../hooks/useOtpStatus";

const LABEL: Record<OtpChannel, string> = { email: "Email", sms: "SMS", whatsapp: "WhatsApp" };
const ICON: Record<OtpChannel, typeof Mail> = { email: Mail, sms: MessageSquare, whatsapp: MessageCircle };

function unavailableText(o: OtpChannelOption): string {
  if (o.reason === "no_phone") return "No mobile number on your account";
  if (o.reason === "no_email") return "No email on your account";
  return "Not available yet";
}

export default function VerifySignIn() {
  const { signOut } = useAuth();
  const { data: status, isLoading, error, refetch } = useOtpStatus();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const from = (location.state as { from?: string } | null)?.from ?? "/dashboard";

  const [channel, setChannel] = useState<OtpChannel | null>(null);
  const [sent, setSent] = useState<OtpSent | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const autoSent = useRef(false);
  const codeRef = useRef<HTMLInputElement>(null);

  const available = status?.channels.filter((c) => c.available) ?? [];

  // Default to the channel used last time, else the first one that works.
  useEffect(() => {
    if (!status || channel) return;
    const pref = status.channels.find((c) => c.channel === status.preferred && c.available);
    setChannel(pref?.channel ?? available[0]?.channel ?? null);
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Returning users get their usual channel straight away.
  useEffect(() => {
    if (autoSent.current || !status?.preferred || !status.enforced || status.verified) return;
    if (!status.channels.some((c) => c.channel === status.preferred && c.available)) return;
    autoSent.current = true;
    void send(status.preferred);
  }, [status]);  

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  async function send(ch: OtpChannel) {
    setBusy(true);
    setMessage(null);
    const r = await sendOtp(ch);
    setBusy(false);
    if (!r.ok) {
      setMessage(r.message);
      if (r.code === "OTP_COOLDOWN") setResendIn(30);
      return;
    }
    setSent(r.data);
    setChannel(r.data.channel);
    setCode("");
    setResendIn(r.data.resendIn);
    setTimeout(() => codeRef.current?.focus(), 0);
  }

  async function verify(value: string) {
    if (!sent || value.length !== 6 || busy) return;
    setBusy(true);
    setMessage(null);
    const r = await verifyOtp(sent.challengeId, value);
    if (r.ok) {
      // Anything fetched before verification came back empty: refetch it all.
      await queryClient.invalidateQueries();
      navigate(from, { replace: true });
      return;
    }
    setBusy(false);
    setCode("");
    setMessage(r.message);
    if (r.code === "OTP_LOCKED" || r.code === "OTP_EXPIRED" || r.code === "OTP_NO_ACTIVE_CODE") setSent(null);
    else codeRef.current?.focus();
  }

  function onCodeChange(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    if (digits.length === 6) void verify(digits);
  }

  if (!isLoading && status && (!status.enforced || status.verified)) return <Navigate to={from} replace />;

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <div className="flex items-center justify-between px-5 py-5 lg:px-10">
        <FiciumLogo heightPx={20} withWordmark wordmarkClassName="text-base text-ink" />
        <button type="button" onClick={() => void signOut()} className="text-sm text-muted font-semibold hover:text-ink">
          Sign out
        </button>
      </div>

      <main className="flex-1 flex items-start sm:items-center justify-center px-5 py-6">
        <div className="w-full max-w-[420px]">
          <div className="w-12 h-12 rounded-2xl grid place-items-center mb-6 bg-ficium/10 text-ficium">
            <ShieldCheck size={24} />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink">Confirm it's you</h1>

          {isLoading && <p className="text-muted mt-3">Loading…</p>}

          {error && (
            <div className="mt-6">
              <p className="text-ink">We couldn't load your sign-in options.</p>
              <Button className="mt-4" onClick={() => void refetch()}>Try again</Button>
            </div>
          )}

          {status && !sent && (
            <>
              <p className="text-muted text-[16px] mt-2 mb-6">Choose where we send your 6-digit sign-in code.</p>
              <div role="radiogroup" aria-label="Where to send the code" className="flex flex-col gap-3">
                {status.channels.map((o) => {
                  const Icon = ICON[o.channel];
                  const selected = channel === o.channel;
                  return (
                    <button
                      key={o.channel}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={!o.available || busy}
                      onClick={() => setChannel(o.channel)}
                      className={
                        "flex items-center gap-4 w-full text-left rounded-2xl border px-4 py-3.5 transition-colors bg-white " +
                        (selected ? "border-ficium ring-2 ring-ficium/20 " : "border-line hover:border-ink/30 ") +
                        (!o.available ? "opacity-50 cursor-not-allowed" : "")
                      }
                    >
                      <Icon size={20} className={selected ? "text-ficium" : "text-ink/60"} />
                      <span className="flex-1 min-w-0">
                        <span className="block font-semibold text-ink">{LABEL[o.channel]}</span>
                        <span className="block text-sm text-muted truncate">
                          {o.available ? o.destination : unavailableText(o)}
                        </span>
                      </span>
                      <span aria-hidden className={"w-4 h-4 rounded-full border-2 " + (selected ? "border-ficium bg-ficium" : "border-ink/25")} />
                    </button>
                  );
                })}
              </div>

              {available.length === 0 && (
                <p className="text-sm text-muted mt-4">No way to send a code is set up. Please contact Ficium support.</p>
              )}

              {message && <p role="alert" className="text-sm text-red-600 mt-4">{message}</p>}

              <Button
                fullWidth size="lg" className="mt-6"
                disabled={!channel || busy || resendIn > 0}
                loading={busy}
                onClick={() => channel && void send(channel)}
              >
                {resendIn > 0 ? `Send code (${resendIn}s)` : "Send code"}
              </Button>
            </>
          )}

          {sent && (
            <form
              noValidate
              onSubmit={(e: FormEvent) => { e.preventDefault(); void verify(code); }}
            >
              <p className="text-muted text-[16px] mt-2 mb-6">
                We sent a code by {LABEL[sent.channel]} to <span className="text-ink font-semibold">{sent.destination}</span>.
              </p>

              <label htmlFor="otp-code" className="block text-sm font-semibold text-ink mb-2">Sign-in code</label>
              <input
                id="otp-code"
                ref={codeRef}
                name="one-time-code"
                value={code}
                onChange={(e) => onCodeChange(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                autoFocus
                disabled={busy}
                aria-invalid={!!message}
                aria-describedby={message ? "otp-error" : undefined}
                className="w-full rounded-2xl border border-line bg-white px-4 py-4 text-center text-3xl tracking-[0.5em] font-mono text-ink focus:outline-hidden focus:border-ficium focus:ring-2 focus:ring-ficium/20"
                placeholder="••••••"
              />

              {message && <p id="otp-error" role="alert" className="text-sm text-red-600 mt-3">{message}</p>}

              <Button type="submit" fullWidth size="lg" className="mt-6" disabled={code.length !== 6 || busy} loading={busy}>
                Confirm
              </Button>

              <div className="flex items-center justify-between mt-5 text-sm">
                <button
                  type="button"
                  onClick={() => { setSent(null); setMessage(null); setCode(""); }}
                  className="inline-flex items-center gap-1 text-muted font-semibold hover:text-ink"
                >
                  <ArrowLeft size={14} /> Another method
                </button>
                <button
                  type="button"
                  disabled={resendIn > 0 || busy}
                  onClick={() => void send(sent.channel)}
                  className="text-ficium font-semibold disabled:text-muted disabled:cursor-not-allowed"
                >
                  {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                </button>
              </div>
            </form>
          )}

          <p className="text-xs text-muted mt-10">Ficium will never call or message you to ask for this code.</p>
        </div>
      </main>
    </div>
  );
}
