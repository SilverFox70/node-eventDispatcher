import type { EditorIssue } from '../document/types.js';

export type Verdict =
  | { revision: number; status: 'pending' | 'failed' }
  | { revision: number; status: 'complete'; issues: readonly EditorIssue[] };

export function readIssues(value: unknown, revision: number): readonly EditorIssue[] {
  if (!value || typeof value !== 'object' || !('revision' in value) || value.revision !== revision ||
    !('issues' in value) || !Array.isArray(value.issues) || !value.issues.every(issue =>
      issue && typeof issue.code === 'string' && typeof issue.path === 'string')) throw Error('INVALID_VERDICT');
  return value.issues;
}

export function validationView(verdict: Verdict | undefined, revision: number) {
  if (!verdict) return { issues: [], message: 'Validate the draft to check its settings and wiring.' };
  if (verdict.revision !== revision) return { issues: [], message: 'Validation is stale. Validate the current draft again.' };
  if (verdict.status !== 'complete') return {
    issues: [], message: verdict.status === 'pending' ? 'Backend validation pending.' : 'Backend validation failed. Try again.',
  };
  const { issues } = verdict;
  const count = issues.length;
  return {
    issues, message: count ? `Backend found ${count} draft ${count === 1 ? 'issue' : 'issues'}.` : 'Backend validated this draft.',
  };
}
