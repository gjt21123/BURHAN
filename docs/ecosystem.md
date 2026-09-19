# Ecosystem Role

Coding agents can generate code, run tests, and report completion. The same agent can also misunderstand requirements, omit evidence, modify tests, or overstate what was verified. BURHAN addresses the gap between **agent execution** and **independent acceptance**.

## Where BURHAN fits

```text
Human / workflow
      |
      v
bounded requirement contract
      |
      v
coding agent / executor  ----> candidate changes
      |                            |
      | (untrusted claims)         v
      +----------------------> BURHAN capture
                                   |
                         sealed validator pack
                                   |
                         fresh verification
                                   |
                              evidence chain
                                   |
                                  verdict
```

BURHAN is not intended to replace:

- source control;
- CI systems;
- code review;
- hardened sandboxes;
- formal verification;
- software supply-chain signing.

It is intended to add a verification boundary around bounded coding-agent tasks so acceptance is based on evidence the candidate did not author.

## Integration points

### Coding agents

Provider-specific execution belongs behind adapters. Agent messages remain untrusted. BURHAN can use a coding agent to propose a validator strategy or implement a task while retaining verdict ownership outside the model.

### CI

Deterministic checks can be invoked by CI. The repository's own workflows demonstrate portable build/test checks and a Windows-native full verification path.

### Evaluation harnesses

Validator qualification and positive/negative controls are useful for measuring whether a proposed verification strategy can discriminate correct from intentionally invalid candidates.

### Evidence consumers

Receipts and evidence records can be inspected by humans or downstream automation. Their assurance wording must remain scoped to what BURHAN actually verifies.

## Why provider independence matters

BURHAN currently integrates with OpenAI/Codex in parts of the reference workflow, but its core verification principle is provider-independent: **the system executing or describing the candidate must not be the authority that accepts it**.

That boundary is useful across coding-agent ecosystems, regardless of which model or agent produced the change.

## Adoption evidence

Real usage should be recorded transparently in `ADOPTERS.md` or linked public issues/PRs. The project does not infer adoption from repository visibility alone.
