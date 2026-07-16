import type { RepositoryFactPack } from "../schemas/repository-fact-pack.js";

export function capabilityCatalog(): RepositoryFactPack["verifierCapabilities"] {
  return [
    { id: "payment.same_key_concurrency", description: "Verify one charge for concurrent identical idempotency keys.", supportedEvidenceClass: "deterministic", supportedClauseTypes: ["outcome"] },
    { id: "payment.distinct_key_independence", description: "Verify distinct idempotency keys create independent charges.", supportedEvidenceClass: "deterministic", supportedClauseTypes: ["outcome"] },
    { id: "repository.regression_suite", description: "Run sealed regression checks.", supportedEvidenceClass: "deterministic", supportedClauseTypes: ["invariant"] },
    { id: "repository.forbidden_paths", description: "Reject protected path changes.", supportedEvidenceClass: "deterministic", supportedClauseTypes: ["prohibition"] },
    { id: "repository.package_manifest_unchanged", description: "Verify dependency manifests do not change.", supportedEvidenceClass: "deterministic", supportedClauseTypes: ["prohibition"] },
    { id: "docs.idempotency_header_present", description: "Verify Idempotency-Key documentation structure.", supportedEvidenceClass: "deterministic", supportedClauseTypes: ["documentation"] },
  ];
}
