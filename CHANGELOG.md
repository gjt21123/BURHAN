# Changelog

## Unreleased

## 0.2.0 — OSS preview — 2026-09-20

### Open-source maintenance

- Added Apache-2.0 licensing and NOTICE.
- Added contribution, security, governance, support, conduct, roadmap and adopter policies; issue forms, PR template, CODEOWNERS and agent guidance.
- Reframed the README for ongoing OSS use while preserving historical submission evidence.
- Added configuration, release, ecosystem and maintainer documentation, plus honest Codex for OSS application drafts.

### Engineering and validation

- Added portable unit/type/build CI on Windows, Linux and macOS using Node 22 and 24.
- Added a separate Windows-native full deterministic verification job, all-dependency npm auditing, repository hygiene and application-answer validation.
- Added CodeQL and OpenSSF Scorecard workflows. Dependency graph review is additional when enabled; unavailability is explicit and never disables the mandatory npm vulnerability gate.
- Fixed Next.js-generated type/configuration changes that caused otherwise successful builds to fail clean-tree checks.
- Added nine built-production HTTP smoke checks and 22 local API regression tests.
- Added a restricted one-time preview publisher with exact-commit CI/scan evidence, source archive and checksums.
- Removed the temporary force-upgrade/write-back workflow after dependency remediation; ongoing updates use reviewed changes.

### Security and compatibility

- Bound the demo to loopback; added Host/Origin validation, streamed request-size limits, task limits, body-read timeout and per-process concurrency gates.
- Disabled live HTTP compilation by default; explicit local opt-in and a provider key are required.
- Resolved the monorepo root for compilation and sanitized reset failures.
- Upgraded the web stack to Next.js 16.3.5 and React/React DOM 19.3.0; updated Vitest to 4.1.11 and pinned third-party Actions by commit SHA.
- Use Node 22 or 24. The package compatibility floor remains 20.9; that older line is not covered by the current CI matrix.
- Full reference execution remains Windows-native. `local_trusted` is not a sandbox, formal proof or external attestation.

## 0.1.0 — initial public prototype — 2026-07-21

Introduced bounded ProofContracts, deterministic validator compilation/qualification, separate agent execution, candidate capture, fresh-workspace verification, evidence-backed verdicts, linked local receipts and the payment-idempotency demonstration. Historical live rejection and deterministic repair are separately disclosed in the retained documentation.
