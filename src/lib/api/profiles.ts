import { apiRequest, ApiError } from "./client";
import type {
  Paginated,
  ProfileCard,
  ProfileDetail,
  OwnProfile,
  ProfileListQuery,
} from "./types";

export function listProfiles(
  params: Partial<Pick<ProfileListQuery, "q" | "country" | "sector" | "page" | "pageSize" | "sort">>,
): Promise<Paginated<ProfileCard>> {
  return apiRequest<Paginated<ProfileCard>>("/profiles", {
    query: {
      q: params.q,
      country: params.country,
      sector: params.sector,
      page: params.page,
      pageSize: params.pageSize,
      sort: params.sort,
    },
  });
}

export function getProfileBySlug(slug: string): Promise<ProfileDetail> {
  return apiRequest<ProfileDetail>(`/profiles/${encodeURIComponent(slug)}`);
}

/** 404 => the caller treats it as "no profile yet". */
export async function getMyProfile(): Promise<OwnProfile | null> {
  try {
    return await apiRequest<OwnProfile>("/profiles/me");
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export function upsertMyProfile(payload: Record<string, unknown>): Promise<OwnProfile> {
  return apiRequest<OwnProfile>("/profiles/me", { method: "PUT", body: payload });
}

export function deleteMyProfile(): Promise<void> {
  return apiRequest<void>("/profiles/me", { method: "DELETE" });
}
