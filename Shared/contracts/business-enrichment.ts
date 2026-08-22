import { z } from "zod";

export const BusinessEnrichmentRunStatusSchema = z.enum([
  "pending",
  "resolved",
  "ambiguous",
  "not_found",
  "failed",
]);
export type BusinessEnrichmentRunStatus = z.infer<typeof BusinessEnrichmentRunStatusSchema>;

export const BusinessEnrichmentRequestSchema = z
  .object({
    businessName: z.string().trim().min(2).max(160),
    website: z.string().trim().max(300).optional(),
    countryHint: z.string().trim().max(120).optional(),
  })
  .strict();
export type BusinessEnrichmentRequest = z.infer<typeof BusinessEnrichmentRequestSchema>;

export const BusinessIdentityCandidateSchema = z
  .object({
    id: z.string().trim().min(1).max(120),
    canonicalName: z.string().trim().min(1).max(200),
    website: z.string().url().max(500).nullable().optional(),
    country: z.string().trim().max(120).nullable().optional(),
    summary: z.string().trim().max(1000).nullable().optional(),
    identityConfidence: z.number().int().min(0).max(100),
    sourceUrls: z.array(z.string().url().max(1000)).max(10).default([]),
    enrichedProfile: z.record(z.unknown()).default({}),
    fieldEvidence: z.record(z.unknown()).default({}),
    memberState: z.enum(["proposed", "confirmed", "rejected"]).default("proposed"),
  })
  .strict();
export type BusinessIdentityCandidate = z.infer<typeof BusinessIdentityCandidateSchema>;

export const BusinessEnrichmentResponseSchema = z
  .object({
    runId: z.string().uuid(),
    state: BusinessEnrichmentRunStatusSchema,
    candidates: z.array(BusinessIdentityCandidateSchema).max(8).default([]),
    selectedCandidate: BusinessIdentityCandidateSchema.optional(),
    errorCode: z.string().trim().max(100).optional(),
  })
  .strict();
export type BusinessEnrichmentResponse = z.infer<typeof BusinessEnrichmentResponseSchema>;

export const BusinessIdentityConfirmationSchema = z
  .object({
    runId: z.string().uuid(),
    candidateId: z.string().trim().min(1).max(120),
    accepted: z.boolean(),
  })
  .strict();
export type BusinessIdentityConfirmation = z.infer<typeof BusinessIdentityConfirmationSchema>;
