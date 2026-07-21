import { describe, expect, it } from "vitest";
import { buildCounterexamplePacket, buildRepairApproval, verifyCounterexamplePacket, verifyRepairApproval } from "./repair-loop.js";

const contractHash = `sha256:${"a".repeat(64)}`;
const packHash = `sha256:${"b".repeat(64)}`;
const threadId = "019f7d13-bbdc-7ad2-94c7-369d9d8ea590";
const packet = () => buildCounterexamplePacket({ schemaVersion: "1", originalRunId: "live-executor-fixture", contractHash, validatorPackContentHash: packHash, originalVerdict: "rejected", repairAttempt: 1, failedClauses: [{ clauseId: "OUT-001", statement: "Concurrent retries create one charge.", evidenceClass: "deterministic", expectedObservation: "one charge", observedValue: "twenty charges", explanation: "C:\\Users\\person\\.burhan\\validator-pack secret=sk_test_123456789" }], policyViolations: [], provenClausesToPreserve: ["OUT-002", "DOC-001"], candidateSummary: { filesChanged: 0, patchEmpty: true, regressionResult: "fail", documentationResult: "fail" }, hiddenDetailsWithheld: true });

describe("repair loop integrity", () => {
  it("sanitizes and detects counterexample mutation", () => {
    const value = packet();
    expect(verifyCounterexamplePacket(value)).toBe(true);
    expect(JSON.stringify(value)).not.toContain("Users");
    expect(JSON.stringify(value)).not.toContain("validator-pack");
    expect(verifyCounterexamplePacket({ ...value, candidateSummary: { ...value.candidateSummary, filesChanged: 1 } })).toBe(false);
  });
  it("requires a matching one-time human approval", () => {
    const value = packet();
    const approval = buildRepairApproval({ schemaVersion: "1", originalRunId: value.originalRunId, executorThreadId: threadId, contractHash, validatorPackContentHash: packHash, counterexampleHash: value.counterexampleHash, approvedAction: "repair_once", approvedAt: "2026-07-20T00:00:00.000Z", actor: "human" });
    const expected = { executorThreadId: threadId, contractHash, validatorPackContentHash: packHash, originalRunId: value.originalRunId, alreadyRepaired: false };
    expect(verifyRepairApproval(approval, value, expected)).toBe(true);
    expect(verifyRepairApproval(approval, value, { ...expected, alreadyRepaired: true })).toBe(false);
    expect(verifyRepairApproval({ ...approval, executorThreadId: "019f7d13-bbdc-7ad2-94c7-369d9d8ea591" }, value, expected)).toBe(false);
  });
});
