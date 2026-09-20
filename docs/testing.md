# Testing and interpretation

## Portable checks

`npm run ci:portable` runs workspace unit tests, TypeScript checking and a production web build. Supported CI combinations are Linux, macOS and Windows with Node.js 22 and 24. Type generation is part of the web typecheck; generated files are not versioned.

`node scripts/smoke-web.mjs` runs **after the build**. It launches a temporary loopback-only production server with live compilation disabled, checks the homepage, compiler opt-in gate, malformed/invalid input, body limits, content type, cross-origin compilation/reset rejection and a normal local reset, then stops the server. It does not test live provider inference.

`apps/web/tests/local-api.test.mjs` has 22 focused tests covering Host/Origin validation, IPv4/IPv6 loopback, JSON parsing, truthful streaming byte limits, invalid UTF-8, body-read timeout, task validation and concurrency-gate release after success/failure. They run under `npm test` without installing another test framework.

## Full Windows reference suite

```powershell
npm run ci:verification
```

This aggregates the existing `eval:burhan`, compiler/Codex/executor fixtures, validator qualification, execution verification, architect-output validation, repair loop/orchestration and submission-demo evaluation commands. It uses no live-provider credentials. The repository must include its Git history/tags; use a normal Git checkout with full history for reproduction.

A fixture's name or a passing script does not establish arbitrary program correctness. Inspect the positive and negative controls and the protected-path assumptions. A deterministic repair is not evidence of a fresh live Codex retry.

## Repository hygiene

```bash
node scripts/check-repository.mjs
```

Checks required OSS documents, license metadata, conservative secret patterns, relative Markdown file links, accidental tracked environment/generated files and application-draft text limits. It does not crawl external links, validate all anchors, scan all binary assets or prove that repository history is secret-free.

## Reading CI results

Do not remove a failing check to claim success. Classify failures as implementation, environment, data, or unavailable integration, retain the evidence and repair the cause. Dependency graph unavailability is reported explicitly; the full npm vulnerability gate remains mandatory. A CodeQL workflow success means analysis completed, not that every vulnerability is absent.

The [validation record](codex-for-oss/validation.md) identifies an inspected SHA and run. For releases, prefer the exact CI/scan URLs and commit in the attached `validation.json`.
