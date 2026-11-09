import { FlowError } from 'event-driven-design';
import type { Registry } from 'event-driven-design';
import type { GraphSpec } from 'event-driven-design/model';

type Definition = Readonly<{ spec: GraphSpec; registry: Registry }>;
const definitions = new WeakMap<object, Definition>();

export function rememberProfile(profile: object, definition: Definition): void {
  definitions.set(profile, definition);
}

export function profileDefinition(profile: object): Definition {
  const definition = definitions.get(profile);
  if (!definition) throw new FlowError('VERSION_UNAVAILABLE');
  return definition;
}
