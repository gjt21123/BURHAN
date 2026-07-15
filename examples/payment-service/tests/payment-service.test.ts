import { describe, expect, it } from "vitest";
import { PaymentService } from "../src/payment-service.js";
import { PaymentStore } from "../src/payment-store.js";

describe("payment idempotency counterexample", () => {
  it("reproduces the duplicate-charge race deterministically", async () => {
    const store = new PaymentStore();
    const service = new PaymentService(store);

    await Promise.all(
      Array.from({ length: 20 }, () => service.charge("retry-42", 100)),
    );

    expect(store.countCreated()).toBe(20);
  });

  it("keeps distinct idempotency keys independent", async () => {
    const store = new PaymentStore();
    const service = new PaymentService(store);

    await Promise.all([
      service.charge("first", 100),
      service.charge("second", 100),
    ]);

    expect(store.countCreated()).toBe(2);
  });
});
