# BURHAN

[![CI](https://github.com/gjt21123/BURHAN/actions/workflows/ci.yml/badge.svg)](https://github.com/gjt21123/BURHAN/actions/workflows/ci.yml)
[![CodeQL](https://github.com/gjt21123/BURHAN/actions/workflows/codeql.yml/badge.svg)](https://github.com/gjt21123/BURHAN/actions/workflows/codeql.yml)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/gjt21123/BURHAN/badge)](https://securityscorecards.dev/viewer/?uri=github.com/gjt21123/BURHAN)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

> **Coding agents should not merely say they finished. They should prove it.**

BURHAN is an open-source, evidence-first verification plane for bounded coding-agent work. It separates **who performs a coding task** from **who decides whether the task is actually complete**.

A model, coding agent, or executor can propose code, tests, explanations, and completion claims. BURHAN treats those claims as untrusted input, captures the candidate state, applies a sealed and qualified validator pack, verifies in a fresh workspace, and reduces the resulting evidence into an explicit verdict.

## Why BURHAN exists

Agentic coding creates a new acceptance problem:

- the same agent can change code and tests;
- a passing self-reported test summary is not independent evidence;
- requirements can be partially satisfied while the agent still reports success;
- protected files can be changed unless boundaries are explicit;
- provider output can look authoritative even when it is incomplete or wrong.

BURHAN adds an independent verification boundary around a bounded task.

```text
requirement
   |
   v
ProofContract --human seal--> ValidatorBlueprint
                                |
                                v
                       deterministic compiler
                                |
                                v
                      qualification controls
                                |
                                v
                       sealed validator pack
                                |
coding agent --> candidate state capture
                                |
                                v
                        fresh verification
                                |
                                v
                          evidence chain
                                |
                                v
                             verdict
```

## Core properties

### Evidence over self-report

Agent completion messages and `AgentExecutionClaim` objects do not determine acceptance. BURHAN-owned evidence does.

### Qualified validators

A validator strategy is not trusted merely because a model proposed it. BURHAN compiles supported validator primitives and qualifies them against positive and negative controls before use.

### Protected boundaries

A `ProofContract` defines allowed paths, forbidden paths, network policy, repair limits, and evidence requirements. Candidate changes outside the permitted boundary are rejected.

### Fresh verification

Where BURHAN claims independent verification, candidate state is captured and checked in a fresh workspace rather than trusting the agent's working directory.

### Explicit assurance

BURHAN distinguishes deterministic evidence, provider-backed execution, local artifact integrity, and unavailable evidence instead of collapsing them into a generic "success" claim.

## Project status

BURHAN is **early-stage open source (0.1.x)**.

The current full reference verification path is Windows-native. Unit tests, type checks, and the web build are exercised across Windows, Linux, and macOS in CI. Cross-platform equivalence for the complete verification path is a roadmap item.

Current assurance boundaries are documented in [the threat model](docs/threat-model.md). In particular, `local_trusted` is **not** a hardened sandbox, external attestation mechanism, malware-containment boundary, or mathematical proof system.

## Quick start

Requirements:

- Node.js 20+
- npm
- Git

Clone and install:

```bash
git clone https://github.com/gjt21123/BURHAN.git
cd BURHAN
npm ci
```

Start the demonstration UI:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Portable validation:

```bash
npm run ci:portable
```

The full deterministic reference suite currently runs on Windows:

```powershell
npm run ci:verification
```

## Reference workflow

BURHAN's payment-idempotency reference task requires:

- exactly one charge from 20 concurrent requests using the same idempotency key;
- independent behavior for distinct keys;
- documentation of the `Idempotency-Key` API header;
- no changes to protected migrations, tests, or dependency manifests.

The repository includes intentionally invalid candidates so the verifier can demonstrate that it rejects failures rather than merely accepting a happy path.

## Architecture

The main pipeline is:

1. **SpecForge** builds a bounded repository fact pack and contract draft.
2. A human approves/seals the `ProofContract`.
3. A validator architect may propose a `ValidatorBlueprint`.
4. BURHAN deterministically lints and compiles supported validators.
5. Validator qualification runs positive and negative controls.
6. A separate executor performs the coding task.
7. BURHAN captures the resulting candidate state.
8. Verification runs against the sealed pack in a fresh workspace.
9. Evidence records are linked and reduced into the final verdict.

See:

- [Architecture](docs/architecture.md)
- [Threat model](docs/threat-model.md)
- [Ecosystem role](docs/ecosystem.md)
- [Product specification](docs/product-spec.md)

## Trust boundaries

| Boundary | Treatment |
| --- | --- |
| Model-generated contract draft | Untrusted until deterministic linting and human approval |
| ValidatorBlueprint | Untrusted proposal |
| Coding-agent output | Untrusted |
| Agent completion claim | Untrusted |
| Candidate patch/state | Untrusted until captured and verified |
| Validator compiler templates | BURHAN-controlled |
| Qualification controls | BURHAN-controlled |
| Sealed validator pack | Protected artifact |
| Fresh verification evidence | BURHAN-controlled |
| Receipt-chain hashes/signatures | Local artifact-integrity mechanism |
| `local_trusted` execution | Local independent execution; not a hardened sandbox |

## Codex integration

BURHAN includes a reference integration with OpenAI Codex.

Codex can participate as a validator architect or task executor, but Codex output does **not** determine the verdict. The verifier, sealed validator pack, captured candidate state, and BURHAN-owned evidence remain authoritative.

This separation is intentional and extends beyond any one model provider: provider-specific execution should remain behind narrow adapters while deterministic acceptance stays outside the agent.

Historical prototype disclosures are preserved in [docs/codex-contributions.md](docs/codex-contributions.md).

## Evaluation

The repository contains deterministic fixtures and negative controls covering:

- correct candidate acceptance;
- sequential-only behavior that fails concurrency requirements;
- protected test deletion;
- forbidden migration changes;
- fake evidence;
- validator qualification;
- executor-output validation;
- repair-loop behavior;
- receipt-chain integrity and tampering detection.

Run individual suites with the scripts in `package.json`, or run the Windows reference verification suite:

```powershell
npm run ci:verification
```

Live/provider-backed evaluations are deliberately separate from ordinary CI. A contributor should not need maintainer credentials or API quota to prove deterministic correctness.

## Repository layout

```text
apps/web                         Demonstration and inspection UI
packages/cli                     CLI and reference evaluation entry point
packages/core                    Contracts, evidence, receipts, state machine
packages/specforge               Fact Pack and contract compiler boundary
packages/validator-compiler      Trusted validator primitives and sealing
packages/validator-qualification Positive/negative qualification controls
packages/codex-runner            Codex adapter, execution and repair orchestration
packages/verifier                Fresh verification, evidence and verdict logic
packages/workspace               Workspace isolation and path-safety utilities
examples/payment-service         Reference bounded coding task
evals                            Valid and intentionally invalid candidates
docs                             Architecture, threat model and project docs
submission-assets                Historical prototype/submission media
```

## Open-source maintenance

BURHAN is maintained as a public OSS project, not merely as a code snapshot.

- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Governance](GOVERNANCE.md)
- [Maintainer guide](docs/maintainer-guide.md)
- [Release process](docs/release-process.md)
- [Roadmap](ROADMAP.md)
- [Support](SUPPORT.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Changelog](CHANGELOG.md)
- [Adopter registry](ADOPTERS.md)

GitHub Actions provide:

- multi-platform unit/type/build checks;
- the Windows-native full deterministic verification suite;
- production dependency auditing;
- CodeQL scanning;
- dependency review on pull requests;
- OpenSSF Scorecard monitoring;
- an evidence-first release gate.

## Contributing

Issues, threat-model critiques, interoperability proposals, tests, documentation improvements, and implementation pull requests are welcome.

Start with [CONTRIBUTING.md](CONTRIBUTING.md). Coding agents working in this repository should also read [AGENTS.md](AGENTS.md).

For verification-sensitive changes, include the affected trust boundary and deterministic evidence in the pull request.

## Security

If you believe you found a vulnerability, **do not open a public issue with exploit details**. Follow [SECURITY.md](SECURITY.md).

Useful reports include false-accept paths, protected-artifact bypasses, evidence tampering, command/path injection, credential leakage, unsafe handling of untrusted repositories, and assurance claims that exceed actual behavior.

## Historical prototype material

BURHAN began as a bounded demonstration with recorded submission assets. Those files remain in the repository for provenance and reproducibility, but they are not the project's long-term maintenance model.

Historical material includes:

- [demo script](docs/demo-script.md)
- [submission notes](docs/devpost.md)
- [screenshots](docs/screenshots.md)
- [original submission checklist](docs/submission-checklist.md)

## Roadmap

Near-term priorities include:

- a stable contributor-facing CLI;
- complete cross-platform verification equivalence;
- additional real-world reference tasks;
- provider adapter contracts;
- stronger fuzz/property testing around canonicalization and state transitions;
- release provenance and signing;
- hardened execution profiles distinct from `local_trusted`;
- external adopter and integration examples.

See [ROADMAP.md](ROADMAP.md).

## License

BURHAN is licensed under the [Apache License 2.0](LICENSE).

Copyright 2026 BURHAN contributors.
