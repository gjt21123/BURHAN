# Configuration and local demo safety

## Start without credentials

Use Node.js 22 or 24, npm and Git.

```bash
npm ci
npm run ci:portable
npm run dev
```

Visit `http://127.0.0.1:3000`. Development and production-demo servers bind to loopback by default.

Run the ten deterministic reference suites with `npm run ci:verification` from a full Git checkout. Current development tests these reference suites on Linux, macOS and Windows with Node 22/24. The separate portable static CLI needs no `npm ci`, while generic external-repository runtime orchestration is still in development. See [runtime portability](runtime-portability.md) for scope, per-process limits, approved command arguments and remaining in-process paths.

## Optional live contract compilation

No API key is needed for deterministic checks. The HTTP compiler is disabled by default and returns `LIVE_COMPILER_DISABLED` without a provider attempt.

For the Next.js UI, copy the template to the app directory:

```bash
cp .env.example apps/web/.env.local
```

On PowerShell use `Copy-Item .env.example apps/web/.env.local`.

Set `BURHAN_ENABLE_LIVE_COMPILER=1` and your own `OPENAI_API_KEY` in that local file, then restart the app. Never commit the real file. Live compilation sends the task and filtered repository facts to the provider and may incur charges. Review the exclusions and threat model before opting in. A missing key returns sanitized `API_KEY_MISSING`. CLI live evaluations use the shell environment and do not implicitly load this Next.js file.

## HTTP boundaries

Compiler and reset routes validate loopback Host/URL values and reject cross-origin browser writes. Compilation requires JSON, enforces a 16 KiB streaming body limit, limits tasks to 8,192 JavaScript characters and times out body reading after 10 seconds. Invalid JSON returns 400; unsupported content types 415; oversized bodies 413. Compiler/reset concurrency gates are separate within one process; overlap returns 429.

These are local-demo safeguards, not authentication, a distributed rate limiter or a secure execution sandbox. Do not expose the demo through a public reverse proxy or untrusted network. Processes already on the host remain within the local trust boundary. Multi-user deployment is unsupported.

## Type generation

`npm run typecheck` generates Next.js route types before TypeScript checks. `apps/web/next-env.d.ts` is generated and ignored; do not commit it. CI rejects changes to tracked source rather than discarding them to produce a green build.

## Provider and execution environments

Codex uses the workspace dependency and local CLI authentication. Do not copy authentication configuration into candidate workspaces, evidence, issue reports or browser payloads. Live evaluations are separate from deterministic CI.

The bounded runtime command backend constructs a narrow child environment instead of forwarding provider credentials or inherited Node/Git/loader overrides. Only maintainer-approved command arguments should be passed. Offline npm defaults and a restricted environment do not enforce network isolation or prevent hostile code from accessing the same host account.

See [SECURITY.md](../SECURITY.md), [the threat model](threat-model.md) and [runtime boundaries](runtime-portability.md).
