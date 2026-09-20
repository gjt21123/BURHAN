# Portable CLI: first external-use increment

The command reference, installation instructions, contract example, error codes and trust limits are in the [packaged CLI README](../packages/cli/portable/README.md). This file is a maintainer-facing milestone record, not an adoption or program-acceptance claim.

## Delivered scope

- Standalone Node.js CLI with doctor/init, contract validation and explicit sealing, immutable-commit verification, JSON reports and separately pinned report-integrity checking.
- Five declarative static predicate types; no arbitrary command execution or candidate-controlled test acceptance.
- Allowed/forbidden path enforcement, integrity pins, bounded resource handling and portable-path guards.
- A real npm tarball with zero runtime dependencies, installed offline outside this monorepo by the distribution smoke test.
- Unit/integration/negative controls in `packages/cli/portable/tests/` and three independently initialized Git fixtures in the package-install smoke test.
- CI coverage on Node.js 22 and 24 across Windows, Linux and macOS, preserving the existing separate Windows runtime-reference verification job.

## Local evidence

The new isolated CLI suite passed 71 tests on Linux / Node 22.16.0 during authoring. The offline package-install test passed three independent fixture repositories, each with a correct candidate and a forbidden-change negative control. Complete monorepo validation runs on GitHub-hosted CI; inspect the final PR and master runs rather than treating local component tests as a full-repository build.

CI artifacts named `burhan-cli-<os>-node<version>` contain the tested tarball, SHA256SUMS and validation.json. They identify the tested platform and package hash, not production adoption or signed provenance. Artifact retention is 14 days; reproduce from the pinned source when an artifact expires.

## Commands for maintainers

```bash
npm run burhan -- doctor
npm run test:cli
npm run test:cli-package
```

The distribution manifest version is `0.3.0-preview.1`; the root project and historical release remain 0.2.0. No old tag or release is replaced. `npm run eval:burhan` still exercises the unchanged historical semantic reference implementation.

## Not delivered by this increment

The complete general-purpose runtime verifier, Linux/macOS equivalence for the legacy runtime path, registry publication, production GitHub Action integration, new live Codex/Claude experiments, external maintainers and adoption evidence are separate remaining work. Static `PASSED` never means the agent's program is functionally correct.

See the [design decision](adr/portable-static-cli.md), [roadmap](../ROADMAP.md) and [contribution guide](../CONTRIBUTING.md).
