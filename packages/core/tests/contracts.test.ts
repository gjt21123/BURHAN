import { describe, expect, it } from "vitest";
import { canonicalJson, proofContractSchema, reduceRun, sha256 } from "../src/index.js";

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
          evidenceStrategy: { mode: "test", evidenceClass: "deterministic", requiredAssurance: "proven" },
        },
      ],
      assumptions: [],
      ambiguities: [],
    });

    expect(contract.clauses[0].id).toBe("OUT-001");
  });

  it("canonicalizes object keys before hashing", () => {
    expect(canonicalJson({ b: 2, a: 1 })).toBe(canonicalJson({ a: 1, b: 2 }));
    expect(sha256(canonicalJson({ b: 2, a: 1 }))).toBe(sha256(canonicalJson({ a: 1, b: 2 })));
  });

  it("accepts run events only in their deterministic order", () => {
    const sealed = reduceRun({ state: "DRAFT" }, { type: "CONTRACT_SEALED" });
    expect(sealed.state).toBe("SEALED");
    expect(() => reduceRun({ state: "DRAFT" }, { type: "RECEIPT_ISSUED", receiptId: "r" })).toThrow("Invalid event");
  });
});
