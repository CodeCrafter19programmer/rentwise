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
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("name, role")
      .eq("id", userId)
      .maybeSingle();
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
  const [authLoading, setAuthLoading] = useState<boolean>(!cachedUser);
  
  const userRef = useRef<AuthUser | null>(cachedUser);
  const bootstrapComplete = useRef(false);
  const isMounted = useRef(true);

  const updateUser = useCallback((newUser: AuthUser | null) => {
    userRef.current = newUser;
    setUser(newUser);
    saveUserToStorage(newUser);
  }, []);

  const resolveAuthUser = useCallback(async (): Promise<AuthUser | null> => {
    if (!isSupabaseConfigured) return null;

    const { data: sessionData } = await supabase.auth.getSession();
    let session = sessionData?.session;

    if (!session) {
      try {
        const { data: refreshData } = await supabase.auth.refreshSession();
        session = refreshData?.session;
      } catch {
        // Refresh failed
      }
    }

    if (!session?.user) return null;

    const authUser = session.user;
    const userId = authUser.id;
    const email = authUser.email || "";

    const profile = await fetchProfileSafe(userId);
    const cached = loadUserFromStorage();
    const cachedMatchesUser = cached?.id === userId;

    const name =
      profile?.name ||
      (cachedMatchesUser ? cached.name : null) ||
      authUser.user_metadata?.name ||
      email.split("@")[0] ||
      "User";

    const role: UserRole =
      profile?.role ||
      (cachedMatchesUser && isValidRole(cached.role) ? cached.role : null) ||
      (isValidRole(authUser.user_metadata?.role) ? authUser.user_metadata.role : null) ||
      DEFAULT_ROLE;

    return { id: userId, email, name, role };
  }, []);

  useEffect(() => {
    isMounted.current = true;

    const bootstrap = async () => {
      if (bootstrapComplete.current) return;

      if (!userRef.current) {
        setAuthLoading(true);
      }

      try {
        const resolved = await resolveAuthUser();
        if (!isMounted.current) return;

        if (resolved) {
          updateUser(resolved);
        } else if (!userRef.current) {
          updateUser(null);
        }
      } catch {
        if (isMounted.current && !userRef.current) {
          updateUser(null);
        }
      } finally {
        if (isMounted.current) {
          setAuthLoading(false);
          bootstrapComplete.current = true;
        }
      }
    };

    bootstrap();

    const authSubscription = isSupabaseConfigured
      ? supabase.auth.onAuthStateChange(async (event) => {
          if (!isMounted.current) return;

          if (event === "SIGNED_OUT") {
            updateUser(null);
            setAuthLoading(false);
            return;
          }

          if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
            try {
              const resolved = await resolveAuthUser();
              if (isMounted.current) {
                if (resolved) {
                  updateUser(resolved);
                }
              }
            } catch {
              // Keep existing user on error
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

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.user) throw new Error("Login failed: no user returned");

      const userId = data.user.id;
      const userEmail = data.user.email || email;

      const profile = await fetchProfileSafe(userId);

      const name =
        profile?.name ||
        data.user.user_metadata?.name ||
        userEmail.split("@")[0] ||
        "User";

      const role: UserRole =
        profile?.role ||
        (isValidRole(data.user.user_metadata?.role) ? data.user.user_metadata.role : null) ||
        DEFAULT_ROLE;

      const authUser: AuthUser = { id: userId, email: userEmail, name, role };
      updateUser(authUser);
      setAuthLoading(false);

      return authUser;
    },
    [updateUser],
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
