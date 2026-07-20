import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, sha256 } from "@burhan/core";
import { qualificationContract, qualificationContractHash, systemCoveredClauseIds, validValidatorBlueprint } from "@burhan/validator-compiler";
import { captureCandidatePatch, createTargetWorkspace } from "@burhan/workspace";
import { verifyCapturedCandidate, type ExecutionResult } from "../execution.js";
import type { AgentExecutionClaim, ValidatorBlueprint } from "../schemas.js";

export async function executeFixture(repositoryRoot: string, runId: string, change: "none" | "correct" | "migration" | "delete-tests" | "fake-evidence" | "untracked-source" | "corrupt", claimStatus: AgentExecutionClaim["claimedStatus"] = "completed"): Promise<ExecutionResult> {
  const executor = await createTargetWorkspace(repositoryRoot, runId, "executor");
  if (change === "correct" || change === "untracked-source") await applyCorrectChange(executor.path);
  if (change === "migration") { await mkdir(path.join(executor.path, "db", "migrations"), { recursive: true }); await writeFile(path.join(executor.path, "db", "migrations", "001.sql"), "select 1;\n"); }
  if (change === "delete-tests") await rm(path.join(executor.path, "tests", "payment-service.test.ts"));
  if (change === "fake-evidence") { await mkdir(path.join(executor.path, ".burhan"), { recursive: true }); await writeFile(path.join(executor.path, ".burhan", "evidence.json"), "{\"status\":\"pass\"}\n"); }
  if (change === "untracked-source") await writeFile(path.join(executor.path, "src", "helper.ts"), "export const helper = true;\n");
  const candidate = await captureCandidatePatch(executor);
  if (change === "corrupt") candidate.bytes = Buffer.from("not a patch\n");
  const baselineHash = sha256(canonicalJson(executor.baselineManifest));
  const blueprint = targetBlueprint(baselineHash);
  const context = { contract: qualificationContract, contractHash: qualificationContractHash, repositoryBaselineHash: baselineHash, knownPaths: ["src/payment-service.ts", "src/payment-store.ts", "docs/api.md"], systemCoveredClauseIds };
  return verifyCapturedCandidate(repositoryRoot, runId, executor, candidate, context, blueprint, fixtureClaim(runId, claimStatus));
}

export function targetBlueprint(baselineHash: string): ValidatorBlueprint {
  const blueprint = validValidatorBlueprint();
  const subject = { modulePath: "src/payment-service.ts", exportName: "PaymentService" };
  return { ...blueprint, repositoryBaselineHash: baselineHash, subject, validators: [
    { ...blueprint.validators[0], subject },
    { ...blueprint.validators[1], subject },
    { ...blueprint.validators[2], subject, parameters: { documentationPath: "docs/api.md", requiredTerms: ["Idempotency-Key", "POST /payments"] } },
  ] };
}

export function fixtureClaim(runId: string, claimedStatus: AgentExecutionClaim["claimedStatus"] = "completed"): AgentExecutionClaim {
  return { schemaVersion: "1", runId, claimedStatus, summary: "Fixture executor completed.", claimedFilesChanged: [], claimedTestsRun: [], claimedConstraintsPreserved: [], assumptions: [], limitations: [] };
}

async function applyCorrectChange(workspacePath: string): Promise<void> {
  await writeFile(path.join(workspacePath, "src", "payment-service.ts"), `import { type PaymentStore, type Charge } from "./payment-store.js";\n\nexport class PaymentService {\n  private readonly inFlight = new Map<string, Promise<Charge>>();\n\n  constructor(private readonly store: PaymentStore) {}\n\n  async charge(idempotencyKey: string, amount: number): Promise<Charge> {\n    const existing = await this.store.findByKey(idempotencyKey);\n    if (existing) return existing;\n    const pending = this.inFlight.get(idempotencyKey);\n    if (pending) return pending;\n    const operation = this.store.create(idempotencyKey, amount);\n    this.inFlight.set(idempotencyKey, operation);\n    try { return await operation; } finally { this.inFlight.delete(idempotencyKey); }\n  }\n}\n`);
  await writeFile(path.join(workspacePath, "docs", "api.md"), "# Payment API\n\n`POST /payments` accepts the `Idempotency-Key` header.\n");
}
