import { describe, it, expect } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { ProfilesService } from "../src/profiles/profiles.service";
import type { Db } from "../src/db/client";

function activeRow(status: "active" | "flagged" | "hidden") {
  return {
    id: "p1",
    userId: "u1",
    slug: "acme",
    businessName: "Acme",
    founderName: "Ada",
    founderPhotoUrl: null,
    logoUrl: null,
    country: "NG",
    sector: "Tech",
    shortDescription: "desc",
    longDescription: null,
    website: null,
    email: "a@b.com",
    phone: null,
    whatsapp: null,
    instagram: null,
    linkedin: null,
    twitter: null,
    keywords: [],
    status,
    featured: false,
    viewCount: 0,
    showEmail: true,
    showPhone: false,
    showWhatsapp: false,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  };
}

function mockDb(row: unknown): Db {
  return {
    select: () => ({
      from: () => ({ where: () => ({ limit: () => Promise.resolve(row ? [row] : []) }) }),
    }),
    // Fire-and-forget view increment must resolve (getBySlug calls .catch on it).
    update: () => ({ set: () => ({ where: () => Promise.resolve() }) }),
  } as unknown as Db;
}

describe("ProfilesService.getBySlug visibility (I1)", () => {
  it("404s a 'hidden' profile", async () => {
    const svc = new ProfilesService(mockDb(activeRow("hidden")));
    await expect(svc.getBySlug("acme")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("404s a 'flagged' (moderated) profile", async () => {
    const svc = new ProfilesService(mockDb(activeRow("flagged")));
    await expect(svc.getBySlug("acme")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("404s when no row exists", async () => {
    const svc = new ProfilesService(mockDb(null));
    await expect(svc.getBySlug("acme")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("returns an 'active' profile", async () => {
    const svc = new ProfilesService(mockDb(activeRow("active")));
    const p = await svc.getBySlug("acme");
    expect(p.slug).toBe("acme");
    expect(p.status).toBe("active");
  });
});
