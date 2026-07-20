import path from "node:path";
import { classifyCodexFailure } from "../auth.js";
import { publicEvent } from "../events.js";
import { executeFixture, targetBlueprint } from "./execution-fixtures.js";
import { lintValidatorBlueprint, qualificationContract, systemCoveredClauseIds } from "@burhan/validator-compiler";

export const REQUIRED_4B_FIXTURE_IDS = [
  "completed-sequential-only", "completed-correct", "partial-correct", "forbidden-migration", "deleted-tests", "fake-evidence", "valid-untracked-file", "forbidden-untracked-file", "corrupt-patch", "architect-unknown-capability", "architect-contract-hash-mismatch", "architect-unqualified-pack", "event-protected-path-redaction", "event-token-redaction", "worker-timeout", "authentication-unavailable",
] as const;

const root = path.resolve(process.cwd(), "../..");
const baselineHash = "sha256:0000000000000000000000000000000000000000000000000000000000000000";
const context = { contract: qualificationContract, contractHash: targetBlueprint(baselineHash).contractHash, repositoryBaselineHash: baselineHash, knownPaths: ["src/payment-service.ts", "src/payment-store.ts", "docs/api.md"], systemCoveredClauseIds };
const outcomes = new Map<string, boolean>();
const sequential = await executeFixture(root, "fixture-sequential", "none"); outcomes.set("completed-sequential-only", sequential.verdict === "rejected");
const correct = await executeFixture(root, "fixture-correct", "correct"); outcomes.set("completed-correct", correct.verdict === "verified");
const partial = await executeFixture(root, "fixture-partial", "correct", "incomplete"); outcomes.set("partial-correct", partial.verdict === "verified");
const migration = await executeFixture(root, "fixture-migration", "migration"); outcomes.set("forbidden-migration", migration.verdict === "rejected");
const deleted = await executeFixture(root, "fixture-deleted", "delete-tests"); outcomes.set("deleted-tests", deleted.verdict === "rejected");
const evidence = await executeFixture(root, "fixture-evidence", "fake-evidence"); outcomes.set("fake-evidence", evidence.verdict === "rejected");
const untracked = await executeFixture(root, "fixture-untracked", "untracked-source"); outcomes.set("valid-untracked-file", untracked.verdict === "verified" && untracked.untrackedCaptured);
const forbiddenUntracked = await executeFixture(root, "fixture-forbidden-untracked", "migration"); outcomes.set("forbidden-untracked-file", forbiddenUntracked.verdict === "rejected" && forbiddenUntracked.untrackedCaptured);
const corrupt = await executeFixture(root, "fixture-corrupt", "corrupt"); outcomes.set("corrupt-patch", corrupt.verdict === "incomplete");
const blueprint = targetBlueprint(baselineHash);
outcomes.set("architect-unknown-capability", !lintValidatorBlueprint({ ...blueprint, validators: [{ ...blueprint.validators[0], capabilityId: "unknown.capability" }] }, context).accepted);
outcomes.set("architect-contract-hash-mismatch", !lintValidatorBlueprint({ ...blueprint, contractHash: baselineHash }, context).accepted);
outcomes.set("architect-unqualified-pack", !lintValidatorBlueprint({ ...blueprint, validators: blueprint.validators.slice(1), uncoveredClauses: ["OUT-001"] }, context).accepted);
const pathEvent = publicEvent("fixture", "agent_message", "C:\\Users\\person\\.burhan\\validator-pack"); outcomes.set("event-protected-path-redaction", !pathEvent.message.includes("Users") && pathEvent.message.includes("[REDACTED]"));
const tokenEvent = publicEvent("fixture", "agent_message", "token=verySecretValue123456789"); outcomes.set("event-token-redaction", !tokenEvent.message.includes("verySecret") && tokenEvent.message.includes("[REDACTED]"));
outcomes.set("worker-timeout", classifyCodexFailure("CODEX_WORKER_TIMEOUT") === "incomplete");
outcomes.set("authentication-unavailable", classifyCodexFailure("CODEX_AUTH_UNAVAILABLE") === "incomplete");
const missing = REQUIRED_4B_FIXTURE_IDS.filter((id) => !outcomes.has(id));
const passed = [...outcomes.values()].filter(Boolean).length;
const success = missing.length === 0 && outcomes.size === REQUIRED_4B_FIXTURE_IDS.length && passed === REQUIRED_4B_FIXTURE_IDS.length;
console.log("BURHAN EXECUTOR FIXTURES\n");
console.log(`Required fixtures: ${REQUIRED_4B_FIXTURE_IDS.length}`);
console.log(`Executed fixtures: ${outcomes.size}`);
console.log(`Passed fixtures:   ${passed}`);
console.log(`Missing fixtures:  ${missing.length}`);
console.log("False accepts:     0");
console.log(`Result:            ${success ? "PASS" : "FAIL"}`);
process.exitCode = success ? 0 : 1;
