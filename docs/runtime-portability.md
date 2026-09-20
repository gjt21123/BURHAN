# Runtime portability: command backend and reference suite

## Delivered increment

Phase B introduces `runLocalCommand` in `packages/verifier/src/runner.ts` and exercises the ten existing deterministic reference suites on Linux, macOS and Windows with Node.js 22 and 24. The old `runWindowsLocalCommand` export remains an alias, so existing callers do not silently lose their execution path.

This is **not completion of the general-purpose runtime milestone**. The standalone `static_git_snapshot_v1` CLI still checks committed blobs only. The runtime reference workflow still uses BURHAN's payment fixture and historical baseline. Neither a passing reference suite nor this backend makes arbitrary repositories ready for unattended execution.

## Execution boundary

Only maintainer-approved `ValidatorCommand` objects may enter the backend. Node resolves to the running verifier's Node executable. npm/npx resolve to that installation's JavaScript entrypoints and run through Node, without a Windows `.cmd` shell or a candidate-controlled PATH lookup.

The child environment is constructed from an allowlist. Provider credentials, inherited `NODE_OPTIONS`, `NODE_PATH`, Git overrides and loader injection variables are not copied. HOME, USERPROFILE, temporary directories and npm cache point to the supplied run directory. npm defaults to offline mode with lifecycle scripts disabled. These defaults do not enforce network isolation against arbitrary local code or explicitly overridden command arguments.

Command limits: 256 arguments, 64 KiB total argument data, no NUL bytes, an execution deadline between 1 ms and 300 seconds, and a combined stdout/stderr budget of at most 16 MiB. Working/temp directories must be absolute and exist. Command-specific limits are normally much lower.

### Cancellation and cleanup

On POSIX, a verifier-owned supervisor starts a process group. On Windows, the supervisor remains alive so an absolute System32 `taskkill.exe /T /F` invocation has a known tree root. The parent handles timeout, excess output, cancellation and unexpected supervisor exit. Cleanup has its own bounded deadline; failed cleanup is never successful verification evidence.

`cleanupSucceeded` reports the outcome of the bounded cleanup procedure, **not an exhaustive process census or malware-containment guarantee**. The tests check ordinary descendants while the command tree is live. Deliberately detached/reparented processes, compromised hosts, parent crashes and Windows native Job Object containment are outside the guarantee. Do not expose unreviewed code to valuable credentials or a production host.

The supervisor protocol is fixed verifier code. It is not formed by interpolating candidate arguments into a shell. Candidate stdout cannot become a supervisor result message.

## Result semantics

`classifyCommandExecution` yields `pass`, `fail` or `blocked`. Timeouts, capped output, aborts, abnormal signals, missing exit evidence and failed cleanup are blocked, even if an intermediate component appeared to exit zero.

`reduceRuntimeStatuses` returns:

| Evidence | Verdict |
| --- | --- |
| Nonempty complete all-pass checks | `verified` |
| Complete checks including a functional failure | `rejected` |
| Empty, unknown, missing or blocked checks | `incomplete` |

The legacy `eval:burhan` command uses these functions. Its report counts incomplete cases separately rather than describing every non-rejection as a false acceptance. Known protected-path violations are rejected before running validators, and protected files are checked again after execution.

## Independently retained pack identity

`verifySealedValidatorPack(packPath, expectedPackHash)` optionally accepts the original separately retained `sha256:...` seal. The legacy command-based evaluator now supplies its retained hash before and after each validator. Recalculating a modified pack's adjacent sidecar is insufficient to pass that pinned check.

The one-argument API remains compatible with historical callers and checks sidecar consistency only. Existing serialized pack hashes and receipt formats have not been replaced. This change applies to `packages/verifier`'s legacy pack API, not an assertion that every pack implementation now has the same API. It does not stop temporary mutations on a compromised shared host or establish signer identity.

## Validation

```bash
npm ci
npm test
npm run typecheck
npm run build
npm run ci:verification
npm run test:cli-package
```

The complete reference command is now exercised by the dedicated [Runtime verification workflow](../.github/workflows/runtime-verification.yml) on six OS/Node combinations. The normal CI continues to run the static CLI package checks, web checks, dependency audit and repository hygiene. The original Windows reference job is retained rather than removed to obtain a green matrix.

New tests comprise 31 process-backend regressions plus nine pack-pin/verdict regressions. The initial macOS job exposed a test assertion comparing `/var` with the same physical directory under `/private/var`; the assertion now compares canonical directory identities, without skipping the test or weakening the runtime boundary.

See [PR #12](https://github.com/gjt21123/BURHAN/pull/12) for final SHA-specific CI and runtime results. Local validation covered the isolated 31-test process suite on Linux/Node 22; complete repository validation runs on GitHub-hosted CI. No new live model invocation is implied by fixture success.

## Remaining work before external runtime pilots

[Issue #11](https://github.com/gjt21123/BURHAN/issues/11) remains open for explicit external repository/base/head/contract inputs, portable fresh workspace construction, general validator/qualification inputs and multiple independent runtime examples.

The existing `packages/codex-runner/src/execution.ts` reference path still imports fixture candidate modules into its own process. It is **not automatically supervised by the new command backend**. That path must be migrated and given process/timeout/negative controls before it is used as a generic external-repository executor. Successful reference tests do not establish isolation of that path.

Live Codex/Claude adapters, reusable production CI integration, npm registry publication, independent review and real adopters remain separate milestones. Ordinary deterministic CI stays credential-free.
