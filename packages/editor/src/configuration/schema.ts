import type { Json } from 'event-driven-design/model';

export type Field =
  | { kind: 'object'; fields: readonly { name: string; required: boolean; field: Field }[] }
  | { kind: 'enum'; values: readonly (string | number | boolean)[] }
  | { kind: 'number' | 'string' | 'boolean' };

export function objectValue(value: Json | undefined): { [name: string]: Json } | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : undefined;
}

/** Interpret supported control shapes. The compiler owns validation. */
export function fieldFor(schema: Json): Field | undefined {
  const spec = objectValue(schema);
  if (!spec) return;
  if (Array.isArray(spec.enum) && spec.enum.length && spec.enum.every(value =>
    typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')) {
    return { kind: 'enum', values: spec.enum as (string | number | boolean)[] };
  }
  if (spec.type === 'object' && spec.additionalProperties === false) {
    const fields = [];
    const required = Array.isArray(spec.required) ? spec.required : [];
    for (const [name, child] of Object.entries(objectValue(spec.properties) ?? {})) {
      if (name === 'serviceBindings' || name === 'credentials') return;
      const field = fieldFor(child);
      if (!field) return;
      fields.push({ name, required: required.includes(name), field });
    }
    return { kind: 'object', fields };
  }
  if (spec.type === 'integer') return { kind: 'number' };
  if (spec.type === 'number' || spec.type === 'boolean' || spec.type === 'string') return { kind: spec.type };
}
