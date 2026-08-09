import * as React from "react";
import type { AppRole } from "@/types";

export interface AuthUser {
  name: string;
  email: string;
  role: AppRole;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** Signs a person in with a given role. Used by both the admin and user login screens. */
  login: (input: { name: string; email: string; role: AppRole }) => void;
  logout: () => void;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "atlas-trainer-auth";

function readStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    if (parsed && (parsed.role === "admin" || parsed.role === "user")) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(readStoredUser);

  const login = React.useCallback((input: { name: string; email: string; role: AppRole }) => {
    const nextUser: AuthUser = { name: input.name, email: input.email, role: input.role };
    setUser(nextUser);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
  }, []);

  const logout = React.useCallback(() => {
    setUser(null);
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = React.useMemo(
    () => ({ user, isAuthenticated: user !== null, login, logout }),
    [user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
