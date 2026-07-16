import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { lintValidatorBlueprint } from "../blueprint-linter.js";
import { cloneBlueprint, qualificationLintContext, validValidatorBlueprint } from "../fixtures.js";
import { compileTrustedValidatorPack, verifyTrustedValidatorPack } from "../validator-pack.js";

type Fixture = { id: string; expectedCode?: string; mutate: (blueprint: ReturnType<typeof validValidatorBlueprint>) => unknown };
const fixtures: Fixture[] = [
  { id: "valid-blueprint", mutate: (blueprint) => blueprint },
  { id: "unknown-capability", expectedCode: "UNKNOWN_CAPABILITY", mutate: (blueprint) => ({ ...blueprint, validators: [{ ...blueprint.validators[0], capabilityId: "payment.invented" }] }) },
  { id: "invented-repository-path", expectedCode: "UNKNOWN_REPOSITORY_PATH", mutate: (blueprint) => ({ ...blueprint, subject: { ...blueprint.subject, modulePath: "examples/payment-service/src/invented.ts" } }) },
  { id: "absolute-path", expectedCode: "ABSOLUTE_PATH", mutate: (blueprint) => ({ ...blueprint, subject: { ...blueprint.subject, modulePath: "C:/outside/payment-service.ts" } }) },
  { id: "contract-hash-mismatch", expectedCode: "CONTRACT_HASH_MISMATCH", mutate: (blueprint) => ({ ...blueprint, contractHash: "sha256:0000000000000000000000000000000000000000000000000000000000000000" }) },
  { id: "baseline-hash-mismatch", expectedCode: "BASELINE_HASH_MISMATCH", mutate: (blueprint) => ({ ...blueprint, repositoryBaselineHash: "sha256:0000000000000000000000000000000000000000000000000000000000000000" }) },
  { id: "weakened-concurrency-count", expectedCode: "WEAK_REQUEST_COUNT", mutate: (blueprint) => ({ ...blueprint, validators: [{ ...blueprint.validators[0], parameters: { ...blueprint.validators[0].parameters, requestCount: 1 } }, ...blueprint.validators.slice(1)] }) },
  { id: "missing-critical-clause", expectedCode: "CRITICAL_CLAUSE_UNCOVERED", mutate: (blueprint) => ({ ...blueprint, validators: blueprint.validators.slice(1), uncoveredClauses: ["OUT-001"] }) },
  { id: "nested-command", expectedCode: "FORBIDDEN_MODEL_FIELD", mutate: (blueprint) => ({ ...blueprint, validators: [{ ...blueprint.validators[0], parameters: { ...blueprint.validators[0].parameters, nested: { command: "powershell -NoProfile" } } }, ...blueprint.validators.slice(1)] }) },
  { id: "tautological-baseline", expectedCode: "TAUTOLOGICAL_VALIDATOR", mutate: (blueprint) => ({ ...blueprint, validators: [{ ...blueprint.validators[0], parameters: { ...blueprint.validators[0].parameters, baselinePasses: true } }, ...blueprint.validators.slice(1)] }) },
  { id: "misses-sequential-only", expectedCode: "WEAK_REQUEST_COUNT", mutate: (blueprint) => ({ ...blueprint, validators: [{ ...blueprint.validators[0], parameters: { ...blueprint.validators[0].parameters, requestCount: 1 } }, ...blueprint.validators.slice(1)] }) },
  { id: "overfit-second-correct", expectedCode: "OVERFIT_VALIDATOR", mutate: (blueprint) => ({ ...blueprint, validators: [{ ...blueprint.validators[0], parameters: { ...blueprint.validators[0].parameters, implementationStrategy: "keyed-lock" } }, ...blueprint.validators.slice(1)] }) },
  { id: "documentation-terms-missing", expectedCode: "WEAK_EXPECTED_RESULT", mutate: (blueprint) => ({ ...blueprint, validators: [...blueprint.validators.slice(0, 2), { ...blueprint.validators[2], parameters: { documentationPath: "examples/payment-service/docs/api.md", requiredTerms: ["payments"] } }] }) },
  { id: "prohibition-model-owned", expectedCode: "SYSTEM_OWNED_VALIDATOR", mutate: (blueprint) => ({ ...blueprint, validators: [...blueprint.validators, { ...blueprint.validators[0], id: "forbidden-paths", clauseId: "PRO-001", capabilityId: "repository.forbidden_paths" }] }) },
  { id: "pack-mutation", mutate: (blueprint) => blueprint },
  { id: "duplicate-conflict", expectedCode: "CONFLICTING_VALIDATOR", mutate: (blueprint) => ({ ...blueprint, validators: [...blueprint.validators, { ...blueprint.validators[0], id: "same-key-conflict", parameters: { ...blueprint.validators[0].parameters, amount: 999 } }] }) },
];

let passed = 0;
for (const fixture of fixtures) {
  const blueprint = fixture.mutate(cloneBlueprint());
  if (fixture.id === "pack-mutation") {
    const stage = await mkdtemp(path.join(os.tmpdir(), "burhan-blueprint-fixture-"));
    try {
      const result = await compileTrustedValidatorPack(path.join(stage, "pack"), blueprint as ReturnType<typeof validValidatorBlueprint>, qualificationLintContext());
      await verifyTrustedValidatorPack(path.join(stage, "pack"));
      const target = path.join(stage, "pack", result.manifest.validators[0].relativePath);
      await writeFile(target, `${await readFile(target, "utf8")}tampered\n`, "utf8");
      await verifyTrustedValidatorPack(path.join(stage, "pack")).then(() => false, () => true).then((detected) => { if (detected) passed += 1; });
    } finally {
      await rm(stage, { recursive: true, force: true });
    }
    continue;
  }
  const result = lintValidatorBlueprint(blueprint, qualificationLintContext());
  const expected = fixture.expectedCode;
  if ((expected === undefined && result.accepted) || (expected !== undefined && result.issues.some((issue) => issue.code === expected))) passed += 1;
}

console.log("BURHAN CODEX BLUEPRINT FIXTURES\n");
console.log(`Cases:                           ${fixtures.length}`);
console.log(`Accepted or safely rejected:     ${passed} / ${fixtures.length}`);
console.log("Live Codex calls:                0");
console.log(`\nRESULT: ${passed === fixtures.length ? "PASS" : "FAIL"}`);
process.exitCode = passed === fixtures.length ? 0 : 1;
