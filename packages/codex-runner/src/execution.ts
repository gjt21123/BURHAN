import { realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, sha256 } from "@burhan/core";
import { compileTrustedValidatorPack, lintValidatorBlueprint, requiredClauseCoverage, type BlueprintLintContext, verifyTrustedValidatorPack } from "@burhan/validator-compiler";
import { applyCandidatePatch, createTargetWorkspace, type CandidatePatch, type TargetWorkspace } from "@burhan/workspace";
import { reduceRuntimeStatuses } from "../../verifier/src/runtime-status.js";
import { qualifyReferenceProbe, runReferenceProbe, type ReferenceProbe, type ProbeOptions } from "./bounded-reference.js";
import { digest, readBoundedFile, referenceFile, relativeReferencePath, snapshotReference, REFERENCE_PROFILE } from "./reference-protocol.mjs";
import type { AgentExecutionClaim } from "./schemas.js";

export type ExecutionResult = {
  verdict: "verified" | "rejected" | "incomplete";
  patchHash: string | null;
  validatorPackContentHash: string | null;
  runInstanceSealHash: string | null;
  packUnchanged: boolean;
  freshWorkspace: boolean;
  claimAffectedVerdict: false;
  candidateEvidenceTrusted: false;
  untrackedCaptured: boolean;
  forbiddenDetected: boolean;
  category?: "CANDIDATE_PATCH_INVALID" | "VERIFICATION_INFRASTRUCTURE_FAILED";
  failureCode?: string;
  runtimeProfile?: string;
  candidateImportedInParent?: false;
  runtimeEvidenceHash?: string;
  runtimeEvidencePath?: string;
  runtimeQualificationHash?: string;
  workspaceUnchanged?: boolean;
};

