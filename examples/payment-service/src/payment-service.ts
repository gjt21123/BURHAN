import { type PaymentStore, type Charge } from "./payment-store.js";

export class PaymentService {
  constructor(private readonly store: PaymentStore) {}

  async charge(idempotencyKey: string, amount: number): Promise<Charge> {
    const existingCharge = await this.store.findByKey(idempotencyKey);
    if (existingCharge) {
      return existingCharge;
    }

    return this.store.create(idempotencyKey, amount);
  }
}
