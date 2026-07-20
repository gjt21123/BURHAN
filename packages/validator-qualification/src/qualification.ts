import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { canonicalJson, reduceRun, sha256 } from "@burhan/core";
import { compileTrustedValidatorPack, qualificationContract, qualificationContractHash, qualificationLintContext, requiredClauseCoverage, trustedCapabilityCompilerVersion, validValidatorBlueprint, verifyTrustedValidatorPack, type BlueprintLintContext, type ValidatorPackManifest } from "@burhan/validator-compiler";
import type { ValidatorBlueprint } from "@burhan/codex-runner";
import { qualificationControls, type QualificationControl } from "./control-catalog.js";

export type QualificationStatus = "qualified" | "rejected" | "incomplete";
export type ControlResult = { controlId: string; expected: "accepted" | "rejected"; observed: "accepted" | "rejected"; passed: boolean };
export type ValidatorQualificationReport = {
  schemaVersion: "1";
  contractHash: string;
  validatorPackHash: string | null;
  compilerVersion: string;
  compilationStatus: "compiled" | "failed";
  positiveControls: ControlResult[];
  negativeControls: ControlResult[];
  falseAccepts: number;
  falseRejects: number;
  discriminationScore: number;
  integrityStatus: "intact" | "mutated" | "incomplete";
  qualificationStatus: QualificationStatus;
  evidenceHashes: string[];
  generatedAt: string;
};

export async function qualifyValidatorPack(): Promise<ValidatorQualificationReport> {
  return qualifyValidatorPackForBlueprint(validValidatorBlueprint(), qualificationLintContext());
}

export async function qualifyValidatorPackForBlueprint(blueprint: ValidatorBlueprint, context: BlueprintLintContext): Promise<ValidatorQualificationReport> {
  const stage = await mkdtemp(path.join(os.tmpdir(), "burhan-validator-qualification-"));
  let report: ValidatorQualificationReport;
  try {
    let model = reduceRun({ state: "DRAFT" }, { type: "CONTRACT_SEALED" });
    model = reduceRun(model, { type: "VALIDATOR_BLUEPRINT_BUILD_STARTED" });
    model = reduceRun(model, { type: "VALIDATOR_BLUEPRINT_READY" });
    model = reduceRun(model, { type: "VALIDATOR_BLUEPRINT_LINTED" });
    model = reduceRun(model, { type: "VALIDATOR_PACK_COMPILATION_STARTED" });
    const packPath = path.join(stage, "sealed-validator-pack");
    const compiled = await compileTrustedValidatorPack(packPath, blueprint, context);
    model = reduceRun(model, { type: "VALIDATOR_PACK_QUALIFICATION_STARTED" });
    const manifest = await verifyTrustedValidatorPack(packPath);
    const coverageIntact = requiredClauseCoverage(context.contract, manifest, context.systemCoveredClauseIds);
    const results = await Promise.all(qualificationControls.map((control) => resultForControl(control, manifest)));
    const positiveControls = results.filter((result) => result.expected === "accepted");
    const negativeControls = results.filter((result) => result.expected === "rejected");
    const falseAccepts = negativeControls.filter((result) => result.observed === "accepted").length;
    const falseRejects = positiveControls.filter((result) => result.observed === "rejected").length;
    const integrity = await proveTamperDetection(stage, packPath, manifest);
    const qualified = coverageIntact && falseAccepts === 0 && falseRejects === 0 && integrity.intact;
    model = reduceRun(model, { type: qualified ? "VALIDATOR_PACK_QUALIFIED" : "VALIDATOR_PACK_REJECTED" });
    if (qualified) {
      model = reduceRun(model, { type: "VALIDATOR_PACK_SEALING_STARTED" });
      model = reduceRun(model, { type: "VALIDATOR_PACK_SEALED" });
    }
    report = {
      schemaVersion: "1",
      contractHash: context.contractHash,
      validatorPackHash: compiled.packHash,
      compilerVersion: trustedCapabilityCompilerVersion,
      compilationStatus: "compiled",
      positiveControls,
      negativeControls,
      falseAccepts,
      falseRejects,
      discriminationScore: score(results),
      integrityStatus: integrity.intact ? "intact" : "mutated",
      qualificationStatus: qualified && model.state === "VALIDATOR_PACK_SEALED" ? "qualified" : "rejected",
      evidenceHashes: [compiled.packHash, integrity.evidenceHash],
      generatedAt: new Date().toISOString(),
    };
    await writeFile(path.join(stage, "qualification-report.json"), `${canonicalJson(report)}\n`, "utf8");
    return report;
  } catch {
    report = incompleteReport(context.contractHash);
    await writeFile(path.join(stage, "qualification-report.json"), `${canonicalJson(report)}\n`, "utf8").catch(() => undefined);
    return report;
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}

async function resultForControl(control: QualificationControl, manifest: ValidatorPackManifest): Promise<ControlResult> {
  const observedAccepted = (await Promise.all(manifest.validators.map(async (validator) => {
    if (validator.capabilityId === "payment.same_key_concurrency") return checkSameKeyConcurrency(control);
    if (validator.capabilityId === "payment.distinct_key_independence") return checkDistinctKeys(control);
    if (validator.capabilityId === "docs.idempotency_header_present") return control.documentation.includes("Idempotency-Key") && control.documentation.includes("POST /payments");
    return false;
  }))).every(Boolean);
  const expected = control.kind === "positive" ? "accepted" : "rejected";
  const observed = observedAccepted ? "accepted" : "rejected";
  return { controlId: control.id, expected, observed, passed: expected === observed };
}

async function checkSameKeyConcurrency(control: QualificationControl): Promise<boolean> {
  const service = control.createService();
  await Promise.all(Array.from({ length: 20 }, () => service.charge("same-key", 100)));
  return service.countCreated() === 1;
}

async function checkDistinctKeys(control: QualificationControl): Promise<boolean> {
  const service = control.createService();
  await Promise.all([service.charge("one", 100), service.charge("two", 100)]);
  return service.countCreated() === 2;
}

async function proveTamperDetection(stage: string, packPath: string, manifest: ValidatorPackManifest): Promise<{ intact: boolean; evidenceHash: string }> {
  const copiedPack = path.join(stage, "tamper-probe");
  await cp(packPath, copiedPack, { recursive: true });
  const target = path.join(copiedPack, manifest.validators[0].relativePath);
  await writeFile(target, `${await readFile(target, "utf8")}tampered\n`, "utf8");
  const detected = await verifyTrustedValidatorPack(copiedPack).then(() => false, () => true);
  return { intact: detected, evidenceHash: sha256(`tamper-probe:${detected ? "detected" : "missed"}`) };
}

function score(results: readonly ControlResult[]): number {
  return results.length === 0 ? 0 : Math.round((results.filter((result) => result.passed).length / results.length) * 100);
}

function incompleteReport(contractHash = qualificationContractHash): ValidatorQualificationReport {
  return {
    schemaVersion: "1",
    contractHash,
    validatorPackHash: null,
    compilerVersion: trustedCapabilityCompilerVersion,
    compilationStatus: "failed",
    positiveControls: [],
    negativeControls: [],
    falseAccepts: 0,
    falseRejects: 0,
    discriminationScore: 0,
    integrityStatus: "incomplete",
    qualificationStatus: "incomplete",
    evidenceHashes: [],
    generatedAt: new Date().toISOString(),
  };
}
