import { describe, expect, it } from "vitest";
import { qualificationContractHash } from "@burhan/validator-compiler";
import { buildArchitectPrompt } from "./architect-prompt.js";
import { validatorBlueprintSchema } from "./schemas.js";

const baselineHash = "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

describe("Architect prompt", () => {
  it("binds exact hashes and gives a schema-valid nonempty JSON example", () => {
    const prompt = buildArchitectPrompt(qualificationContractHash, baselineHash);
    expect(prompt).toContain(qualificationContractHash);
    expect(prompt).toContain(baselineHash);
    expect(prompt).not.toContain("validators:[]");
    expect(prompt).toContain("OUT-001/payment.same_key_concurrency");
    expect(prompt).toContain("OUT-002/payment.distinct_key_independence");
    expect(prompt).toContain("DOC-001/docs.idempotency_header_present");
    const marker = "Use this schema-valid compact example, replacing only fields justified by the sealed inputs: ";
    const example = JSON.parse(prompt.slice(prompt.indexOf(marker) + marker.length));
    expect(validatorBlueprintSchema.safeParse(example).success).toBe(true);
    expect(example.contractHash).toBe(qualificationContractHash);
    expect(example.repositoryBaselineHash).toBe(baselineHash);
    expect(prompt).not.toMatch(/sha256:<|<[^>]*hash[^>]*>/i);
    expect(example.validators).toHaveLength(3);
  });
});
