import { canonicalJson } from 'event-driven-design/model';

export type DurableProfilePin = Readonly<{
  format: 'nodeflow.durable-profile';
  version: 1;
  executionDigest: string;
  adapterDigest: string;
}>;

const digest = (value: unknown) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

/** Read a detached version pin without loading handlers or server dependencies. */
export function readDurableProfilePin(value: unknown): DurableProfilePin {
  try {
    const row = JSON.parse(canonicalJson(value, 1024));
    if (row.format === 'nodeflow.durable-profile' && row.version === 1 &&
        digest(row.executionDigest) && digest(row.adapterDigest) && Object.keys(row).length === 4) {
      return Object.freeze(row);
    }
  } catch {
    // Malformed or oversized metadata has the same passive-format refusal.
  }
  throw Error('INVALID_PROFILE_PIN');
}
