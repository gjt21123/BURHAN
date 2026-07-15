import { PaymentService } from "../src/payment-service.js";
import type { Charge, PaymentStore } from "../src/payment-store.js";

class Deferred {
  readonly promise: Promise<void>;
  private resolve: () => void = () => undefined;

  constructor() {
    this.promise = new Promise<void>((resolve) => {
      this.resolve = resolve;
    });
  }

  release(): void {
    this.resolve();
  }
}

class GatedPaymentStore implements PaymentStore {
  private readonly gate = new Deferred();
  private readonly charges = new Map<string, Charge>();
  private sequence = 0;
  reads = 0;

  async findByKey(key: string): Promise<Charge | undefined> {
    this.reads += 1;
    await this.gate.promise;
    return this.charges.get(key);
  }

  async create(key: string, amount: number): Promise<Charge> {
    this.sequence += 1;
    const charge = { id: `charge_${this.sequence}`, idempotencyKey: key, amount };
    this.charges.set(key, charge);
    return charge;
  }

  releaseReads(): void {
    this.gate.release();
  }

  countCreated(): number {
    return this.sequence;
  }
}

const store = new GatedPaymentStore();
const service = new PaymentService(store);
const requests = Array.from({ length: 20 }, () => service.charge("same-key", 100));
await Promise.resolve();
if (store.reads !== 20) {
  throw new Error(`Expected 20 blocked reads, observed ${store.reads}.`);
}
store.releaseReads();
await Promise.all(requests);
console.log(`Race reproduced: ${store.countCreated()} charges created for one key.`);
