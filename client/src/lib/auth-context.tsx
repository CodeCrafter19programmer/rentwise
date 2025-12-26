import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
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
  const userRef = useRef<AuthUser | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const withTimeout = useCallback(<T,>(promise: PromiseLike<T>, ms: number): Promise<T> => {
    return Promise.race([
      Promise.resolve(promise),
      new Promise<T>((_resolve, reject) => {
        setTimeout(() => reject(new Error("timeout")), ms);
      }),
    ]);
  }, []);

  const buildAuthUser = useCallback(async (existingUser?: AuthUser | null): Promise<AuthUser | null> => {
    if (!isSupabaseConfigured) return null;
    const { data } = await withTimeout(supabase.auth.getSession(), 8000);
    const session = data.session;
    if (!session?.user) return null;

    const authUser = session.user;
    let profileRow: any | null = null;
    try {
      const { data: pr } = await withTimeout(
        supabase
          .from("profiles")
          .select("id, email, name, role")
          .eq("id", authUser.id)
          .single(),
        8000,
      );
      profileRow = pr || null;
    } catch {
      profileRow = null;
    }

    const existingMatches = existingUser && existingUser.id === authUser.id ? existingUser : null;

    const name =
      profileRow?.name ||
      existingMatches?.name ||
      authUser.user_metadata?.name ||
      authUser.email?.split("@")[0] ||
      "User";
    const role =
      (profileRow?.role as AuthUser["role"]) ||
      existingMatches?.role ||
      (authUser.user_metadata?.role as AuthUser["role"]) ||
      "tenant";

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
        const existing = userRef.current;
        const u = await buildAuthUser(existing);
        if (!mounted) return;
        if (u) {
          setUser(u);
        } else if (existing) {
          setUser(existing);
        } else {
          setUser(null);
        }
      } catch {
        if (mounted && userRef.current) setUser(userRef.current);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    })();

    const sub = isSupabaseConfigured
      ? supabase.auth.onAuthStateChange(async (event) => {
          if (event === "SIGNED_OUT") {
            userRef.current = null;
            setUser(null);
            setAuthLoading(false);
            return;
          }

          setAuthLoading(true);
          try {
            const existing = userRef.current;
            const u = await buildAuthUser(existing);
            if (u) {
              setUser(u);
              userRef.current = u;
            } else if (existing) {
              setUser(existing);
            } else {
              setUser(null);
              userRef.current = null;
            }
          } catch {
            if (userRef.current) setUser(userRef.current);
          } finally {
            setAuthLoading(false);
          }
        })
      : { subscription: { unsubscribe: () => {} } } as any;

    const onVisible = async () => {
      if (!isSupabaseConfigured) return;
      if (document.visibilityState !== "visible") return;
      const existing = userRef.current;
      if (!existing) return;
      setAuthLoading(true);
      try {
        await withTimeout(supabase.auth.refreshSession(), 8000);
        const u = await buildAuthUser(existing);
        if (u) {
          setUser(u);
          userRef.current = u;
        } else {
          setUser(existing);
        }
      } catch {
        if (existing) setUser(existing);
      } finally {
        setAuthLoading(false);
      }
    };

    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [buildAuthUser]);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthUser | null> => {
      if (!isSupabaseConfigured) return null;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const u = await buildAuthUser(userRef.current);
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
