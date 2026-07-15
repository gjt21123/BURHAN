# Architecture

```text
Intent → ProofContract → Seal → Executor workspace → Independent verifier → ProofReceipt
```

The executor and verifier have separate trust boundaries. An executor may edit its working tree but must not edit validator files, create evidence records, or issue its own receipt.

## Current boundaries

| Package | Responsibility | Writable by executor |
| --- | --- | --- |
| `packages/core` | Contract, evidence, receipt, state definitions | No |
| `examples/payment-service` | Demo target application | Yes, in a future worktree |
| `packages/verifier` | Validators and evidence collection | No |
| `apps/web` | Review and verdict experience | No |

## State model

`DRAFT → AWAITING_APPROVAL → SEALED → BUILDING_VALIDATORS → EXECUTING → VERIFYING`

Verification may terminate as `VERIFIED`, `REJECTED`, or `INCOMPLETE`. A rejected run can move through `REPAIRING` before another execution attempt.

## Evidence policy

Evidence is deterministic where possible: commands, exit codes, content hashes, changed paths, and static checks. Semantic evidence is labeled separately and never presented as formal proof.
