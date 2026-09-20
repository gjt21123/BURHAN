# BURHAN

[![CI](https://github.com/gjt21123/BURHAN/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/gjt21123/BURHAN/actions/workflows/ci.yml)
[![CodeQL](https://github.com/gjt21123/BURHAN/actions/workflows/codeql.yml/badge.svg?branch=master)](https://github.com/gjt21123/BURHAN/actions/workflows/codeql.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

**Independent, evidence-first verification for bounded coding-agent work.**

BURHAN separates the agent that changes code from the system that decides whether the task is complete. It treats model drafts, candidate patches, test summaries and completion claims as untrusted input. Acceptance comes from a human-sealed contract, qualified validators and BURHAN-owned evidence produced in a fresh workspace.

## Portable CLI preview: committed-file checks

The new **0.3.0-preview.1 CLI distribution** can inspect independent Git repositories without the payment fixture, BURHAN milestone tags, Next.js or provider credentials. It supports `doctor`, `init`, `contract validate`, `contract seal`, `verify`, `report` and pinned report-integrity checking.

```bash
# No npm ci is needed for this dependency-free profile.
node packages/cli/portable/bin/burhan.mjs doctor
node packages/cli/portable/bin/burhan.mjs --help
```

Its explicit `static_git_snapshot_v1` profile checks committed file predicates and allowed/forbidden changes against a maintainer-approved, independently pinned contract. **Static PASSED is not runtime correctness**, and dirty/untracked files are not included. It does not execute candidate code or replace the existing qualified runtime verifier.

Read the [CLI installation and command reference](packages/cli/portable/README.md), [milestone evidence and remaining scope](docs/portable-cli.md), and [design decision](docs/adr/portable-static-cli.md). `npm run test:cli-package` packs and installs the real tarball offline outside this monorepo; CI retains the tested package and checksums as artifacts. No npm registry publication or external adoption is claimed.

## Status and intended use

**0.2.0 is an early-stage OSS preview**, suitable for inspecting and reproducing the reference workflow, contributing tests, and evaluating the approach. It is not a hosted service or a general-purpose production verifier for arbitrary repositories.

The complete reference verification flow is **Windows-native**. CI covers portable unit tests, TypeScript checks and the web build on **Windows, Linux and macOS, using Node.js 22 and 24**. This does not establish cross-platform equivalence for the complete executor/verifier flow.

`local_trusted` is **not a hardened sandbox, malware-containment boundary, external attestation or mathematical correctness guarantee**. Read the [threat model](docs/threat-model.md) before running unfamiliar code.

## Start without an API key

Use Git, npm and Node.js **22 or 24**. The package's compatibility floor is 20.9, but that older line is not in the supported CI matrix.

```bash
git clone https://github.com/gjt21123/BURHAN.git
cd BURHAN
npm ci
npm run dev
```

Visit **http://127.0.0.1:3000**. The demo binds to loopback. Deterministic tests and fixtures do not require provider credentials. HTTP live compilation is disabled unless explicitly enabled locally.

```bash
# Portable tests, generated Next.js types, type checks and build
npm run ci:portable

# Project files, relative links, conservative secret-pattern hygiene,
# and application-draft length checks
node scripts/check-repository.mjs

# Built production demo: nine HTTP checks with live calls disabled
node scripts/smoke-web.mjs
```

On Windows, run the full reference suite:

```powershell
npm run ci:verification
```

See [configuration and local API safety](docs/configuration.md), [evaluation cases](docs/testing.md) and the [demo script](docs/demo-script.md). No npm package publication is claimed; use this source checkout, not an unverified `npx burhan` command.

## What is verified

The payment-idempotency reference task requires exactly one charge from 20 concurrent same-key requests, independent handling of distinct keys, documentation of the `Idempotency-Key` header, and no changes to protected tests, migrations or dependency manifests.

```text
Task and filtered repository facts
    -> draft ProofContract -> human review and seal
    -> untrusted ValidatorBlueprint
    -> deterministic validator compiler
    -> positive/negative qualification controls
    -> sealed validator pack
    -> separate coding-agent execution
    -> captured candidate state
    -> fresh-workspace verification
    -> evidence-backed verdict and linked local receipts
```

The fixtures include intentionally wrong candidates, protected-path violations and fabricated evidence. A passing agent-authored test summary is not sufficient for acceptance.

## Trust boundaries

| Input or component | Treatment |
| --- | --- |
| Model contract draft and ValidatorBlueprint | Untrusted; deterministic linting and human approval are required |
| Executor output, candidate patch, completion claim | Untrusted; cannot determine its own verdict |
| Validator templates and qualification controls | BURHAN-controlled |
| Sealed contracts, validator packs and receipts | Protected artifacts with integrity checks |
| Independent runtime verification | Uses captured state in a fresh workspace |
| Portable static snapshot verification | Reads committed blobs; no runtime-execution claim |
| Local signatures and hashes | Local artifact integrity, not external certification |
| Local HTTP API | Loopback/origin/body limits, not authentication or a multi-user service |

Details: [architecture](docs/architecture.md), [threat model](docs/threat-model.md), [product specification](docs/product-spec.md), [ecosystem rationale](docs/ecosystem.md).

## Codex integration and honest evidence

Codex can act as a validator architect or task executor, but its output never determines acceptance. Provider execution remains separate from deterministic verdict logic.

The historical live Codex Architect/Executor run produced **REJECTED** after BURHAN captured an empty candidate patch. The original retained context does not support same-thread repair and reports `REPAIR_CONTEXT_UNAVAILABLE`. The UI's successful repair sequence is explicitly a **DETERMINISTIC REPAIR DEMO**, not a second live Codex run.

Historical GPT compiler disclosures, including unavailable live API quota, remain in [codex-contributions.md](docs/codex-contributions.md). Adding CI and OSS policies does not turn old fixtures into new live-provider evidence.

## Validation and maintenance

The CI workflow runs six portable OS/Node combinations, the separate full Windows reference suite, all-dependency npm auditing, repository hygiene and application-file validation. Each portable job also installs and exercises the standalone CLI tarball offline on independent fixture repositories. A production HTTP smoke test runs on Linux/Node 22. Tracked changes and unexpected untracked output fail the clean-tree checks.

CodeQL analyzes JavaScript/TypeScript. The PR dependency workflow always enforces a complete npm audit and additionally runs GitHub dependency-graph review **when that repository feature is available**. An unavailable graph is reported explicitly, not counted as a successful graph review. OpenSSF Scorecard provides posture information, not certification.

See the [validation record](docs/codex-for-oss/validation.md), [release process](docs/release-process.md) and [changelog](CHANGELOG.md). Passing bounded tests does not establish absence of all defects or vulnerabilities.

## Repository layout

```text
apps/web                         Local demonstration and inspection UI
packages/cli                     Portable CLI distribution and legacy evaluation entry point
packages/core                    Contracts, evidence, receipts and state machine
packages/specforge               Filtered repository facts and contract compiler
packages/validator-compiler      Trusted validator templates and sealing
packages/validator-qualification Positive and negative qualification controls
packages/codex-runner            Codex adapter, execution and repair orchestration
packages/verifier                Fresh verification and verdict logic
packages/workspace               Workspace and path-safety utilities
examples/payment-service         Reference bounded coding task
evals                            Valid and intentionally invalid candidates
scripts                          Repository, packaging and production HTTP checks
docs                             Architecture, usage, maintenance and evidence
submission-assets                Historical demonstration media
```

## Contribute

Start with [CONTRIBUTING.md](CONTRIBUTING.md). Coding agents must also read [AGENTS.md](AGENTS.md). Useful contributions include negative controls, reproducibility reports, threat-model critiques, portable execution backends and additional reference tasks. Verification-sensitive changes should identify the trust boundary, regression tests and failure behavior.

- [Roadmap](ROADMAP.md) and [governance](GOVERNANCE.md)
- [Maintainer guide](docs/maintainer-guide.md), [support](SUPPORT.md) and [Code of Conduct](CODE_OF_CONDUCT.md)
- [Adopter registry](ADOPTERS.md): consented, verifiable usage only
- [Codex for OSS application pack](docs/codex-for-oss/README.md): a transparent draft, not program acceptance

No widespread adoption, npm download statistics, external production users or independent security audit are claimed.

## Security

Do not publish exploit details or credentials in issues. Follow [SECURITY.md](SECURITY.md). Keep the demo local; do not expose it through a public reverse proxy. Live compilation can send filtered repository facts to a provider and must be explicitly enabled after reviewing [configuration](docs/configuration.md).

## License

[Apache License 2.0](LICENSE). Copyright 2026 BURHAN contributors. See [NOTICE](NOTICE).
