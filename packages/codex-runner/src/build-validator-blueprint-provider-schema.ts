import { canonicalJson, sha256, type ProofContract } from "@burhan/core";
import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { strictifyOutputSchema, strictSchemaPreflight, type JsonSchema } from "./strict-output-schema.js";

export const architectProviderSchemaSpecializationVersion = "1";
export type ArchitectProviderSchemaInput = { contract: ProofContract; contractHash: string; repositoryBaselineHash: string; knownPaths: readonly string[] };
export type ArchitectProviderSchema = { schema: JsonSchema; providerSchemaHash: string; allowedPairs: ReadonlyArray<{ clauseId: string; capabilityId: string }> };

const pairs = [
  { clauseId: "OUT-001", capabilityId: "payment.same_key_concurrency" },
  { clauseId: "OUT-002", capabilityId: "payment.distinct_key_independence" },
  { clauseId: "DOC-001", capabilityId: "docs.idempotency_header_present" }
] as const;

export function buildValidatorBlueprintProviderSchema(input: ArchitectProviderSchemaInput): ArchitectProviderSchema {
  const sourcePaths = input.knownPaths.filter((entry) => entry.startsWith("src/"));
  const documentationPaths = input.knownPaths.filter((entry) => entry.startsWith("docs/"));
  const schema = strictifyOutputSchema({
    type: "object",
    properties: {
      schemaVersion: { type: "string", const: "1" },
      contractHash: opaqueConst(input.contractHash, "Opaque sealed contract identifier. Copy exactly; do not derive it."),
      repositoryBaselineHash: opaqueConst(input.repositoryBaselineHash, "Opaque sealed baseline identifier. Copy exactly; do not derive it."),
      subject: subjectSchema(sourcePaths),
      validators: { type: "array", minItems: 3, maxItems: 3, items: { anyOf: pairs.map((pair) => validatorBranch(pair, sourcePaths, documentationPaths)) } },
      uncoveredClauses: { type: "array", maxItems: 0, items: { type: "string", enum: [] } },
      assumptions: { type: "array", items: { type: "string", maxLength: 300 }, maxItems: 32 }
    },
    required: ["schemaVersion", "contractHash", "repositoryBaselineHash", "subject", "validators", "uncoveredClauses", "assumptions"],
    additionalProperties: false
  });
  const preflight = strictSchemaPreflight(schema);
  if (!preflight.valid) throw new Error("Specialized provider schema failed strict preflight.");
  return { schema, providerSchemaHash: sha256(canonicalJson(schema)), allowedPairs: pairs };
}

export async function prepareArchitectProviderSchema(protectedPath: string, input: ArchitectProviderSchemaInput): Promise<ArchitectProviderSchema & { schemaPath: string | null; deterministic: boolean }> {
  const built = buildValidatorBlueprintProviderSchema(input);
  const serialized = canonicalJson(built.schema);
  const deterministic = serialized === canonicalJson(buildValidatorBlueprintProviderSchema(input).schema);
  const schemaPath = path.join(protectedPath, "architect-output-schema.json");
  await writeFile(`${schemaPath}.tmp`, serialized, "utf8");
  await rename(`${schemaPath}.tmp`, schemaPath);
  const reread = JSON.parse(await readFile(schemaPath, "utf8")) as JsonSchema;
  if (!strictSchemaPreflight(reread).valid || canonicalJson(reread) !== serialized) return { ...built, schemaPath: null, deterministic: false };
  return { ...built, schemaPath, deterministic };
}

