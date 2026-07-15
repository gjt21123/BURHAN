import { PaymentStore, type Charge } from "./payment-store.js";

export class PaymentService {
  constructor(private readonly store: PaymentStore) {}

  async charge(idempotencyKey: string, amount: number): Promise<Charge> {
    const existingCharge = this.store.findByKey(idempotencyKey);
    if (existingCharge) {
      return existingCharge;
    }

    await Promise.resolve();
    return this.store.create(idempotencyKey, amount);
  }
}
