import { describe, expect, it } from "vitest";
import { PaymentService } from "../src/payment-service.js";
import { InMemoryPaymentStore } from "../src/payment-store.js";

describe("payment service regression behavior", () => {
  it("returns the existing charge for a sequential retry", async () => {
    const store = new InMemoryPaymentStore();
    const service = new PaymentService(store);

    const first = await service.charge("retry-42", 100);
    const second = await service.charge("retry-42", 100);

    expect(first.id).toBe(second.id);
    expect(store.countCreated()).toBe(1);
  });

  it("keeps distinct idempotency keys independent", async () => {
    const store = new InMemoryPaymentStore();
    const service = new PaymentService(store);

    await Promise.all([
      service.charge("first", 100),
      service.charge("second", 100),
    ]);

    expect(store.countCreated()).toBe(2);
  });
});
