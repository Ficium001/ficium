import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode }     from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase }           from "../../../shared/lib/supabase";

type UserRole = "client" | "bank" | "admin";

type AuthContextValue = {
  user:      User | null;
  session:   Session | null;
  role:      UserRole | null;
  isLoading: boolean;
  signOut:   () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session,   setSession]   = useState<Session | null>(null);
  const [role,      setRole]      = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        fetchUserMeta(data.session.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
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
