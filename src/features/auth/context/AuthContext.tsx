import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode }     from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase }           from "../../../shared/lib/supabase";
import { queryClient }        from "../../../core/query-client";
import { getProfileSummary }  from "../../../individual/dashboard/api/profile";
import { getMyRequests }      from "../../../individual/requests/api/requests";

type UserRole = "client" | "bank" | "admin";

type AuthContextValue = {
  user:      User | null;
  session:   Session | null;
  role:      UserRole | null;
  isLoading: boolean;
  signOut:   () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Warm the React-Query cache with the data the dashboard needs immediately.
 * Fires in the background as soon as we know the user is logged in — before
 * the router has even rendered the dashboard route — so name, greeting and
 * request count appear instantly instead of after a loading spinner.
 */
function prefetchDashboardData(): void {
  void queryClient.prefetchQuery({
    queryKey:  ["profile"],
    queryFn:   getProfileSummary,
    staleTime: 10 * 60 * 1000,
  });
  void queryClient.prefetchQuery({
    queryKey:  ["requests", "mine"],
    queryFn:   getMyRequests,
    staleTime: 60 * 1000,
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session,   setSession]   = useState<Session | null>(null);
  const [role,      setRole]      = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Tracks which user the cached React-Query data belongs to. If the
  // authenticated user changes (sign-out, or switching accounts in the same
  // tab), we wipe the ENTIRE cache so no query can ever serve the previous
  // user's data. This is the client-side complement to row-level security:
  // RLS stops the DB from returning another user's rows; this stops a stale
  // cache from showing them before a refetch.
  const cachedUserId = useRef<string | null>(null);

  function resetCacheForUser(nextUserId: string | null): void {
    if (cachedUserId.current !== nextUserId) {
      queryClient.clear();              // drop every cached query, unconditionally
      cachedUserId.current = nextUserId;
    }
  }

  async function fetchUserMeta(userId: string): Promise<void> {
    const { data: roleData } = await supabase.rpc("get_my_role");
    if (!roleData) {
      await supabase.auth.signOut();
      setSession(null);
      setRole(null);
      window.location.href = "/";
      return;
    }
    void userId;
    setRole((roleData as UserRole) ?? "client");
    // Kick off dashboard prefetch in parallel — don't await it
    if ((roleData as UserRole) === "client") prefetchDashboardData();
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      resetCacheForUser(data.session?.user?.id ?? null);
      setSession(data.session);
      if (data.session?.user) {
        fetchUserMeta(data.session.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // Wipe cache the moment the user changes — before any new query runs.
      resetCacheForUser(newSession?.user?.id ?? null);
      setSession(newSession);
      if (newSession?.user) {
        fetchUserMeta(newSession.user.id);
      } else {
        setRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async (): Promise<void> => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, session, role, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
