# AGENTS.md

This file defines how coding agents should work in BURHAN.

## Mission

BURHAN independently verifies bounded coding-agent work. A model's statement that a task is complete is untrusted input. Preserve the separation between agent output and BURHAN-owned acceptance evidence.

## Read first

Before changing verification behavior, read `README.md`, `docs/architecture.md`, `docs/threat-model.md`, `docs/runtime-portability.md` and `CONTRIBUTING.md`.

## Trust rules

- Candidate/agent output never determines its own verdict.
- Sealed contracts and qualified validator packs are protected artifacts. Keep independently retained seal identity separate from candidate data.
- Qualification needs positive and negative controls.
- A workflow claiming independent runtime verification must check captured candidate state in a fresh workspace.
- Empty, contradictory, interrupted or unverifiable evidence is incomplete, never a successful verdict.
- Static `PASSED` is not runtime `VERIFIED`; the static CLI must not execute candidate code.
- A portable process runner does not mean every legacy in-process path is supervised. Inspect the actual call path before claiming bounded execution.
- `local_trusted` is not a secure sandbox, network-isolation mechanism or remote attestation.
- UI, logs and docs must not claim more than their actual checks establish.

## Scope and sensitive data

Use focused changes. Avoid unrelated refactors in trust-boundary code. Never commit credentials, private keys, raw provider streams, private model reasoning, hidden validator source in public evidence, generated local run directories or machine-specific state.

## Validation

```bash
npm ci
npm test
npm run typecheck
npm run build
npm run ci:verification
npm run test:cli-package
node scripts/check-repository.mjs
git diff --check
```

CI exercises portable unit/type/build/package checks and the ten deterministic runtime reference suites on Linux, macOS and Windows with Node 22 and 24. This covers the bounded reference fixtures, not generic arbitrary-repository runtime support. Inspect both CI and Runtime verification on the exact PR head before merge.

Live/provider-backed evaluations remain separate. An ordinary contribution must not require maintainer credentials or external model quota. Do not claim a recorded fixture is a new live run.

## Verification tests and pull requests

Include a positive control, negative control and regression for changed behavior. Test protected paths/evidence, cancellation and unavailable evidence when relevant. Identify the affected trust boundary, commands actually run, observed results, failure handling and documentation changes.

Do not weaken validators, discard source changes, skip failing cases or manufacture adoption to obtain a green report. Distinguish maintainer-directed automation from external contribution or independent review.
