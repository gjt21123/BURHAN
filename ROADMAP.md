# BURHAN Roadmap

This roadmap describes intended directions, not promises or deadlines. Work is accepted when it preserves BURHAN's trust model and can be evaluated with deterministic evidence.

## Near term — make the core easy to adopt

- [ ] Stable, documented CLI surface for common verification workflows.
- [ ] Reproducible install and quick-start path from a clean clone.
- [ ] Cross-platform deterministic test coverage for Windows, Linux, and macOS where the assurance model is equivalent.
- [ ] Example projects beyond payment idempotency.
- [ ] Machine-readable evidence schema documentation and compatibility policy.
- [ ] Versioned releases with changelog and migration notes.
- [ ] Contributor-friendly issue taxonomy and triage process.

## Verification depth

- [ ] Additional negative-control libraries for common coding-agent failure modes.
- [ ] Stronger protected-path and workspace-isolation invariants.
- [ ] Better diagnostics for incomplete, contradictory, or non-reproducible evidence.
- [ ] Explicit provenance links from contract → validator pack → candidate → verdict.
- [ ] Property-based and fuzz testing for parsers, canonicalization, and state-machine transitions.

## Provider interoperability

- [ ] Keep provider-specific execution behind narrow adapters.
- [ ] Add documented adapter contracts for additional coding agents.
- [ ] Ensure deterministic verification can run without provider credentials.
- [ ] Record provider metadata without allowing it to determine the verdict.

## Security and supply chain

- [ ] Continuous dependency review and code scanning.
- [ ] OpenSSF Scorecard monitoring and hardening.
- [ ] Signed release artifacts/provenance where the release pipeline can support it safely.
- [ ] Document a hardened remote/sandbox execution profile distinct from `local_trusted`.
- [ ] Expand tampering and replay resistance tests.

## Community and ecosystem

- [ ] Publish reusable integrations for CI systems and coding-agent workflows.
- [ ] Add end-to-end examples contributed by external users.
- [ ] Define a compatibility test kit for third-party validator packs/adapters.
- [ ] Maintain public security, contribution, governance, and release policies.

## Explicit non-goals

BURHAN does not currently aim to:

- prove arbitrary program correctness mathematically;
- declare an AI agent trustworthy based on self-reported completion;
- claim `local_trusted` is a hardened malware sandbox;
- hide uncertainty behind a binary success UI.

Issues and pull requests that move these roadmap items forward are welcome.
