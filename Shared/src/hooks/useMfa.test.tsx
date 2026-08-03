import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const listFactors = vi.fn();
const getAal = vi.fn();
const unenroll = vi.fn();
const enrollFn = vi.fn();

vi.mock("@shared/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      mfa: {
        listFactors: (...a: unknown[]) => listFactors(...a),
        getAuthenticatorAssuranceLevel: (...a: unknown[]) => getAal(...a),
        unenroll: (...a: unknown[]) => unenroll(...a),
        enroll: (...a: unknown[]) => enrollFn(...a),
      },
    },
  },
}));

vi.mock("@shared/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1" }, loading: false }),
}));

import { useMfa } from "@shared/hooks/useMfa";

const verified = { id: "f-ok", status: "verified", factor_type: "totp" };
const unverified = { id: "f-pending", status: "unverified", factor_type: "totp" };

beforeEach(() => {
  vi.clearAllMocks();
  unenroll.mockResolvedValue({ error: null });
  enrollFn.mockResolvedValue({
    data: { id: "f-new", totp: { qr_code: "<svg/>", secret: "S3CR3T" } },
    error: null,
  });
});

describe("useMfa", () => {
  it("ignores unverified factors so an abandoned enrolment never reads as 'MFA on'", async () => {
    listFactors.mockResolvedValue({ data: { totp: [unverified], all: [unverified] }, error: null });
    getAal.mockResolvedValue({ data: { currentLevel: "aal1", nextLevel: "aal1" } });

    const { result } = renderHook(() => useMfa());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.factors).toHaveLength(0);
    expect(result.current.enrolled).toBe(false);
  });

  it("flags challengeRequired when a verified factor exists but the session is aal1", async () => {
    listFactors.mockResolvedValue({ data: { totp: [verified], all: [verified] }, error: null });
    getAal.mockResolvedValue({ data: { currentLevel: "aal1", nextLevel: "aal2" } });

    const { result } = renderHook(() => useMfa());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.enrolled).toBe(true);
    expect(result.current.challengeRequired).toBe(true);
  });

  it("clears challengeRequired once the session reaches aal2", async () => {
    listFactors.mockResolvedValue({ data: { totp: [verified], all: [verified] }, error: null });
    getAal.mockResolvedValue({ data: { currentLevel: "aal2", nextLevel: "aal2" } });

    const { result } = renderHook(() => useMfa());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.challengeRequired).toBe(false);
  });

  it("does not require a challenge for an account with no factors", async () => {
    listFactors.mockResolvedValue({ data: { totp: [], all: [] }, error: null });
    getAal.mockResolvedValue({ data: { currentLevel: "aal1", nextLevel: "aal1" } });

    const { result } = renderHook(() => useMfa());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.challengeRequired).toBe(false);
  });

  it("fails closed to no factors when listFactors errors", async () => {
    listFactors.mockResolvedValue({ data: null, error: { message: "boom" } });
    getAal.mockResolvedValue({ data: { currentLevel: "aal1", nextLevel: "aal1" } });

    const { result } = renderHook(() => useMfa());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.enrolled).toBe(false);
  });

  it("sweeps abandoned unverified factors before enrolling a new one", async () => {
    listFactors.mockResolvedValue({
      data: { totp: [unverified], all: [unverified] },
      error: null,
    });
    getAal.mockResolvedValue({ data: { currentLevel: "aal1", nextLevel: "aal1" } });

    const { result } = renderHook(() => useMfa());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const { data } = await result.current.enroll();

    expect(unenroll).toHaveBeenCalledWith({ factorId: "f-pending" });
    expect(data).toEqual({ factorId: "f-new", qrCode: "<svg/>", secret: "S3CR3T" });
  });
});
