# Contributing to BURHAN

Thank you for helping improve BURHAN.

BURHAN sits on a trust boundary: it evaluates coding-agent work and produces evidence that humans may use to make decisions. Contributions therefore need to preserve **independence, reproducibility, explicit trust boundaries, and fail-closed behavior**.

## Before you start

Please read:

- [README.md](README.md)
- [Architecture](docs/architecture.md)
- [Threat model](docs/threat-model.md)
- [Governance](GOVERNANCE.md)
- [Security policy](SECURITY.md)

For non-trivial changes, open an issue first and describe the problem, proposed behavior, trust-boundary impact, and how the change will be tested.

## Development setup

Requirements:

- Node.js 20.9 or newer
- npm
- Git
- Windows is the currently validated primary execution environment; portability work is welcome.

Install and start:

```bash
npm ci
npm run dev
```

## Required checks

Before opening a pull request, run:

```bash
npm test
npm run typecheck
npm run build
npm run eval:burhan
npm run eval:compiler:fixtures
npm run eval:codex:fixtures
npm run eval:validator-qualification
npm run eval:executor:fixtures
npm run eval:execution-verification
npm run eval:architect-output
npm run eval:repair-loop
npm run eval:repair-orchestration
npm run eval:submission-demo
git diff --check
```

Provider-backed/live checks are intentionally separate from deterministic CI. A pull request must not require maintainer credentials or external model quota to prove its deterministic correctness.

## Pull request expectations

A strong PR:

1. states the user or maintainer problem;
2. identifies any affected trust boundary;
3. explains failure modes and rollback behavior;
4. includes deterministic tests or fixtures;
5. updates documentation when public behavior changes;
6. avoids unrelated refactors;
7. does not include credentials, private reasoning, raw provider streams, hidden validator source, or protected artifacts.

Security-sensitive changes should include a short threat-model note in the PR body.

## Verification principles

Changes to verification logic should preserve these rules:

- Agent-authored claims are untrusted input.
- Verdicts must come from BURHAN-controlled evidence.
- Validators must be qualified against positive and negative controls.
- Protected artifacts must not be writable by the candidate.
- Verification should occur in a fresh workspace when the workflow claims independence.
- Ambiguous or incomplete evidence should fail closed.
- Claims in UI/docs must match the actual assurance level.

## Commit and branch hygiene

Use focused commits with imperative messages, for example:

```text
verifier: reject mutable sealed-contract inputs
docs: clarify local artifact integrity boundary
test: add negative control for protected-path writes
```

Do not commit generated build output, local credentials, or machine-specific state.

## Licensing

By submitting a contribution, you agree that your contribution is intentionally submitted for inclusion in BURHAN under the [Apache License 2.0](LICENSE), unless you explicitly state otherwise before the contribution is accepted.

## Reporting vulnerabilities

Do not disclose a suspected vulnerability in a public issue. Follow [SECURITY.md](SECURITY.md).
