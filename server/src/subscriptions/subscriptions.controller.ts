import { Controller, Get } from "@nestjs/common";
import { SubscriptionsService } from "./subscriptions.service";
import { CurrentUser } from "../auth/decorators";
import type { AuthUser } from "../auth/types";
import type { SubscriptionDto } from "../contracts";

@Controller("subscriptions")
export class SubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  @Get("me")
  getMine(@CurrentUser() user: AuthUser): Promise<SubscriptionDto> {
    return this.service.getMine(user.id);
  }
}
