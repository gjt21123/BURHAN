# Contributing to BURHAN

BURHAN evaluates agent-authored changes. Contributions must preserve independent acceptance, reproducible evidence, explicit trust boundaries and fail-closed behavior.

Read the [README](README.md), [architecture](docs/architecture.md), [threat model](docs/threat-model.md), [governance](GOVERNANCE.md) and [security policy](SECURITY.md). For a non-trivial change, describe the problem, affected trust boundary and proposed tests in an issue before broad refactoring. Coding agents also follow [AGENTS.md](AGENTS.md).

## Setup

Use Git, npm and Node.js 22 or 24:

```bash
npm ci
npm run dev
```

Visit `http://127.0.0.1:3000`. Do not configure an API key for ordinary development or deterministic validation. Live provider-backed evaluations are separate, optional and may incur costs.

## Required validation

Portable checks on Windows, Linux or macOS:

```bash
npm run ci:portable
node scripts/check-repository.mjs
node scripts/smoke-web.mjs
git diff --check
git diff --exit-code
```

Run the smoke script after the production build included in `ci:portable`. It starts and stops a local server, exercises safe API behavior and leaves live compilation disabled. Next.js type declarations are generated and ignored; do not commit `apps/web/next-env.d.ts`.

The complete reference execution/verification path remains Windows-native:

```powershell
npm run ci:verification
```

Contributors on other operating systems should run the portable checks and inspect the Windows CI job, not claim that the full reference path ran locally. No maintainer credentials or external model quota are needed for these gates.

## Verification changes

Preserve these invariants:

- Agent-authored code, tests, explanations and completion claims remain untrusted.
- Qualified validator packs and sealed contracts cannot be redefined by the candidate.
- BURHAN-owned evidence determines acceptance in a fresh workspace.
- Missing, contradictory or unverifiable evidence fails closed.
- UI and documentation must not claim stronger assurance than the implementation.

Include a positive control, a negative control that must fail, and a regression for the reported failure. Describe protected-path/evidence impact and rollback behavior. Do not weaken validators or skip failing tests to obtain a green check.

## Pull requests

State the problem, implementation, affected trust boundaries, exact commands run, observed results and known limitations. Distinguish local results from CI results and live-provider execution from deterministic fixtures. Keep changes focused and update relevant documentation.

Automated or maintainer-authored work must not be presented as independent review, external adoption or a new human contributor. Do not fabricate issues, users, benchmarks, stars or usage metrics.

## Hygiene and licensing

Never commit keys, credentials, private reasoning, raw provider streams, hidden validator source in public evidence, generated run directories or machine-specific state. Conservative repository checks are not a substitute for reviewing the patch and history for sensitive data.

Use descriptive commits, such as `verifier: reject unsupported evidence` or `test: cover protected-path regression`.

By submitting a contribution, you intentionally submit it for inclusion under [Apache-2.0](LICENSE), unless agreed otherwise before acceptance. Report vulnerabilities privately using [SECURITY.md](SECURITY.md).
