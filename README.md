# BURHAN

> Agents do not say done. They prove it.

BURHAN is an independent verification plane for AI coding agents. It turns a bounded task into a sealed proof contract, runs independent checks, and issues a tamper-evident receipt only when the evidence supports the result.

## Milestone 1

This repository establishes the local vertical slice:

- A TypeScript workspace with a Next.js review surface.
- The `ProofContract`, `EvidenceRecord`, and `ProofReceipt` domain schemas.
- A deterministic orchestration state machine.
- A deliberately racy payment-service fixture and a deterministic test that exposes the duplicate-charge bug.
- A Define → Review mock flow for the payment task.

## Run locally

```bash
npm install
npm test
npm run dev
```

Open `http://localhost:3000` to review and seal the example contract. The current payment fixture is intentionally unsafe; the test documents the counterexample BURHAN must later reject.

## Repository layout

```text
apps/web                 Next.js Define and Review experience
packages/core            Contracts, receipt types, and state machine
packages/specforge       Contract compiler boundary (Milestone 2)
packages/codex-runner    Agent execution boundary (future milestone)
packages/verifier        Independent verifier boundary (future milestone)
packages/cli             CLI boundary (future milestone)
examples/payment-service Deliberately buggy payment fixture
evals                    Candidate-patch evaluation suite (future milestone)
docs                     Product, architecture, and threat model notes
```
