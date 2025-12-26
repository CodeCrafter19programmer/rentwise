import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";

type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "manager" | "tenant";
};

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  const withTimeout = useCallback(<T,>(promise: PromiseLike<T>, ms: number): Promise<T> => {
    return Promise.race([
      Promise.resolve(promise),
      new Promise<T>((_resolve, reject) => {
        setTimeout(() => reject(new Error("timeout")), ms);
      }),
    ]);
  }, []);

  const buildAuthUser = useCallback(async (): Promise<AuthUser | null> => {
    if (!isSupabaseConfigured) return null;
    const { data } = await withTimeout(supabase.auth.getSession(), 8000);
    const session = data.session;
    if (!session?.user) return null;

    const authUser = session.user;
    // Try to read profile row (optional now; will exist once backend seeds profiles)
    const { data: profileRow } = await withTimeout(
      supabase
        .from("profiles")
        .select("id, email, name, role")
        .eq("id", authUser.id)
        .single(),
      8000,
    );

    const name = profileRow?.name || authUser.user_metadata?.name || authUser.email?.split("@")[0] || "User";
    const role = (profileRow?.role as AuthUser["role"]) || (authUser.user_metadata?.role as AuthUser["role"]) || "tenant";

    return {
      id: authUser.id,
      email: authUser.email || "",
      name,
      role,
    };
  }, [withTimeout]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setAuthLoading(true);
      try {
        const u = await buildAuthUser();
        if (mounted) setUser(u);
      } catch {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    })();

    const sub = isSupabaseConfigured
      ? supabase.auth.onAuthStateChange(async () => {
          setAuthLoading(true);
          try {
            const u = await buildAuthUser();
            setUser(u);
          } catch {
            setUser(null);
          } finally {
            setAuthLoading(false);
          }
        })
      : { subscription: { unsubscribe: () => {} } } as any;

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [buildAuthUser]);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthUser | null> => {
      if (!isSupabaseConfigured) return null;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const u = await buildAuthUser();
      setUser(u);
      return u;
    },
    [buildAuthUser],
  );

  const logout = useCallback(async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        authLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
