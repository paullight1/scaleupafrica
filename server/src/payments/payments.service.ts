import { Injectable, Logger } from "@nestjs/common";

export interface PaystackEvent {
  event: string;
  data?: Record<string, unknown>;
}

/**
 * STUB — Plan 06 owns the real handler. This plan (07) provides only the webhook
 * mount + signature verification. When Plan 06 lands, `handleEvent` becomes:
 *   idempotent on payments.reference; on `charge.success` call grant_annual_access()
 *   (the ONLY code path that flips subscriptions.has_access/expires_at).
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger("Payments");

  async handleEvent(event: PaystackEvent): Promise<void> {
    // Plan 06 implements: record payment_webhook_events (idempotency), then act.
    this.logger.log(`Received Paystack event: ${event.event} (handler stub — Plan 06)`);
  }
}