export function validateArchitectProviderAdmission(value: unknown, input: ArchitectProviderSchemaInput): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!isRecord(value)) return { valid: false, reasons: ["ROOT_INVALID"] };
  if (value.contractHash !== input.contractHash) reasons.push("CONTRACT_HASH_CONST_MISMATCH");
  if (value.repositoryBaselineHash !== input.repositoryBaselineHash) reasons.push("BASELINE_HASH_CONST_MISMATCH");
  if (!validSubject(value.subject, input.knownPaths.filter((entry) => entry.startsWith("src/")))) reasons.push("SUBJECT_NOT_ALLOWED");
  if (!Array.isArray(value.uncoveredClauses) || value.uncoveredClauses.length !== 0) reasons.push("UNCOVERED_CLAUSE_NOT_ALLOWED");
  if (!Array.isArray(value.validators) || value.validators.length !== 3) reasons.push("VALIDATOR_COUNT_INVALID");
  else for (const validator of value.validators) if (!validBranch(validator, input.knownPaths)) reasons.push("VALIDATOR_BRANCH_NOT_ALLOWED");
  return { valid: reasons.length === 0, reasons: [...new Set(reasons)] };
}

function validatorBranch(pair: typeof pairs[number], sourcePaths: readonly string[], documentationPaths: readonly string[]): JsonSchema {
  return { type: "object", properties: { id: { type: "string", minLength: 1, maxLength: 120 }, clauseId: { type: "string", const: pair.clauseId }, capabilityId: { type: "string", const: pair.capabilityId }, subject: subjectSchema(sourcePaths), parameters: parameterSchema(pair.capabilityId, documentationPaths), expectedObservation: { type: "string", minLength: 1, maxLength: 500 }, rationale: { type: "string", minLength: 1, maxLength: 500 } }, required: ["id", "clauseId", "capabilityId", "subject", "parameters", "expectedObservation", "rationale"], additionalProperties: false };
}
function parameterSchema(capabilityId: string, documentationPaths: readonly string[]): JsonSchema {
  if (capabilityId === "payment.same_key_concurrency") return closed({ requestCount: { type: "integer", const: 20 }, expectedCharges: { type: "integer", const: 1 }, key: { type: "string", const: "same-key" }, amount: { type: "number", const: 100 } });
  if (capabilityId === "payment.distinct_key_independence") return closed({ keyCount: { type: "integer", const: 2 }, expectedCharges: { type: "integer", const: 2 }, keys: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 2 }, amount: { type: "number", const: 100 } });
  return closed({ documentationPath: { type: "string", enum: [...documentationPaths] }, requiredTerms: { type: "array", items: { type: "string", enum: ["Idempotency-Key", "POST /payments"] }, minItems: 2, maxItems: 2 } });
}
function subjectSchema(paths: readonly string[]): JsonSchema { return closed({ modulePath: { type: "string", enum: [...paths] }, exportName: { type: "string", const: "PaymentService" } }); }
function closed(properties: JsonSchema): JsonSchema { return { type: "object", properties, required: Object.keys(properties), additionalProperties: false }; }
function opaqueConst(value: string, description: string): JsonSchema { return { type: "string", const: value, description }; }
function validSubject(value: unknown, paths: readonly string[]): boolean { return isRecord(value) && typeof value.modulePath === "string" && paths.includes(value.modulePath) && value.exportName === "PaymentService"; }
function validBranch(value: unknown, paths: readonly string[]): boolean {
  if (!isRecord(value) || !validSubject(value.subject, paths.filter((entry) => entry.startsWith("src/")))) return false;
  const pair = pairs.find((entry) => entry.clauseId === value.clauseId && entry.capabilityId === value.capabilityId);
  if (!pair || !isRecord(value.parameters)) return false;
  const parameters = value.parameters;
  if (pair.capabilityId === "payment.same_key_concurrency") return parameters.requestCount === 20 && parameters.expectedCharges === 1 && parameters.key === "same-key" && parameters.amount === 100;
  if (pair.capabilityId === "payment.distinct_key_independence") return parameters.keyCount === 2 && parameters.expectedCharges === 2 && parameters.amount === 100 && Array.isArray(parameters.keys) && parameters.keys.length === 2;
  return typeof parameters.documentationPath === "string" && paths.includes(parameters.documentationPath) && Array.isArray(parameters.requiredTerms) && parameters.requiredTerms.includes("Idempotency-Key") && parameters.requiredTerms.includes("POST /payments");
}
function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
