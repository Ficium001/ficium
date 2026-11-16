/**
 * Public "how to delete your Ficium account" page.
 *
 * Google Play requires a web address, reachable without the app and without
 * signing in, that explains how to delete an account and what happens to the
 * data. This is that address (entered in the Play Console Data safety form).
 * The deletion itself happens at /profile/close, after sign-in, and is
 * enforced on the server (api/account.ts).
 */
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { CONTACT_EMAIL } from "../content";

export function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <main className="max-w-[720px] mx-auto px-5 sm:px-8 py-10">
        <Link to="/" className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink mb-6">
          <ArrowLeft size={15} aria-hidden /> Ficium
        </Link>

        <h1 className="font-display text-3xl sm:text-4xl font-bold">Delete your Ficium account</h1>
        <p className="text-[15px] text-ink/80 leading-relaxed mt-5">
          You can close your Ficium account and delete your data at any time, from the Ficium app
          or from this website. Ficium is operated by Ficium Ltd.
        </p>

        <section className="mt-8">
          <h2 className="font-display text-lg font-bold">How to delete your account</h2>
          <ol className="list-decimal pl-5 mt-2 space-y-2 text-[14px] text-ink/80 leading-relaxed">
            <li>Sign in to Ficium, in the app or on this website.</li>
            <li>Open your Profile.</li>
            <li>Choose “Close account”, enter your password and confirm.</li>
          </ol>
          <p className="mt-4">
            <Link to="/profile/close" className="inline-flex items-center justify-center rounded-pill bg-ficium px-5 py-3 text-[14px] font-semibold text-white no-underline">
              Sign in and close my account
            </Link>
          </p>
          <p className="text-[14px] text-ink/80 leading-relaxed mt-4">
            Can't sign in? Email{" "}
            <a href={`mailto:${CONTACT_EMAIL}?subject=Delete%20my%20Ficium%20account`} className="text-ficium">{CONTACT_EMAIL}</a>{" "}
            from the address you registered with and we will close the account for you.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="font-display text-lg font-bold">What is deleted</h2>
          <ul className="list-disc pl-5 mt-2 space-y-2 text-[14px] text-ink/80 leading-relaxed">
            <li>You are signed out on every device and the account can no longer be used.</li>
            <li>Requests still waiting for offers are withdrawn, and the institutions are told.</li>
            <li>Your advisor conversations, money tracker and alerts are deleted straight away.</li>
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="font-display text-lg font-bold">What is kept, and for how long</h2>
          <ul className="list-disc pl-5 mt-2 space-y-2 text-[14px] text-ink/80 leading-relaxed">
            <li>
              Financial regulations require us to keep your identity checks, your requests and the
              offers you received for a fixed period after closure. The exact period is shown before
              you confirm. When it ends, these records are erased.
            </li>
            <li>
              An offer you have already accepted is an agreement between you and that institution.
              It keeps its own records under its own policy; contact it directly.
            </li>
          </ul>
        </section>

        <p className="mt-10 pt-6 border-t border-line text-[13px]">
          <Link to="/privacy" className="text-ficium">Read the Privacy Notice</Link>
        </p>
      </main>
    </div>
  );
}
