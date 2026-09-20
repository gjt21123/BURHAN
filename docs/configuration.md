# Configuration and local demo safety

## Start without credentials

Use a maintained Node.js LTS release (Node 22 is recommended), npm and Git.

```bash
npm ci
npm run ci:portable
npm run dev
```

Visit `http://127.0.0.1:3000`. Development and production-demo servers bind to loopback by default. The complete reference verification suite remains Windows-native: `npm run ci:verification`.

## Optional live contract compilation

No API key is needed for deterministic checks. The HTTP compiler is disabled by default and returns `LIVE_COMPILER_DISABLED` without a provider attempt.

For the Next.js UI, copy the template to the **app directory**:

```bash
cp .env.example apps/web/.env.local
```

On PowerShell use `Copy-Item .env.example apps/web/.env.local`.

Set `BURHAN_ENABLE_LIVE_COMPILER=1` and your own `OPENAI_API_KEY` in that local file, then restart the app. Never commit the real file. Live compilation sends the task and a filtered repository fact pack to the provider and may incur charges. Read the fact-pack exclusions and threat model before opting in. A missing key returns the sanitized `API_KEY_MISSING` condition. CLI live evaluations use the shell environment and do not implicitly load this Next.js file.

## HTTP boundaries

Compiler and reset routes validate loopback Host/URL values and reject cross-origin browser writes. The compiler requires JSON, enforces a 16 KiB streaming body limit, limits tasks to 8,192 JavaScript characters, and times out body reading after 10 seconds. Invalid JSON returns 400; unsupported content types return 415; oversized bodies return 413. Compiler/reset concurrency is limited separately within a single process; overlapping operations return 429.

These are local-demo safeguards, **not authentication, a distributed rate limiter or a secure execution sandbox**. Do not put the demo behind a public reverse proxy or expose it to an untrusted network. Requests from processes already running on your machine are within the local trust boundary. There is no multi-user deployment support.

## Type generation

`npm run typecheck` generates the Next.js route types before TypeScript checks. `apps/web/next-env.d.ts` is generated and ignored; do not check it into Git. CI still rejects changes to tracked source files rather than discarding them to produce a green build.

## Codex CLI

The runner uses the workspace Codex dependency and local CLI authentication. Keep authentication local; do not copy Codex configuration into candidate workspaces, evidence, issue reports or browser payloads. Live Codex evaluations are separate from deterministic CI and must never be required for an ordinary contribution.

See [SECURITY.md](../SECURITY.md) and [the threat model](threat-model.md).
