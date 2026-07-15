# BURHAN product specification

## Product promise

BURHAN verifies AI-generated code changes against a sealed, independently executed proof contract. It is a tamper-evident evidence system for bounded engineering tasks, not a general formal-proof system.

## Primary demo

A TypeScript payment service receives twenty concurrent requests with the same idempotency key. The correct implementation creates exactly one charge, keeps distinct keys independent, updates API documentation, changes no migration, and makes no external network call.

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

## Explicit non-goals

- No model integrations or external agent execution yet.
- No GitHub authentication, multi-tenancy, Kubernetes, or blockchain.
- No claim of mathematical correctness for arbitrary programs.
