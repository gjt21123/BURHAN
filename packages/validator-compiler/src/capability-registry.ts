import type { Clause } from "@burhan/core";

export const trustedCapabilityCompilerVersion = "4A.1";

export type ModelCapabilityId =
  | "payment.same_key_concurrency"
  | "payment.distinct_key_independence"
  | "docs.idempotency_header_present";

type CapabilityDefinition = {
  clauseType: Clause["type"];
  templateName: string;
};

const capabilities: Record<ModelCapabilityId, CapabilityDefinition> = {
  "payment.same_key_concurrency": { clauseType: "outcome", templateName: "same-key-concurrency" },
  "payment.distinct_key_independence": { clauseType: "outcome", templateName: "distinct-key-independence" },
  "docs.idempotency_header_present": { clauseType: "documentation", templateName: "idempotency-header-present" },
};

export const systemOwnedCapabilityIds = new Set([
  "repository.regression_suite",
  "repository.forbidden_paths",
  "repository.package_manifest_unchanged",
  "repository.protected_test_integrity",
]);

export function isModelCapabilityId(value: string): value is ModelCapabilityId {
  return value in capabilities;
}

export function capabilityDefinition(capabilityId: ModelCapabilityId): CapabilityDefinition {
  return capabilities[capabilityId];
}
