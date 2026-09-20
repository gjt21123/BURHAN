# AGENTS.md

This file defines how coding agents should work in BURHAN.

## Mission

BURHAN independently verifies bounded coding-agent work. A model's statement that a task is complete is **untrusted input**. Changes must preserve the separation between agent output and BURHAN-owned evidence.

## Read first

Before changing verification behavior, read:

1. `README.md`
2. `docs/architecture.md`
3. `docs/threat-model.md`
4. `CONTRIBUTING.md`

## Trust rules

Do not weaken these invariants without an explicit design discussion:

- Candidate/agent output never determines its own verdict.
- Sealed contracts and validator packs are protected artifacts.
- Validators are qualified against positive and negative controls.
- Verification that claims independence runs against captured candidate state in a fresh workspace.
- Missing, contradictory, or unverifiable evidence fails closed.
- Documentation and UI must not claim stronger assurance than the implementation provides.
- `local_trusted` is not a hardened sandbox or remote attestation system.

## Scope discipline

Prefer the smallest change that solves the issue. Avoid opportunistic refactors in trust-boundary code.

Never commit:

- API keys or tokens;
- private keys;
- raw provider credentials;
- hidden validator source in public evidence;
- private model reasoning;
- generated local run directories;
- machine-specific state.

## Validation

Portable checks:

```bash
npm ci
npm test
npm run typecheck
npm run build
```

The full deterministic verification suite currently has a Windows-native execution path and should be run on Windows:

```powershell
npm run eval:burhan
npm run eval:compiler:fixtures
npm run eval:codex:fixtures
npm run eval:validator-qualification
npm run eval:executor:fixtures
npm run eval:execution-verification
npm run eval:architect-output
npm run eval:repair-loop
npm run eval:repair-orchestration
npm run eval:submission-demo
```

Live/provider-backed evaluations are separate from deterministic CI and must not be required for an ordinary pull request.

## Tests for verification changes

A change to verifier/compiler/qualification behavior should normally include:

- a positive control that should pass;
- at least one negative control that must fail;
- a regression test for the reported failure mode;
- a check that protected paths/evidence cannot be silently rewritten.

## Pull requests

In the PR body explain:

- the problem;
- the trust-boundary impact;
- deterministic evidence;
- failure behavior;
- documentation changes.

If a task is ambiguous in a way that can change the assurance boundary, stop and surface the ambiguity instead of silently choosing the weaker interpretation.
