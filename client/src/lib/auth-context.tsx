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

const STORAGE_KEY = "rentwise_auth_user";

function saveUserToStorage(user: AuthUser | null) {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {}
}

function loadUserFromStorage(): AuthUser | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as AuthUser;
  } catch {}
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage - if we have a cached user, start as NOT loading
  const cachedUser = loadUserFromStorage();
  const [user, setUser] = useState<AuthUser | null>(cachedUser);
  // Only show loading if we have NO cached user (fresh visit)
  const [authLoading, setAuthLoading] = useState<boolean>(!cachedUser);
  const userRef = useRef<AuthUser | null>(cachedUser);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    userRef.current = user;
    saveUserToStorage(user);
  }, [user]);

  const buildAuthUser = useCallback(async (existingUser?: AuthUser | null): Promise<AuthUser | null> => {
    if (!isSupabaseConfigured) return null;
    
    // First try getSession (reads from memory/storage, fast)
    let session = (await supabase.auth.getSession()).data.session;
    
    // If no session in memory, try refreshing (network call)
    if (!session) {
      try {
        const refreshResult = await supabase.auth.refreshSession();
        session = refreshResult.data.session;
      } catch {}
    }
    
    if (!session?.user) return null;

    const authUser = session.user;
    let profileRow: any | null = null;
    try {
      const { data: pr, error } = await supabase
        .from("profiles")
        .select("id, email, name, role")
        .eq("id", authUser.id)
        .single();
      if (!error) profileRow = pr || null;
    } catch {
      profileRow = null;
    }

    const existingMatches = existingUser && existingUser.id === authUser.id ? existingUser : null;

    // Priority: profile DB > existing cached > user_metadata > fallback
    // IMPORTANT: Don't default to "tenant" if we have a cached role - profile fetch might have failed due to RLS
    const cachedUser = loadUserFromStorage();
    const cachedRole = cachedUser?.id === authUser.id ? cachedUser.role : null;
    
    const name =
      profileRow?.name ||
      existingMatches?.name ||
      authUser.user_metadata?.name ||
      authUser.email?.split("@")[0] ||
      "User";
    const role =
      (profileRow?.role as AuthUser["role"]) ||
      existingMatches?.role ||
      cachedRole ||
      (authUser.user_metadata?.role as AuthUser["role"]) ||
      "tenant";

    return {
      id: authUser.id,
      email: authUser.email || "",
      name,
      role,
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    
    // Initial load - only show loading if no cached user
    (async () => {
      // If we already have a cached user, don't show loading spinner
      if (!userRef.current) {
        setAuthLoading(true);
      }
      try {
        const existing = userRef.current;
        const u = await buildAuthUser(existing);
        if (!mounted) return;
        if (u) {
          setUser(u);
          userRef.current = u;
        } else if (existing) {
          // Keep existing user if buildAuthUser fails (RLS issues, network errors)
          setUser(existing);
        } else {
          setUser(null);
        }
      } catch {
        // On error, preserve existing user
        if (mounted && userRef.current) setUser(userRef.current);
      } finally {
        if (mounted) {
          setAuthLoading(false);
          initialLoadDone.current = true;
        }
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

          // IMPORTANT: Don't set authLoading=true for background events after initial load
          // This prevents the loading spinner from showing when token refreshes
          // Only show loading for SIGNED_IN event if we don't have a user yet
          const showLoading = event === "SIGNED_IN" && !userRef.current;
          if (showLoading) setAuthLoading(true);
          
          try {
            const existing = userRef.current;
            const u = await buildAuthUser(existing);
            if (u) {
              setUser(u);
              userRef.current = u;
            } else if (existing) {
              // Keep existing user on failure
              setUser(existing);
            } else {
              setUser(null);
              userRef.current = null;
            }
          } catch {
            // On error, keep existing user
            if (userRef.current) setUser(userRef.current);
          } finally {
            if (showLoading) setAuthLoading(false);
          }
        })
      : { subscription: { unsubscribe: () => {} } } as any;

    const onVisible = async () => {
      if (!isSupabaseConfigured) return;
      if (document.visibilityState !== "visible") return;
      const existing = userRef.current;
      if (!existing) return;
      // Don't show loading spinner for background refresh - silent update
      try {
        await supabase.auth.refreshSession();
        const u = await buildAuthUser(existing);
        if (u) {
          setUser(u);
          userRef.current = u;
        }
        // If buildAuthUser returns null but we have existing, keep existing
      } catch {
        // On error, keep existing user - don't logout on transient failures
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
      // Clear any stale cached data before login
      localStorage.removeItem(STORAGE_KEY);
      userRef.current = null;
      
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      // Fetch fresh user data - don't use cached user to avoid role mismatch
      const u = await buildAuthUser(null);
      if (u) {
        setUser(u);
        userRef.current = u;
      }
      return u;
    },
    [buildAuthUser],
  );

  const logout = useCallback(async () => {
    // Clear localStorage first
    localStorage.removeItem(STORAGE_KEY);
    userRef.current = null;
    setUser(null);
    
    // Then sign out from Supabase
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error("Logout error:", e);
      }
    }
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
