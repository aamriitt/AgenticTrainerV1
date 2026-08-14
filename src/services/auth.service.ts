import { apiRequest, setAccessToken } from "./api-client";
import type { AppRole } from "@/types";

export interface AuthUserDto {
  email: string;
  name: string;
  role: AppRole;
}

export interface LoginResult {
  access_token: string;
  token_type: string;
  user: AuthUserDto;
}

export const authService = {
  login: async (email: string, password: string, name?: string): Promise<LoginResult> => {
    const result = await apiRequest<LoginResult>("/auth/login", {
      method: "POST",
      auth: false,
      body: { email, password, name },
    });
    setAccessToken(result.access_token);
    return result;
  },

  me: () => apiRequest<AuthUserDto>("/auth/me"),

  logout: () => {
    setAccessToken(null);
  },
};
