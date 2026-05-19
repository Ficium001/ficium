import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900">Page not found</h1>
        <p className="mt-2 text-slate-500">That URL doesn't exist.</p>
        <Link to="/" className="mt-6 inline-block text-emerald-600 underline">
          Back to home
        </Link>
      </div>
    </div>
  );
}