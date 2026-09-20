# Threat model

BURHAN checks unsupported completion claims within a bounded local task. Its assurance depends on a trusted local host and verifier process.

## In scope

- An executor claiming success without trusted evidence.
- Candidate changes to forbidden paths, tests or dependency manifests.
- Sequential-only behavior that fails the reference concurrency validator.
- Forged or modified local artifacts detected through hashes and linked receipts.
- Untrusted contract drafts, validator blueprints and provider output attempting to influence acceptance criteria.

The verifier runs outside the executor's writable clone and records evidence independently. Qualified validators, captured candidate state and fresh verification determine the verdict. An agent's completion claim never does.

## Out of scope

- A compromised host, administrator/root attacker or verifier process.
- Arbitrary malicious dependencies, malware containment or full-disk access under the same account.
- Complete network isolation or prevention of exfiltration by hostile local code.
- Mathematical proof of every execution of arbitrary programs.
- Multi-user or internet-exposed deployment of the demonstration UI.

`local_trusted` must not be described as a secure sandbox. Local signatures are not external attestation or certification.

## Validator and executor inputs

SpecForge treats task text and repository facts as untrusted data. Structured output validates shape, not semantic correctness; source references, capabilities, ambiguity, assurance and paths remain subject to deterministic linting.

Blueprints cannot supply arbitrary commands, executables, environment references, control oracles, evidence, receipts, verdicts or validator source. BURHAN compiles supported primitives and qualifies positive/negative controls before sealing. Hash checks detect subsequent pack mutation.

Codex authentication stays local to its CLI. Public events are capped and sanitized; raw provider credentials and streams are not accepted as evidence. Captured patches are verified in fresh workspaces, including protected files, untracked changes and validator-pack integrity.

## Local demonstration HTTP boundary

Default scripts bind to `127.0.0.1`. Compiler/reset writes require loopback URL/Host values; cross-origin browser requests and cross-site fetches are rejected. Compilation requires JSON and enforces streamed byte limits, task length limits, a body-read deadline and a per-process exclusive gate. Reset uses a separate gate and the existing bounded demo-root checks. No raw reset error is returned.

Live HTTP compilation is disabled unless `BURHAN_ENABLE_LIVE_COMPILER=1`; opting in may transmit filtered repository facts and incur provider costs. Credentials remain server-side. See [configuration](configuration.md).

These guards reduce accidental exposure, cross-origin browser writes and resource abuse in a local demo. They are not authentication, a distributed quota system, a proxy trust model, or protection against a malicious process already on the host. Do not override the loopback binding to expose this application publicly.

## Validation limits

Positive/negative controls, API regression tests, CI, dependency auditing and CodeQL provide bounded evidence. None establishes exhaustive vulnerability absence. Conservative current-file secret patterns do not replace a complete history/binary-asset review or an independent security audit.
