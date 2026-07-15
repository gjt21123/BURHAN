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

The verifier must run outside the executor's writable worktree and record evidence itself.
