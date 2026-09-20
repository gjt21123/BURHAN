# Maintainer guide

Maintenance signals must come from real work, not manufactured activity.

## Triage and review

Reproduce reports, identify the component and trust boundary, distinguish deterministic behavior from provider behavior, and classify false acceptance, false rejection, incomplete evidence and documentation mismatches. Request sanitized minimal reproductions. Security reports follow [SECURITY.md](../SECURITY.md), not public exploit discussions.

Review whether the candidate can influence protected evidence, whether positive/negative controls are sufficient, whether missing evidence fails closed, and whether claims match actual assurance. CI is evidence, not independent review or a security certificate.

## Dependencies

Dependabot covers npm and Actions. Review runtime changes, transitive risk, Action pinning, provider compatibility and Node.js 22/24 behavior. All-dependency npm audit is mandatory. The GitHub dependency-graph comparison is additional when the repository feature is enabled; its absence must remain visible.

The temporary force-upgrade/write-back workflow was removed after remediation. Do not reintroduce unattended `npm audit fix --force` or write-capable execution of untrusted PR code. Keep changes reviewed and preserve the lockfile.

## Repository settings to verify separately

Files and workflows do not enable administrative controls automatically. An owner should inspect repository settings for:

- Dependency graph and Dependabot alerts, so the additional graph review becomes available.
- Private vulnerability reporting; verify the reporting route before advertising it as active.
- Branch protection/rulesets requiring CI and CodeQL, no force-pushes and review appropriate to the maintainer model. CODEOWNERS alone does not enforce reviews.
- Repository description and topics; package metadata does not populate the GitHub About panel.

Suggested description: `Independent, evidence-first verification for bounded coding-agent work.`
Suggested topics: `ai-agents`, `codex`, `software-verification`, `agentic-coding`, `typescript`, `developer-tools`.

Record configuration limitations as maintainer tasks rather than presenting unsupported checks as passed. Do not publish credentials or request a broad personal access token in an issue.

## Releases

Follow the [release process](release-process.md). Releases need clean deterministic checks, explicit version/commit identity, accurate notes and documented assurance limits. The 0.2.0 bootstrap publisher is deliberately restricted to a validated master commit and creates a preview, never a stable npm release.

## Claims and adoption

Use “local artifact integrity” rather than external attestation, “deterministic verification” rather than formal proof, and `local_trusted` with its limits rather than sandbox. Record only consented, verifiable use in [ADOPTERS.md](../ADOPTERS.md).

Maintainer-directed automated changes, test fixtures and roadmap issues are not external users, independent reviewers or community adoption. A prepared application pack does not establish program acceptance.
