# BURHAN product specification

## Product promise

BURHAN verifies AI-generated code changes against a sealed, independently executed proof contract. It is a tamper-evident evidence system for bounded engineering tasks, not a general formal-proof system.

## Primary demo

A TypeScript payment service receives twenty concurrent requests with the same idempotency key. The correct implementation creates exactly one charge, keeps distinct keys independent, updates API documentation, changes no migration, tests, or dependency manifests.

The focal outcome is:

```text
AGENT CLAIM: DONE
BURHAN VERDICT: REJECTED
```

BURHAN then returns a structured counterexample to the executor. A repaired implementation may become `VERIFIED` only after the verifier collects sufficient evidence.

## Milestone 1 scope

- Define the bounded task with a mock compiled contract.
- Let a user review and seal that contract in the web experience.
- Model proof contracts, evidence records, receipts, and run states in TypeScript.
- Provide a deterministic fixture that demonstrates the concurrency race.

## Milestone 2 kernel

The sealed local verification kernel creates an independent Git clone for each run and stores contract, baseline, validator, evidence, and receipt artifacts outside it. `VERIFIED` means contract clauses and protected artifacts were independently checked by the local trusted runner; it does not claim hostile-code containment.

## Milestone 3 SpecForge

SpecForge compiles a natural-language task plus a deterministic repository fact pack into an untrusted `ContractDraft`. GPT-5.6 supplies only the draft through Structured Outputs. A deterministic linter, explicit human approval, canonical normalization, and hashing produce the sealed `ProofContract` used by the verification kernel.

## Milestone 4A validator qualification

A future Codex Validator Architect supplies a structured `ValidatorBlueprint`, never arbitrary test source or commands. BURHAN lints that blueprint against the sealed contract and fact-pack paths, compiles only trusted validator templates, then qualifies the pack against two distinct correct strategies and four known incorrect controls. A pack is sealed only after zero false accepts, zero false rejects, complete clause coverage, and a successful tamper probe.

## Milestone 4B independent execution

Codex can act as a separate executor, but its `AgentExecutionClaim` cannot issue a BURHAN verdict. BURHAN captures the real patch from an isolated target repository and verifies it in a fresh third workspace. `VERIFIED`, `REJECTED`, and `INCOMPLETE` remain deterministic BURHAN outcomes with `local_trusted` assurance.

## Explicit non-goals

- No model integrations or external agent execution yet.
- No GitHub authentication, multi-tenancy, Kubernetes, or blockchain.
- No claim of mathematical correctness for arbitrary programs.