/** Reference-only orchestration. Candidate imports are exclusively in supervised workers. */
export async function verifyCapturedCandidate(repositoryRoot: string, runId: string, executor: TargetWorkspace, candidate: CandidatePatch,
  context: BlueprintLintContext, blueprint: Parameters<typeof compileTrustedValidatorPack>[1], _claim: AgentExecutionClaim,
  options: ProbeOptions = {}): Promise<ExecutionResult> {
  const base = (): ExecutionResult => ({ verdict: "incomplete", patchHash: candidate.patchHash, validatorPackContentHash: null,
    runInstanceSealHash: null, packUnchanged: false, freshWorkspace: false, claimAffectedVerdict: false, candidateEvidenceTrusted: false,
    untrackedCaptured: candidate.untrackedFiles.length > 0, forbiddenDetected: false, runtimeProfile: REFERENCE_PROFILE,
    candidateImportedInParent: false });
  const incomplete = (failureCode: string, category: ExecutionResult["category"] = "VERIFICATION_INFRASTRUCTURE_FAILED") => ({ ...base(), category, failureCode });
  try {
    if (!Buffer.isBuffer(candidate.bytes) || candidate.bytes.length > 8 * 1024 * 1024 || sha256(candidate.bytes) !== candidate.patchHash) {
      return incomplete("CAPTURED_PATCH_HASH_MISMATCH", "CANDIDATE_PATCH_INVALID");
    }
    if (sha256(canonicalJson(context.contract)) !== context.contractHash ||
        sha256(canonicalJson(executor.baselineManifest)) !== context.repositoryBaselineHash) return incomplete("REFERENCE_BASELINE_OR_CONTRACT_MISMATCH");
    const before = new Map(executor.baselineManifest.files.map(file => [file.path, file.sha256]));
    const after = new Map(candidate.afterManifest.files.map(file => [file.path, file.sha256]));
    const changed = [...new Set([...before.keys(), ...after.keys()])].filter(file => before.get(file) !== after.get(file));
    if (candidate.forbiddenChanges.length || changed.some(file => !allowedReferenceChange(file, context))) {
      return { ...base(), verdict: "rejected", forbiddenDetected: true };
    }
    const lint = lintValidatorBlueprint(blueprint, context);
    if (!lint.accepted || !lint.blueprint) return incomplete("REFERENCE_BLUEPRINT_INVALID");
    // Snapshot the validated plan before asynchronous execution; caller mutation
    // cannot replace acceptance parameters while a candidate is running.
    const plan = JSON.parse(JSON.stringify(lint.blueprint)) as typeof blueprint;
    const verification = await createTargetWorkspace(repositoryRoot, runId, "verification");
    if (await realpath(verification.path) === await realpath(executor.path) ||
        canonicalJson(verification.baselineManifest) !== canonicalJson(executor.baselineManifest)) return incomplete("FRESH_BASELINE_MISMATCH");
    try { await applyCandidatePatch(verification, candidate); }
    catch { return incomplete("CANDIDATE_PATCH_INVALID", "CANDIDATE_PATCH_INVALID"); }
    const snapshot = await snapshotReference(verification.path);
    const packPath = path.join(path.dirname(verification.path), "validator-pack");
    const compiled = await compileTrustedValidatorPack(packPath, plan, context);
    const reproduction = await compileTrustedValidatorPack(`${packPath}-reproduction`, plan, context);
    if (compiled.packHash !== reproduction.packHash) return incomplete("PACK_REPRODUCTION_FAILED");
    const initial = await verifyTrustedValidatorPack(packPath, compiled.packHash);
    if (!requiredClauseCoverage(context.contract, initial, context.systemCoveredClauseIds) ||
        context.systemCoveredClauseIds.some(id => !["INV-001", "PRO-001", "PRO-002"].includes(id))) return incomplete("REFERENCE_COVERAGE_INCOMPLETE");

    const results: Array<{ id: string; status: "pass" | "fail" | "blocked"; evidence: unknown }> = [];
    const qualifications: string[] = [];
    const probes = plan.validators.filter(v => v.capabilityId !== "docs.idempotency_header_present").map(v => ({ id: v.id, probe: probeFor(v) }));
    // Preserve the reference sequential-retry behavior with returned-charge checks,
    // in addition to same-key concurrency and distinct-key observations.
    if (probes.length) probes.push({ id: "system-sequential-retry", probe: { ...probes[0].probe, keys: ["retry-42", "retry-42"], sequential: true } });
    if (!probes.length) return incomplete("REFERENCE_RUNTIME_CHECKS_MISSING");
    for (const { id, probe } of probes) {
      if (options.signal?.aborted) return incomplete("COMMAND_ABORTED");
      const qualification = await qualifyReferenceProbe(probe);
      if (!qualification.passed) return incomplete("REFERENCE_HARNESS_QUALIFICATION_FAILED");
      qualifications.push(qualification.hash);
      await verifyTrustedValidatorPack(packPath, compiled.packHash);
      const result = await runReferenceProbe(verification.path, probe, options);
      await verifyTrustedValidatorPack(packPath, compiled.packHash);
      if ((await snapshotReference(verification.path)).hash !== snapshot.hash) return incomplete("POST_RUN_WORKSPACE_MUTATION");
      results.push({ id, status: result.status, evidence: result });
      if (result.status === "blocked") break;
    }
    for (const validator of plan.validators.filter(v => v.capabilityId === "docs.idempotency_header_present")) {
      const parameters = validator.parameters as Record<string, unknown>;
      const terms = parameters.requiredTerms;
      if (!Array.isArray(terms) || !terms.length || terms.length > 32 || terms.some(term => typeof term !== "string" || !term || term.length > 1024)) return incomplete("REFERENCE_DOCUMENT_PARAMETERS_INVALID");
      try {
        const filename = await referenceFile(verification.path, String(parameters.documentationPath));
        const bytes = await readBoundedFile(filename);
        const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        results.push({ id: validator.id, status: terms.every(term => text.includes(term)) ? "pass" : "fail", evidence: digest(bytes) });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") results.push({ id: validator.id, status: "fail", evidence: "DOCUMENT_MISSING" });
        else return incomplete("REFERENCE_DOCUMENT_UNREADABLE");
      }
    }
    await verifyTrustedValidatorPack(packPath, compiled.packHash);
    if ((await snapshotReference(verification.path)).hash !== snapshot.hash) return incomplete("POST_RUN_WORKSPACE_MUTATION");
    const verdict = reduceRuntimeStatuses(results.map(result => result.status));
    const runtimeQualificationHash = sha256(canonicalJson(qualifications));
    const runtimeEvidence = { schemaVersion: 1, profile: REFERENCE_PROFILE, runId, baselineCommit: verification.baselineCommit,
      baselineHash: context.repositoryBaselineHash, candidatePatchHash: candidate.patchHash, validatorPackHash: compiled.packHash,
      verdict, results, qualifications, runtimeQualificationHash, snapshotHash: snapshot.hash };
    const runtimeEvidenceHash = sha256(canonicalJson(runtimeEvidence));
    const runtimeEvidencePath = `runtime-evidence-${runtimeEvidenceHash.slice(7)}.json`;
    const body = Buffer.from(canonicalJson(runtimeEvidence) + "\n");
    if (body.length > 512 * 1024) return incomplete("RUNTIME_EVIDENCE_LIMIT");
    const output = path.join(path.dirname(verification.path), runtimeEvidencePath);
    try { await writeFile(output, body, { flag: "wx", mode: 0o600 }); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST" || !(await readBoundedFile(output, 512 * 1024)).equals(body)) return incomplete("RUNTIME_EVIDENCE_WRITE_FAILED");
    }
    return { ...base(), verdict, validatorPackContentHash: compiled.packHash, packUnchanged: true, freshWorkspace: true,
      workspaceUnchanged: true, runtimeEvidenceHash, runtimeEvidencePath, runtimeQualificationHash,
      runInstanceSealHash: sha256(canonicalJson({ profile: REFERENCE_PROFILE, validatorPackContentHash: compiled.packHash,
        runId, baselineCommit: verification.baselineCommit, patchHash: candidate.patchHash, runtimeEvidenceHash, runtimeQualificationHash })),
      ...(verdict === "incomplete" ? { category: "VERIFICATION_INFRASTRUCTURE_FAILED" as const, failureCode: "REFERENCE_EXECUTION_INCOMPLETE" } : {}) };
  } catch { return incomplete("REFERENCE_VERIFICATION_FAILED"); }
}

