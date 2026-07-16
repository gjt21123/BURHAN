import { qualifyValidatorPack } from "./qualification.js";

const report = await qualifyValidatorPack();
const positiveAccepted = report.positiveControls.filter((result) => result.observed === "accepted").length;
const negativeRejected = report.negativeControls.filter((result) => result.observed === "rejected").length;
const passed = report.qualificationStatus === "qualified"
  && positiveAccepted === 2
  && negativeRejected === 4
  && report.falseAccepts === 0
  && report.falseRejects === 0
  && report.discriminationScore === 100
  && report.integrityStatus === "intact";

console.log("BURHAN VALIDATOR QUALIFICATION\n");
console.log(`Positive controls accepted: ${positiveAccepted} / ${report.positiveControls.length}`);
console.log(`Negative controls rejected: ${negativeRejected} / ${report.negativeControls.length}`);
console.log(`False accepts:              ${report.falseAccepts}`);
console.log(`False rejects:              ${report.falseRejects}`);
console.log(`Discrimination score:       ${report.discriminationScore}%`);
console.log(`Pack integrity:             ${report.integrityStatus.toUpperCase()}`);
console.log(`Result:                     ${passed ? "QUALIFIED" : report.qualificationStatus.toUpperCase()}`);
process.exitCode = passed ? 0 : 1;
