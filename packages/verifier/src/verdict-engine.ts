import type { EvidenceRecord, ProofContract, RunVerdict } from "@burhan/core";
import type { ExecutionAssurance } from "./runner.js";

export type IntegrityStatus = "intact" | "tampered" | "unknown";
export type LocalRunVerdict = { contractVerdict: RunVerdict; integrityStatus: IntegrityStatus; executionAssurance: ExecutionAssurance };

export function evaluateRun(
  contract: ProofContract,
  evidenceRecords: EvidenceRecord[],
  policyViolations: string[],
  runnerStatus: { trustedIsolation: boolean; infrastructureFailure: boolean },
): LocalRunVerdict {
  if (!runnerStatus.trustedIsolation || runnerStatus.infrastructureFailure) return { contractVerdict: "incomplete", integrityStatus: "unknown", executionAssurance: "local_trusted" };
  if (policyViolations.includes("protected-artifact-tampering")) return { contractVerdict: "incomplete", integrityStatus: "tampered", executionAssurance: "local_trusted" };
  if (policyViolations.length > 0) return { contractVerdict: "rejected", integrityStatus: "intact", executionAssurance: "local_trusted" };
  for (const clause of contract.clauses) {
    const evidence = evidenceRecords.filter((record) => record.clauseId === clause.id);
    if (evidence.length === 0 || evidence.some((record) => record.status === "blocked")) return { contractVerdict: "incomplete", integrityStatus: "intact", executionAssurance: "local_trusted" };
    if (evidence.some((record) => record.status === "fail")) return { contractVerdict: "rejected", integrityStatus: "intact", executionAssurance: "local_trusted" };
    if (clause.severity === "critical" && evidence.some((record) => record.assurance !== "proven")) return { contractVerdict: "incomplete", integrityStatus: "intact", executionAssurance: "local_trusted" };
  }
  return { contractVerdict: "verified", integrityStatus: "intact", executionAssurance: "local_trusted" };
}
