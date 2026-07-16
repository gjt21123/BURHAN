# ADR 002: SpecForge drafts are untrusted

GPT-5.6 produces `ContractDraft` only. BURHAN Core validates source references and fixed capabilities, requires human approval for critical inferences, normalizes the approved draft, and alone seals the final `ProofContract`.

Structured Outputs guarantee schema shape, not semantic correctness. The deterministic linter therefore blocks invented capabilities and paths, unsupported local-trusted guarantees, missing citations, unresolved ambiguity, and unconfirmed critical inference. Model output cannot issue evidence, a verdict, or `PROVEN`.

`local_trusted` cannot prove network containment. The compiler surfaces such requests as unsupported rather than silently weakening them.
