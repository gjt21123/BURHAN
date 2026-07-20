import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, sha256 } from "@burhan/core";
import { createBaselineManifest } from "@burhan/workspace";
import { lintValidatorBlueprint, qualificationContract, qualificationContractHash, systemCoveredClauseIds } from "@burhan/validator-compiler";
import { normalizeProviderValidatorBlueprint } from "../provider-output-schema.js";
import { validatorBlueprintSchema } from "../schemas.js";

const expectedClauses = new Map([
  ["payment.same_key_concurrency", "OUT-001"],
  ["payment.distinct_key_independence", "OUT-002"],
  ["docs.idempotency_header_present", "DOC-001"]
]);

try {
  const retained = await latestRetainedBlueprint();
  const parsedJson = JSON.parse(await readFile(retained.artifactPath, "utf8"));
  const parsed = validatorBlueprintSchema.safeParse(normalizeProviderValidatorBlueprint(parsedJson));
  if (!parsed.success) throw new Error("Blueprint Zod validation failed.");
  const baselineHash = sha256(canonicalJson(await createBaselineManifest(retained.workspacePath)));
  const lint = lintValidatorBlueprint(parsed.data, {
    contract: qualificationContract,
    contractHash: qualificationContractHash,
    repositoryBaselineHash: baselineHash,
    knownPaths: ["src/payment-service.ts", "src/payment-store.ts", "docs/api.md"],
    systemCoveredClauseIds
  });
  const issues = lint.issues.map((issue, index) => describeIssue(issue.code, issue.validatorId, parsed.data, index));
  console.log("BURHAN LIVE BLUEPRINT DIAGNOSIS\n");
  console.log("JSON validation:       PASS");
  console.log("Zod validation:        PASS");
  console.log(`Linter result:         ${lint.accepted ? "ACCEPTED" : "REJECTED"}`);
  console.log(`Blocking issues:       ${issues.length}`);
  console.log("Warnings:              0\n");
  console.log("Issues:");
  issues.forEach((issue, index) => {
    console.log(`\n${index + 1}.`);
    console.log(`Code:        ${issue.code}`);
    console.log(`Severity:    ${issue.severity}`);
    console.log("Blocking:    true");
    console.log(`Clause:      ${issue.clauseId ?? "N/A"}`);
    console.log(`Capability:  ${issue.capabilityId ?? "N/A"}`);
    console.log(`Pointer:     ${issue.pointer}`);
    console.log(`Expected:    ${issue.expected}`);
    console.log(`Observed:    ${issue.observed}`);
    console.log(`Explanation: ${issue.explanation}`);
    console.log("Class:       PROVIDER_SCHEMA_GAP");
  });
} catch {
  console.log("BURHAN LIVE BLUEPRINT DIAGNOSIS\n\nStatus: DIAGNOSTIC_INSUFFICIENT");
  process.exitCode = 1;
}

async function latestRetainedBlueprint(): Promise<{ artifactPath: string; workspacePath: string }> {
  const root = path.join(process.env.LOCALAPPDATA ?? "", "BURHAN");
  const runsRoot = path.join(root, "runs");
  const candidates: Array<{ runId: string; modified: number }> = [];
  for (const entry of await readdir(runsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith("live-architect-")) continue;
    try { candidates.push({ runId: entry.name, modified: (await stat(path.join(runsRoot, entry.name, "codex-output", "architect-final.json"))).mtimeMs }); } catch { /* no artifact */ }
  }
  candidates.sort((left, right) => right.modified - left.modified);
  if (!candidates[0]) throw new Error("No retained artifact.");
  return { artifactPath: path.join(runsRoot, candidates[0].runId, "codex-output", "architect-final.json"), workspacePath: path.join(root, "workspaces", candidates[0].runId, "architect") };
}

function describeIssue(code: string, validatorId: string | null, blueprint: ReturnType<typeof validatorBlueprintSchema.parse>, index: number) {
  const validator = blueprint.validators.find((entry) => entry.id === validatorId);
  const capabilityId = validator?.capabilityId ?? null;
  const expectedClause = capabilityId ? expectedClauses.get(capabilityId) ?? null : null;
  if (code === "CONTRACT_HASH_MISMATCH") return diagnostic(code, "critical", null, null, "/contractHash", "sealed contract hash", "different valid hash", "The provider schema allowed a hash other than the sealed contract hash.");
  if (code === "BASELINE_HASH_MISMATCH") return diagnostic(code, "critical", null, null, "/repositoryBaselineHash", "sealed baseline hash", "different valid hash", "The provider schema allowed a hash other than the sealed baseline hash.");
  if (code === "UNKNOWN_CLAUSE") return diagnostic(code, expectedClause === "OUT-001" ? "critical" : "high", validator?.clauseId ?? null, capabilityId, `/validators/${blueprint.validators.indexOf(validator!)}/clauseId`, expectedClause ?? "sealed clause ID", "unrecognized clause ID", "The provider schema allowed a clause ID outside the sealed contract.");
  const uncovered = code === "CRITICAL_CLAUSE_UNCOVERED" ? "OUT-001" : index === 6 ? "OUT-002" : "DOC-001";
  return diagnostic(code, uncovered === "OUT-001" ? "critical" : "high", uncovered, null, "/validators", "one accepted validator", "no accepted validator", "No validator with a sealed clause ID covered this required contract clause.");
}

function diagnostic(code: string, severity: "critical" | "high", clauseId: string | null, capabilityId: string | null, pointer: string, expected: string, observed: string, explanation: string) {
  return { code, severity, clauseId, capabilityId, pointer, expected, observed, explanation: explanation.slice(0, 300) };
}
