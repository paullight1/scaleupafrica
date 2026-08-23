import { pgTable, uuid, text, bigint, timestamp, jsonb, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Current projection of the payment tables after the Bachs/data-rights migrations.
 * `schema.ts` preserves the historical foundation mirror; db/client.ts overrides
 * those two legacy table objects with these current definitions.
 */
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    // Nullable after account deletion so the minimum ledger can be retained
    // without retaining an auth-user identifier.
    userId: uuid("user_id"),
    provider: text("provider").notNull().default("bachs"),
    reference: text("reference").notNull().unique(),
    planCode: text("plan_code").notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    currency: text("currency").notNull(),
    status: text("status").notNull().default("initialized"),
    channel: text("channel"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    gatewayResponse: jsonb("gateway_response"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("payments_user_idx").on(t.userId, t.createdAt)],
);

export const paymentWebhookEvents = pgTable(
  "payment_webhook_events",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    provider: text("provider").notNull().default("bachs"),
    eventType: text("event_type").notNull(),
    reference: text("reference"),
    signatureValid: boolean("signature_valid").notNull(),
    payload: jsonb("payload").notNull(),
    processed: boolean("processed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("payment_webhook_events_dedupe_key").on(t.provider, t.eventType, t.reference)],
);

export type PaymentRow = typeof payments.$inferSelect;
