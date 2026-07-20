import { mkdir } from "node:fs/promises";
import path from "node:path";
import { codexAuthenticationPreflight } from "../auth.js";
import { canonicalJson, sha256 } from "@burhan/core";
import { lintValidatorBlueprint, qualificationContract, qualificationContractHash, systemCoveredClauseIds } from "@burhan/validator-compiler";
import { createTargetWorkspace, getRunsRoot } from "@burhan/workspace";
import { validatorBlueprintSchema } from "../schemas.js";
import { runCodexWorker } from "../worker-client.js";
import { offlineArchitectPreflight } from "../offline-preflight.js";
import { normalizeProviderValidatorBlueprint } from "../provider-output-schema.js";
import { strictSchemaPreflight, type StrictSchemaPreflight } from "../strict-output-schema.js";
import { buildValidatorBlueprintProviderSchema, prepareArchitectProviderSchema } from "../build-validator-blueprint-provider-schema.js";
import { buildArchitectPrompt } from "../architect-prompt.js";

const authentication = await codexAuthenticationPreflight();
let result: Awaited<ReturnType<typeof runCodexWorker>> | null = null;
let blueprintValid = false;
let lintAccepted = false;
let preflight: Array<{ name: string; passed: boolean }> = [];
let schemaPreflight: StrictSchemaPreflight = strictSchemaPreflight(buildValidatorBlueprintProviderSchema({ contract: qualificationContract, contractHash: qualificationContractHash, repositoryBaselineHash: "sha256:0000000000000000000000000000000000000000000000000000000000000000", knownPaths: ["src/payment-service.ts", "src/payment-store.ts", "docs/api.md"] }).schema);
let schemaDeterministic = false;
let preflightBlocked = false;
if (authentication === "AVAILABLE") {
  const root = path.resolve(process.cwd(), "../.."); const runId = `live-architect-${Date.now()}`;
  const architect = await createTargetWorkspace(root, runId, "architect");
  const protectedPath = path.join(getRunsRoot(root), runId, "codex-output"); await mkdir(protectedPath, { recursive: true });
  const baselineHash = sha256(canonicalJson(architect.baselineManifest));
  const input = { contract: qualificationContract, contractHash: qualificationContractHash, repositoryBaselineHash: baselineHash, knownPaths: ["src/payment-service.ts", "src/payment-store.ts", "docs/api.md"] };
  const prompt = buildArchitectPrompt(qualificationContractHash, baselineHash);
  const preparedSchema = await prepareArchitectProviderSchema(protectedPath, input);
  schemaPreflight = strictSchemaPreflight(preparedSchema.schema);
  schemaDeterministic = preparedSchema.deterministic;
  preflight = await offlineArchitectPreflight(architect.path, protectedPath, preparedSchema.schema, prompt, 120_000);
  preflightBlocked = !preparedSchema.schemaPath || !schemaPreflight.valid || !preflight.every((check) => check.passed);
  if (!preflightBlocked) {
    const workerResult = await runCodexWorker({ runId, role: "validator_architect", workspacePath: architect.path, protectedPath, schemaPath: preparedSchema.schemaPath, outputMode: "validated_json", timeoutMs: 120_000, prompt });
    result = workerResult;
    if (workerResult.ok && workerResult.finalOutput) {
      const raw = safeJson(workerResult.finalOutput); const rootValid = isBlueprintRoot(raw); const parsed = rootValid ? validatorBlueprintSchema.safeParse(normalizeProviderValidatorBlueprint(raw)) : null;
      blueprintValid = parsed?.success === true;
      if (parsed?.success) lintAccepted = lintValidatorBlueprint(parsed.data, { contract: qualificationContract, contractHash: qualificationContractHash, repositoryBaselineHash: baselineHash, knownPaths: ["src/payment-service.ts", "src/payment-store.ts", "docs/api.md"], systemCoveredClauseIds }).accepted;
    }
  }
}
const lifecycle = result?.lifecycle;
const qualificationStatus = blueprintValid && lintAccepted ? "NOT_EXECUTED" : "NOT_REACHED";
const executorStatus = qualificationStatus === "NOT_EXECUTED" ? "NOT_ELIGIBLE" : "NOT_REACHED";
const finalCategory = result?.category ?? (blueprintValid && lintAccepted ? "ARCHITECT_PIPELINE_INCOMPLETE" : preflightBlocked ? "CODEX_OUTPUT_SCHEMA_PREFLIGHT_FAILED" : authentication === "AVAILABLE" ? "CODEX_OUTPUT_SCHEMA_INVALID" : "CODEX_AUTH_UNAVAILABLE");
console.log("BURHAN LIVE CODEX EVALUATION\n");
console.log("Previous lifecycle artifact:    NONE_RETAINED");
for (const check of preflight) console.log(`Preflight ${check.name}: ${check.passed ? "PASS" : "FAIL"}`);
console.log(`Strict schema preflight:        ${schemaPreflight.valid ? "PASS" : "FAIL"}`);
console.log(`Strict schema deterministic:    ${schemaDeterministic ? "PASS" : "FAIL"}`);
if (!schemaPreflight.valid) console.log(`Strict schema issues:           ${schemaPreflight.issues.map((issue) => `${issue.code}@${issue.pointer}`).join(",")}`);
console.log(`Codex authentication:          ${authentication}`);
console.log(`Architect thread started:      ${lifecycle?.threadStarted ? "YES" : "NO"}`);
console.log(`Architect thread ID:           ${lifecycle?.threadId ?? "N/A"}`);
console.log(`Architect turn started:        ${lifecycle?.turnStarted ? "YES" : "NO"}`);
console.log(`Architect turn completed:      ${lifecycle?.turnCompleted ? "YES" : "NO"}`);
console.log(`Architect blueprint valid:     ${blueprintValid ? "YES" : "NO"}`);
console.log(`Blueprint linter accepted:     ${lintAccepted ? "YES" : "NO"}`);
console.log(`Validator pack qualified:      ${qualificationStatus}`);
console.log(`Executor thread started:       ${executorStatus}`);
console.log(`Final output artifact:         ${result?.finalOutputHash ? "PRESENT" : "MISSING"}`);
console.log(`Final output hash:             ${result?.finalOutputHash ?? "N/A"}`);
console.log(`Lifecycle events:              ${lifecycle?.eventTypes.join(",") || "none"}`);
console.log(`Process exit code:             ${lifecycle?.processExitCode ?? "N/A"}`);
console.log(`Category:                      ${finalCategory}`);
console.log("Result:                        NOT_COMPLETED");
process.exitCode = 0;

function safeJson(value: string): unknown { try { const trimmed = value.trim(); return trimmed.startsWith("{") && trimmed.endsWith("}") ? JSON.parse(trimmed) : null; } catch { return null; } }
function isBlueprintRoot(value: unknown): boolean { if (!value || typeof value !== "object" || Array.isArray(value)) return false; const keys = Object.keys(value as Record<string, unknown>).sort(); return JSON.stringify(keys) === JSON.stringify(["assumptions", "contractHash", "repositoryBaselineHash", "schemaVersion", "subject", "uncoveredClauses", "validators"]); }
