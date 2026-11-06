import { copyJson } from '../../packet/json.js';
import { validateRegressionFixture } from '../../model/diagnostics/fixtures/fixture.js';
import type { RegressionFixture } from '../../model/diagnostics/fixtures/fixture.js';
import { FlowError } from '../../errors.js';

export type FixtureReview = (fixture: RegressionFixture) => boolean;

export function reviewedFixture(value: unknown, approved: FixtureReview): RegressionFixture {
  let snapshot: unknown;
  try { snapshot = copyJson(value); }
  catch { throw new FlowError('INVALID_FIXTURE'); }
  if (!validateRegressionFixture(snapshot).ok) throw new FlowError('INVALID_FIXTURE');
  const fixture = snapshot as RegressionFixture;
  if (approved(fixture) !== true) throw new FlowError('FIXTURE_REVIEW_REQUIRED');
  return fixture;
}

export type FixtureApproval = Readonly<{ roles: readonly string[]; approve: FixtureReview }>;

export function checkFixtureRoles(fixture: RegressionFixture, trusted: readonly string[]): void {
  const actual = Object.keys(fixture.dependencyScripts).sort(), expected = [...trusted].sort();
  if (actual.length !== expected.length || actual.some((role, index) => role !== expected[index])) {
    throw new FlowError('BINDING_MISMATCH');
  }
}
