# ADR 001: sealed verification kernel

## Decision

BURHAN uses deterministic validator commands stored outside the candidate workspace. A sealed manifest binds validator identity to the contract hash and baseline commit before candidate execution.

## Rationale

- The verifier is deterministic so a model statement or candidate log cannot become proof.
- Each run uses `git clone --no-hardlinks`; this protects the primary repository's metadata but is not an operating-system sandbox.
- Validators are sealed outside the workspace so the candidate cannot rewrite its judge.
- Model-produced evidence may be semantic or attested, never `PROVEN`.
- An Ed25519 receipt signature detects local receipt mutation. It is not an external certificate, PKI assertion, hostile-code containment guarantee, or formal proof of arbitrary program correctness.
