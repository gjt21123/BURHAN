# BURHAN Devpost package

## Project name

BURHAN

## Tagline

Agents should not merely say they finished. They should prove it.

## Short description

BURHAN independently verifies coding-agent work with sealed contracts, qualified validators, fresh workspaces, and linked local-integrity receipts.

## Full project description

AI coding agents can produce code and say “done,” but their completion claim is not proof. BURHAN seals the task contract before execution, qualifies its validator pack against both correct and incorrect controls, captures the candidate patch, and verifies it in a fresh workspace before issuing its own verdict.

Our payment-idempotency demo requires exactly one charge from twenty concurrent same-key requests, preserves independent keys, documents the API header, and protects migrations, tests, and dependency manifests. A real live Codex Validator Architect proposed a strategy that BURHAN qualified. A separate real live Codex Executor then ran. BURHAN captured its empty candidate state and independently issued **REJECTED**. `AgentExecutionClaim` never determines the verdict.

The final repair sequence is explicitly labeled **DETERMINISTIC REPAIR DEMO**. The original live run cannot support same-thread repair because its complete retained bundle was not available; BURHAN reports `REPAIR_CONTEXT_UNAVAILABLE`. The deterministic demo shows counterexample → human approval → complete patch capture → fresh verification with the same sealed validator standard. `SamePackProof` binds the standard across attempts, and linked local-artifact-integrity receipts detect tampering. The deterministic repair result is **VERIFIED**.

## Inspiration

We wanted a more honest interface for agentic development: not “the model says it worked,” but “the work is independently verified against a contract the model cannot rewrite.”

## What it does

- Seals a proof contract before verification.
- Qualifies validators against correct and incorrect controls.
- Captures candidate state and verifies it in a fresh workspace.
- Issues `VERIFIED`, `REJECTED`, or `INCOMPLETE` from BURHAN-owned evidence.
- Demonstrates a same-standard deterministic repair loop with linked receipts.

## How it was built

TypeScript, Next.js, Zod, canonical hashing, local Ed25519 artifact-integrity signatures, Windows-native Git workspaces, deterministic linters, validator qualification controls, and a local verification kernel. The main path uses no Docker, WSL, or containers.

## How GPT-5.6 was used

SpecForge contains a server-side GPT-5.6 Structured Outputs integration that supplies an untrusted contract draft for deterministic linting and human approval. Deterministic compiler fixtures pass. We do **not** claim successful live GPT-5.6 Platform API inference because the final live compiler evaluation could not complete when API quota was unavailable.

## How Codex was used

Codex was used for the real historical Validator Architect and Executor runs. BURHAN validated and qualified the strategy, captured the candidate patch, and independently returned `REJECTED`. The deterministic repair demo is not presented as a live Codex repair.

## Challenges

Keeping agent metadata separate from verifier-owned evidence; preventing a strategy from becoming arbitrary executable test code; preserving evidence integrity while allowing repair; and accurately distinguishing historical live evidence from deterministic replay.

## Accomplishments

Real live Codex execution independently rejected by BURHAN; qualification controls at 2/2 positive and 4/4 negative; deterministic repair with SamePackProof, linked receipts, tampering detection, and safe reset; zero false accepts in the deterministic submission suite.

## What we learned

Structured output can constrain an agent, but correctness comes from independent evidence: sealed contracts, qualified validators, protected artifacts, fresh verification, and truthful trust labels.

## What comes next

The product logic is frozen for submission. Future work would broaden task domains and evidence visualization without weakening the independent-verification boundary.

## Technology list

TypeScript · Next.js · OpenAI Codex CLI · OpenAI Responses Structured Outputs boundary · Zod · Git · Node.js · canonical hashing · Ed25519 local artifact-integrity signatures

## Repository instructions

See [README.md](../README.md) for Node.js 20+ setup, local demo startup, and the full deterministic validation matrix.

## Demo disclosure

**LIVE CODEX RUN** and **LIVE BURHAN VERIFICATION** describe historical real Codex evidence. **DETERMINISTIC REPAIR DEMO** is reproducible local proof evidence, not a live provider retry. `local_trusted` is local execution assurance, not a secure sandbox or malicious-code-containment claim.

## Known limitations

- The original live run reports `REPAIR_CONTEXT_UNAVAILABLE` for same-thread repair.
- GPT-5.6 live Platform API inference is not claimed because quota was unavailable.
- Local artifact-integrity signatures are not external attestation.
- BURHAN does not offer a mathematical correctness guarantee or hostile-code containment.
