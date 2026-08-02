import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Query,
  Body,
  HttpCode,
  NotFoundException,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ProfilesService } from "./profiles.service";
import { Public, CurrentUser } from "../auth/decorators";
import type { AuthUser } from "../auth/types";
import { ZodBody } from "../common/zod-validation.pipe";
import {
  ProfileListQuerySchema,
  ProfileUpsertSchema,
  type Paginated,
  type ProfileCard,
  type ProfileDetail,
  type OwnProfile,
} from "../contracts";

@Controller("profiles")
export class ProfilesController {
  constructor(private readonly service: ProfilesService) {}

  /** Directory list/search/paginate — replaces the client-side "fetch 200 rows". */
  @Public()
  @Get()
  list(@Query() rawQuery: Record<string, unknown>): Promise<Paginated<ProfileCard>> {
    const query = ProfileListQuerySchema.parse(rawQuery);
    return this.service.list(query);
  }

  /** Own profile (404 => FE treats as "no profile yet"). Must precede :slug. */
  @Get("me")
  async getOwn(@CurrentUser() user: AuthUser): Promise<OwnProfile> {
    const row = await this.service.getOwn(user.id);
    if (!row) throw new NotFoundException({ error: { code: "NOT_FOUND", message: "No profile yet." } });
    return row;
  }

  /** Upsert own profile (strict zod strips user_id/status/featured/slug). */
  @Put("me")
  upsertOwn(
    @CurrentUser() user: AuthUser,
    @Body(new ZodBody(ProfileUpsertSchema)) body: import("../contracts").ProfileUpsertInput,
  ): Promise<OwnProfile> {
    return this.service.upsertOwn(user.id, body);
  }

  @Delete("me")
  @HttpCode(204)
  async deleteOwn(@CurrentUser() user: AuthUser): Promise<void> {
    await this.service.deleteOwn(user.id);
  }

  /** Full public profile by slug (increments view_count). */
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get(":slug")
  getBySlug(@Param("slug") slug: string): Promise<ProfileDetail> {
    return this.service.getBySlug(slug);
  }
}
