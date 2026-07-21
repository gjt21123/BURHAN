# BURHAN — copy-ready Devpost draft

## Project name

BURHAN

## Tagline

Agents should not merely say they finished. They should prove it.

## Short description

BURHAN independently verifies coding-agent work with sealed contracts, qualified validators, fresh workspaces, and linked local-integrity receipts.

## Full description

AI coding agents can produce code and say “done,” but their completion claim is not proof. BURHAN seals the task contract before execution, qualifies its validator pack against correct and incorrect controls, captures candidate state, and verifies it in a fresh workspace before issuing its own verdict.

In the payment-idempotency demo, a real live Codex Validator Architect proposed a strategy that BURHAN qualified. A separate real live Codex Executor then ran. BURHAN captured its empty candidate state and independently issued **REJECTED**. `AgentExecutionClaim` never determines the verdict.

The repair sequence is explicitly a **DETERMINISTIC REPAIR DEMO**, not live Codex repair. The original live run reports `REPAIR_CONTEXT_UNAVAILABLE` for same-thread repair. The deterministic demo uses the same sealed validator standard, complete patch capture, fresh verification, `SamePackProof`, linked local-artifact-integrity receipts, and tampering detection to reach **VERIFIED**.

## Inspiration

We wanted agentic development to show independent proof instead of a self-reported completion claim.

## What it does

Seals contracts, qualifies validator packs, captures candidate state, verifies fresh workspaces, issues verifier-owned verdicts, and demonstrates the repair proof loop with linked receipts.

## How it was built

TypeScript, Next.js, Zod, canonical hashing, local Ed25519 artifact-integrity signatures, Windows-native Git workspaces, deterministic linters, validator qualification controls, OpenAI Codex CLI, and an OpenAI Responses Structured Outputs boundary.

## Challenges, accomplishments, learning, and next steps

See the full approved copy in `docs/devpost.md`; preserve its live/deterministic disclosure and known limitations verbatim when entering longer Devpost fields.

## Technology list

TypeScript · Next.js · OpenAI Codex CLI · OpenAI Responses Structured Outputs · Zod · Git · Node.js · canonical hashing · Ed25519 local artifact-integrity signatures

## Honest disclosure and limitations

Live Codex Architect/Executor evidence is historical and real. The repair demo is deterministic, not live. GPT-5.6 live Platform API inference is not claimed because quota was unavailable. `local_trusted` is not a secure sandbox, and local signatures are not external attestation.

## URLs and identifier placeholders

- Repository: `REPOSITORY_URL`
- Demo: `DEMO_URL`
- Video: `VIDEO_URL`
- Devpost submission: `DEVPOST_SUBMISSION_URL`
- Codex feedback/session: `CODEX_FEEDBACK_SESSION_ID`
