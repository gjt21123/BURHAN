# Testing and interpretation

## Portable checks

`npm run ci:portable` runs workspace unit tests, TypeScript checking and a production web build. CI covers Linux, macOS and Windows with Node.js 22 and 24. Type generation is part of web typechecking; generated files are not versioned.

`npm run test:cli-package` packs the actual standalone CLI, installs it offline outside the monorepo and checks three independent fixture repositories with positive/negative controls. Those fixtures are not external adopters. The static CLI suite has 71 tests.

`node scripts/smoke-web.mjs` runs after the build. It launches a temporary loopback-only production server with live compilation disabled, checks the homepage and safe compiler/reset behavior, then stops the server. The nine HTTP checks do not invoke live provider inference. The local API guard suite contains 22 focused regressions.

## Deterministic runtime reference suite

```bash
npm run ci:verification
```

This aggregates `eval:burhan`, compiler/Codex/executor fixtures, validator qualification, execution verification, architect-output checks, repair loop/orchestration and submission-demo checks. The Runtime verification workflow runs all ten suites on Linux, macOS and Windows with Node 22 and 24. A full Git checkout including historical tags is required for these original reference cases.

The new process backend has 31 direct regressions for argument boundaries, environment hygiene, deadlines, output limits, cancellation and ordinary descendant cleanup. Nine additional tests cover independently retained pack hashes and pass/reject/incomplete reduction. See [runtime portability](runtime-portability.md) for exact scope and remaining in-process paths.

A passing reference suite is not arbitrary program correctness, full hostile-code containment, or proof that a generic external runtime workflow is ready. Never classify unavailable or interrupted execution as success. A deterministic repair is not a fresh live Codex retry.

## Repository hygiene

```bash
node scripts/check-repository.mjs
```

Checks required OSS documents, license metadata, conservative secret patterns, relative Markdown file links, accidentally tracked environment/generated files and application-draft text limits. It does not crawl external links, validate every anchor, scan all binary assets or prove repository history is secret-free.

## Reading evidence

Classify failures as implementation, environment, input or unavailable integration; preserve the failure and repair its cause. Do not remove a failing check to claim success. Dependency graph unavailability is explicit and does not disable the full npm audit. CodeQL workflow success means analysis completed, not exhaustive vulnerability absence.

For current development, use the exact PR head and its CI/Runtime verification/CodeQL results. Historical [validation records](codex-for-oss/validation.md) remain tied to their recorded SHA. Existing release metadata does not automatically apply to newer commits. New reference runs do not replace historical live-provider evidence.
