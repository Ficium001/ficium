import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../../../shared/lib/supabase";

/* ---------- Context shape ---------- */

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  unreadCount: number;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/* ---------- Provider ---------- */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch initial unread count
  async function fetchUnreadCount(userId: string) {
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null);
    setUnreadCount(count ?? 0);
  }

  useEffect(() => {
    // 1. Hydrate initial session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
      if (data.session?.user) {
        fetchUnreadCount(data.session.user.id);
      }
    });

    // 2. Auth state changes
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        if (newSession?.user) {
          fetchUnreadCount(newSession.user.id);
        } else {
          setUnreadCount(0);
        }
      }
    );

    return () => authSub.unsubscribe();
  }, []);

  // 3. Realtime subscription — fires when a new notification is inserted
  useEffect(() => {
    if (!session?.user) return;

    const userId = session.user.id;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // New notification arrived — bump the count
          setUnreadCount((prev) => prev + 1);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // A notification was marked read — re-fetch accurate count
          fetchUnreadCount(userId);
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
    <AuthContext.Provider value={{ user: session?.user ?? null, session, isLoading, unreadCount, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

/* ---------- Hook ---------- */

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}