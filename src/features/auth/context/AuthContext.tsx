import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../../../shared/lib/supabase";

type UserRole = "client" | "bank" | "admin";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  isLoading: boolean;
  unreadCount: number;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  async function fetchUserMeta(userId: string) {
    // V2: use get_my_role() RPC — reads from correct schema per user type
    // (public.clients, institution.institution_members, or admin.admin_users)
    const [{ data: roleData }, { count }] = await Promise.all([
      supabase.rpc("get_my_role"),
      supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("read_at", null),
    ]);

    // Stale session detected — DB row gone. Force complete cleanup + reload.
    if (!roleData) {
      await supabase.auth.signOut();
      setSession(null);
      setRole(null);
      setUnreadCount(0);
      window.location.href = "/";
      return;
    }

    setRole((roleData as UserRole) ?? "client");
    setUnreadCount(count ?? 0);
  }

  useEffect(() => {
    // 1. Hydrate session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        fetchUserMeta(data.session.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    // 2. Auth state changes
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        if (newSession?.user) {
          fetchUserMeta(newSession.user.id);
        } else {
          setRole(null);
          setUnreadCount(0);
        }
      }
    );

    return () => authSub.unsubscribe();
  }, []);

  // 3. Realtime notifications
  useEffect(() => {
    if (!session?.user) return;
    const userId = session.user.id;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => setUnreadCount((prev) => prev + 1)
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => {
          supabase
            .from("notifications")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .is("read_at", null)
            .then(({ count }) => setUnreadCount(count ?? 0));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        role,
        isLoading,
        unreadCount,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
