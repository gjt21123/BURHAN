export type QualificationControl = {
  id: "correct-keyed-lock" | "correct-inflight-promise-deduplication" | "buggy-baseline" | "sequential-only" | "distinct-key-regression" | "documentation-not-updated";
  kind: "positive" | "negative";
  createService: () => PaymentControl;
  documentation: string;
};

export type PaymentControl = { charge: (idempotencyKey: string, amount: number) => Promise<void>; countCreated: () => number };

export const qualificationControls: readonly QualificationControl[] = [
  { id: "correct-keyed-lock", kind: "positive", createService: () => new KeyedLockPayment(), documentation: "POST /payments accepts the Idempotency-Key header." },
  { id: "correct-inflight-promise-deduplication", kind: "positive", createService: () => new InFlightPromisePayment(), documentation: "POST /payments accepts the Idempotency-Key header." },
  { id: "buggy-baseline", kind: "negative", createService: () => new BuggyPayment(), documentation: "POST /payments creates a payment." },
  { id: "sequential-only", kind: "negative", createService: () => new BuggyPayment(), documentation: "POST /payments accepts the Idempotency-Key header." },
  { id: "distinct-key-regression", kind: "negative", createService: () => new GlobalDedupPayment(), documentation: "POST /payments accepts the Idempotency-Key header." },
  { id: "documentation-not-updated", kind: "negative", createService: () => new InFlightPromisePayment(), documentation: "POST /payments creates a payment." },
];

class KeyedLockPayment implements PaymentControl {
  private readonly charges = new Set<string>();
  private readonly tails = new Map<string, Promise<void>>();

  async charge(idempotencyKey: string, _amount: number): Promise<void> {
    const previous = this.tails.get(idempotencyKey) ?? Promise.resolve();
    let release: () => void = () => undefined;
    const current = new Promise<void>((resolve) => { release = resolve; });
    this.tails.set(idempotencyKey, previous.then(() => current));
    await previous;
    this.charges.add(idempotencyKey);
    release();
  }

  countCreated(): number { return this.charges.size; }
}

class InFlightPromisePayment implements PaymentControl {
  private readonly charges = new Set<string>();
  private readonly inFlight = new Map<string, Promise<void>>();

  charge(idempotencyKey: string, _amount: number): Promise<void> {
    const existing = this.inFlight.get(idempotencyKey);
    if (existing) return existing;
    const operation = Promise.resolve().then(() => { this.charges.add(idempotencyKey); });
    this.inFlight.set(idempotencyKey, operation);
    return operation.finally(() => this.inFlight.delete(idempotencyKey));
  }

  countCreated(): number { return this.charges.size; }
}

class BuggyPayment implements PaymentControl {
  private created = 0;

  async charge(_idempotencyKey: string, _amount: number): Promise<void> {
    await Promise.resolve();
    this.created += 1;
  }

  countCreated(): number { return this.created; }
}

class GlobalDedupPayment implements PaymentControl {
  private created = false;

  async charge(_idempotencyKey: string, _amount: number): Promise<void> {
    if (!this.created) this.created = true;
  }

  countCreated(): number { return this.created ? 1 : 0; }
}
