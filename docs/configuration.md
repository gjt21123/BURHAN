# Configuration

BURHAN separates deterministic verification from live provider-backed execution.

## Deterministic workflows

The ordinary test/type/build and fixture evaluation paths should not require provider credentials.

```bash
npm ci
npm run ci:portable
```

The full reference verification suite currently runs on Windows:

```powershell
npm run ci:verification
```

## OpenAI API

Live SpecForge contract compilation uses:

```text
OPENAI_API_KEY
```

Copy the template if you need provider-backed compilation:

```bash
cp .env.example .env.local
```

Then add the key locally. Do not commit it.

The application returns a sanitized `API_KEY_MISSING` condition if live compilation is requested without a key.

## Codex CLI

The Codex runner uses the locally installed workspace dependency and the Codex CLI authentication state. BURHAN intentionally sanitizes the child-process environment and forwards only a narrow set of local environment variables.

Check local Codex authentication separately before running live Codex evaluations.

Live Codex workflows are **not** part of deterministic CI and should not be required to validate an ordinary pull request.

## Credential handling rules

- Never place provider credentials in browser-visible payloads.
- Never write credentials into evidence bundles.
- Never copy local Codex configuration into a candidate workspace.
- Never include keys, cookies, access tokens, or private provider streams in issues or pull requests.
- Prefer repository/environment secrets for CI integrations that genuinely require credentials.
- Keep deterministic tests runnable without secrets.

See [SECURITY.md](../SECURITY.md) and [docs/threat-model.md](threat-model.md).
