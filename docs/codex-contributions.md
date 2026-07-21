# Codex contributions

## Milestone 1

- Codex scaffolded the TypeScript workspace and the local Next.js review UI.
- Codex defined the proof-domain schemas and deterministic run-state transitions.
- Codex implemented the intentionally racy payment fixture and its reproducible concurrency counterexample.
- Human product decisions incorporated: independent verifier, sealed contract, forbidden migration path, protected tests and dependency manifests, and the payment-idempotency demonstration.

## Evidence produced

- `npm test` is the milestone validation command.
- The payment fixture test records that twenty concurrent same-key requests produce twenty charges before any repair is applied.

## Milestone 2

- Codex separated normal regression tests from the deterministic baseline-race reproducer.
- Codex added sealed validator manifests, canonical hashing, evidence chaining, local Ed25519 receipt signatures, independent clones, and a Windows-native local trusted runner.
- The resulting contract verdict is explicitly separate from execution assurance; it does not claim hostile-code containment.

## Milestone 3

- Codex added SpecForge schemas, a secret-excluding deterministic fact-pack builder, capability catalog, source/capability linter, canonical approval normalization, and fixture compiler evaluations.
- Codex wired GPT-5.6 Structured Outputs server-side only through the Responses API; absent API credentials produce the explicit `API_KEY_MISSING` live-eval state.

## Milestone 4A

- Codex added shared structured agent schemas and fixture-only ValidatorBlueprint intake; no live Codex request is made.
- Codex added a deterministic blueprint linter, trusted capability templates, manifest hashing, sealing, qualification controls, and a copied-pack tamper probe.
- Codex added the qualification reducer states and a read-only result component. Human product decisions retained: model-authored commands and arbitrary test code are forbidden, control catalog paths remain internal, and qualification precedes pack sealing.

## Milestone 4B and 4C

- Codex was used in one real Architect and Executor flow. BURHAN received lifecycle events, captured the actual candidate patch, and independently verified the candidate in a fresh workspace.
- The real candidate patch was empty. BURHAN therefore returned `REJECTED`; an agent completion claim did not affect the verdict.
- Codex implemented the deterministic retained repair demonstration, SamePackProof, linked local artifact-integrity receipts, tampering checks, and the safe demo reset. The repair shown in the submission UI is deterministic and reproducible; it is not presented as a second live Codex repair.
- The historical live run predates complete retained-run bundles, so same-thread live repair is accurately unavailable as `REPAIR_CONTEXT_UNAVAILABLE`.

## AI disclosure for submission

- Codex contributed implementation assistance and was used for the recorded live Architect/Executor evidence.
- GPT-5.6 is supported server-side by the SpecForge compiler boundary through Structured Outputs. The project does not claim a successful live GPT-5.6 result for the final submission because the live API evaluation was unavailable due to quota.
- All final verdicts in the demo come from BURHAN-owned deterministic verification, not from an AI model's self-report.
