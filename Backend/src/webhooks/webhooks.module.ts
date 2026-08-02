import { Module } from "@nestjs/common";
import { PaystackController } from "./paystack.controller";
import { PaymentsService } from "../payments/payments.service";

@Module({ controllers: [PaystackController], providers: [PaymentsService] })
export class WebhooksModule {}
