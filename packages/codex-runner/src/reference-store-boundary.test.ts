import { it, expect } from "vitest";
import { writeFile, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { canonicalJson, sha256 } from "@burhan/core";
import { qualificationContract, qualificationContractHash, systemCoveredClauseIds } from "@burhan/validator-compiler";
import { captureCandidatePatch, createTargetWorkspace } from "@burhan/workspace";
import { fixtureClaim, targetBlueprint } from "./evals/execution-fixtures.js";
import { verifyCapturedCandidate } from "./execution.js";

it("service-only instrumentation cannot silently accept an unverified store implementation change", async () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const runId = `store-boundary-${randomUUID()}`;
  const executor = await createTargetWorkspace(root, runId, "executor");
  try {
    await writeFile(path.join(executor.path, "src/payment-store.ts"), "export class InMemoryPaymentStore { countCreated(){return 1;} }\n");
    const candidate = await captureCandidatePatch(executor);
    const baselineHash = sha256(canonicalJson(executor.baselineManifest));
    const context = { contract: qualificationContract, contractHash: qualificationContractHash,
      repositoryBaselineHash: baselineHash, knownPaths: ["src/payment-service.ts", "src/payment-store.ts", "docs/api.md"], systemCoveredClauseIds };
    const result = await verifyCapturedCandidate(root, runId, executor, candidate, context, targetBlueprint(baselineHash), fixtureClaim(runId));
    expect(result.verdict).toBe("incomplete");
    expect(result.failureCode).toBe("REFERENCE_STORE_CHANGE_UNSUPPORTED");
    expect(result.runtimeEvidenceHash).toBeUndefined();
  } finally { await rm(path.dirname(executor.path), { recursive: true, force: true }); }
}, 30_000);
