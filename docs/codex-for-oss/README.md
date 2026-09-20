# Codex for Open Source application pack

This is an honest maintainer application draft, **not evidence of acceptance or a promise of eligibility**. The owner must review the final public repository and submit the form personally. No application has been submitted by this repository workflow.

## Official references

Reviewed on 2026-09-20:

- [Application form](https://openai.com/ar/form/codex-for-oss/)
- [Program terms](https://developers.openai.com/codex/codex-for-oss-terms)

OpenAI considers usage, ecosystem importance, active maintenance, the applicant's role/permissions and program capacity. Submission does not guarantee selection. The form permits an explanation of ecosystem significance even when the ordinary criteria do not fit directly. It does not publish a mandatory star threshold.

## Ready-to-copy answers

Use [application.json](application.json). The three long-answer values are validated against the form's 500-character limit by `node scripts/check-repository.mjs`.

First/last name, the email associated with ChatGPT, and the OpenAI organization ID must be supplied privately by the applicant. Do not commit account identifiers, credentials, or private contact information to complete the draft. The role is Primary Maintainer only while that remains accurate.

## Evidence to review

| Claim | Evidence | Limit |
| --- | --- | --- |
| Reusable verification implementation | `packages/`, architecture and reference task | Early-stage; not a formal proof system |
| Independent acceptance boundary | Qualified validator packs, fresh verification and negative controls | Local host is trusted |
| Reproducibility | CI logs, unit tests, fixture evaluations and HTTP smoke checks | Complete reference execution remains Windows-native |
| Open-source maintenance | License, contribution/security/governance docs, reviewed PR and release history | Maintainer-directed work is not external adoption |
| Community relevance | [Ecosystem rationale](../ecosystem.md) and roadmap | Potential benefit, not demonstrated widespread dependency |

## Remaining adoption evidence

At preparation time no external production adopters or npm download statistics are claimed. Stars, forks and issue counts must be checked again at submission time; do not invent them, buy them or describe maintainer-created issues/automation as external usage.

Record genuine, consented use in [ADOPTERS.md](../../ADOPTERS.md). Useful next evidence includes independent reproducibility reports, real integrations, external bug reports and contributions. There is no guarantee any particular amount of activity leads to selection.

## Credit-use plan

The proposed credit workflow is a plan, not a claim that unattended review automation is deployed. Keep live provider calls opt-in, use a reviewed budget and sanitized inputs, and never let model output change acceptance criteria or approve its own patch. Deterministic CI remains credential-free.
