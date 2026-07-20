import path from "node:path";
import { continueRetainedArchitectPipeline } from "../live-pipeline-continuation.js";

const result = await continueRetainedArchitectPipeline(path.resolve(process.cwd(), "../.."));
console.log("BURHAN LIVE PIPELINE CONTINUATION\n");
console.log(`Retained Architect artifact:       ${result.artifactValid ? "VALID" : "INVALID"}`);
console.log(`Runtime Zod:                       ${result.zod ? "PASS" : "FAIL"}`);
console.log(`Blueprint linter:                  ${result.linter ? "PASS" : "FAIL"}`);
console.log(`Validator compilation:             ${result.validatorPackContentHash ? "PASS" : "NOT_REACHED"}`);
console.log(`Positive controls:                 ${result.positiveControls} / 2`);
console.log(`Negative controls:                 ${result.negativeControls} / 4`);
console.log(`False accepts:                     ${result.falseAccepts}`);
console.log(`False rejects:                     ${result.falseRejects}`);
console.log(`Qualification:                     ${result.qualification.toUpperCase()}`);
console.log(`Validator pack sealed:             ${result.sealed ? "YES" : "NO"}`);
console.log(`Executor eligible:                 ${result.executorEligible ? "YES" : "NO"}`);
console.log("Additional Architect attempts:     0");
console.log(`Result:                            ${result.executorEligible ? "PASS" : "FAIL"}`);
process.exitCode = result.executorEligible ? 0 : 1;
