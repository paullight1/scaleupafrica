import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { and, or, eq, ilike, arrayContains, desc, count, sql } from "drizzle-orm";
import { DB, type Db } from "../db/client";
import { profiles } from "../db/schema";
import type {
  Paginated,
  ProfileCard,
  ProfileDetail,
  ProfileListQuery,
  ProfileUpsertInput,
  OwnProfile,
} from "../contracts";

/** Escape ilike wildcards so user input is a literal substring match. */
export function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (m) => `\\${m}`);
}

@Injectable()
export class ProfilesService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async list(query: ProfileListQuery): Promise<Paginated<ProfileCard>> {
    const conds = [eq(profiles.status, "active")];
    if (query.country) conds.push(eq(profiles.country, query.country));
    if (query.sector) conds.push(eq(profiles.sector, query.sector));

    const term = (query.q ?? "").trim();
    if (term) {
      const like = `%${escapeLike(term)}%`;
      const search = or(
        ilike(profiles.businessName, like),
        ilike(profiles.founderName, like),
        ilike(profiles.shortDescription, like),
        arrayContains(profiles.keywords, [term.toLowerCase()]),
      );
      if (search) conds.push(search);
    }

    const where = and(...conds);
    const offset = (query.page - 1) * query.pageSize;

    const orderBy =
      query.sort === "newest"
        ? [desc(profiles.createdAt)]
        : [desc(profiles.featured), desc(profiles.createdAt)];

    const [rows, totalRow] = await Promise.all([
      this.db
        .select({
          id: profiles.id,
          slug: profiles.slug,
          business_name: profiles.businessName,
          founder_name: profiles.founderName,
          logo_url: profiles.logoUrl,
          country: profiles.country,
          sector: profiles.sector,
          short_description: profiles.shortDescription,
          featured: profiles.featured,
          created_at: profiles.createdAt,
        })
        .from(profiles)
        .where(where)
        .orderBy(...orderBy)
        .limit(query.pageSize)
        .offset(offset),
      this.db.select({ n: count() }).from(profiles).where(where),
    ]);

    return {
      items: rows.map((r) => ({ ...r, created_at: toIso(r.created_at) })),
      total: Number(totalRow[0]?.n ?? 0),
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async getBySlug(slug: string): Promise<ProfileDetail> {
    const [row] = await this.db.select().from(profiles).where(eq(profiles.slug, slug)).limit(1);
    // Only 'active' profiles are public — 'hidden' and 'flagged' (moderated) both 404,
    // mirroring the directory list and get_profile_contact() (active-only).
    if (!row || row.status !== "active") {
      throw new NotFoundException({
        error: { code: "NOT_FOUND", message: "Profile not found." },
      });
    }
    // Fire-and-forget view increment (never blocks the response, never throws up).
    void this.db
      .update(profiles)
      .set({ viewCount: sql`${profiles.viewCount} + 1` })
      .where(and(eq(profiles.id, row.id), eq(profiles.status, "active")))
      .catch(() => undefined);

    return toDetail(row);
  }

  async getOwn(userId: string): Promise<OwnProfile | null> {
    const [row] = await this.db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
    if (!row) return null;
    // Owner sees their own contact fields regardless of show_* visibility flags.
    return { ...toDetail(row, false), user_id: row.userId };
  }

  async upsertOwn(userId: string, input: ProfileUpsertInput): Promise<OwnProfile> {
    // user_id / status / featured / view_count / slug are NEVER taken from the body.
    const values = {
      userId,
      businessName: input.business_name,
      founderName: input.founder_name ?? null,
      country: input.country,
      sector: input.sector,
      shortDescription: input.short_description ?? null,
      longDescription: input.long_description ?? null,
      website: input.website ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      whatsapp: input.whatsapp ?? null,
      instagram: input.instagram ?? null,
      linkedin: input.linkedin ?? null,
      twitter: input.twitter ?? null,
      logoUrl: input.logo_url ?? null,
      founderPhotoUrl: input.founder_photo_url ?? null,
      keywords: input.keywords,
      showEmail: input.show_email,
      showPhone: input.show_phone,
      showWhatsapp: input.show_whatsapp,
    };
    // slug omitted on purpose — DB trigger assigns it on insert (immutable after).
    const { userId: _uid, ...updateSet } = values;

    const [row] = await this.db
      .insert(profiles)
      .values(values as typeof profiles.$inferInsert)
      .onConflictDoUpdate({ target: profiles.userId, set: updateSet })
      .returning();

    return { ...toDetail(row, false), user_id: row.userId };
  }

  async deleteOwn(userId: string): Promise<void> {
    await this.db.delete(profiles).where(eq(profiles.userId, userId));
  }
}

function toIso(v: Date | string | null): string {
  if (!v) return "";
  return v instanceof Date ? v.toISOString() : String(v);
}

function toDetail(row: typeof profiles.$inferSelect, mask = true): ProfileDetail {
  return {
    id: row.id,
    slug: row.slug,
    business_name: row.businessName,
    founder_name: row.founderName,
    founder_photo_url: row.founderPhotoUrl,
    logo_url: row.logoUrl,
    country: row.country,
    sector: row.sector,
    short_description: row.shortDescription,
    long_description: row.longDescription,
    website: row.website,
    instagram: row.instagram,
    linkedin: row.linkedin,
    twitter: row.twitter,
    keywords: row.keywords ?? [],
    status: row.status,
    featured: row.featured,
    view_count: row.viewCount,
    email: !mask || row.showEmail ? row.email : null,
    phone: !mask || row.showPhone ? row.phone : null,
    whatsapp: !mask || row.showWhatsapp ? row.whatsapp : null,
    show_email: row.showEmail,
    show_phone: row.showPhone,
    show_whatsapp: row.showWhatsapp,
    created_at: toIso(row.createdAt),
    updated_at: toIso(row.updatedAt),
  };
}
