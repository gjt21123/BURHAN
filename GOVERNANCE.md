# BURHAN Governance

BURHAN is an open-source project focused on independent verification of coding-agent work.

## Roles

### Users

People who run BURHAN, evaluate it, report bugs, or propose improvements.

### Contributors

Anyone whose documentation, tests, code, threat analysis, or other work is accepted into the repository.

### Maintainers

Maintainers can triage issues, review pull requests, make releases, and enforce project policy. The current primary maintainer is the repository owner, `@gjt21123`.

## Decision principles

Technical decisions prioritize, in order:

1. correctness of the stated assurance;
2. integrity of trust boundaries;
3. deterministic reproducibility;
4. security and fail-closed behavior;
5. maintainability and contributor clarity;
6. usability and performance.

A feature is not accepted merely because it makes an agent appear more successful. Evidence quality and truthful claims take priority.

## Change process

- Small fixes may be merged after review and required checks.
- Behavior-changing or trust-boundary changes should have an issue or design note.
- Security-sensitive changes should include threat-model analysis.
- Breaking changes should be documented in the changelog and release notes.
- Maintainers may request additional negative controls or independent verification before merge.

## Reviews

Self-merge is permitted while BURHAN has a single maintainer, but meaningful changes should still be made through pull requests with CI evidence. As the maintainer group grows, the project intends to require at least one independent approval for trust-boundary changes.

## Releases

BURHAN follows semantic versioning where practical:

- patch: fixes and hardening without intended public API breakage;
- minor: backward-compatible features and new verification capabilities;
- major: incompatible public contract or workflow changes.

Pre-1.0 releases may still evolve quickly. Release notes must clearly distinguish verified behavior from experimental or provider-dependent behavior.

## Becoming a maintainer

Consistent contributors may be invited as maintainers based on:

- quality and depth of contributions;
- understanding of the threat model;
- constructive review history;
- reliability in handling security-sensitive changes;
- alignment with evidence-first project principles.

## Conflicts of interest

Contributors should disclose material conflicts when proposing or reviewing changes that promote a vendor, model provider, benchmark, or commercial integration.

## Project independence

BURHAN may integrate with coding agents and model providers, but the project does not treat any provider's completion message as proof. Provider output remains untrusted unless independently verified by the BURHAN workflow.
