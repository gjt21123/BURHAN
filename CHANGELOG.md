# Changelog

## Unreleased

### Phase B: supervised candidate-reference verification

- Remove in-process candidate imports from `packages/codex-runner/src/execution.ts`; execute the reference subject through the bounded local backend.
- Add the explicit `bounded_payment_reference_v1` profile with a fixed measurement worker, verifier-owned instrumented store, challenge-bound protocol and parent-side acceptance comparison.
- Run positive/negative controls through the same subprocess harness and compare returned charges as well as counts for same-key, distinct-key and sequential requests.
- Enforce captured patch/contract/baseline identity, derive protected-path violations independently of candidate metadata, require a matching fresh baseline and check workspace snapshots after execution.
- Check independently retained compiler-pack hashes before/after probes and validate individual manifest/file bindings, resource limits and unexpected/link entries without changing historical template serialization.
- Persist safe content-addressed runtime evidence outside the candidate workspace; early zero exits, malformed/replayed output and execution interruptions are incomplete.
- Enforce every approved documentation term instead of checking only the header token.
- Add 44 protocol/worker tests, 20 runtime integration cases and six compiler-pack integrity cases. Keep the existing static CLI, process-backend tests and full reference suites.
- Document that fixed worker execution is distinct from executing historical generated Vitest files, storage-backend verification, generic repository support or sandboxing. No provider calls, npm publication or external adoption are claimed.

### Phase B: bounded command backend and runtime reference portability

- Add `runLocalCommand`, preserving the old Windows-named export as a compatibility alias.
- Resolve npm/npx through installation-local JavaScript entrypoints without a `.cmd` shell; restrict inherited child environments and scope home/temp/cache settings to the run.
- Add owned supervision, POSIX process groups/Windows tree termination, timeout, cancellation, combined output caps and explicit cleanup failure reporting.
- Add 31 backend regressions and nine independently pinned pack/verdict regressions.
- Exercise all ten deterministic reference suites on Linux, macOS and Windows with Node 22 and 24; retain the existing CI and original Windows reference job.
- Compare canonical directory identity in the macOS cwd test rather than treating `/var` and `/private/var` aliases as different directories.
- Preserve blocked/incomplete outcomes in the command-based evaluator; reject known protected-path violations before execution and check protected files afterwards.
- Check independently retained legacy validator-pack hashes before/after validators without changing historical serialization or receipt formats.
- At this increment, generic repository inputs and the in-process candidate path remained open. See the subsequent supervised candidate-reference increment above.

### Phase A: portable static CLI distribution (0.3.0-preview.1)

- Add a dependency-free CLI for doctor/init, contract validation and explicit sealing, immutable-commit verification, reports and pinned report-integrity checks.
- Introduce `static_git_snapshot_v1`: five fixed file predicates plus allowed/forbidden change policies, independent SHA-256 seal pins and full commit IDs. Static PASSED does not imply runtime correctness.
- Read Git objects without checking out or executing candidate code, running lifecycle scripts, using replacement refs or fetching. Add bounds, portable path checks and strict JSON duplicate-key handling.
- Add 71 isolated regression tests and actual offline tarball installation on three independent Git fixtures with positive/negative controls in all six CI OS/Node combinations.
- Preserve tested tarballs, checksums and validation metadata as CI artifacts. No npm registry publication or external adoption is claimed.
- Route `npm run burhan` to the portable preview; retain historical receipt/eval commands via `npm run burhan:legacy` and unchanged `npm run eval:burhan`.
- At the Phase A delivery, the runtime compiler, qualified packs, signed evidence/repair flow and Windows reference suite were preserved. See the subsequent Phase B changes above.

## 0.2.0 — OSS preview — 2026-09-20

### Open-source maintenance

- Added Apache-2.0 licensing and NOTICE.
- Added contribution, security, governance, support, roadmap, maintainer and release documentation; issue forms, PR template, CODEOWNERS, Dependabot and agent guidance.
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
- The 0.2.0 release's full reference execution was Windows-native. `local_trusted` is not a sandbox, formal proof or external attestation.

## 0.1.0 — initial public prototype — 2026-07-21

Introduced bounded ProofContracts, deterministic validator compilation/qualification, separate agent execution, candidate capture, fresh-workspace verification, evidence-backed verdicts, linked local receipts and the payment-idempotency demonstration. Historical live rejection and deterministic repair are separately disclosed in the retained documentation.
