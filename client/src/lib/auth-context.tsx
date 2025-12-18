import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { Profile, UserRole } from "@shared/schema";
import { mockProfiles } from "./mock-data";

interface AuthContextType {
  user: Profile | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);

  const login = useCallback(async (email: string, _password: string): Promise<boolean> => {
    const foundUser = mockProfiles.find(p => p.email.toLowerCase() === email.toLowerCase());
    if (foundUser) {
      setUser(foundUser);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const switchRole = useCallback((role: UserRole) => {
    const userWithRole = mockProfiles.find(p => p.role === role);
    if (userWithRole) {
      setUser(userWithRole);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        switchRole,
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
