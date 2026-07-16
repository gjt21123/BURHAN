import { canonicalJson, sha256, type ProofContract } from "@burhan/core";
import type { ContractDraft } from "../schemas/contract-draft.js";
import type { RepositoryFactPack } from "../schemas/repository-fact-pack.js";
import { lintContractDraft } from "../lint/contract-linter.js";

export function normalizeApprovedDraft(draft: ContractDraft, task: string, facts: RepositoryFactPack, approvedClauseIds: string[]): { contract: ProofContract; contractHash: string } {
  const lint = lintContractDraft(draft, task, facts, approvedClauseIds);
  if (!lint.sealable) throw new Error(`Draft cannot be sealed: ${lint.issues.map((issue) => issue.code).join(", ")}`);
  const counters = { outcome: 0, invariant: 0, prohibition: 0, documentation: 0 };
  const contract: ProofContract = { id: `contract-${sha256(task).slice(7, 19)}`, version: 1, title: draft.conciseTitle, goal: draft.normalizedGoal, scope: { allowedPaths: ["examples/payment-service/src/**", "examples/payment-service/docs/**"], forbiddenPaths: ["examples/payment-service/db/migrations/**", "examples/payment-service/tests/**", "package.json", "package-lock.json"], networkAccess: "disabled", maxRepairAttempts: 0 }, clauses: draft.clauses.filter((clause) => approvedClauseIds.includes(clause.temporaryId)).map((clause) => { counters[clause.type] += 1; return { id: `${clause.type.slice(0, 3).toUpperCase()}-${String(counters[clause.type]).padStart(3, "0")}`, type: clause.type, statement: clause.normalizedStatement, severity: clause.severity, sourceReference: clause.sourceReferences.map((reference) => `${reference.sourceId}:${reference.excerpt}`).join(" | "), evidenceStrategy: { mode: modeFor(clause.verificationPlan.strategy), evidenceClass: clause.verificationPlan.evidenceClass, requiredAssurance: clause.verificationPlan.evidenceClass === "deterministic" ? "proven" : "supported" } }; }), assumptions: draft.assumptions.map((assumption) => assumption.statement), ambiguities: [] };
  return { contract, contractHash: sha256(canonicalJson(contract)) };
}
function modeFor(strategy: ContractDraft["clauses"][number]["verificationPlan"]["strategy"]): ProofContract["clauses"][number]["evidenceStrategy"]["mode"] { return strategy === "structural_document_check" ? "static_analysis" : strategy === "diff_policy" || strategy === "file_manifest" ? "diff_check" : strategy === "semantic_review" ? "semantic_review" : "test"; }
