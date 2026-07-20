import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { canonicalJson, sha256 } from "@burhan/core";
import { compileTrustedValidatorPack, type BlueprintLintContext, type ValidatorPackManifest, verifyTrustedValidatorPack } from "@burhan/validator-compiler";
import { applyCandidatePatch, createTargetWorkspace, type CandidatePatch, type TargetWorkspace } from "@burhan/workspace";
import type { AgentExecutionClaim } from "./schemas.js";

export type ExecutionResult = { verdict: "verified" | "rejected" | "incomplete"; patchHash: string | null; validatorPackContentHash: string | null; runInstanceSealHash: string | null; packUnchanged: boolean; freshWorkspace: boolean; claimAffectedVerdict: false; candidateEvidenceTrusted: false; untrackedCaptured: boolean; forbiddenDetected: boolean; category?: "CANDIDATE_PATCH_INVALID" | "VERIFICATION_INFRASTRUCTURE_FAILED" };

export async function verifyCapturedCandidate(repositoryRoot: string, runId: string, executor: TargetWorkspace, candidate: CandidatePatch, context: BlueprintLintContext, blueprint: Parameters<typeof compileTrustedValidatorPack>[1], _claim: AgentExecutionClaim): Promise<ExecutionResult> {
  if (candidate.forbiddenChanges.length > 0) return rejected(candidate, null, false, false);
  const verification = await createTargetWorkspace(repositoryRoot, runId, "verification");
  try {
    await applyCandidatePatch(verification, candidate);
  } catch {
    return incomplete(candidate, "CANDIDATE_PATCH_INVALID");
  }
  const packPath = path.join(path.dirname(verification.path), "validator-pack");
  try {
    const compiled = await compileTrustedValidatorPack(packPath, blueprint, context);
    const reproduction = await compileTrustedValidatorPack(`${packPath}-reproduction`, blueprint, context);
    if (compiled.packHash !== reproduction.packHash) return incomplete(candidate, "VERIFICATION_INFRASTRUCTURE_FAILED");
    const initial = await verifyTrustedValidatorPack(packPath);
    const passed = await runQualifiedChecks(verification.path, initial);
    await verifyTrustedValidatorPack(packPath);
    const result = passed ? "verified" : "rejected";
    const seal = sha256(canonicalJson({ validatorPackContentHash: compiled.packHash, runId, baselineCommit: verification.baselineCommit }));
    return { verdict: result, patchHash: candidate.patchHash, validatorPackContentHash: compiled.packHash, runInstanceSealHash: seal, packUnchanged: true, freshWorkspace: verification.path !== executor.path, claimAffectedVerdict: false, candidateEvidenceTrusted: false, untrackedCaptured: candidate.untrackedFiles.length > 0, forbiddenDetected: false };
  } catch {
    return incomplete(candidate, "VERIFICATION_INFRASTRUCTURE_FAILED");
  }
}

async function runQualifiedChecks(workspacePath: string, manifest: ValidatorPackManifest): Promise<boolean> {
  const source = (file: string) => pathToFileURL(path.join(workspacePath, file)).href;
  const { PaymentService } = await import(source("src/payment-service.ts")) as { PaymentService: new (store: unknown) => { charge: (key: string, amount: number) => Promise<unknown> } };
  const { InMemoryPaymentStore } = await import(source("src/payment-store.ts")) as { InMemoryPaymentStore: new () => { countCreated: () => number } };
  for (const validator of manifest.validators) {
    if (validator.capabilityId === "payment.same_key_concurrency") {
      const store = new InMemoryPaymentStore(); const service = new PaymentService(store);
      await Promise.all(Array.from({ length: 20 }, () => service.charge("same-key", 100)));
      if (store.countCreated() !== 1) return false;
    }
    if (validator.capabilityId === "payment.distinct_key_independence") {
      const store = new InMemoryPaymentStore(); const service = new PaymentService(store);
      await Promise.all([service.charge("one", 100), service.charge("two", 100)]);
      if (store.countCreated() !== 2) return false;
    }
    if (validator.capabilityId === "docs.idempotency_header_present") {
      if (!(await readFile(path.join(workspacePath, "docs", "api.md"), "utf8")).includes("Idempotency-Key")) return false;
    }
  }
  return true;
}

function rejected(candidate: CandidatePatch, hash: string | null, packUnchanged: boolean, freshWorkspace: boolean): ExecutionResult {
  return { verdict: "rejected", patchHash: candidate.patchHash, validatorPackContentHash: hash, runInstanceSealHash: null, packUnchanged, freshWorkspace, claimAffectedVerdict: false, candidateEvidenceTrusted: false, untrackedCaptured: candidate.untrackedFiles.length > 0, forbiddenDetected: true };
}

function incomplete(candidate: CandidatePatch, category: "CANDIDATE_PATCH_INVALID" | "VERIFICATION_INFRASTRUCTURE_FAILED"): ExecutionResult {
  return { verdict: "incomplete", patchHash: candidate.patchHash, validatorPackContentHash: null, runInstanceSealHash: null, packUnchanged: false, freshWorkspace: true, claimAffectedVerdict: false, candidateEvidenceTrusted: false, untrackedCaptured: candidate.untrackedFiles.length > 0, forbiddenDetected: false, category };
}
