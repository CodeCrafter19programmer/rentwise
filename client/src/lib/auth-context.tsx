import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";

type UserRole = "admin" | "manager" | "tenant";

type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
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
const DEFAULT_ROLE: UserRole = "tenant";
const LOGIN_TIMEOUT_MS = 8000;

function saveUserToStorage(user: AuthUser | null): void {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Storage unavailable
  }
}

function loadUserFromStorage(): AuthUser | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.id && parsed?.email && parsed?.role) {
        return parsed as AuthUser;
      }
    }
  } catch {
    // Invalid or unavailable storage
  }
  return null;
}

function isValidRole(role: unknown): role is UserRole {
  return role === "admin" || role === "manager" || role === "tenant";
}

async function fetchProfileSafe(userId: string): Promise<{ name?: string; role?: UserRole } | null> {
  if (!isSupabaseConfigured) return null;
  
  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), 5000);
  });

  const queryPromise = supabase
    .from("profiles")
    .select("name, role")
    .eq("id", userId)
    .maybeSingle();

  try {
    const result = await Promise.race([queryPromise, timeoutPromise]);
    
    if (result === null) return null;
    
    const { data, error } = result;
    
    if (error || !data) return null;
    
    return {
      name: data.name || undefined,
      role: isValidRole(data.role) ? data.role : undefined,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const cachedUser = loadUserFromStorage();
  const [user, setUser] = useState<AuthUser | null>(cachedUser);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  
  const userRef = useRef<AuthUser | null>(cachedUser);
  const bootstrapComplete = useRef(false);
  const isMounted = useRef(true);

  const updateUser = useCallback((newUser: AuthUser | null) => {
    userRef.current = newUser;
    setUser(newUser);
    saveUserToStorage(newUser);
  }, []);

  const resolveAuthUser = useCallback(async (providedSession?: any): Promise<AuthUser | null> => {
    if (!isSupabaseConfigured) return null;

    let session = providedSession;

    if (!session) {
      const { data: sessionData } = await supabase.auth.getSession();
      session = sessionData?.session;

      if (!session) {
        try {
          const { data: refreshData } = await supabase.auth.refreshSession();
          session = refreshData?.session;
        } catch {
          // Refresh failed
        }
      }
    }

    if (!session?.user) return null;

    const authUser = session.user;
    const userId = authUser.id;
    const email = authUser.email || "";

    const cached = loadUserFromStorage();
    const cachedMatchesUser = cached?.id === userId;

    let profile: { name?: string; role?: UserRole } | null = null;
    
    if (!authUser.user_metadata?.role && !cached?.role) {
      profile = await fetchProfileSafe(userId);
    }

    const name =
      authUser.user_metadata?.name ||
      (cachedMatchesUser && cached ? cached.name : null) ||
      profile?.name ||
      email.split("@")[0] ||
      "User";

    const role: UserRole =
      (isValidRole(authUser.user_metadata?.role) ? authUser.user_metadata.role : null) ||
      (cachedMatchesUser && cached && isValidRole(cached.role) ? cached.role : null) ||
      profile?.role ||
      DEFAULT_ROLE;

    return { id: userId, email, name, role };
  }, []);

  useEffect(() => {
    isMounted.current = true;

    const bootstrap = async () => {
      if (bootstrapComplete.current) return;

      try {
        const resolved = await resolveAuthUser();
        if (!isMounted.current) return;

        if (resolved) {
          updateUser(resolved);
        } else {
          updateUser(null);
        }
      } catch {
        if (isMounted.current) {
          updateUser(null);
        }
      } finally {
        if (isMounted.current) {
          bootstrapComplete.current = true;
        }
      }
    };

    bootstrap();

    const authSubscription = isSupabaseConfigured
      ? supabase.auth.onAuthStateChange(async (event, session) => {
          if (!isMounted.current) return;

          if (event === "SIGNED_OUT") {
            updateUser(null);
            setAuthLoading(false);
            return;
          }

          if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
            try {
              const resolved = await resolveAuthUser(session);
              if (isMounted.current) {
                if (resolved) {
                  updateUser(resolved);
                } else if (session?.user && event === "SIGNED_IN") {
                  const fallbackUser: AuthUser = {
                    id: session.user.id,
                    email: session.user.email || "",
                    name: session.user.email?.split("@")[0] || "User",
                    role: DEFAULT_ROLE,
                  };
                  updateUser(fallbackUser);
                }
              }
            } catch {
              if (isMounted.current && session?.user && event === "SIGNED_IN") {
                const fallbackUser: AuthUser = {
                  id: session.user.id,
                  email: session.user.email || "",
                  name: session.user.email?.split("@")[0] || "User",
                  role: DEFAULT_ROLE,
                };
                updateUser(fallbackUser);
              }
            } finally {
              if (isMounted.current) {
                setAuthLoading(false);
              }
            }
          }
        })
      : null;

    return () => {
      isMounted.current = false;
      authSubscription?.data.subscription.unsubscribe();
    };
  }, [resolveAuthUser, updateUser]);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthUser | null> => {
      if (!isSupabaseConfigured) return null;

      localStorage.removeItem(STORAGE_KEY);
      userRef.current = null;
      setUser(null);

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.user) throw new Error("Login failed: no user returned");

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve(userRef.current);
        }, 5000);

        const checkInterval = setInterval(() => {
          if (userRef.current) {
            clearTimeout(timeout);
            clearInterval(checkInterval);
            resolve(userRef.current);
          }
        }, 100);
      });
    },
    [],
  );

  const logout = useCallback(async () => {
    localStorage.removeItem(STORAGE_KEY);
    userRef.current = null;
    setUser(null);
    setAuthLoading(false);

    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Ignore signout errors
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
