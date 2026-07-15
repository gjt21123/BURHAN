import { describe, expect, it } from "vitest";
import { proofContractSchema, transition } from "../src/index.js";

describe("proof contract", () => {
  it("accepts a bounded, deterministic payment requirement", () => {
    const contract = proofContractSchema.parse({
      id: "payment-idempotency-v1",
      version: 1,
      title: "Prevent duplicate payment retries",
      goal: "Make concurrent retries idempotent.",
      scope: {
        allowedPaths: ["src/**", "docs/**", "tests/**"],
        forbiddenPaths: ["db/migrations/**"],
        networkAccess: "disabled",
        maxRepairAttempts: 1,
      },
      clauses: [
        {
          id: "OUT-001",
          type: "outcome",
          statement: "Twenty concurrent same-key retries create one charge.",
          severity: "critical",
          evidenceStrategy: { mode: "test", deterministic: true },
        },
      ],
      assumptions: [],
      ambiguities: [],
    });

    expect(contract.clauses[0].id).toBe("OUT-001");
  });

  it("allows repair only after verification", () => {
    expect(transition("VERIFYING", "REPAIRING")).toBe("REPAIRING");
    expect(() => transition("DRAFT", "VERIFIED")).toThrow("Invalid BURHAN state transition");
  });
});
