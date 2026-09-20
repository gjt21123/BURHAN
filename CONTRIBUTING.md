# Contributing to BURHAN

Preserve independent acceptance, reproducible evidence, explicit trust boundaries and fail-closed behavior.

Read the [README](README.md), [architecture](docs/architecture.md), [threat model](docs/threat-model.md), [runtime boundaries](docs/runtime-portability.md), [governance](GOVERNANCE.md) and [security policy](SECURITY.md). Describe non-trivial changes and affected trust boundaries before broad refactoring. Coding agents also follow [AGENTS.md](AGENTS.md).

## Setup and checks

Use Git, npm and Node.js 22 or 24. The local UI starts with `npm ci` then `npm run dev` at `http://127.0.0.1:3000`. No API key is needed for ordinary development or deterministic validation.

```bash
npm ci
npm run ci:portable
npm run ci:verification
npm run test:cli-package
node scripts/check-repository.mjs
node scripts/smoke-web.mjs
git diff --check
git diff --exit-code
```

The smoke script requires the production build included in `ci:portable`; it starts/stops a local server with live compilation disabled. Do not commit generated `apps/web/next-env.d.ts`.

The ten complete deterministic reference suites are exercised on Windows, Linux and macOS with Node 22/24. Their original examples require full Git history/tags. This is not generic external-repository runtime support; static CLI packaging and runtime execution have distinct scopes. Inspect both CI and Runtime verification jobs on the final PR commit.

Live evaluations are optional, separate, cost-bearing work. Never require maintainer credentials or API quota for deterministic contributor checks.

## Verification changes

- Agent-authored code, tests, explanations and completion claims remain untrusted.
- Approved contracts/packs must not be redefined by candidate-controlled data. Retain approval pins independently where supported.
- Evidence determines acceptance; empty, blocked, contradictory or unverifiable evidence stays incomplete.
- Static PASSED must never be presented as executed/runtime VERIFIED.
- A portable subprocess API does not supervise a caller that still imports candidate modules in-process.
- Documentation and logs must not overstate runtime assurance, live execution or test coverage.

Include positive and negative controls, a regression for the failure, protected-path/evidence impact and rollback behavior. Preserve exact argument boundaries, environment hygiene and resource limits when changing process execution. Document ordinary-child cleanup separately from deliberately detached/hostile-code containment.

## Pull requests and hygiene

State the problem, implementation, trust impact, commands actually run, observed results and remaining scope. Distinguish local from GitHub CI checks, historical records from new live runs, and maintainer automation from independent review or external adoption.

Do not skip failing tests, discard source changes or fabricate metrics to make results look stronger. Never commit credentials, private reasoning, raw provider streams, hidden validator source in public evidence, generated run directories or local machine state. Repository pattern checks are not an exhaustive history/asset secret audit.

Use descriptive focused commits. Contributions are intentionally submitted for inclusion under [Apache-2.0](LICENSE), unless agreed otherwise before acceptance. Report vulnerabilities through [SECURITY.md](SECURITY.md), not public exploit discussions.
