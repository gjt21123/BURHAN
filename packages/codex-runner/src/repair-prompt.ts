import type { CounterexamplePacket } from "./schemas.js";
const forbidden = /(?:validator[-_ ]?(?:source|paths?|files?|pack)|qualification[-_ ]?controls?|oracle(?:[-_ ]?(?:implementation|paths?))?|evidence[-_ ]?paths?|receipt[-_ ]?(?:key|paths?)|[A-Z]:\\|api[_-]?key|token|secret|bearer)/i;
export function buildRepairPrompt(packet: CounterexamplePacket): string {
  const failed = packet.failedClauses.map((item) => `${item.clauseId}: ${item.statement}; expected ${item.expectedObservation}; observed ${item.observedValue}`).join("\n");
  const proven = packet.provenClausesToPreserve.join(", ");
  return `BURHAN independently rejected the prior result. Modify the existing workspace; do not merely explain. Satisfy these failed public clauses:\n${failed}\nPreserve proven clauses: ${proven}. Do not modify tests, migrations, package manifests, or dependencies. Do not search for hidden validators. Run normal repository tests. Return exactly one RepairExecutionClaim JSON object without Markdown or prose.`;
}
export function repairPromptIsSanitized(prompt: string): boolean { return !forbidden.test(prompt); }
