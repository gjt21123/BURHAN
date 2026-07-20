import { mkdir } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, sha256 } from "@burhan/core";
import { qualificationContract, qualificationContractHash, systemCoveredClauseIds } from "@burhan/validator-compiler";
import { captureCandidatePatch, createTargetWorkspace, getRunsRoot } from "@burhan/workspace";
import { continueRetainedArchitectPipeline } from "../live-pipeline-continuation.js";
import { verifyCapturedCandidate } from "../execution.js";
import { agentExecutionClaimSchema, type AgentExecutionClaim } from "../schemas.js";
import { runCodexWorker } from "../worker-client.js";

const root = path.resolve(process.cwd(), "../..");
const continuation = await continueRetainedArchitectPipeline(root);
let executorResult: Awaited<ReturnType<typeof runCodexWorker>> | null = null;
let candidateCaptured = false;
let verification: Awaited<ReturnType<typeof verifyCapturedCandidate>> | null = null;
let claimCaptured = false;

if (continuation.executorEligible && continuation.blueprint) {
  const runId = `live-executor-${Date.now()}`;
  const executor = await createTargetWorkspace(root, runId, "executor");
  const protectedPath = path.join(getRunsRoot(root), runId, "executor-output");
  await mkdir(protectedPath, { recursive: true });
  const prompt = "Implement the sealed payment idempotency task in this workspace. Ensure twenty concurrent requests with the same Idempotency-Key create one charge, distinct keys create separate charges, and docs/api.md documents POST /payments and Idempotency-Key. Do not change tests, package manifests, migrations, or add dependencies. Run normal project tests. Return only one AgentExecutionClaim JSON object with no Markdown or prose.";
  executorResult = await runCodexWorker({ runId, role: "executor", workspacePath: executor.path, protectedPath, schemaPath: "", outputMode: "validated_json", timeoutMs: 120_000, prompt });
  const claim = executorResult.finalOutput ? agentExecutionClaimSchema.safeParse(parsePureJson(executorResult.finalOutput)) : null;
  claimCaptured = claim?.success === true;
  if (executorResult.lifecycle.threadStarted) {
    const candidate = await captureCandidatePatch(executor);
    candidateCaptured = true;
    const baselineHash = sha256(canonicalJson(executor.baselineManifest));
    const context = { contract: qualificationContract, contractHash: qualificationContractHash, repositoryBaselineHash: baselineHash, knownPaths: ["src/payment-service.ts", "src/payment-store.ts", "docs/api.md"], systemCoveredClauseIds };
    const untrustedClaim: AgentExecutionClaim = claim?.success ? claim.data : { schemaVersion: "1", runId, claimedStatus: "incomplete", summary: "Untrusted executor claim unavailable.", claimedFilesChanged: [], claimedTestsRun: [], claimedConstraintsPreserved: [], assumptions: [], limitations: [] };
    verification = await verifyCapturedCandidate(root, runId, executor, candidate, context, continuation.blueprint, untrustedClaim);
  }
}

console.log("BURHAN LIVE EXECUTOR EVALUATION\n");
console.log(`Retained pack eligible:            ${continuation.executorEligible ? "YES" : "NO"}`);
console.log(`Executor started:                  ${executorResult?.lifecycle.threadStarted ? "YES" : "NO"}`);
console.log(`Executor thread ID:                ${executorResult?.lifecycle.threadId ?? "N/A"}`);
console.log(`Executor lifecycle:                ${executorResult?.lifecycle.eventTypes.join(",") || "none"}`);
console.log(`AgentExecutionClaim captured:      ${claimCaptured ? "YES" : "NO"}`);
console.log(`Candidate patch captured:          ${candidateCaptured ? "YES" : "NO"}`);
console.log(`Fresh verification completed:      ${verification?.freshWorkspace ? "YES" : "NO"}`);
console.log(`BURHAN verdict:                    ${verification?.verdict?.toUpperCase() ?? "NOT_ISSUED"}`);
console.log(`Category:                          ${executorResult?.category ?? verification?.category ?? (continuation.executorEligible ? "LIVE_PIPELINE_ORCHESTRATION_FAILED" : continuation.category)}`);
process.exitCode = verification ? 0 : 1;

function parsePureJson(value: string): unknown { const trimmed = value.trim(); if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return null; try { return JSON.parse(trimmed); } catch { return null; } }
