import path from "node:path";
import { validatorBlueprintSchema, type ValidatorBlueprint } from "@burhan/codex-runner";
import type { ProofContract } from "@burhan/core";
import { capabilityDefinition, isModelCapabilityId, systemOwnedCapabilityIds } from "./capability-registry.js";

export type BlueprintLintIssue = {
  code: string;
  message: string;
  validatorId: string | null;
};

export type BlueprintLintContext = {
  contract: ProofContract;
  contractHash: string;
  repositoryBaselineHash: string;
  knownPaths: readonly string[];
  systemCoveredClauseIds: readonly string[];
};

export type BlueprintLintResult = {
  accepted: boolean;
  issues: BlueprintLintIssue[];
  blueprint: ValidatorBlueprint | null;
};

const forbiddenKey = /(?:command|executable|shell|script|powershell|environment|(?:^|_)env(?:$|_)|evidencerecord|proofreceipt|verdict|qualification|control|oracle|typescript|sourcecode|arbitrarycode)/i;
const commandValue = /(?:^|\s)(?:powershell|cmd(?:\.exe)?|bash|zsh|sh)(?:\s|$)/i;
const exportName = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

export function lintValidatorBlueprint(input: unknown, context: BlueprintLintContext): BlueprintLintResult {
  const parsed = validatorBlueprintSchema.safeParse(input);
  if (!parsed.success) return { accepted: false, issues: [issue("SCHEMA_INVALID", "Blueprint does not match the structured schema.", null)], blueprint: null };

  const blueprint = parsed.data;
  const issues: BlueprintLintIssue[] = [];
  if (blueprint.contractHash !== context.contractHash) issues.push(issue("CONTRACT_HASH_MISMATCH", "Blueprint contract hash differs from the sealed contract.", null));
  if (blueprint.repositoryBaselineHash !== context.repositoryBaselineHash) issues.push(issue("BASELINE_HASH_MISMATCH", "Blueprint baseline hash differs from the sealed baseline.", null));
  scanUntrustedValues(blueprint, issues);
  validateSubject(blueprint.subject, context.knownPaths, issues, null);

  const clauses = new Map(context.contract.clauses.map((clause) => [clause.id, clause]));
  const seen = new Map<string, ValidatorBlueprint["validators"][number]>();
  const covered = new Set<string>();
  for (const validator of blueprint.validators) {
    const clause = clauses.get(validator.clauseId);
    if (!clause) {
      issues.push(issue("UNKNOWN_CLAUSE", "Validator references a clause outside the sealed contract.", validator.id));
      continue;
    }
    if (systemOwnedCapabilityIds.has(validator.capabilityId) || clause.type === "prohibition" || clause.type === "invariant") {
      issues.push(issue("SYSTEM_OWNED_VALIDATOR", "Prohibitions and invariants remain BURHAN-owned validators.", validator.id));
      continue;
    }
    if (!isModelCapabilityId(validator.capabilityId)) {
      issues.push(issue("UNKNOWN_CAPABILITY", "Validator capability is not in the trusted capability registry.", validator.id));
      continue;
    }
    if (capabilityDefinition(validator.capabilityId).clauseType !== clause.type) {
      issues.push(issue("CAPABILITY_CLAUSE_MISMATCH", "Capability cannot verify this clause type.", validator.id));
      continue;
    }
    validateSubject(validator.subject, context.knownPaths, issues, validator.id);
    validateParameters(validator, context.knownPaths, issues);
    const key = `${validator.clauseId}:${validator.capabilityId}`;
    const prior = seen.get(key);
    if (prior) {
      issues.push(issue(sameValidator(prior, validator) ? "DUPLICATE_VALIDATOR" : "CONFLICTING_VALIDATOR", "A clause may have one unambiguous trusted capability binding.", validator.id));
    } else {
      seen.set(key, validator);
      covered.add(validator.clauseId);
    }
  }

  for (const clauseId of blueprint.uncoveredClauses) {
    const clause = clauses.get(clauseId);
    if (!clause) issues.push(issue("UNKNOWN_UNCOVERED_CLAUSE", "Uncovered clause is not in the sealed contract.", null));
    else if (clause.severity === "critical") issues.push(issue("CRITICAL_CLAUSE_UNCOVERED", "Critical outcomes cannot be left uncovered.", null));
  }
  for (const clause of context.contract.clauses) {
    if (context.systemCoveredClauseIds.includes(clause.id)) continue;
    if (!covered.has(clause.id) && !blueprint.uncoveredClauses.includes(clause.id)) issues.push(issue(clause.severity === "critical" ? "CRITICAL_CLAUSE_UNCOVERED" : "REQUIRED_CLAUSE_UNCOVERED", "Required contract clause lacks validator coverage.", null));
  }
  return { accepted: issues.length === 0, issues, blueprint };
}

function validateSubject(subject: ValidatorBlueprint["subject"], knownPaths: readonly string[], issues: BlueprintLintIssue[], validatorId: string | null): void {
  if (isAbsolute(subject.modulePath)) issues.push(issue("ABSOLUTE_PATH", "Absolute paths are not allowed in blueprints.", validatorId));
  else if (!knownPaths.includes(subject.modulePath)) issues.push(issue("UNKNOWN_REPOSITORY_PATH", "Subject path is absent from the RepositoryFactPack.", validatorId));
  if (!exportName.test(subject.exportName)) issues.push(issue("MALFORMED_SUBJECT_EXPORT", "Subject export must be a valid identifier.", validatorId));
}

