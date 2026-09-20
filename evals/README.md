# BURHAN Evaluations

The evaluation suite tests whether BURHAN can distinguish a valid bounded change from known-invalid candidates.

## Principle

A verification system should be evaluated on both sides of the decision boundary:

- **positive control:** a candidate that should be accepted;
- **negative controls:** candidates that must be rejected or marked incomplete.

False acceptance is especially important because it means BURHAN claimed evidence supported a result when it should not have.

## Reference cases

The current payment-service evaluation covers:

- `correct` — satisfies the bounded contract;
- `sequential-only` — does not satisfy the concurrency outcome;
- `delete-tests` — violates protected-path policy;
- `forbidden-migration` — changes a forbidden migration path;
- `fake-evidence` — attempts to substitute candidate-authored evidence.

Additional suites cover validator qualification, provider-output validation, repair behavior, linked receipts, and tampering detection.

## Running evaluations

Portable workspace checks:

```bash
npm run ci:portable
```

Full reference verification currently requires Windows:

```powershell
npm run ci:verification
```

Live/provider-backed evaluations are separate. A live run should never be silently substituted for a deterministic fixture, and fixture success should never be described as a successful live provider run.
