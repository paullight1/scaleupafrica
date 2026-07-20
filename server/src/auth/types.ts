export interface AuthUser {
  id: string; // JWT `sub` (UUID) — the ONLY source of user identity in queries
  email?: string;
}

export type AppRoleName = "admin" | "editor" | "moderator" | "user";
