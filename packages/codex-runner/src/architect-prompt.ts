import type { ValidatorBlueprint } from "./schemas.js";

export function buildArchitectPrompt(contractHash: string, repositoryBaselineHash: string): string {
  const example: ValidatorBlueprint = {
    schemaVersion: "1",
    contractHash,
    repositoryBaselineHash,
    subject: { modulePath: "src/payment-service.ts", exportName: "PaymentService" },
    validators: [
      { id: "same-key", clauseId: "OUT-001", capabilityId: "payment.same_key_concurrency", subject: { modulePath: "src/payment-service.ts", exportName: "PaymentService" }, parameters: { requestCount: 20, expectedCharges: 1, key: "same-key", amount: 100 }, expectedObservation: "One charge is created for twenty concurrent requests with the same key.", rationale: "Covers the sealed same-key outcome." },
      { id: "distinct-key", clauseId: "OUT-002", capabilityId: "payment.distinct_key_independence", subject: { modulePath: "src/payment-service.ts", exportName: "PaymentService" }, parameters: { keyCount: 2, expectedCharges: 2, keys: ["one", "two"], amount: 100 }, expectedObservation: "Two independent keys create two charges.", rationale: "Covers the sealed distinct-key outcome." },
      { id: "documentation", clauseId: "DOC-001", capabilityId: "docs.idempotency_header_present", subject: { modulePath: "src/payment-service.ts", exportName: "PaymentService" }, parameters: { documentationPath: "docs/api.md", requiredTerms: ["Idempotency-Key", "POST /payments"] }, expectedObservation: "Documentation includes the required header and endpoint terms.", rationale: "Covers the sealed documentation outcome." },
    ],
    uncoveredClauses: [],
    assumptions: [],
  };
  return `FINAL OUTPUT CONTRACT: Return exactly one JSON object. The JSON root itself is the ValidatorBlueprint; never use error, result, data, blueprint, response, success, or any wrapper. No Markdown, code fences, comments, prose, or keys outside the schema. The root must contain exactly schemaVersion, contractHash, repositoryBaselineHash, subject, validators, uncoveredClauses, assumptions. Copy opaque contractHash and repositoryBaselineHash exactly. clauseId is OUT-001, OUT-002, or DOC-001; capabilityId is separate. Never put capabilityId in clauseId. Return validators for all three required pairs: OUT-001/payment.same_key_concurrency, OUT-002/payment.distinct_key_independence, DOC-001/docs.idempotency_header_present. Use this schema-valid compact example, replacing only fields justified by the sealed inputs: ${JSON.stringify(example)}`;
}
