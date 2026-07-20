import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { qualificationContract, qualificationContractHash, systemCoveredClauseIds, lintValidatorBlueprint } from "@burhan/validator-compiler";
import { buildValidatorBlueprintProviderSchema, validateArchitectProviderAdmission } from "./build-validator-blueprint-provider-schema.js";
import { validatorBlueprintSchema } from "./schemas.js";

const input = { contract: qualificationContract, contractHash: qualificationContractHash, repositoryBaselineHash: "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", knownPaths: ["src/payment-service.ts", "src/payment-store.ts", "docs/api.md"] };
const valid = { schemaVersion: "1", contractHash: input.contractHash, repositoryBaselineHash: input.repositoryBaselineHash, subject: { modulePath: "src/payment-service.ts", exportName: "PaymentService" }, validators: [
  { id: "same", clauseId: "OUT-001", capabilityId: "payment.same_key_concurrency", subject: { modulePath: "src/payment-service.ts", exportName: "PaymentService" }, parameters: { requestCount: 20, expectedCharges: 1, key: "same-key", amount: 100 }, expectedObservation: "One charge.", rationale: "Required." },
  { id: "distinct", clauseId: "OUT-002", capabilityId: "payment.distinct_key_independence", subject: { modulePath: "src/payment-service.ts", exportName: "PaymentService" }, parameters: { keyCount: 2, expectedCharges: 2, keys: ["one", "two"], amount: 100 }, expectedObservation: "Two charges.", rationale: "Required." },
  { id: "docs", clauseId: "DOC-001", capabilityId: "docs.idempotency_header_present", subject: { modulePath: "src/payment-service.ts", exportName: "PaymentService" }, parameters: { documentationPath: "docs/api.md", requiredTerms: ["Idempotency-Key", "POST /payments"] }, expectedObservation: "Header present.", rationale: "Required." }
], uncoveredClauses: [], assumptions: [] };

describe("run-specialized Architect provider schema", () => {
  it("binds hashes, pairs, paths, parameters, and preserves independent linter validation", async () => {
    const first = buildValidatorBlueprintProviderSchema(input);
    const second = buildValidatorBlueprintProviderSchema(input);
    expect(first.allowedPairs).toHaveLength(3);
    expect(first.providerSchemaHash).toBe(second.providerSchemaHash);
    expect(buildValidatorBlueprintProviderSchema({ ...input, contractHash: "sha256:0000000000000000000000000000000000000000000000000000000000000000" }).providerSchemaHash).not.toBe(first.providerSchemaHash);
    expect(validateArchitectProviderAdmission(valid, input).valid).toBe(true);
    expect(validatorBlueprintSchema.safeParse(valid).success).toBe(true);
    expect(lintValidatorBlueprint(valid, { ...input, systemCoveredClauseIds }).accepted).toBe(true);
    const rejected = JSON.parse(await readFile(new URL("./evals/fixtures/live-architect-rejected-blueprint.json", import.meta.url), "utf8"));
    expect(validateArchitectProviderAdmission(rejected, input).valid).toBe(false);
    for (const mutation of [
      { ...valid, contractHash: "sha256:0000000000000000000000000000000000000000000000000000000000000000" },
      { ...valid, repositoryBaselineHash: "sha256:0000000000000000000000000000000000000000000000000000000000000000" },
      { ...valid, subject: { ...valid.subject, modulePath: "C:/outside.ts" } },
      { ...valid, subject: { ...valid.subject, modulePath: "src/missing.ts" } },
      { ...valid, validators: [{ ...valid.validators[0], clauseId: "payment.same_key_concurrency" }, ...valid.validators.slice(1)] },
      { ...valid, validators: [{ ...valid.validators[0], capabilityId: "payment.distinct_key_independence" }, ...valid.validators.slice(1)] },
      { ...valid, validators: [{ ...valid.validators[0], parameters: { ...valid.validators[0].parameters, requestCount: 1 } }, ...valid.validators.slice(1)] },
      { ...valid, uncoveredClauses: ["OUT-001"] }
    ]) expect(validateArchitectProviderAdmission(mutation, input).valid).toBe(false);
  });
});
