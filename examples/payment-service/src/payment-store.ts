export type Charge = {
  id: string;
  idempotencyKey: string;
  amount: number;
};

export interface PaymentStore {
  findByKey(idempotencyKey: string): Promise<Charge | undefined>;
  create(idempotencyKey: string, amount: number): Promise<Charge>;
}

export class InMemoryPaymentStore implements PaymentStore {
  private readonly charges = new Map<string, Charge>();
  private sequence = 0;

  async findByKey(idempotencyKey: string): Promise<Charge | undefined> {
    return this.charges.get(idempotencyKey);
  }

  async create(idempotencyKey: string, amount: number): Promise<Charge> {
    this.sequence += 1;
    const charge = { id: `charge_${this.sequence}`, idempotencyKey, amount };
    this.charges.set(idempotencyKey, charge);
    return charge;
  }

  countCreated(): number {
    return this.sequence;
  }
}
