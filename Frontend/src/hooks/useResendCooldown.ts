import { useCallback, useEffect, useRef, useState } from "react";

/** Supabase rate-limits transactional email to one send per 60s per address. */
export const RESEND_COOLDOWN = 60;

/**
 * Countdown that gates "resend email" buttons.
 *
 * Extracted because signup confirmation and passwordless sign-in both need it
 * and both used to keep their own interval ref — one of which leaked when the
 * screen unmounted mid-countdown.
 */
export function useResendCooldown(seconds: number = RESEND_COOLDOWN) {
  const [cooldown, setCooldown] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => clear, [clear]);

  const start = useCallback(() => {
    clear();
    setCooldown(seconds);
    timer.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) clear();
        return c - 1;
      });
    }, 1000);
  }, [clear, seconds]);

  return { cooldown, start };
}
