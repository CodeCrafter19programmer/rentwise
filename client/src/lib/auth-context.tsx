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
  
  console.log('[AUTH] fetchProfileSafe starting for userId:', userId);
  
  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => {
      console.log('[AUTH] fetchProfileSafe TIMEOUT after 5s');
      resolve(null);
    }, 5000);
  });

  const queryPromise = supabase
    .from("profiles")
    .select("name, role")
    .eq("id", userId)
    .maybeSingle()
    .then(result => {
      console.log('[AUTH] fetchProfileSafe query completed - data:', !!result.data, 'error:', result.error?.message);
      return result;
    });

  try {
    const result = await Promise.race([queryPromise, timeoutPromise]);
    
    if (result === null) {
      console.log('[AUTH] fetchProfileSafe timed out');
      return null;
    }
    
    const { data, error } = result;
    
    if (error) {
      console.error('[AUTH] fetchProfileSafe error:', error.message);
      return null;
    }
    
    if (!data) {
      console.log('[AUTH] fetchProfileSafe no data found');
      return null;
    }
    
    console.log('[AUTH] fetchProfileSafe SUCCESS - role:', data.role, 'name:', data.name);
    
    return {
      name: data.name || undefined,
      role: isValidRole(data.role) ? data.role : undefined,
    };
  } catch (err) {
    console.error('[AUTH] fetchProfileSafe exception:', err);
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
      console.log('[AUTH] resolveAuthUser: Getting session...');
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
    } else {
      console.log('[AUTH] Using provided session');
    }

    if (!session?.user) {
      console.log('[AUTH] No session user found');
      return null;
    }

    const authUser = session.user;
    const userId = authUser.id;
    const email = authUser.email || "";

    const cached = loadUserFromStorage();
    const cachedMatchesUser = cached?.id === userId;

    console.log('[AUTH] Checking metadata role:', authUser.user_metadata?.role);
    console.log('[AUTH] Checking cached role:', cached?.role);

    let profile: { name?: string; role?: UserRole } | null = null;
    
    if (!authUser.user_metadata?.role && !cached?.role) {
      console.log('[AUTH] No metadata/cached role found, fetching profile...');
      profile = await fetchProfileSafe(userId);
      console.log('[AUTH] Profile fetched:', !!profile, 'Role:', profile?.role);
    } else {
      console.log('[AUTH] Skipping profile fetch - using metadata/cache');
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

    console.log('[AUTH] Resolved user - role:', role);
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
          console.log('[AUTH] Event:', event, 'Session:', !!session, 'User:', !!session?.user);

          if (event === "SIGNED_OUT") {
            updateUser(null);
            setAuthLoading(false);
            return;
          }

          if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
            console.log('[AUTH] Starting user resolution for', event);
            try {
              const resolved = await resolveAuthUser(session);
              console.log('[AUTH] Resolved user:', !!resolved);
              if (isMounted.current) {
                if (resolved) {
                  console.log('[AUTH] Updating with resolved user');
                  updateUser(resolved);
                } else if (session?.user && event === "SIGNED_IN") {
                  console.log('[AUTH] Using fallback user (resolved was null)');
                  const fallbackUser: AuthUser = {
                    id: session.user.id,
                    email: session.user.email || "",
                    name: session.user.email?.split("@")[0] || "User",
                    role: DEFAULT_ROLE,
                  };
                  updateUser(fallbackUser);
                }
              }
            } catch (err) {
              console.error('[AUTH] Error resolving user:', err);
              if (isMounted.current && session?.user && event === "SIGNED_IN") {
                console.log('[AUTH] Using fallback user (error caught)');
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

      console.log('[AUTH] Login started');
      localStorage.removeItem(STORAGE_KEY);
      userRef.current = null;
      setUser(null);

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.user) throw new Error("Login failed: no user returned");
      console.log('[AUTH] signInWithPassword succeeded, waiting for state update...');

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.log('[AUTH] Login timeout - resolving with:', userRef.current);
          resolve(userRef.current);
        }, 5000);

        const checkInterval = setInterval(() => {
          if (userRef.current) {
            console.log('[AUTH] User state updated, resolving');
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