function validateParameters(validator: ValidatorBlueprint["validators"][number], knownPaths: readonly string[], issues: BlueprintLintIssue[]): void {
  const parameters = validator.parameters as Record<string, unknown>;
  if (containsSemanticEvidence(parameters)) issues.push(issue("SEMANTIC_EVIDENCE_DISALLOWED", "A deterministic capability cannot be weakened to semantic evidence.", validator.id));
  if (parameters.baselinePasses === true || parameters.acceptBaseline === true) issues.push(issue("TAUTOLOGICAL_VALIDATOR", "A validator cannot use baseline acceptance as its oracle.", validator.id));
  if (typeof parameters.implementationStrategy === "string") issues.push(issue("OVERFIT_VALIDATOR", "A validator cannot target one implementation strategy.", validator.id));
  if (validator.capabilityId === "payment.same_key_concurrency") {
    rejectUnexpectedParameters(parameters, ["requestCount", "expectedCharges", "key", "amount"], validator.id, issues);
    if (parameters.requestCount !== 20) issues.push(issue("WEAK_REQUEST_COUNT", "Same-key concurrency requires exactly twenty requests.", validator.id));
    if (parameters.expectedCharges !== 1) issues.push(issue("WEAK_EXPECTED_RESULT", "Same-key concurrency requires exactly one charge.", validator.id));
  }
  if (validator.capabilityId === "payment.distinct_key_independence") {
    rejectUnexpectedParameters(parameters, ["keyCount", "expectedCharges", "keys", "amount"], validator.id, issues);
    if (parameters.keyCount !== 2) issues.push(issue("WEAK_REQUEST_COUNT", "Distinct-key validation requires exactly two independent keys.", validator.id));
    if (parameters.expectedCharges !== 2) issues.push(issue("WEAK_EXPECTED_RESULT", "Distinct-key validation requires two charges.", validator.id));
  }
  if (validator.capabilityId === "docs.idempotency_header_present") {
    rejectUnexpectedParameters(parameters, ["documentationPath", "requiredTerms"], validator.id, issues);
    const documentationPath = parameters.documentationPath;
    if (typeof documentationPath !== "string" || isAbsolute(documentationPath)) issues.push(issue("ABSOLUTE_PATH", "Documentation path must be a known relative path.", validator.id));
    else if (!knownPaths.includes(documentationPath)) issues.push(issue("UNKNOWN_REPOSITORY_PATH", "Documentation path is absent from the RepositoryFactPack.", validator.id));
    const terms = parameters.requiredTerms;
    if (!Array.isArray(terms) || !terms.includes("Idempotency-Key")) issues.push(issue("WEAK_EXPECTED_RESULT", "Documentation validator must require the Idempotency-Key term.", validator.id));
  }
}

function rejectUnexpectedParameters(parameters: Record<string, unknown>, allowed: readonly string[], validatorId: string, issues: BlueprintLintIssue[]): void {
  for (const key of Object.keys(parameters)) if (!allowed.includes(key)) issues.push(issue("UNSUPPORTED_PARAMETER", "Capability parameters must use the bounded trusted schema.", validatorId));
}

function scanUntrustedValues(value: unknown, issues: BlueprintLintIssue[], currentValidatorId: string | null = null, keyName = ""): void {
  if (forbiddenKey.test(keyName)) issues.push(issue("FORBIDDEN_MODEL_FIELD", "Blueprints cannot carry commands, environments, evidence, verdicts, controls, or source code.", currentValidatorId));
  if (typeof value === "string") {
    if (isAbsolute(value)) issues.push(issue("ABSOLUTE_PATH", "Absolute paths are not allowed in blueprints.", currentValidatorId));
    if (commandValue.test(value)) issues.push(issue("FORBIDDEN_COMMAND_VALUE", "Command-like values are not allowed in blueprints.", currentValidatorId));
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) scanUntrustedValues(item, issues, currentValidatorId, keyName);
    return;
  }
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    const validatorId = typeof object.id === "string" && "capabilityId" in object ? object.id : currentValidatorId;
    for (const [key, item] of Object.entries(object)) scanUntrustedValues(item, issues, validatorId, key);
  }
}

function containsSemanticEvidence(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsSemanticEvidence);
  if (!value || typeof value !== "object") return false;
  return Object.entries(value as Record<string, unknown>).some(([key, item]) => (key === "evidenceMode" && item === "semantic") || containsSemanticEvidence(item));
}

function isAbsolute(candidate: string): boolean {
  return path.isAbsolute(candidate) || /^[A-Za-z]:[\\/]/.test(candidate) || candidate.startsWith("\\\\");
}

function sameValidator(left: ValidatorBlueprint["validators"][number], right: ValidatorBlueprint["validators"][number]): boolean {
  return JSON.stringify(left.parameters) === JSON.stringify(right.parameters) && left.expectedObservation === right.expectedObservation;
}

function issue(code: string, message: string, validatorId: string | null): BlueprintLintIssue {
  return { code, message, validatorId };
}
