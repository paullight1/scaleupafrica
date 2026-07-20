import {
  Controller,
  Post,
  Req,
  Headers,
  HttpCode,
  UnauthorizedException,
  Inject,
  type RawBodyRequest,
} from "@nestjs/common";
import type { Request } from "express";
import { Public } from "../auth/decorators";
import { ENV, type Env } from "../config/env";
import { verifyPaystackSignature } from "./paystack-signature";
import { PaymentsService, type PaystackEvent } from "../payments/payments.service";

@Controller("webhooks")
export class PaystackController {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly payments: PaymentsService,
  ) {}

  /**
   * POST /api/v1/webhooks/paystack — signature-gated (no JWT). Verifies
   * HMAC-SHA512 over the RAW body, then hands the event to PaymentsService (Plan 06).
   * Always 200 after a valid signature to stop Paystack retries.
   */
  @Public()
  @Post("paystack")
  @HttpCode(200)
  async paystack(
    @Req() req: RawBodyRequest<Request>,
    @Headers("x-paystack-signature") signature: string | undefined,
  ): Promise<{ received: true }> {
    const raw = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
    if (!this.env.PAYSTACK_SECRET_KEY || !verifyPaystackSignature(raw, signature, this.env.PAYSTACK_SECRET_KEY)) {
      throw new UnauthorizedException({
        error: { code: "UNAUTHENTICATED", message: "Invalid signature." },
      });
    }
    await this.payments.handleEvent((req.body ?? {}) as PaystackEvent);
    return { received: true };
  }
}
