# Runtime portability: command backend and reference suite

## Delivered increments

Phase B introduced `runLocalCommand` in `packages/verifier/src/runner.ts` and exercises the ten deterministic reference suites on Linux, macOS and Windows with Node.js 22 and 24. The old `runWindowsLocalCommand` export remains an alias. [PR #12](https://github.com/gjt21123/BURHAN/pull/12) records the original command/reference portability delivery.

The subsequent [bounded candidate-reference increment](bounded-reference-runtime.md), tracked in [PR #17](https://github.com/gjt21123/BURHAN/pull/17), migrates `packages/codex-runner/src/execution.ts` away from in-process candidate imports. That reference path now uses a supervised worker, qualified observations, parent-owned comparisons and independently pinned compiler-pack checks.

Neither increment completes general-purpose runtime orchestration. The standalone `static_git_snapshot_v1` CLI still checks committed blobs only. The runtime reference workflow still uses BURHAN's payment fixture and historical baseline. Passing reference suites do not make arbitrary repositories ready for unattended execution.

## Execution boundary

Only maintainer-approved `ValidatorCommand` objects may enter the backend. Node resolves to the running verifier's Node executable. npm/npx resolve to that installation's JavaScript entrypoints and run through Node, without a Windows `.cmd` shell or a candidate-controlled PATH lookup.

The child environment is constructed from an allowlist. Provider credentials, inherited `NODE_OPTIONS`, `NODE_PATH`, Git overrides and loader injection variables are not copied. HOME, USERPROFILE, temporary directories and npm cache point to the supplied run directory. npm defaults to offline mode with lifecycle scripts disabled. These defaults do not enforce network isolation against arbitrary local code or explicitly overridden command arguments.

Command limits: 256 arguments, 64 KiB total argument data, no NUL bytes, an execution deadline between 1 ms and 300 seconds, and a combined stdout/stderr budget of at most 16 MiB. Working/temp directories must be absolute and exist. The candidate reference profile selects narrower limits: at most 10 seconds per probe and 64 KiB combined output.

### Cancellation and cleanup

On POSIX, a verifier-owned supervisor starts a process group. On Windows, the supervisor remains alive so an absolute System32 `taskkill.exe /T /F` invocation has a known tree root. The parent handles timeout, excess output, cancellation and unexpected supervisor exit. Cleanup has its own bounded deadline; failed cleanup is never successful verification evidence.

`cleanupSucceeded` reports the outcome of the bounded cleanup procedure, **not an exhaustive process census or malware-containment guarantee**. The tests check ordinary descendants while the command tree is live. Deliberately detached/reparented processes, compromised hosts, parent crashes and Windows native Job Object containment are outside the guarantee. Do not expose unreviewed code to valuable credentials or a production host.

The supervisor protocol is fixed verifier code. It is not formed by interpolating candidate arguments into a shell. Candidate stdout cannot become a supervisor result message. The higher-level reference worker additionally requires a complete challenge-bound measurement frame; a zero process exit alone is not acceptance.

## Result semantics

`classifyCommandExecution` yields `pass`, `fail` or `blocked`. Timeouts, capped output, aborts, abnormal signals, missing exit evidence and failed cleanup are blocked, even if an intermediate component appeared to exit zero.

`reduceRuntimeStatuses` returns:

| Evidence | Verdict |
| --- | --- |
| Nonempty complete all-pass checks | `verified` |
| Complete checks including a functional failure | `rejected` |
| Empty, unknown, missing or blocked checks | `incomplete` |

The legacy `eval:burhan` command uses these functions and counts incomplete cases separately. The bounded candidate reference path also uses this reducer after parent-side observation comparisons. Known protected-path violations are rejected before running candidates. Workspace/pack changes or missing protocol evidence cannot be silently accepted.

## Independently retained pack identity

Two private APIs serve historical paths:

- `packages/verifier`: `verifySealedValidatorPack(packPath, expectedPackHash)` checks the legacy command evaluator's retained identity around execution.
- `packages/validator-compiler`: `verifyTrustedValidatorPack(packPath, expectedPackHash)` checks the bounded reference path's retained compiler-pack identity and manifest/file size/hash bindings.

Their one-argument forms preserve legacy consistency checking; an adjacent sidecar alone is not approval. Existing serialized hashes and receipt formats are retained. A matching local hash does not prove signer identity, prevent transient shared-host mutation or establish external attestation.

## Validation

```bash
npm ci
npm test
npm run typecheck
npm run build
npm run ci:verification
npm run test:cli-package
```

The [Runtime verification workflow](../.github/workflows/runtime-verification.yml) runs the ten reference suites in six OS/Node combinations. Normal CI continues static CLI package tests, web checks, dependency audit and repository hygiene. The original Windows reference job is retained.

The command-backend increment added 31 process tests plus nine legacy pack/verdict regressions. Its macOS cwd test compares canonical directory identities rather than skipping `/var` versus `/private/var` aliases. The candidate-reference increment adds protocol/worker, runtime orchestration and compiler-pack tests described in [its validation scope](bounded-reference-runtime.md).

Consult each PR for its final tested commit and post-merge runs. Local checks do not substitute for the complete GitHub-hosted matrix, and deterministic fixture success is not new live model evidence.

## Remaining work before external runtime pilots

[Issue #11](https://github.com/gjt21123/BURHAN/issues/11) remains open for explicit external repository/base/head/contract inputs, portable parent-owned capture and workspace construction, general validator/qualification inputs and multiple independent runtime examples.

The migrated payment path is explicitly `bounded_payment_reference_v1`: it measures a service against a verifier-owned instrumented store, not every candidate storage backend, and uses a fixed worker rather than executing historical generated Vitest templates. Preserve this boundary when generalizing the pipeline.

Live Codex/Claude adapters, reusable production CI integration, npm registry publication, independent review and real adopters remain separate milestones. Ordinary deterministic CI stays credential-free.
