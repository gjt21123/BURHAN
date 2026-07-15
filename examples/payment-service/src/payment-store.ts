export type Charge = {
  id: string;
  idempotencyKey: string;
  amount: number;
};

export class PaymentStore {
  private readonly charges = new Map<string, Charge>();
  private sequence = 0;

  findByKey(idempotencyKey: string): Charge | undefined {
    return this.charges.get(idempotencyKey);
  }

  create(idempotencyKey: string, amount: number): Charge {
    this.sequence += 1;
    const charge = { id: `charge_${this.sequence}`, idempotencyKey, amount };
    this.charges.set(idempotencyKey, charge);
    return charge;
  }

  countCreated(): number {
    return this.sequence;
  }
}
