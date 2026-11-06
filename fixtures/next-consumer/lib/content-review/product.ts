import { z } from 'zod';
import { contract } from 'event-driven-design';

const schema = z.strictObject({
  slug: z.string().max(80), title: z.string().max(120), description: z.string().max(500),
  altText: z.string().max(160), archived: z.boolean(),
});
export type Product = z.infer<typeof schema>;
export const product = contract('review-product@1', schema);
export const finding = z.strictObject({ field: z.string(), message: z.string() });
export const findings = contract('review-findings@1', z.array(finding));
export const report = contract('review-report@1', z.strictObject({
  findings: z.array(finding), preview: z.strictObject({ title: z.string(), description: z.string() }).nullable(),
}));
export function admitProduct(value: unknown) {
  const parsed = schema.safeParse(value);
  if (parsed.success) return { ok: true as const, product: parsed.data };
  return { ok: false as const, issues: parsed.error.issues.map(issue => ({
    field: issue.path.join('.') || 'product', code: issue.code,
  })) };
}
