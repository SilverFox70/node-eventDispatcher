import 'server-only';
import type { FunctionContext } from 'event-driven-design';

export const serverCanary = 'FBP_PRIVATE_PROVIDER_8f705a91d3c64b4c';

/** Local fake only; the mode is server-owned test configuration, never request data. */
export async function double(value: number, context: FunctionContext): Promise<number> {
  console.log('FBP_DEMO_EFFECT', context.packet.jobId);
  const mode = process.env.FBP_DEMO_MODE;
  if (mode === 'throw') throw new Error(serverCanary);
  if (mode === 'timeout') {
    return new Promise<number>((_, reject) => {
      context.signal.addEventListener('abort', () => reject(new Error(serverCanary)), { once: true });
    });
  }
  return value * 2;
}
