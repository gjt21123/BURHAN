import type { ContractDraft } from "../schemas/contract-draft.js";
import type { RepositoryFactPack } from "../schemas/repository-fact-pack.js";

export type ContractLintIssue = { code: string; severity: "error" | "warning"; message: string; clauseId: string | null };
export type ContractLintResult = { sealable: boolean; issues: ContractLintIssue[]; blockingAmbiguities: string[] };

export function lintContractDraft(draft: ContractDraft, task: string, factPack: RepositoryFactPack, humanConfirmedClauseIds: string[] = []): ContractLintResult {
  const issues: ContractLintIssue[] = [];
  if (draft.compilationStatus !== "ready_for_review") issues.push(issue("COMPILATION_NOT_READY", "Draft is not ready for human review.", null));
  const capabilities = new Map(factPack.verifierCapabilities.map((capability) => [capability.id, capability]));
  const knownPaths = new Set([...factPack.files.sourcePaths, ...factPack.files.testPaths, ...factPack.files.documentationPaths, ...factPack.files.migrationPaths, "package.json", "package-lock.json"]);
  for (const clause of draft.clauses) {
    if (clause.sourceReferences.length === 0) issues.push(issue("SOURCE_REFERENCE_MISSING", "Every clause needs a source reference.", clause.temporaryId));
    for (const reference of clause.sourceReferences) if (reference.sourceType === "user_task" && !task.includes(reference.excerpt)) issues.push(issue("SOURCE_EXCERPT_INVALID", "User-task excerpt is not present in the original task.", clause.temporaryId));
    const capability = clause.verificationPlan.capabilityId ? capabilities.get(clause.verificationPlan.capabilityId) : undefined;
    if (clause.verificationPlan.strategy !== "unsupported" && !capability) issues.push(issue("UNKNOWN_CAPABILITY", "The selected capability is not in the fact pack.", clause.temporaryId));
    if (capability && (!capability.supportedClauseTypes.includes(clause.type) || capability.supportedEvidenceClass !== clause.verificationPlan.evidenceClass)) issues.push(issue("CAPABILITY_MISMATCH", "Capability cannot support this clause or evidence class.", clause.temporaryId));
    if (clause.origin === "inferred_requirement" && clause.severity === "critical" && !humanConfirmedClauseIds.includes(clause.temporaryId)) issues.push(issue("CRITICAL_INFERENCE_UNCONFIRMED", "Critical inferred clauses require human confirmation.", clause.temporaryId));
    if (/network|internet/i.test(clause.statement) && clause.verificationPlan.evidenceClass === "deterministic") issues.push(issue("NETWORK_ASSURANCE_UNSUPPORTED", "local_trusted cannot prove network denial.", clause.temporaryId));
    const paths = clause.statement.match(/[\w./-]+\.(?:ts|md|json|sql)/g) ?? [];
    if (paths.some((candidate) => !knownPaths.has(candidate) && !task.includes(candidate))) issues.push(issue("MODEL_INVENTED_PATH", "Clause names a path absent from task and fact pack.", clause.temporaryId));
    if (clause.verificationPlan.strategy === "unsupported" && clause.severity !== "medium") issues.push(issue("UNSUPPORTED_CRITICAL_CLAUSE", "Unsupported high-impact clauses block sealing.", clause.temporaryId));
  }
  const blockingAmbiguities = draft.ambiguities.filter((ambiguity) => ambiguity.blocking).map((ambiguity) => ambiguity.id);
  if (blockingAmbiguities.length) issues.push(issue("BLOCKING_AMBIGUITY", "Blocking ambiguities require a human answer.", null));
  if (draft.compilationStatus === "unsupported" && draft.clauses.length > 0) issues.push(issue("UNSUPPORTED_WITH_CLAUSES", "Unsupported input must not fabricate executable clauses.", null));
  return { sealable: issues.every((entry) => entry.severity !== "error"), issues, blockingAmbiguities };
}
function issue(code: string, message: string, clauseId: string | null): ContractLintIssue { return { code, severity: "error", message, clauseId }; }
