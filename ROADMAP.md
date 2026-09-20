# BURHAN Roadmap

Work is accepted when its trust boundaries and actual validation are explicit. This roadmap is not a promise of program selection, external adoption or completion dates.

## Phase A — first portable static distribution

Delivered in PR #10 / issue #9:

- [x] Dependency-free static-profile CLI, JSON reports and distinct exit codes.
- [x] Full commit IDs and independently retained contract seal pins.
- [x] Allowlisted tarball installed offline outside the monorepo.
- [x] Positive/negative, tampering, path and malformed-input regressions on six OS/Node combinations.

See [portable CLI](docs/portable-cli.md). Maintainer-created test repositories are fixtures, not adopters. Static PASSED is not runtime correctness.

## Phase B — runtime portability and generic inputs

The process/reference increment is tracked in PR #12; the complete milestone remains issue #11.

- [x] Portable local command backend with narrow environments, shell-free launch, timeout, cancellation, output limits and explicit cleanup outcomes.
- [x] Preserve the legacy exported name while using the portable backend.
- [x] Exercise all ten deterministic reference suites on Linux/macOS/Windows with Node 22/24.
- [x] Distinguish functional failure from incomplete/blocked execution in the command-based evaluator.
- [x] Check the original retained validator-pack hash around command execution; retain legacy serialization compatibility.
- [ ] Migrate the remaining in-process candidate-import path to approved bounded execution, with negative controls.
- [ ] Accept generic repository/base/head/contract/qualification inputs without historical payment-fixture or milestone dependencies.
- [ ] Review portable fresh workspace construction, cancellation and integrity across the complete generic pipeline.
- [ ] Exercise multiple independent runtime examples before real-project pilots.

See [runtime portability](docs/runtime-portability.md). Ordinary local process cleanup is not a sandbox or guarantee against detached/reparented malicious processes.

## Provider interoperability and adoption

- [ ] Validate real Codex and Claude adapters under a narrow shared contract, with explicit budgets and separate live evidence.
- [ ] Publish a maintainer-pinned GitHub Actions integration after runtime boundaries are reviewed.
- [ ] Establish opt-in real external use, repeated usage and meaningful independent contributions.
- [ ] Record real cases where independently owned checks add value beyond agent self-report.
- [ ] Confirm registry ownership and release provenance before public npm publication.

## Verification depth

- [ ] Broader negative-control libraries for coding-agent failure modes.
- [ ] Stronger protected-path/workspace invariants throughout every legacy path.
- [ ] Property/fuzz tests for parsers, canonicalization, evidence and state transitions.
- [ ] Versioned machine-readable evidence compatibility and migration policies.
- [ ] Extend tampering/replay defenses without implying external attestation.

## Security and supply chain

- [x] Deterministic CI, dependency auditing and CodeQL workflows.
- [x] Public contribution, security, governance and release policies.
- [ ] Repository administration settings tracked in issue #3, including the unavailable Dependency graph comparison and required-review/ruleset enforcement.
- [ ] Reviewed release signing/provenance beyond local checksums.
- [ ] Hardened remote execution profile distinct from `local_trusted`.
- [ ] Independent security review and full sensitive-history/asset audit.

## Non-goals

No arbitrary-program mathematical proof, self-certified agent success, fabricated community metrics, or concealment of uncertainty behind a binary success label. See [ADOPTERS.md](ADOPTERS.md) for evidence-based external-use reporting.
