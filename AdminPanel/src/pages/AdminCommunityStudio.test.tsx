// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AdminProfiles from "./AdminProfiles";
import AdminUsers from "./AdminUsers";

const mutate = vi.fn();

const profiles = [
  {
    id: "profile-1",
    slug: "agrinova",
    business_name: "AgriNova Solutions",
    founder_name: "Emeka Okafor",
    country: "Nigeria",
    sector: "Agritech",
    status: "active",
    featured: true,
    view_count: 1246,
    created_at: "2026-07-01T00:00:00.000Z",
    logo_url: null,
  },
  {
    id: "profile-2",
    slug: "studio-next",
    business_name: "Studio Next",
    founder_name: "Nana Ama",
    country: "Ghana",
    sector: "Creative",
    status: "flagged",
    featured: false,
    view_count: 321,
    created_at: "2026-07-02T00:00:00.000Z",
    logo_url: null,
  },
];

const users = [
  {
    user_id: "user-1",
    email: "amaka@cresciva.com",
    created_at: "2026-06-01T00:00:00.000Z",
    last_sign_in_at: "2026-08-20T00:00:00.000Z",
    business_name: "Cresciva HQ",
    country: "Nigeria",
    has_access: true,
    expires_at: "2030-01-01T00:00:00.000Z",
    is_admin: true,
    is_editor: false,
  },
  {
    user_id: "user-2",
    email: "founder@example.com",
    created_at: "2026-06-02T00:00:00.000Z",
    last_sign_in_at: null,
    business_name: "Studio Next",
    country: "Ghana",
    has_access: false,
    expires_at: null,
    is_admin: false,
    is_editor: false,
  },
];

vi.mock("@shared/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/hooks/queries/adminUsers", () => ({
  useAdminProfiles: () => ({ data: profiles, isLoading: false, isError: false, refetch: vi.fn() }),
  useModerateProfile: () => ({ mutate, isPending: false }),
  useDeleteProfile: () => ({ mutate, isPending: false }),
  useAdminUsers: () => ({ data: users, isLoading: false, isError: false, refetch: vi.fn() }),
  useSetAccess: () => ({ mutate, isPending: false }),
  useSetExpiry: () => ({ mutate, isPending: false }),
  useSetRole: () => ({ mutate, isPending: false }),
  subscriptionActive: (user: { has_access: boolean; expires_at: string | null }) =>
    user.has_access && (!user.expires_at || new Date(user.expires_at).getTime() > Date.now()),
}));

describe("dashboard-style community management", () => {
  it("makes directory moderation people-first and keeps filters visible", () => {
    render(<MemoryRouter><AdminProfiles /></MemoryRouter>);

    expect(screen.getByRole("heading", { name: "Directory profiles" })).toBeInTheDocument();
    expect(screen.queryByText("Community desk")).not.toBeInTheDocument();
    expect(screen.getByText("Featured profiles")).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search profiles by business name" })).toBeInTheDocument();
  });

  it("summarizes member access without hiding account actions", () => {
    render(<MemoryRouter><AdminUsers /></MemoryRouter>);

    expect(screen.getByRole("heading", { name: "Users" })).toBeInTheDocument();
    expect(screen.queryByText("Member access")).not.toBeInTheDocument();
    expect(screen.getByText("Active members")).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search users by email or business" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Actions for amaka@cresciva.com" })).toBeInTheDocument();
  });
});
