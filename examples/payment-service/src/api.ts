import { PaymentService } from "./payment-service.js";

export async function createPayment(
  service: PaymentService,
  idempotencyKey: string,
  amount: number,
) {
  return service.charge(idempotencyKey, amount);
}
