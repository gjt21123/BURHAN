# ADR 003: Qualify trusted validator packs before sealing

## Decision

Codex will produce a bounded `ValidatorBlueprint` rather than arbitrary tests. BURHAN owns the executable capability templates, hashes every generated file, and seals a pack only after deterministic qualification.

## Rationale

- A blueprint can be linted for contract hashes, capabilities, parameters, paths, and prohibited fields; arbitrary source cannot be safely trusted on that basis.
- BURHAN-owned templates preserve the verifier trust boundary and prevent model-authored commands, executable paths, evidence, receipts, and verdict logic.
- One positive implementation is insufficient because a validator can overfit its strategy. Two correct implementations using keyed locking and in-flight promise deduplication test strategy independence.
- Targeted negative controls reveal false accepts, while positive controls reveal false rejects.
- Qualification must complete before sealing so an intact pack has demonstrated discrimination rather than only compilation.
- Fixture mode provides reproducible local validation before a future live Codex integration exists; it requires no credentials or network calls.
