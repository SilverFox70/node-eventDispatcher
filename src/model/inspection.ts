import type { Catalog } from './catalog.js';
import type { GraphSpec } from './graph.js';
import type { ContractIssue } from './contracts.js';
import type { DispatcherTopology } from './dispatcher-topology.js';

/** One wire-format version shared by snapshot production and diagram admission. */
export const inspectionVersion = 1;

export type ValidationReport = Readonly<{
  runId: string; nodeId: string; port: string; direction: 'input' | 'output';
  componentId: string; componentVersion: number; contractId: string; representationId: string;
  issues: readonly ContractIssue[]; truncated: boolean;
}>;
export type Diagnostic = Readonly<{ sequence: number; code: string; nodeId?: string; validation?: ValidationReport }>;
export type Snapshot = Readonly<{
  runId: string; status: 'running' | 'draining' | 'completed' | 'cancelled' | 'failed';
  nodes: readonly Readonly<{ id: string; status: 'running' | 'completed' | 'failed' | 'cancelled' }>[];
  channels: readonly Readonly<{ id: string; queued: number; capacity: number; pendingSend: boolean;
    sent: number; received: number; discarded: number }>[];
  diagnostics: readonly Diagnostic[];
}>;
export type InspectionSource = Readonly<
  { id: string; kind: 'graph'; spec: GraphSpec; catalog: Catalog; run: Snapshot | null } |
  { id: string; kind: 'dispatcher'; topology: DispatcherTopology }
>;
/** Explicit registrations only; run counters/verdicts contain no packet values or executable handles. */
export type InspectionSnapshot = Readonly<{ version: typeof inspectionVersion; sources: readonly InspectionSource[] }>;
