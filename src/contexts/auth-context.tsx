import * as React from "react";
import type { AppRole } from "@/types";
import { authService } from "@/services/auth.service";
import { getAccessToken, setAccessToken } from "@/services/api-client";

export interface AuthUser {
  name: string;
  email: string;
  role: AppRole;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** Authenticates against the FastAPI backend and stores the JWT. */
  login: (input: { email: string; password: string; name?: string }) => Promise<void>;
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
    if (parsed && (parsed.role === "admin" || parsed.role === "user" || parsed.role === "sme") && getAccessToken()) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(readStoredUser);

  const login = React.useCallback(async (input: { email: string; password: string; name?: string }) => {
    const result = await authService.login(input.email, input.password, input.name);
    const nextUser: AuthUser = {
      name: result.user.name,
      email: result.user.email,
      role: result.user.role,
    };
    setUser(nextUser);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
  }, []);

  const logout = React.useCallback(() => {
    authService.logout();
    setUser(null);
    window.localStorage.removeItem(STORAGE_KEY);
    setAccessToken(null);
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