function probeFor(validator: Parameters<typeof compileTrustedValidatorPack>[1]["validators"][number]): ReferenceProbe {
  const p = validator.parameters as Record<string, unknown>;
  const subject = validator.subject;
  relativeReferencePath(subject.modulePath);
  if (!Number.isSafeInteger(p.amount) || Number(p.amount) < 0) throw new Error("REFERENCE_AMOUNT_INVALID");
  if (validator.capabilityId === "payment.same_key_concurrency" && p.requestCount === 20 && p.expectedCharges === 1 && typeof p.key === "string" && p.key.length > 0 && p.key.length <= 128) {
    return { modulePath: subject.modulePath, exportName: subject.exportName, keys: Array.from({ length: 20 }, () => p.key as string), amount: p.amount as number };
  }
  if (validator.capabilityId === "payment.distinct_key_independence" && p.keyCount === 2 && p.expectedCharges === 2 && Array.isArray(p.keys) && p.keys.length === 2 &&
      p.keys.every(key => typeof key === "string" && key.length > 0 && key.length <= 128) && new Set(p.keys).size === 2) {
    return { modulePath: subject.modulePath, exportName: subject.exportName, keys: [...p.keys] as string[], amount: p.amount as number };
  }
  throw new Error("REFERENCE_CAPABILITY_PARAMETERS_INVALID");
}

function allowedReferenceChange(file: string, context: BlueprintLintContext): boolean {
  relativeReferencePath(file);
  const matches = (pattern: string) => {
    const p = pattern.replace(/^examples\/payment-service\//, "");
    if (p === "**") return true;
    if (p.endsWith("/**")) return file.startsWith(p.slice(0, -2));
    return file === p;
  };
  // The reference profile never permits candidate control-plane/config changes,
  // even when mutable candidate metadata claims otherwise.
  return (file.startsWith("src/") || file.startsWith("docs/")) &&
    context.contract.scope.allowedPaths.some(matches) && !context.contract.scope.forbiddenPaths.some(matches);
}
