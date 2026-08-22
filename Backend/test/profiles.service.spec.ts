import { describe, it, expect } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { ProfilesService } from "../src/profiles/profiles.service";
import { ProfileUpsertSchema } from "../src/contracts";
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
    country: "Nigeria",
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
    keywords: ["ai"],
    businessStage: "growth",
    fundingTargetUsd: "250000",
    preferredFundingTypes: ["grant"],
    applicationReadiness: "ready",
    organisationType: "nonprofit",
    operatingCountries: ["Nigeria", "Ghana"],
    foundingYear: 2023,
    businessIdentityConfirmedAt: new Date("2026-08-22T12:00:00Z"),
    businessIdentitySourceUrls: ["https://example.org/about"],
    businessIdentityRunId: "00000000-0000-4000-8000-000000000010",
    businessIdentityCandidateId: "00000000-0000-4000-8000-000000000011",
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
    update: () => ({ set: () => ({ where: () => Promise.resolve() }) }),
  } as unknown as Db;
}

function mockUpsertDb(
  row: ReturnType<typeof activeRow>,
  capture: { publicValues?: Record<string, unknown>; fundingValues?: Record<string, unknown> },
): Db {
  const tx = {
    insert: () => ({
      values: (values: Record<string, unknown>) => {
        capture.publicValues = values;
        return {
          onConflictDoUpdate: () => ({
            returning: () => Promise.resolve([row]),
          }),
        };
      },
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => {
        capture.fundingValues = values;
        return {
          where: () => ({
            returning: () => Promise.resolve([row]),
          }),
        };
      },
    }),
  };
  return {
    transaction: (callback: (inner: typeof tx) => unknown) => callback(tx),
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

  it("returns an 'active' public profile without private funding intelligence", async () => {
    const svc = new ProfilesService(mockDb(activeRow("active")));
    const p = await svc.getBySlug("acme");
    expect(p.slug).toBe("acme");
    expect(p.status).toBe("active");
    expect("business_stage" in p).toBe(false);
    expect("funding_target_usd" in p).toBe(false);
    expect("business_identity_source_urls" in p).toBe(false);
  });
});

describe("ProfilesService own funding intelligence parity", () => {
  it("returns private funding/enrichment fields to the owner", async () => {
    const svc = new ProfilesService(mockDb(activeRow("active")));
    const own = await svc.getOwn("u1");
    expect(own?.business_stage).toBe("growth");
    expect(own?.funding_target_usd).toBe(250000);
    expect(own?.preferred_funding_types).toEqual(["grant"]);
    expect(own?.application_readiness).toBe("ready");
    expect(own?.organisation_type).toBe("nonprofit");
    expect(own?.operating_countries).toEqual(["Nigeria", "Ghana"]);
    expect(own?.founding_year).toBe(2023);
    expect(own?.business_identity_source_urls).toEqual(["https://example.org/about"]);
  });

  it("accepts and persists member-editable funding profile fields", async () => {
    const input = ProfileUpsertSchema.parse({
      business_name: "Acme",
      country: "Nigeria",
      sector: "Tech",
      keywords: ["AI"],
      business_stage: "growth",
      funding_target_usd: 250000,
      preferred_funding_types: ["grant"],
      application_readiness: "ready",
      organisation_type: "nonprofit",
      operating_countries: ["Nigeria", "Ghana"],
      founding_year: 2023,
    });
    const capture: {
      publicValues?: Record<string, unknown>;
      fundingValues?: Record<string, unknown>;
    } = {};
    const svc = new ProfilesService(mockUpsertDb(activeRow("active"), capture));
    await svc.upsertOwn("u1", input);
    expect(capture.fundingValues?.businessStage).toBe("growth");
    expect(capture.fundingValues?.fundingTargetUsd).toBe("250000");
    expect(capture.fundingValues?.preferredFundingTypes).toEqual(["grant"]);
    expect(capture.fundingValues?.applicationReadiness).toBe("ready");
    expect(capture.fundingValues?.organisationType).toBe("nonprofit");
    expect(capture.fundingValues?.operatingCountries).toEqual(["Nigeria", "Ghana"]);
    expect(capture.fundingValues?.foundingYear).toBe(2023);
    expect(capture.publicValues).not.toHaveProperty("fundingTargetUsd");
  });
});
