"use client";

type DraftClause = { temporaryId: string; type: string; statement: string; origin: string; severity: string; sourceReferences: Array<{ excerpt: string }>; verificationPlan: { capabilityId: string | null; evidenceClass: string } };

export function ContractDraftReview({ clauses }: { clauses: DraftClause[] }) {
  const groups = [["Must become true", "outcome"], ["Must remain true", "invariant"], ["Must never happen", "prohibition"], ["Documentation", "documentation"]] as const;
  return <section className="contract-grid">{groups.map(([title, type]) => <article className="card clause-group" key={type}><h2>{title}</h2>{clauses.filter((clause) => clause.type === type).map((clause) => <div className="clause" key={clause.temporaryId}><span>{clause.origin === "inferred_requirement" ? "INFERRED" : "EXPLICIT"}</span><p>{clause.statement}</p><small>{clause.verificationPlan.capabilityId ?? "Human review"} · {clause.verificationPlan.evidenceClass}</small><small>Source: {clause.sourceReferences[0]?.excerpt}</small></div>)}</article>)}</section>;
}
