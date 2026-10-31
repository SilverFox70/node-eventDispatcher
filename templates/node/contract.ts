import { z } from 'zod';
import { contract } from 'event-driven-design';

const requestSchema = z.strictObject({ id: z.string().min(1).max(128) });
const resultSchema = z.union([
  z.strictObject({ kind: z.literal('found'), id: z.string(), label: z.string() }),
  z.strictObject({ kind: z.literal('missing'), id: z.string() }),
]);

export type LookupRequest = z.infer<typeof requestSchema>;
export type LookupResult = z.infer<typeof resultSchema>;
export const request = contract('profile-request@1', requestSchema);
export const result = contract('profile-result@1', resultSchema);
