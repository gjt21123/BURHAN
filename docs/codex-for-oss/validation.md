# OSS readiness validation record

Recorded 2026-09-20. This is a scoped engineering record, not a security certification, independent audit, formal proof or selection decision by OpenAI.

## Inspected implementation

Continuation head: `c0af84041da9b5e0c30fbb1b4a5fe9a9fe1433cd`.

- [CI run](https://github.com/gjt21123/BURHAN/actions/runs/35533596742)
- [CodeQL workflow](https://github.com/gjt21123/BURHAN/actions/runs/35533596787)
- [Maintainer-directed pull request](https://github.com/gjt21123/BURHAN/pull/2)

The linked CI exercised the implementation before the final documentation/release-workflow changes. Inspect the PR's latest checks and the release's `validation.json` for the final commit; this file does not imply that a later untested commit inherits those results.

## Observed checks

| Check | Observed outcome and scope |
| --- | --- |
| Portable unit tests, typecheck and build | Passed for Linux/macOS/Windows on Node 22/24; tracked and unexpected untracked output checks passed |
| Full deterministic reference suite | Passed on Windows / Node 22 |
| New local API regressions | 22 tests; also passed locally with Node 22's TypeScript stripping |
| Built production HTTP behavior | Nine checks passed on Linux / Node 22, including same-origin reset, disabled live compilation, malformed JSON and body limits |
| Complete npm dependency audit | Passed the high/critical severity gate, including development dependencies |
| Repository hygiene/application answers | Required files, relative Markdown links, conservative credential patterns and 500-character draft limits passed |
| CodeQL | Workflow completed successfully; this is scan execution evidence, not a claim of zero possible vulnerabilities |
| GitHub dependency graph review | Initially unavailable because the repository feature was disabled; the revised workflow reports that limitation and keeps mandatory npm audit enforcement |

No live API or Codex execution was requested during this continuation. Full repository/build execution was performed by GitHub-hosted CI, not by an asserted local clone. The local check covered the new isolated API guard tests.

## Important repairs

The prior CI run failed only after a successful web build because Next.js rewrote tracked TypeScript configuration and generated declarations. The repair committed the correct TypeScript settings, generated types before checking, and stopped tracking generated declarations. It did not discard changes to hide a dirty working tree.

The compiler/reset HTTP boundary now checks loopback Host/Origin, caps streamed JSON at 16 KiB, limits task text, bounds body-read duration and rejects overlapping operations per local process. Live compilation is explicitly opt-in. The compiler resolves the actual repository root instead of treating `apps/web` as the repository.

## Unverified or intentionally unsupported

- Complete reference execution on Linux/macOS.
- Hostile-code containment, protection against a compromised host, or multi-user/public deployment.
- Fresh live-provider correctness, performance or cost benchmarks.
- Exhaustive secret scanning of repository history and all assets.
- Independent third-party security audit or formal verification.
- External production adoption, npm download metrics or program acceptance.

## Administrative follow-up

Repository description/topics, Dependency graph, private vulnerability reporting and branch/ruleset enforcement are repository settings, not files. File changes cannot establish that those controls are enabled. See [maintainer guide](../maintainer-guide.md); verify settings directly before relying on them. Code-owned files alone do not enforce required review.
