/**
 * Drizzle schema — a READ/WRITE MIRROR of the live Supabase `public` schema.
 *
 * OWNERSHIP: `supabase/migrations/*.sql` is the ONLY DDL pipeline (FOUNDATION §8.3).
 * This file is hand-authored to mirror those migrations column-by-column and verified
 * with `drizzle-kit pull` (drift check only). NEVER run generate/push/migrate here.
 *
 * Sources mirrored:
 *   20260713035330  profiles, subscriptions (+ has_active_subscription, triggers)
 *   20260720120000  admin foundation: app_role, user_roles, resources, blog_posts,
 *                   funding_opportunities, leads, newsletter_subscribers,
 *                   analytics_events, site_settings, admin_audit_log,
 *                   profiles.status/featured/view_count
 *   20260720130000  profiles.slug (NOT NULL, trigger), show_email/phone/whatsapp
 *   20260720140000  funding_results, funding_opportunities.details/source/batch_id/
 *                   last_verified_at/verified_by
 *   20260720150000  payments, payment_webhook_events
 *   20260720160000  saved_opportunities, user_preferences
 *
 * FKs to auth.users are NOT modeled as Drizzle references (auth schema stays external);
 * the DB still enforces them. CHECK constraints live in SQL / zod contracts, not here.
 */
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  bigint,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const appRole = pgEnum("app_role", ["admin", "editor", "moderator", "user"]);

// ---- profiles ----
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull().unique(),
    businessName: text("business_name").notNull(),
    founderName: text("founder_name"),
    founderPhotoUrl: text("founder_photo_url"),
    logoUrl: text("logo_url"),
    country: text("country").notNull(),
    sector: text("sector").notNull(),
    shortDescription: text("short_description"),
    longDescription: text("long_description"),
    website: text("website"),
    email: text("email"),
    phone: text("phone"),
    whatsapp: text("whatsapp"),
    instagram: text("instagram"),
    linkedin: text("linkedin"),
    twitter: text("twitter"),
    keywords: text("keywords").array().default(sql`'{}'::text[]`),
    status: text("status").notNull().default("active"), // CHECK ('active'|'hidden'|'flagged')
    featured: boolean("featured").notNull().default(false),
    viewCount: integer("view_count").notNull().default(0),
    slug: text("slug").notNull().unique(), // trigger-assigned, immutable (20260720130000)
    showEmail: boolean("show_email").notNull().default(true),
    showPhone: boolean("show_phone").notNull().default(true),
    showWhatsapp: boolean("show_whatsapp").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_profiles_slug").on(t.slug),
    index("idx_profiles_directory").on(t.status, t.featured, t.createdAt),
  ],
);

// ---- subscriptions ----
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().unique(),
  hasAccess: boolean("has_access").notNull().default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- user_roles ----
export const userRoles = pgTable(
  "user_roles",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    role: appRole("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("user_roles_user_id_role_key").on(t.userId, t.role)],
);

// ---- resources ----
export const resources = pgTable(
  "resources",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    type: text("type").notNull().default("article"),
    category: text("category"),
    excerpt: text("excerpt"),
    content: text("content"),
    coverImageUrl: text("cover_image_url"),
    fileUrl: text("file_url"),
    fileName: text("file_name"),
    fileSizeKb: integer("file_size_kb"),
    topics: text("topics").array().notNull().default(sql`'{}'::text[]`),
    gated: boolean("gated").notNull().default(false),
    status: text("status").notNull().default("draft"),
    featured: boolean("featured").notNull().default(false),
    viewCount: integer("view_count").notNull().default(0),
    downloadCount: integer("download_count").notNull().default(0),
    readTimeMin: integer("read_time_min"),
    authorId: uuid("author_id"),
    authorName: text("author_name"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("resources_status_idx").on(t.status), index("resources_type_idx").on(t.type)],
);

// ---- blog_posts ----
export const blogPosts = pgTable(
  "blog_posts",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    excerpt: text("excerpt"),
    content: text("content"),
    coverImageUrl: text("cover_image_url"),
    category: text("category"),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    status: text("status").notNull().default("draft"),
    featured: boolean("featured").notNull().default(false),
    viewCount: integer("view_count").notNull().default(0),
    readTimeMin: integer("read_time_min"),
    authorId: uuid("author_id"),
    authorName: text("author_name"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("blog_posts_status_idx").on(t.status)],
);

// ---- funding_opportunities (admin-curated + verification metadata) ----
export const fundingOpportunities = pgTable("funding_opportunities", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  funder: text("funder").notNull(),
  type: text("type"),
  summary: text("summary"),
  amount: text("amount"),
  opens: text("opens"),
  deadline: text("deadline"),
  eligibility: text("eligibility"),
  url: text("url"),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  countryFocus: text("country_focus").array().notNull().default(sql`'{}'::text[]`),
  status: text("status").notNull().default("published"),
  featured: boolean("featured").notNull().default(false),
  // 20260720140000 additions:
  details: jsonb("details").notNull().default(sql`'{}'::jsonb`),
  source: text("source").notNull().default("manual"), // CHECK ('manual'|'ai')
  batchId: uuid("batch_id"),
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
  verifiedBy: uuid("verified_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- leads ----
export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name"),
  email: text("email").notNull(),
  company: text("company"),
  message: text("message"),
  source: text("source").notNull().default("contact"),
  resourceId: uuid("resource_id"),
  status: text("status").notNull().default("new"),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- newsletter_subscribers ----
export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  status: text("status").notNull().default("subscribed"),
  source: text("source"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- analytics_events ----
export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    eventType: text("event_type").notNull(),
    path: text("path"),
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),
    userId: uuid("user_id"),
    sessionId: text("session_id"),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("analytics_events_type_created_idx").on(t.eventType, t.createdAt)],
);

// ---- site_settings ----
export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull().default(sql`'{}'::jsonb`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid("updated_by"),
});

