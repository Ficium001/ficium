import { Link } from "react-router-dom";

export default function Splash() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-6">
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        {/* Logo mark */}
        <div className="h-20 w-20 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/20">
          <span className="text-4xl font-bold text-white">F</span>
        </div>

        {/* Brand */}
        <h1 className="mt-6 text-5xl font-bold tracking-tight text-slate-900">
          Ficium
        </h1>
        <p className="mt-2 text-slate-600">More Value Less Friction</p>

        {/* Value proposition */}
        <p className="mt-10 text-lg text-slate-700 leading-relaxed">
          Post once. Banks bid. You choose.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          The reverse marketplace where banks compete for your business.
        </p>

        {/* Primary CTA */}
        <Link
          to="/register"
          className="mt-10 w-full inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800 transition"
        >
          Get Started
        </Link>

        {/* Secondary link */}
        <Link
          to="/login"
          className="mt-4 text-sm text-slate-600 hover:text-slate-900 transition"
        >
          I already have an account
        </Link>
      </div>

      {/* Footer */}
      <p className="absolute bottom-6 text-xs text-slate-400">
        © {new Date().getFullYear()} Ficium · Mauritius & India
      </p>
    </div>
  );
}