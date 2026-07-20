# Architecture

```text
Intent → ProofContract → Seal → ValidatorBlueprint → Trusted validator compiler → Qualification gate → Executor workspace → Independent verifier → ProofReceipt
```

The executor and verifier have separate trust boundaries. An executor may edit its working tree but must not edit validator files, create evidence records, or issue its own receipt.

## Current boundaries

| Package | Responsibility | Writable by executor |
| --- | --- | --- |
| `packages/core` | Contract, evidence, receipt, state definitions | No |
| `examples/payment-service` | Demo target application | Yes, in an independent run clone |
| `packages/verifier` | Validators and evidence collection | No |
| `apps/web` | Review and verdict experience | No |

## State model

`DRAFT → AWAITING_APPROVAL → SEALED → BUILDING_VALIDATORS → EXECUTING → VERIFYING`

Verification may terminate as `VERIFIED`, `REJECTED`, or `INCOMPLETE`. A rejected run can move through `REPAIRING` before another execution attempt.

## Evidence policy

Evidence is deterministic where possible: commands, exit codes, content hashes, changed paths, and static checks. Semantic evidence is labeled separately and never presented as formal proof.

## Kernel trust boundaries

Every run uses an independent `git clone --no-hardlinks` workspace under `.burhan/workspaces/<runId>`. Protected artifacts live under `%LOCALAPPDATA%/BURHAN/runs/<runId>`, outside Git and the candidate workspace. The Windows-native parent process uses an allowlisted command, a sanitized environment, output caps, timeouts, and evidence written atomically. A verdict carries `local_trusted` execution assurance, not operating-system containment.

## SpecForge boundary

`task + RepositoryFactPack → GPT-5.6 ContractDraft → deterministic linter → human approval → ProofContract`. Repository facts exclude secrets, Git metadata, build output, binaries, and protected BURHAN paths. The model selects only capability IDs from the fact pack and never emits commands, validator definitions, evidence, or a verdict.

## Validator qualification boundary

`ValidatorBlueprint` is untrusted structured input. It can name an approved capability, sealed clause, bounded parameters, and fact-pack path only. The `validator-compiler` owns all executable templates and seals the generated manifest with file hashes. The qualification package alone owns control implementations; their paths and oracle behavior never enter the blueprint. Qualification checks two positive strategies and four targeted negatives before the core reducer permits `VALIDATOR_PACK_SEALED`.

## Codex executor boundary

Codex runs only in an independently materialized target repository under local application data. BURHAN captures its staged binary patch, including untracked files, then applies that captured patch to a third fresh workspace. The executor claim is public metadata only: the fresh workspace, qualified pack hashes, deterministic policies, and independent checks determine the verdict.
