/** Shared wire-format version for type declarations and runtime snapshots. */
export const dispatcherTopologyVersion = 1;

/** Explicit attribution supplied by the subscriber's caller. */
export type OwnerMetadata = Readonly<{ ownerId: string }>;

export type DispatcherSubscriber = Readonly<{
  id: number;
  event: string;
  ownerId: string | null;
  callbackName: string;
  once: boolean;
}>;

export type DispatcherPublisher = Readonly<{
  id: number;
  event: string;
  ownerId: string;
  provenance: 'declared';
}>;

/** Detached, immutable JSON metadata; IDs are local to each dispatcher/entity kind. */
export type DispatcherTopology = Readonly<{
  version: typeof dispatcherTopologyVersion;
  events: readonly Readonly<{ name: string }>[];
  subscribers: readonly DispatcherSubscriber[];
  publishers: readonly DispatcherPublisher[];
}>;
