# BURHAN

[![CI](https://github.com/gjt21123/BURHAN/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/gjt21123/BURHAN/actions/workflows/ci.yml)
[![Runtime verification](https://github.com/gjt21123/BURHAN/actions/workflows/runtime-verification.yml/badge.svg?branch=master)](https://github.com/gjt21123/BURHAN/actions/workflows/runtime-verification.yml)
[![CodeQL](https://github.com/gjt21123/BURHAN/actions/workflows/codeql.yml/badge.svg?branch=master)](https://github.com/gjt21123/BURHAN/actions/workflows/codeql.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

**Independent, evidence-first verification for bounded coding-agent work.**

BURHAN separates the agent that changes code from the system that decides whether the task is complete. Model drafts, candidate patches, test summaries and completion claims are untrusted input. Acceptance comes from explicit approved requirements, qualified validators and BURHAN-owned evidence, not an agent's self-report.

## Portable CLI preview: committed-file checks

The **0.3.0-preview.1 CLI distribution** inspects independent Git repositories without the payment fixture, BURHAN milestone tags, Next.js or provider credentials. It supports `doctor`, `init`, `contract validate`, `contract seal`, `verify`, `report` and pinned report-integrity checking.

```bash
# No npm ci is needed for this dependency-free profile.
node packages/cli/portable/bin/burhan.mjs doctor
node packages/cli/portable/bin/burhan.mjs --help
```

Its `static_git_snapshot_v1` profile checks committed file predicates and allowed/forbidden changes against a maintainer-approved, independently pinned contract. **Static PASSED is not runtime correctness**, and dirty/untracked files are not included. It does not execute candidate code or replace the qualified runtime reference workflow.

Read the [CLI command reference](packages/cli/portable/README.md), [Phase A evidence](docs/portable-cli.md) and [design decision](docs/adr/portable-static-cli.md). `npm run test:cli-package` packs and installs the actual tarball offline outside this monorepo. CI retains tested packages and checksums as artifacts; no npm registry publication or external adoption is claimed.

## Runtime portability: current development

The command-based runtime path now uses a bounded local process backend with cancellation, combined output limits, restricted child environments and explicit cleanup outcomes. The ten deterministic reference suites are exercised on **Linux, macOS and Windows with Node.js 22 and 24** by a separate Runtime verification workflow.

The command-based evaluator retains approved validator-pack hashes independently and checks them around execution. Missing or interrupted execution produces `incomplete`, not an apparent successful result or a normal functional rejection.

This is a **reference-workflow portability increment**, not completion of generic runtime verification for arbitrary repositories. The original runtime examples still use BURHAN's fixtures/history, and some legacy in-process execution paths have not been migrated to the supervisor. Read [runtime portability and remaining boundaries](docs/runtime-portability.md) before running unfamiliar code.

## Status and intended use

The last published project release is **0.2.0 OSS preview**; newer development and the separate CLI preview do not overwrite that release. BURHAN is early-stage software for inspecting the approach, reproducing reference checks and contributing tests. It is not a hosted service or a general-purpose production verifier.

`local_trusted` is **not a hardened sandbox, malware-containment boundary, complete network isolation, external attestation or mathematical correctness guarantee**. The host and verifier toolchain remain trusted. See the [threat model](docs/threat-model.md).

## Start without an API key

Use Git, npm and Node.js **22 or 24**. The package's older 20.9 compatibility floor is not in the supported CI matrix.

```bash
git clone https://github.com/gjt21123/BURHAN.git
cd BURHAN
npm ci
npm run dev
```

Visit **http://127.0.0.1:3000**. The demo binds to loopback. Deterministic tests and fixtures need no provider credentials; HTTP live compilation is disabled unless explicitly enabled locally.

```bash
# Unit tests, generated types, TypeScript checks and web build
npm run ci:portable

# Ten deterministic runtime reference suites; use a full Git checkout
npm run ci:verification

# Real standalone tarball installation and fixture checks
npm run test:cli-package

# Required files, relative links, conservative secret hygiene and draft limits
node scripts/check-repository.mjs

# Nine HTTP checks on the built local production demo, with live calls disabled
node scripts/smoke-web.mjs
```

See [configuration](docs/configuration.md), [testing](docs/testing.md) and the [demo script](docs/demo-script.md). Use a source checkout or a reviewed CI tarball, not an unrelated `npx burhan` package.

## What the runtime reference task verifies

The payment-idempotency reference requires one charge from 20 concurrent same-key requests, independent handling of distinct keys, documentation of the `Idempotency-Key` header and no changes to protected tests, migrations or dependency manifests.

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

The fixtures include intentionally wrong candidates, protected-path violations and fabricated evidence. A passing agent-authored test summary is insufficient for acceptance. Reference tests do not establish that the same checks cover every real-world payment system.

## Trust boundaries

| Input or component | Treatment |
| --- | --- |
| Model contract draft and ValidatorBlueprint | Untrusted; linting and human approval required |
| Executor output, patch and completion claim | Cannot determine their own verdict |
| Validator templates and qualification controls | BURHAN-controlled |
| Approved pack identity | Retain its seal independently; an adjacent checksum alone is not approval |
| Independent runtime verification | Uses captured state in a fresh workspace; see actual path limits |
| Portable static snapshot verification | Committed blobs only; no execution claim |
| Process supervisor | Bounded local execution, not hostile-code containment |
| Local signatures and hashes | Artifact integrity, not external certification |
| Local HTTP API | Loopback/origin/body limits, not authentication or a multi-user service |

Details: [architecture](docs/architecture.md), [threat model](docs/threat-model.md), [runtime boundary](docs/runtime-portability.md), [product specification](docs/product-spec.md), [ecosystem rationale](docs/ecosystem.md).

## Codex integration and historical evidence

Codex can act as a validator architect or executor, but its output does not determine acceptance. Provider execution remains separate from deterministic verdict logic.

The historical live Codex Architect/Executor run produced **REJECTED** after BURHAN captured an empty patch. The original retained context does not support same-thread repair and reports `REPAIR_CONTEXT_UNAVAILABLE`. The UI's repair sequence is a **DETERMINISTIC REPAIR DEMO**, not a second live Codex run.

Historical GPT compiler disclosures remain in [codex-contributions.md](docs/codex-contributions.md). New CI runs, fixture labels and constructed receipt examples are not new live-provider evidence or a revalidation of old provider bundles.

## Validation and maintenance

Normal CI covers six OS/Node unit/type/build/package combinations, the retained Windows reference job, all-dependency npm auditing and repository/application hygiene. A production HTTP smoke test runs on Linux/Node 22. The dedicated Runtime verification workflow additionally exercises all ten reference suites in six combinations. Tracked changes and unexpected untracked output fail clean-tree checks.

CodeQL analyzes JavaScript/TypeScript. The PR dependency workflow always enforces a complete npm audit and runs an additional GitHub dependency-graph review only when available. An unavailable graph is reported, not counted as a successful comparison. OpenSSF Scorecard is posture information, not certification.

See [testing](docs/testing.md), [historical validation](docs/codex-for-oss/validation.md), [release process](docs/release-process.md) and [changelog](CHANGELOG.md). Check results for the exact commit being reviewed; old release evidence does not automatically cover later changes.

## Repository layout

```text
apps/web                         Local demonstration and inspection UI
packages/cli                     Portable static distribution and runtime reference CLI
packages/core                    Contracts, evidence, receipts and state machine
packages/specforge               Filtered repository facts and contract compiler
packages/validator-compiler      Trusted validator templates and sealing
packages/validator-qualification Positive and negative qualification controls
packages/codex-runner            Codex reference adapter and repair orchestration
packages/verifier                Runtime command backend, evidence and verdict logic
packages/workspace               Workspace and path-safety utilities
examples/payment-service         Reference bounded coding task
evals                            Valid and intentionally invalid candidates
scripts                          Repository, packaging and production HTTP checks
docs                             Architecture, usage, maintenance and evidence
submission-assets                Historical demonstration media
```

## Contribute

Read [CONTRIBUTING.md](CONTRIBUTING.md); coding agents also follow [AGENTS.md](AGENTS.md). Useful work includes negative controls, reproducibility reports, migration of the remaining in-process runtime path, generic repository inputs and additional runtime examples. Describe trust boundaries and actual validation in each PR.

- [Roadmap](ROADMAP.md) and [governance](GOVERNANCE.md)
- [Maintainer guide](docs/maintainer-guide.md), [support](SUPPORT.md) and [Code of Conduct](CODE_OF_CONDUCT.md)
- [Adopter registry](ADOPTERS.md): consented, verifiable usage only
- [Codex for OSS application pack](docs/codex-for-oss/README.md): a draft, not acceptance

No widespread adoption, npm download metrics, external production users or independent security audit are claimed.

## Security and license

Do not publish exploit details or credentials in issues. Follow [SECURITY.md](SECURITY.md). Keep the demo local. Live compilation can send filtered facts to a provider and requires explicit local opt-in described in [configuration](docs/configuration.md).

[Apache License 2.0](LICENSE). Copyright 2026 BURHAN contributors. See [NOTICE](NOTICE).
