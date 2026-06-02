/**
 * src/features/auth/context/AuthContext.tsx
 * ─────────────────────────────────────────────────────────────
 * Authentication context — session, role, sign out.
 *
 * REMOVED: Supabase Realtime WebSocket for notifications.
 * REPLACED: useUnreadCount hook with smart polling (see notifications module).
 *   At 10M concurrent users, WebSockets require dedicated infrastructure.
 *   Smart polling is free, scales infinitely, and has near-identical UX.
 *
 * The unreadCount is now driven by useUnreadCount() in the BottomNav/header
 * components directly — they only poll when mounted and visible.
 */
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode }     from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase }           from "../../../shared/lib/supabase";
import { identifyUser, clearUser } from "../../../core/sentry";

// ── Types ────────────────────────────────────────────────────

type UserRole = "client" | "bank" | "admin";

type AuthContextValue = {
  user:      User    | null;
  session:   Session | null;
  role:      UserRole | null;
  isLoading: boolean;
  signOut:   () => Promise<void>;
};

// ── Context ──────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ── Provider ─────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session,   setSession]   = useState<Session | null>(null);
  const [role,      setRole]      = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function fetchUserMeta(userId: string): Promise<void> {
    // Single RPC call — reads correct schema based on user type
    const { data: roleData } = await supabase.rpc("get_my_role");

    if (!roleData) {
      // Stale session: DB row gone — force clean logout
      await supabase.auth.signOut();
      setSession(null);
      setRole(null);
      window.location.href = "/";
      return;
    }

    // Satisfy TypeScript — userId is used as a stable dep in callers
    void userId;
    setRole((roleData as UserRole) ?? "client");
    identifyUser(userId, (roleData as UserRole) ?? "client");
  }

  useEffect(() => {
    // Hydrate session on mount
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        fetchUserMeta(data.session.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        if (newSession?.user) {
          fetchUserMeta(newSession.user.id);
        } else {
          setRole(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async (): Promise<void> => {
    clearUser();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, session, role, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
