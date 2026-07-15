# Codex contributions

## Milestone 1

- Codex scaffolded the TypeScript workspace and the local Next.js review UI.
- Codex defined the proof-domain schemas and deterministic run-state transitions.
- Codex implemented the intentionally racy payment fixture and its reproducible concurrency counterexample.
- Human product decisions incorporated: independent verifier, sealed contract, forbidden migration path, network prohibition, and the payment-idempotency demonstration.

## Evidence produced

- `npm test` is the milestone validation command.
- The payment fixture test records that twenty concurrent same-key requests produce twenty charges before any repair is applied.
