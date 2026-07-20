import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, sha256 } from "@burhan/core";
import { qualificationContract, qualificationContractHash, systemCoveredClauseIds } from "@burhan/validator-compiler";
import { captureCandidatePatch, createTargetWorkspace } from "@burhan/workspace";
import { continueRetainedArchitectPipeline } from "../live-pipeline-continuation.js";
import { verifyCapturedCandidate } from "../execution.js";
import { agentExecutionClaimSchema, type AgentExecutionClaim } from "../schemas.js";

const root = path.resolve(process.cwd(), "../..");
const run = await latestExecutorRun();
const continuation = await continueRetainedArchitectPipeline(root);
let verification: Awaited<ReturnType<typeof verifyCapturedCandidate>> | null = null;
let captured = false;
let claimCaptured = false;
if (run && continuation.executorEligible && continuation.blueprint) {
  const baseline = await createTargetWorkspace(root, `${run.runId}-finalize`, "verification").catch(() => null);
  const local = process.env.LOCALAPPDATA;
  const existingPath = local ? path.join(local, "BURHAN", "workspaces", run.runId, "executor") : null;
  if (baseline && existingPath) {
    const workspace = { ...baseline, path: existingPath };
    const candidate = await captureCandidatePatch(workspace);
    captured = true;
    const baselineHash = sha256(canonicalJson(workspace.baselineManifest));
    const context = { contract: qualificationContract, contractHash: qualificationContractHash, repositoryBaselineHash: baselineHash, knownPaths: ["src/payment-service.ts", "src/payment-store.ts", "docs/api.md"], systemCoveredClauseIds };
    const parsedClaim = run.outputPresent ? agentExecutionClaimSchema.safeParse(parsePureJson(await readFile(path.join(local!, "BURHAN", "runs", run.runId, "executor-output", "executor-final.json"), "utf8"))) : null;
    claimCaptured = parsedClaim?.success === true;
    const claim: AgentExecutionClaim = parsedClaim?.success ? parsedClaim.data : { schemaVersion: "1", runId: run.runId, claimedStatus: "incomplete", summary: "Untrusted executor claim unavailable.", claimedFilesChanged: [], claimedTestsRun: [], claimedConstraintsPreserved: [], assumptions: [], limitations: [] };
    verification = await verifyCapturedCandidate(root, run.runId, workspace, candidate, context, continuation.blueprint, claim);
  }
}
console.log("BURHAN LIVE EXECUTOR FINALIZATION\n");
console.log(`Executor thread ID:                ${run?.threadId ?? "N/A"}`);
console.log(`Executor output artifact:          ${run?.outputPresent ? "PRESENT" : "MISSING"}`);
console.log(`AgentExecutionClaim captured:      ${claimCaptured ? "YES" : "NO"}`);
console.log(`Candidate patch captured:          ${captured ? "YES" : "NO"}`);
console.log(`Candidate patch hash:              ${verification?.patchHash ?? "N/A"}`);
console.log(`Fresh verification completed:      ${verification?.freshWorkspace ? "YES" : "NO"}`);
console.log(`Validator pack content hash:       ${verification?.validatorPackContentHash ?? continuation.validatorPackContentHash ?? "N/A"}`);
console.log(`Run instance seal hash:            ${verification?.runInstanceSealHash ?? continuation.runInstanceSealHash ?? "N/A"}`);
console.log(`BURHAN verdict:                    ${verification?.verdict?.toUpperCase() ?? "NOT_ISSUED"}`);
console.log(`Category:                          ${verification?.category ?? (verification?.verdict === "rejected" ? "BURHAN_VERDICT_REJECTED" : run ? "EXECUTOR_CLAIM_UNAVAILABLE" : "LIVE_PIPELINE_ORCHESTRATION_FAILED")}`);
process.exitCode = verification ? 0 : 1;

async function latestExecutorRun(): Promise<{ runId: string; threadId: string; outputPresent: boolean } | null> {
  const local = process.env.LOCALAPPDATA;
  if (!local) return null;
  const rootPath = path.join(local, "BURHAN", "runs");
  const entries = await readdir(rootPath, { withFileTypes: true }).catch(() => []);
  const candidates = await Promise.all(entries.filter((entry) => entry.isDirectory() && entry.name.startsWith("live-executor-")).map(async (entry) => {
    const output = path.join(rootPath, entry.name, "executor-output");
    try { const lifecycle = JSON.parse(await readFile(path.join(output, "lifecycle-summary.json"), "utf8")) as { threadId?: unknown }; return typeof lifecycle.threadId === "string" ? { runId: entry.name, threadId: lifecycle.threadId, outputPresent: await readFile(path.join(output, "executor-final.json")).then(() => true, () => false) } : null; } catch { return null; }
  }));
  return candidates.filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null).sort((left, right) => right.runId.localeCompare(left.runId))[0] ?? null;
}
function parsePureJson(value: string): unknown { const trimmed = value.trim(); if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return null; try { return JSON.parse(trimmed); } catch { return null; } }
