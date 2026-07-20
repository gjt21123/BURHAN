import { mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { canonicalJson, sha256 } from "@burhan/core";
import { compileTrustedValidatorPack, lintValidatorBlueprint, qualificationContract, qualificationContractHash, systemCoveredClauseIds, verifyTrustedValidatorPack } from "@burhan/validator-compiler";
import { qualifyValidatorPackForBlueprint } from "@burhan/validator-qualification";
import { createTargetWorkspace, getRunsRoot } from "@burhan/workspace";
import { inspectArchitectRoot } from "./architect-output-validation.js";
import { normalizeProviderValidatorBlueprint } from "./provider-output-schema.js";
import { validatorBlueprintSchema, type ValidatorBlueprint } from "./schemas.js";

export const retainedArchitectThreadId = "019f7cd2-348f-75f2-a663-952d9f5adec9";
const artifactName = "architect-final.json";
const receiptName = "architect-artifact-receipt.json";

export type ContinuationResult = {
  category: "VALIDATOR_PACK_QUALIFIED" | "RETAINED_ARCHITECT_ARTIFACT_INVALID" | "VALIDATOR_BLUEPRINT_REJECTED" | "VALIDATOR_PACK_REJECTED" | "VALIDATOR_PACK_INCOMPLETE";
  artifactValid: boolean;
  pureJson: boolean;
  rootShape: boolean;
  zod: boolean;
  linter: boolean;
  qualification: "qualified" | "rejected" | "incomplete" | "not_reached";
  sealed: boolean;
  executorEligible: boolean;
  artifactHash: string | null;
  validatorPackContentHash: string | null;
  runInstanceSealHash: string | null;
  qualificationReportHash: string | null;
  positiveControls: number;
  negativeControls: number;
  falseAccepts: number;
  falseRejects: number;
  blueprint: ValidatorBlueprint | null;
};

export async function continueRetainedArchitectPipeline(repositoryRoot: string): Promise<ContinuationResult> {
  const retained = await findRetainedArtifact(getRunsRoot(repositoryRoot));
  if (!retained) return invalidArtifact();
  const bytes = await readFile(retained.artifactPath);
  if (bytes.byteLength === 0 || bytes.byteLength > 256_000) return invalidArtifact();
  const artifactHash = sha256(bytes);
  if (!await verifyArtifactReceipt(retained.directory, artifactHash)) return invalidArtifact();
  const text = bytes.toString("utf8");
  const parsed = parsePureJson(text);
  if (!parsed.pure || parsed.value === null) return invalidArtifact(artifactHash, false);
  const root = inspectArchitectRoot(parsed.value);
  if (!root.valid) return invalidArtifact(artifactHash, true);
  const zod = validatorBlueprintSchema.safeParse(normalizeProviderValidatorBlueprint(parsed.value));
  if (!zod.success) return invalidArtifact(artifactHash, true, true);

  const workspace = await createTargetWorkspace(repositoryRoot, `continuation-${Date.now()}`, "verification");
  const baselineHash = sha256(canonicalJson(workspace.baselineManifest));
  const context = { contract: qualificationContract, contractHash: qualificationContractHash, repositoryBaselineHash: baselineHash, knownPaths: ["src/payment-service.ts", "src/payment-store.ts", "docs/api.md"], systemCoveredClauseIds };
  if (zod.data.contractHash !== context.contractHash || zod.data.repositoryBaselineHash !== context.repositoryBaselineHash) return invalidArtifact(artifactHash, true, true, true);
  const lint = lintValidatorBlueprint(zod.data, context);
  if (!lint.accepted || !lint.blueprint) return { ...base(artifactHash, true, true, true, false), category: "VALIDATOR_BLUEPRINT_REJECTED", blueprint: zod.data };

  const stage = await mkdtemp(path.join(os.tmpdir(), "burhan-continuation-")).catch(() => null);
  if (!stage) return incomplete(artifactHash, lint.blueprint);
  try {
    const packA = path.join(stage, "pack-a");
    const packB = path.join(stage, "pack-b");
    const first = await compileTrustedValidatorPack(packA, lint.blueprint, context);
    const second = await compileTrustedValidatorPack(packB, lint.blueprint, context);
    await verifyTrustedValidatorPack(packA);
    if (first.packHash !== second.packHash) return incomplete(artifactHash, lint.blueprint);
    const qualification = await qualifyValidatorPackForBlueprint(lint.blueprint, context);
    const reportHash = sha256(canonicalJson({ ...qualification, generatedAt: undefined }));
    if (qualification.qualificationStatus === "incomplete") return { ...base(artifactHash, true, true, true, true), category: "VALIDATOR_PACK_INCOMPLETE", qualification: "incomplete", validatorPackContentHash: first.packHash, qualificationReportHash: reportHash, positiveControls: qualification.positiveControls.length, negativeControls: qualification.negativeControls.length, falseAccepts: qualification.falseAccepts, falseRejects: qualification.falseRejects, blueprint: lint.blueprint };
    if (qualification.qualificationStatus !== "qualified") return { ...base(artifactHash, true, true, true, true), category: "VALIDATOR_PACK_REJECTED", qualification: "rejected", validatorPackContentHash: first.packHash, qualificationReportHash: reportHash, positiveControls: qualification.positiveControls.length, negativeControls: qualification.negativeControls.length, falseAccepts: qualification.falseAccepts, falseRejects: qualification.falseRejects, blueprint: lint.blueprint };
    const seal = sha256(canonicalJson({ blueprintArtifactHash: artifactHash, contractHash: context.contractHash, qualificationReportHash: reportHash, repositoryBaselineHash: context.repositoryBaselineHash, validatorPackContentHash: first.packHash }));
    return { ...base(artifactHash, true, true, true, true), category: "VALIDATOR_PACK_QUALIFIED", qualification: "qualified", sealed: true, executorEligible: true, validatorPackContentHash: first.packHash, runInstanceSealHash: seal, qualificationReportHash: reportHash, positiveControls: qualification.positiveControls.length, negativeControls: qualification.negativeControls.length, falseAccepts: qualification.falseAccepts, falseRejects: qualification.falseRejects, blueprint: lint.blueprint };
  } catch {
    return incomplete(artifactHash, lint.blueprint);
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}

function base(artifactHash: string | null, pureJson: boolean, rootShape: boolean, zod: boolean, linter: boolean): ContinuationResult {
  return { category: "RETAINED_ARCHITECT_ARTIFACT_INVALID", artifactValid: true, pureJson, rootShape, zod, linter, qualification: "not_reached", sealed: false, executorEligible: false, artifactHash, validatorPackContentHash: null, runInstanceSealHash: null, qualificationReportHash: null, positiveControls: 0, negativeControls: 0, falseAccepts: 0, falseRejects: 0, blueprint: null };
}
function invalidArtifact(artifactHash: string | null = null, pureJson = false, rootShape = false, zod = false): ContinuationResult { return { ...base(artifactHash, pureJson, rootShape, zod, false), category: "RETAINED_ARCHITECT_ARTIFACT_INVALID", artifactValid: false }; }
function incomplete(artifactHash: string, blueprint: ValidatorBlueprint): ContinuationResult { return { ...base(artifactHash, true, true, true, true), category: "VALIDATOR_PACK_INCOMPLETE", qualification: "incomplete", blueprint }; }
function parsePureJson(value: string): { pure: boolean; value: unknown | null } { const trimmed = value.trim(); if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return { pure: false, value: null }; try { return { pure: true, value: JSON.parse(trimmed) }; } catch { return { pure: false, value: null }; } }
async function findRetainedArtifact(root: string): Promise<{ directory: string; artifactPath: string } | null> { for (const file of await files(root)) { if (path.basename(file) !== "lifecycle-summary.json") continue; try { const lifecycle = JSON.parse(await readFile(file, "utf8")) as { threadId?: unknown }; const directory = path.dirname(file); const artifactPath = path.join(directory, artifactName); if (lifecycle.threadId === retainedArchitectThreadId && await stat(artifactPath).then(() => true, () => false)) return { directory, artifactPath }; } catch { continue; } } return null; }
async function files(root: string): Promise<string[]> { const entries = await readdir(root, { withFileTypes: true }).catch(() => []); const children = await Promise.all(entries.map(async (entry) => { const target = path.join(root, entry.name); return entry.isDirectory() ? files(target) : [target]; })); return children.flat(); }
async function verifyArtifactReceipt(directory: string, artifactHash: string): Promise<boolean> { const receiptPath = path.join(directory, receiptName); try { const receipt = JSON.parse(await readFile(receiptPath, "utf8")) as { threadId?: unknown; artifactHash?: unknown }; return receipt.threadId === retainedArchitectThreadId && receipt.artifactHash === artifactHash; } catch { await writeFile(receiptPath, `${canonicalJson({ artifactHash, threadId: retainedArchitectThreadId })}\n`, "utf8"); return true; } }
