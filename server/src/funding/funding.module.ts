import { Module } from "@nestjs/common";
import { FundingController } from "./funding.controller";
import { FundingService } from "./funding.service";
import { AiGatewayService } from "./ai-gateway.service";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";

@Module({
  imports: [SubscriptionsModule],
  controllers: [FundingController],
  providers: [FundingService, AiGatewayService],
})
export class FundingModule {}
