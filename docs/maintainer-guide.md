# Maintainer Guide

This guide describes ongoing maintenance work for BURHAN. It is deliberately operational: maintenance signals should come from real work, not manufactured activity.

## Triage

For each new issue:

1. reproduce or clarify the report;
2. identify the affected component and assurance boundary;
3. distinguish deterministic BURHAN behavior from provider/API behavior;
4. classify whether the failure can cause a false accept, false reject, incomplete result, or documentation mismatch;
5. request a minimal reproduction with secrets removed;
6. link the issue to a pull request or roadmap item when action is planned.

Security reports follow `SECURITY.md` and should not be triaged publicly when disclosure would increase risk.

## Pull-request review

A review should answer:

- Does the change preserve independent verdict ownership?
- Can untrusted candidate output write or influence protected evidence?
- Are positive and negative controls sufficient?
- Are failures explicit and fail closed?
- Is provider-specific behavior isolated from deterministic verification?
- Does documentation describe the actual assurance precisely?
- Are new dependencies necessary and appropriately scoped?

CI is evidence, not a substitute for review.

## Dependency maintenance

Dependabot is configured for npm and GitHub Actions updates. Dependency pull requests should be reviewed for:

- runtime behavior changes;
- transitive security impact;
- action provenance/pinning;
- changes to provider SDK behavior;
- compatibility with Node.js 20+.

## Release management

Follow `docs/release-process.md`. Every release should have:

- a clean deterministic verification run;
- a changelog entry;
- a version/tag consistency check;
- documented breaking or assurance-boundary changes;
- security fixes called out without prematurely exposing exploit details.

## Claims discipline

Avoid terms such as "secure", "proved", "sandboxed", or "tamper-proof" unless the exact scope is defined and supported by evidence.

Prefer:

- "local artifact integrity" over "attestation" when no external attestation exists;
- "deterministic verification" over "proof" where the system executes tests/checks;
- "local_trusted" with its documented limitations over "sandbox".

## Community health

Meaningful project-health signals include:

- external bug reports and feature requests;
- reproducible issues;
- reviewed pull requests;
- releases tied to real changes;
- adopter references;
- compatibility requests;
- security reports handled responsibly.

Do not create synthetic issues, stars, forks, or adoption claims to inflate project metrics.
