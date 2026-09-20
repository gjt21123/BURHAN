# ADR: an explicit portable static snapshot CLI profile

Status: implemented as the first Phase A preview; see issue #9 and the implementation PR for test evidence.

## Context

The existing CLI exposes the historical payment evaluation and receipt operations. Its reference execution depends on a BURHAN milestone tag and a Windows-native runner. Packaging that path as a universal verifier would overstate portability and require unrelated workspace dependencies.

The owner approved a roadmap to make BURHAN usable on independent repositories. The first increment must be independently installable and useful without weakening existing qualified validators or silently executing untrusted candidate commands.

## Decision

Add `packages/cli/portable`, a dependency-free distribution boundary, with profile `static_git_snapshot_v1`. It evaluates only fixed declarative file predicates and allowed/forbidden committed changes. It reads Git objects directly, without checking out or executing candidate code. It does not claim fresh runtime execution.

The contract is explicitly approved against a full baseline commit. Its complete canonical contents and baseline are bound into a domain-separated SHA-256 seal. Verification requires a separately retained expected seal hash. Candidate-controlled changes cannot authorize a different contract without changing the independent pin.

Static verdicts are `PASSED` and `REJECTED`; unavailable evidence or unsupported input returns `INCOMPLETE`/exit 2. No static result is promoted into a semantic `VERIFIED` runtime receipt. Pinned report integrity is a checksum comparison, not authentication, a digital signature or attestation.

The existing runtime compiler, qualification controls, evidence records, repair flow, signed receipt format and `eval:burhan` are unchanged. Legacy CLI operations remain available as `npm run burhan:legacy -- ...`.

## Safeguards

Require full immutable commit IDs and an ancestor baseline. Disable replacement refs and network protocols; remove inherited provider credentials and Git overrides from subprocess environments; do not use a shell, checkout hooks, smudge filters or arbitrary candidate validators. Bound input sizes, tree entries, blob output and operation durations. Refuse symlinks, submodules and nonportable/case-colliding names as incomplete. Reject ambiguous duplicate JSON keys.

The installed verifier, Git binary, local host and repository metadata are trusted. This design is not hostile-host containment. Static text presence is not semantic correctness, and primitive self-controls do not prove a user-written contract is adequate.

## Distribution and validation

The nested package is packed through an explicit allowlist and has no runtime dependencies or install scripts. It remains `private: true` to prevent accidental registry publication. CI installs the real tarball offline outside the monorepo and checks three fresh fixture repositories with positive and negative cases on every OS/Node combination. Those fixtures are not adopters.

Node built-ins provide portability without a bundler, new dependency or changes to the existing lockfile. Tests use `node:test`, not Vitest, so the parent CLI test command explicitly selects that suite.

## Next milestones

Generalize the qualified runtime executor behind an explicit backend and test complete Linux/Windows equivalence. Then integrate pinned contracts with a read-only GitHub Actions reference flow and live Codex/Claude adapters. Those steps remain open; this ADR does not claim they shipped.

## Primary implementation references

- [Git object reads](https://git-scm.com/docs/git-cat-file)
- [Git replacement and fetch controls](https://git-scm.com/docs/git)
- [Node child-process boundaries](https://nodejs.org/api/child_process.html)
- [npm package allowlists and bin metadata](https://docs.npmjs.com/files/package.json/)
