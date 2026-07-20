import { describe, expect, it } from "vitest";
import { qualificationLintContext, validValidatorBlueprint } from "@burhan/validator-compiler";
import { qualifyValidatorPackForBlueprint } from "./qualification.js";

describe("qualified validator packs", () => {
  it("qualifies the supplied trusted blueprint against all controls", async () => {
    const report = await qualifyValidatorPackForBlueprint(validValidatorBlueprint(), qualificationLintContext());
    expect(report.qualificationStatus).toBe("qualified");
    expect(report.positiveControls).toHaveLength(2);
    expect(report.negativeControls).toHaveLength(4);
    expect(report.falseAccepts).toBe(0);
    expect(report.falseRejects).toBe(0);
  });

  it("does not qualify a blueprint that fails trusted compilation", async () => {
    const blueprint = validValidatorBlueprint();
    const report = await qualifyValidatorPackForBlueprint({ ...blueprint, validators: [] }, qualificationLintContext());
    expect(report.qualificationStatus).toBe("incomplete");
  });
});
