import { Controller, Get, Post, Body, HttpCode } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { FundingService } from "./funding.service";
import { Public, CurrentUser } from "../auth/decorators";
import type { AuthUser } from "../auth/types";
import { ZodBody } from "../common/zod-validation.pipe";
import {
  FundingSearchSchema,
  type FundingSearchInput,
  type FundingSearchResult,
  type CuratedOpportunity,
} from "../contracts";

@Controller("funding")
export class FundingController {
  constructor(private readonly service: FundingService) {}

  /** AI deep search (auth + active sub). Per-user 5/min throttle (plan 07 §5.1). */
  @Post("search")
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  search(
    @CurrentUser() user: AuthUser,
    @Body(new ZodBody(FundingSearchSchema)) body: FundingSearchInput,
  ): Promise<FundingSearchResult> {
    return this.service.search(user.id, body.keywords);
  }

  /** Most recent unexpired cached result (204 when none). */
  @Get("latest")
  async latest(@CurrentUser() user: AuthUser): Promise<FundingSearchResult | undefined> {
    const result = await this.service.latest(user.id);
    return result ?? undefined; // 204-ish empty body when null
  }

  /** Admin-curated published feed. */
  @Public()
  @Get("opportunities")
  opportunities(): Promise<CuratedOpportunity[]> {
    return this.service.curatedList();
  }
}
