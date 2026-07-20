import { Module } from "@nestjs/common";
import { APP_GUARD, APP_FILTER } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { DbModule } from "./db/db.module";
import { AuthModule } from "./auth/auth.module";
import { HealthModule } from "./health/health.module";
import { ProfilesModule } from "./profiles/profiles.module";
import { SubscriptionsModule } from "./subscriptions/subscriptions.module";
import { FundingModule } from "./funding/funding.module";
import { WebhooksModule } from "./webhooks/webhooks.module";
import { OgModule } from "./directory/og.module";
import { AllExceptionsFilter } from "./common/http-exception.filter";

@Module({
  imports: [
    // Global 100 req/min/IP baseline; per-route @Throttle tightens specific routes.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    DbModule,
    AuthModule,
    HealthModule,
    ProfilesModule,
    SubscriptionsModule,
    FundingModule,
    WebhooksModule,
    OgModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
