export const ADMIN_EMAIL_DOMAIN = "crescivacapital.com";

export function isAllowedAdminEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const separator = normalized.lastIndexOf("@");
  return separator > 0 && normalized.slice(separator + 1) === ADMIN_EMAIL_DOMAIN;
}
