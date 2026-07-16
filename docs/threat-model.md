# Threat model

BURHAN protects against unsupported completion claims within a bounded local task.

## In scope

- An executor claiming tests passed without a trusted runner record.
- An executor changing a forbidden path.
- An executor deleting or changing visible tests to mask a defect.
- An executor passing a sequential check while failing a deterministic concurrency validator.
- A forged artifact being detected by stored hashes in a future receipt verifier.

## Out of scope for the MVP

- A compromised host or verifier process.
- Malicious dependencies or a full software supply-chain defense.
- Proving every possible execution of an arbitrary program.

The verifier runs outside the executor's writable clone and records evidence itself. Local trusted mode detects incorrect changes, forbidden modifications, workspace-authored fake evidence, validator-pack mutation, and unsupported completion claims.

Local trusted mode does not contain malware with the same Windows account, administrator- or kernel-level attacks, full-disk enumeration, or strong network exfiltration.

SpecForge treats both repository facts and task text as untrusted data to reduce prompt-injection impact. Structured output shape does not establish semantic correctness; source-reference, capability, ambiguity, assurance, and path linting remain independent deterministic gates.
