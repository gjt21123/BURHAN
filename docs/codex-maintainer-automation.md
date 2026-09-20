# Codex Maintainer Automation

BURHAN can use Codex to reduce maintainer workload without making Codex the authority that accepts its own work.

This document separates **maintainer automation** from **verification authority**.

## Suitable Codex-assisted maintenance

Codex can assist with:

- reproducing a well-scoped bug from an issue;
- proposing regression tests;
- preparing a focused patch;
- reviewing pull requests for missing tests or documentation;
- summarizing dependency updates;
- drafting release notes from an already-reviewed diff;
- classifying issues into deterministic, provider, documentation, or security-sensitive categories;
- suggesting negative controls for a verifier change.

## What remains maintainer/BURHAN-owned

Codex output must not be the sole authority for:

- merging trust-boundary changes;
- declaring a security issue resolved;
- changing protected-path policy;
- weakening negative controls;
- issuing a `VERIFIED` verdict;
- claiming a release has passed checks that did not actually run.

## Proposed PR-review flow

```text
pull request
   |
   +--> deterministic CI
   |
   +--> Codex review suggestion (untrusted)
   |
   v
maintainer review
   |
   v
required fixes/tests
   |
   v
merge decision
```

A Codex review can point to risks or missing evidence. CI and human review decide whether those concerns are resolved.

## Proposed issue-triage flow

Codex may prepare a structured summary:

- reproducibility status;
- suspected component;
- possible trust-boundary impact;
- missing reproduction details;
- suggested labels or next checks.

The maintainer confirms the classification before closing, escalating, or treating an issue as security-sensitive.

## Proposed release flow

Codex may draft:

- changelog wording;
- migration notes;
- release-note summaries;
- candidate verification checklist.

The release gate and maintainer confirm the actual commit, tag, deterministic checks, and known limitations.

## API-credit usage

If BURHAN receives provider/API credits for OSS maintenance, the preferred use is bounded maintainer work: PR review assistance, regression-test generation, issue triage, release-note preparation, and evaluation of new verifier strategies. Provider output remains untrusted until checked by the repository's deterministic controls and maintainer review.
