# Changelog

All notable changes to BURHAN will be documented in this file.

The project aims to follow [Semantic Versioning](https://semver.org/) as its public interfaces stabilize.

## [Unreleased]

## [0.2.0] - 2026-09-20

This release turns BURHAN from a public proof-of-concept repository into a maintained open-source project with explicit project health, security, verification, and release controls.

### Added

- Apache-2.0 open-source licensing and NOTICE.
- Contributor, security, governance, support, code-of-conduct, and roadmap policies.
- Maintainer, release, configuration, ecosystem, adopter, and coding-agent guidance.
- GitHub issue forms, pull-request template, and CODEOWNERS.
- Dependabot configuration for npm and GitHub Actions.
- Multi-platform CI across Windows, Linux, and macOS with Node.js 20 and 22.
- Windows-native full deterministic verification as an independent CI job.
- CodeQL analysis, dependency review, OpenSSF Scorecard monitoring, and production dependency auditing.
- Evidence-first release-gate automation.
- Safe environment-variable template and explicit provider credential boundaries.
- Documentation for deterministic evaluation cases and reference examples.
- A public adopter registry that records only opt-in, verifiable usage.

### Changed

- Reframed the README from a one-time submission artifact into an ongoing open-source project while preserving historical submission material for provenance.
- Raised the supported Node.js floor to 20.9 to match the maintained web framework baseline.
- Upgraded the web stack to Next.js 16.3.5, React 19.3.0, and React DOM 19.3.0.
- Kept Webpack explicit for the web application while its custom extension alias is required.
- Upgraded Vitest to 4.1.11 across test workspaces.
- Added project/package metadata for license, repository, issues, homepage, and ecosystem keywords.

### Security

- Removed the dependency vulnerabilities found by the new audit gate during OSS hardening.
- Pinned third-party GitHub Actions to immutable commit SHAs.
- Added CodeQL, dependency review, and OpenSSF Scorecard workflows.
- Documented private vulnerability reporting and the limits of the current `local_trusted` execution mode.

### Compatibility

- Portable unit/type/build checks are exercised on Windows, Linux, and macOS.
- The complete deterministic reference verification path remains Windows-native in 0.2.0; cross-platform equivalence remains on the roadmap.

## [0.1.0] - 2026-07-21

Initial public proof-of-concept:

- bounded `ProofContract` workflow;
- deterministic validator compilation and qualification;
- separate coding-agent execution;
- candidate patch capture;
- fresh-workspace verification;
- evidence-backed verdict reduction;
- linked local-artifact integrity receipts;
- payment-idempotency demonstration and evaluation fixtures.

The 0.1.0 repository state was created as a public demonstration. Historical submission-oriented documentation remains in `docs/` for transparency.
