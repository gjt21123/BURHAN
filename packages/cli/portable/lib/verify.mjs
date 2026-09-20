import { digest, exactKeys, LIMITS, PROFILE, requireThat, validDigest, VERSION } from './common.mjs';
import { matches, validateSeal } from './contract.mjs';
import { isAncestor, readBlob, readTree, repository, requireCommit } from './git.mjs';
import { evaluate, primitiveControls } from './primitives.mjs';

export async function verify({ repo, seal, expectedSeal, head, base }) {
  validateSeal(seal, expectedSeal);
  requireThat(base === undefined || base === seal.baseCommit, 'BASE_MISMATCH', 'The requested base differs from the approved seal.');
  const root = await repository(repo);
  requireCommit(root, seal.baseCommit);
  requireCommit(root, head);
  requireThat(isAncestor(root, seal.baseCommit, head), 'BASE_NOT_ANCESTOR', 'Approved base must be an ancestor of the candidate commit.');
  const controls = primitiveControls();
  requireThat(controls.status === 'PASS', 'PRIMITIVE_CONTROLS_FAILED', 'Static template controls did not pass.');
  const before = readTree(root, seal.baseCommit);
  const after = readTree(root, head);
  const changed = [...new Set([...before.keys(), ...after.keys()])].sort().filter(file => before.get(file)?.objectId !== after.get(file)?.objectId || before.get(file)?.mode !== after.get(file)?.mode);
  const policyIssues = [];
  if (seal.contract.requireChanges && changed.length === 0) policyIssues.push({ code: 'NO_CHANGES' });
  for (const file of changed) {
    if (seal.contract.forbiddenPaths.some(pattern => matches(pattern, file))) policyIssues.push({ code: 'FORBIDDEN_CHANGE', path: file });
    else if (!seal.contract.allowedPaths.some(pattern => matches(pattern, file))) policyIssues.push({ code: 'OUTSIDE_SCOPE', path: file });
  }
  const cache = new Map();
  const checks = [];
  let bytesRead = 0;
  for (const check of seal.contract.checks) {
    const entry = after.get(check.path);
    let bytes = null;
    if (entry) {
      if (['exists', 'absent'].includes(check.kind)) bytes = Buffer.alloc(0);
      else {
        if (!cache.has(entry.objectId)) {
          bytesRead += entry.size;
          requireThat(bytesRead <= LIMITS.totalBlobBytes, 'RUN_LIMIT', 'Checked data exceeds the 16 MiB preview limit.');
          cache.set(entry.objectId, readBlob(root, entry));
        }
        bytes = cache.get(entry.objectId);
      }
    }
    const reason = evaluate(check, bytes);
    checks.push({ id: check.id, kind: check.kind, path: check.path, objectId: entry?.objectId ?? null, status: reason === 'PASS' ? 'PASS' : 'FAIL', reason });
  }
  const payload = {
    kind: 'burhan.static-report.v1', profile: PROFILE, version: VERSION,
    baseCommit: seal.baseCommit, headCommit: head, sealHash: seal.sealHash, contractHash: seal.contractHash,
    verdict: policyIssues.length === 0 && checks.every(check => check.status === 'PASS') ? 'PASSED' : 'REJECTED',
    scope: 'Declared static predicates on committed Git blobs only; not runtime correctness or sandbox assurance.',
    candidateCodeExecuted: false, primitiveControls: controls, changedPaths: changed, policyIssues, checks
  };
  requireThat(Buffer.byteLength(JSON.stringify(payload, null, 2)) < LIMITS.reportBytes - 256, 'REPORT_LIMIT', 'Report exceeds the 4 MiB preview limit.');
  return { ...payload, reportHash: digest('burhan.report.v1', payload) };
}
export function validateReport(report, expectedHash) {
  requireThat(validDigest(expectedHash), 'PIN_REQUIRED', 'An independently retained --expect-report digest is required.');
  exactKeys(report, ['kind', 'profile', 'version', 'baseCommit', 'headCommit', 'sealHash', 'contractHash', 'verdict', 'scope', 'candidateCodeExecuted', 'primitiveControls', 'changedPaths', 'policyIssues', 'checks', 'reportHash']);
  requireThat(report.kind === 'burhan.static-report.v1' && report.profile === PROFILE && report.candidateCodeExecuted === false && ['PASSED', 'REJECTED'].includes(report.verdict), 'REPORT_UNSUPPORTED', 'Unsupported static report. Historical receipt formats are not interchangeable.');
  const { reportHash, ...payload } = report;
  requireThat(reportHash === expectedHash && digest('burhan.report.v1', payload) === expectedHash, 'REPORT_MISMATCH', 'Report integrity does not match the retained digest.');
  return report;
}
