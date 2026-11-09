export type DurableProgressView = Readonly<{
  status: string; revisionId: string; executionDigest: string; adapterDigest: string;
  lifecycleRevision: string; nextCursor: string | null; failureCode: string | null;
  steps: readonly Readonly<{
    stepId: string; nodeId: string; stage: string; attempts: number; maxClaims: number; failureCode: string | null;
    wait: Readonly<{ signalName: string; revision: number; state: string }> | null;
    operation: Readonly<{ operationId: string; revision: number; state: string }> | null;
  }>[];
}>;

export type DurableProgressAction =
  | Readonly<{ kind: 'cancel'; expectedRevision: string }>
  | Readonly<{ kind: 'signal'; generation: string; nodeId: string; signalName: string; expectedRevision: number }>
  | Readonly<{ kind: 'resolve'; stepId: string; operationId: string; expectedRevision: number }>;
