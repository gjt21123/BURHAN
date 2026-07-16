import { canonicalJson, sha256, type ProofContract } from "@burhan/core";
import type { ValidatorBlueprint } from "@burhan/codex-runner";
import type { BlueprintLintContext } from "./blueprint-linter.js";

export const qualificationContract: ProofContract = {
  id: "payment-validator-qualification-v1",
  version: 1,
  title: "Payment idempotency validator qualification",
  goal: "Verify concurrent payment idempotency without trusting generated test code.",
  scope: {
    allowedPaths: ["examples/payment-service/src/**", "examples/payment-service/docs/**"],
    forbiddenPaths: ["examples/payment-service/db/migrations/**", "examples/payment-service/tests/**", "package.json", "package-lock.json"],
    networkAccess: "disabled",
    maxRepairAttempts: 0,
  },
  clauses: [
    { id: "OUT-001", type: "outcome", statement: "Twenty concurrent same-key requests create one charge.", severity: "critical", evidenceStrategy: { mode: "test", evidenceClass: "deterministic", requiredAssurance: "proven" } },
    { id: "OUT-002", type: "outcome", statement: "Two distinct idempotency keys create independent charges.", severity: "high", evidenceStrategy: { mode: "test", evidenceClass: "deterministic", requiredAssurance: "proven" } },
    { id: "DOC-001", type: "documentation", statement: "API documentation names the Idempotency-Key header.", severity: "high", evidenceStrategy: { mode: "static_analysis", evidenceClass: "deterministic", requiredAssurance: "proven" } },
    { id: "INV-001", type: "invariant", statement: "The sealed regression suite remains passing.", severity: "high", evidenceStrategy: { mode: "test", evidenceClass: "deterministic", requiredAssurance: "proven" } },
    { id: "PRO-001", type: "prohibition", statement: "Migration files remain unchanged.", severity: "critical", evidenceStrategy: { mode: "diff_check", evidenceClass: "deterministic", requiredAssurance: "proven" } },
    { id: "PRO-002", type: "prohibition", statement: "Protected tests and package manifests remain unchanged.", severity: "critical", evidenceStrategy: { mode: "file_hash", evidenceClass: "deterministic", requiredAssurance: "proven" } },
  ],
  assumptions: [],
  ambiguities: [],
};

export const qualificationContractHash = sha256(canonicalJson(qualificationContract));
export const qualificationBaselineHash = sha256("milestone-3-validator-qualification-baseline");
export const qualificationKnownPaths = [
  "examples/payment-service/src/payment-service.ts",
  "examples/payment-service/src/payment-store.ts",
  "examples/payment-service/docs/api.md",
];
export const systemCoveredClauseIds = ["INV-001", "PRO-001", "PRO-002"];

export function qualificationLintContext(): BlueprintLintContext {
  return {
    contract: qualificationContract,
    contractHash: qualificationContractHash,
    repositoryBaselineHash: qualificationBaselineHash,
    knownPaths: qualificationKnownPaths,
    systemCoveredClauseIds,
  };
}

export function validValidatorBlueprint(): ValidatorBlueprint {
  const subject = { modulePath: "examples/payment-service/src/payment-service.ts", exportName: "PaymentService" };
  return {
    schemaVersion: "1",
    contractHash: qualificationContractHash,
    repositoryBaselineHash: qualificationBaselineHash,
    subject,
    validators: [
      { id: "same-key-concurrency", clauseId: "OUT-001", capabilityId: "payment.same_key_concurrency", subject, parameters: { requestCount: 20, expectedCharges: 1, key: "same-key", amount: 100 }, expectedObservation: "Exactly one charge is created for twenty concurrent same-key requests.", rationale: "Sealed critical outcome." },
      { id: "distinct-key-independence", clauseId: "OUT-002", capabilityId: "payment.distinct_key_independence", subject, parameters: { keyCount: 2, expectedCharges: 2, keys: ["one", "two"], amount: 100 }, expectedObservation: "Two distinct keys create two charges.", rationale: "Sealed independent-key outcome." },
      { id: "documentation-header", clauseId: "DOC-001", capabilityId: "docs.idempotency_header_present", subject, parameters: { documentationPath: "examples/payment-service/docs/api.md", requiredTerms: ["Idempotency-Key", "POST /payments"] }, expectedObservation: "Documentation contains the required header and endpoint terms.", rationale: "Sealed documentation outcome." },
    ],
    uncoveredClauses: [],
    assumptions: [],
  };
}

export function cloneBlueprint(blueprint = validValidatorBlueprint()): ValidatorBlueprint {
  return JSON.parse(JSON.stringify(blueprint)) as ValidatorBlueprint;
}
