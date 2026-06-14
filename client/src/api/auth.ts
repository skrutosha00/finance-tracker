import { apiFetch } from "./client";

export interface AuthUser {
  id: string;
  email: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export function registerApi(input: { email: string; password: string }): Promise<AuthUser> {
  return apiFetch<AuthUser>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function loginApi(input: { email: string; password: string }): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
