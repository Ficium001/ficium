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
  // isLoading is only true until we know whether a session exists.
  // Role resolution (get_my_role RPC) happens async and does NOT block rendering.
  const [isLoading, setIsLoading] = useState(true);
  const cachedUserId = useRef<string | null>(null);

  function resetCacheForUser(nextUserId: string | null): void {
    if (cachedUserId.current !== nextUserId) {
      queryClient.clear();
      cachedUserId.current = nextUserId;
    }
  }

  // Resolves role in the background — never blocks the loading gate.
  function resolveRole(userId: string): void {
    supabase.rpc("get_my_role").then(({ data: roleData }) => {
      if (!roleData) {
        void supabase.auth.signOut();
        setSession(null);
        setRole(null);
        window.location.href = "/";
        return;
      }
      void userId;
      const resolved = (roleData as UserRole) ?? "client";
      setRole(resolved);
      if (resolved === "client") prefetchDashboardData();
    });
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      resetCacheForUser(data.session?.user?.id ?? null);
      setSession(data.session);
      // Unblock the app immediately — role resolves in background
      setIsLoading(false);
      if (data.session?.user) {
        resolveRole(data.session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      resetCacheForUser(newSession?.user?.id ?? null);
      setSession(newSession);
      if (newSession?.user) {
        resolveRole(newSession.user.id);
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