// ---- admin_audit_log ----
export const adminAuditLog = pgTable(
  "admin_audit_log",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    actorId: uuid("actor_id"),
    actorEmail: text("actor_email"),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    details: jsonb("details").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("admin_audit_log_created_idx").on(t.createdAt)],
);

// ---- funding_results (per-user AI deep-search cache — 20260720140000) ----
export const fundingResults = pgTable(
  "funding_results",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    keywordsNormalized: text("keywords_normalized").notNull(), // cache key
    keywordsRaw: text("keywords_raw").notNull(),
    opportunities: jsonb("opportunities").notNull(), // validated Opportunity[]
    model: text("model").notNull().default("google/gemini-2.5-pro"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true })
      .notNull()
      .default(sql`now() + interval '7 days'`),
  },
  (t) => [
    uniqueIndex("funding_results_user_kw_key").on(t.userId, t.keywordsNormalized),
    index("funding_results_user_created_idx").on(t.userId, t.createdAt),
  ],
);

// ---- payments (20260720150000 — Plan 06) ----
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    provider: text("provider").notNull().default("paystack"),
    reference: text("reference").notNull().unique(), // idempotency key
    planCode: text("plan_code").notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(), // integer subunits (kobo/cents)
    currency: text("currency").notNull(),
    status: text("status").notNull().default("initialized"), // initialized|success|failed|abandoned
    channel: text("channel"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    gatewayResponse: jsonb("gateway_response"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("payments_user_idx").on(t.userId, t.createdAt)],
);

// ---- payment_webhook_events (20260720150000 — idempotency backstop) ----
export const paymentWebhookEvents = pgTable(
  "payment_webhook_events",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    provider: text("provider").notNull().default("paystack"),
    eventType: text("event_type").notNull(),
    reference: text("reference"),
    signatureValid: boolean("signature_valid").notNull(),
    payload: jsonb("payload").notNull(),
    processed: boolean("processed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("payment_webhook_events_dedupe_key").on(t.provider, t.eventType, t.reference)],
);

// ---- saved_opportunities (20260720160000 — Plan 03) ----
export const savedOpportunities = pgTable(
  "saved_opportunities",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    opportunityId: uuid("opportunity_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("saved_opportunities_user_opp_key").on(t.userId, t.opportunityId),
    index("saved_opportunities_user_idx").on(t.userId, t.createdAt),
  ],
);

// ---- user_preferences (20260720160000 — Plan 03) ----
export const userPreferences = pgTable("user_preferences", {
  userId: uuid("user_id").primaryKey(),
  emailNewFunding: boolean("email_new_funding").notNull().default(true),
  emailProductUpdates: boolean("email_product_updates").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ProfileRow = typeof profiles.$inferSelect;
export type SubscriptionRow = typeof subscriptions.$inferSelect;
export type FundingResultRow = typeof fundingResults.$inferSelect;
export type FundingOpportunityRow = typeof fundingOpportunities.$inferSelect;
export type PaymentRow = typeof payments.$inferSelect;
