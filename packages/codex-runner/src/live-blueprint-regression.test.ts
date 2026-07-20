import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { lintValidatorBlueprint, qualificationContract, qualificationContractHash, systemCoveredClauseIds } from "@burhan/validator-compiler";
import { validatorBlueprintSchema } from "./schemas.js";

describe("retained live Architect rejection", () => {
  it("preserves the blocking semantic linter failures", async () => {
    const fixture = JSON.parse(await readFile(new URL("./evals/fixtures/live-architect-rejected-blueprint.json", import.meta.url), "utf8"));
    const parsed = validatorBlueprintSchema.parse(fixture);
    const result = lintValidatorBlueprint(parsed, {
      contract: qualificationContract,
      contractHash: qualificationContractHash,
      repositoryBaselineHash: "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      knownPaths: ["src/payment-service.ts", "src/payment-store.ts", "docs/api.md"],
      systemCoveredClauseIds
    });
    expect(result.accepted).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "CONTRACT_HASH_MISMATCH",
      "BASELINE_HASH_MISMATCH",
      "UNKNOWN_CLAUSE",
      "UNKNOWN_CLAUSE",
      "UNKNOWN_CLAUSE",
      "CRITICAL_CLAUSE_UNCOVERED",
      "REQUIRED_CLAUSE_UNCOVERED",
      "REQUIRED_CLAUSE_UNCOVERED"
    ]);
  });
});
