# Codex for Open Source application pack

This is a maintainer application draft, not acceptance or a promise of eligibility. The owner must review the actual public repository and submit the form personally. No application has been submitted by this workflow.

## Official references

Program references last reviewed on 2026-09-20; refresh them before submission:

- [Application form](https://openai.com/ar/form/codex-for-oss/)
- [Program terms](https://developers.openai.com/codex/codex-for-oss-terms)

OpenAI considers usage, ecosystem importance, active maintenance, role/permissions and capacity. The form allows an ecosystem-significance explanation when ordinary criteria do not fit directly. Do not treat an internal readiness score as a statistical acceptance probability.

## Draft answers

Use [application.json](application.json). The three long-answer values are checked against a 500-character limit by `node scripts/check-repository.mjs`; confirm the live form still uses that limit when submitting.

The applicant supplies their name, ChatGPT email and requested organization details privately. Do not commit private account identifiers, contact details or credentials to complete the draft. Primary Maintainer is accurate only while that role remains true.

## Evidence to review

| Claim | Evidence | Limit |
| --- | --- | --- |
| Reusable verification implementation | Source, architecture, reference tasks and standalone CLI | Static CLI checks are not generic runtime verification |
| Independent acceptance boundary | Approved contracts/packs, controls and captured-state verification | Trusted host; inspect the exact runtime path |
| Reproducibility | CI and Runtime verification across Linux/macOS/Windows with Node 22/24 | Reference fixtures are not live-provider runs or real external adopters |
| Runtime improvements | [Backend and pack-pin documentation](../runtime-portability.md) and PR #12 | Generic repository runtime inputs and remaining in-process path still require work |
| Maintained OSS project | License, policies, reviewed changes and release history | Automation by the maintainer is not external community contribution |
| Ecosystem relevance | [Ecosystem rationale](../ecosystem.md) and real adopter reports when available | Potential benefit is not demonstrated widespread dependency |

Historical [validation records](validation.md) remain tied to their original commit. Check the latest PR and exact-commit workflow results for current development; do not apply old release evidence to newer code. The last published project release and the separate CLI preview have distinct versions.

## Adoption and credit use

No external production adopters or npm download statistics are currently claimed in this draft. Refresh real metrics before submitting. Do not invent or buy activity, or count fixture repositories and maintainer-authored automation as external usage.

Record consented, verifiable use in [ADOPTERS.md](../../ADOPTERS.md). Independent reproducibility reports, real integrations and substantive external contributions are stronger evidence than a claim without references.

The proposed credit workflow is a plan, not deployed unattended review automation. Keep live calls opt-in, budgeted and sanitized. Deterministic checks and human approval remain authoritative; a model cannot approve its own acceptance criteria. Ordinary CI stays credential-free.
