import { useEffect, useState } from "react";
import { supabase } from "./shared/lib/supabase";

type ConnectionStatus = "checking" | "connected" | "error";

function App() {
  const [status, setStatus] = useState<ConnectionStatus>("checking");
  const [details, setDetails] = useState<string>("");

  useEffect(() => {
    async function testConnection() {
      const { error } = await supabase.from("users").select("id").limit(1);

      // RLS will block this query since we're not logged in.
      // A "permission denied" error is actually a SUCCESS signal:
      // it proves we reached Supabase, hit RLS, and got rejected as expected.
      if (error) {
        if (
          error.message.toLowerCase().includes("permission") ||
          error.message.toLowerCase().includes("denied") ||
          error.code === "PGRST301" ||
          error.code === "42501"
        ) {
          setStatus("connected");
          setDetails("RLS is enforcing access — exactly as designed.");
        } else {
          setStatus("error");
          setDetails(error.message);
        }
      } else {
        setStatus("connected");
        setDetails("Query succeeded (no rows returned — table is empty).");
      }
    }

    testConnection();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center max-w-md px-6">
        <h1 className="text-5xl font-bold text-slate-900">Ficium</h1>
        <p className="mt-3 text-slate-600">More Value Less Friction</p>

        <div className="mt-10 p-4 rounded-lg border bg-white">
          {status === "checking" && (
            <p className="text-slate-500">Checking Supabase connection…</p>
          )}
          {status === "connected" && (
            <>
              <p className="text-emerald-600 font-medium">
                ✓ Connected to Supabase
              </p>
              <p className="mt-1 text-xs text-slate-500">{details}</p>
            </>
          )}
          {status === "error" && (
            <>
              <p className="text-red-600 font-medium">✗ Connection failed</p>
              <p className="mt-1 text-xs text-slate-500">{details}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;