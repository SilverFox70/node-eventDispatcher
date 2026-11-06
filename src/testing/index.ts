export { runGraph } from './run-graph.js';
export { runNode } from './run-node.js';
export type { TestOptions, TestResult } from './run-graph.js';

export { prepareRegressionFixture } from '../diagnostics/fixture-export/prepare.js';
export { writeRegressionTest } from '../diagnostics/fixture-export/write.js';
export { runRegressionFixture } from './fixtures/run.js';
export type { FixtureBindings, FixtureServices } from './fixtures/run.js';
export type { FixtureApproval, FixtureReview } from './fixtures/review.js';
export { validateRegressionFixture } from '../model/diagnostics/fixtures/fixture.js';
export type { RegressionFixture, FixturePacket, FixtureStep, FixtureDecision } from '../model/diagnostics/fixtures/fixture.js';

export { compareFixture } from './comparison/compare.js';
export type { ComparisonSide, ComparisonResult, ComparisonChange, RevisionDigests } from './comparison/compare.js';
