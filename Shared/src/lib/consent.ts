export const CONSENT_STORAGE_KEY = "cresciva:consent:v1";
export const OPEN_COOKIE_SETTINGS_EVENT = "cresciva:open-cookie-settings";

export interface ConsentPreferences {
  analytics: boolean;
}

export function readConsent(): ConsentPreferences | null {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return typeof parsed.analytics === "boolean" ? { analytics: parsed.analytics } : null;
  } catch {
    return null;
  }
}

export function writeConsent(preferences: ConsentPreferences): void {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // A blocked storage API should not prevent the visitor from continuing.
  }
}

export function hasAnalyticsConsent(): boolean {
  return readConsent()?.analytics === true;
}

export function openCookieSettings(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT));
}
