import { FlowError } from '../../errors.js';
import { readRecord } from '../../packet/data.js';

export type JoinOptions = Readonly<{ outputId: string; maxKeys?: number; completedGroupLimit?: number }>;
export function joinOptions(value: JoinOptions) {
  const fields = readRecord(value, 'INVALID_ARGUMENT');
  if (Object.keys(fields).some(name => !['outputId', 'maxKeys', 'completedGroupLimit'].includes(name))) throw new FlowError('INVALID_ARGUMENT');
  const maxKeys = Object.hasOwn(fields, 'maxKeys') ? fields.maxKeys : 128;
  const completedGroupLimit = Object.hasOwn(fields, 'completedGroupLimit') ? fields.completedGroupLimit : 65536;
  if (!Number.isSafeInteger(maxKeys) || (maxKeys as number) < 1 || (maxKeys as number) > 4096 ||
    !Number.isSafeInteger(completedGroupLimit) || (completedGroupLimit as number) < 1 || (completedGroupLimit as number) > 1048576) throw new FlowError('INVALID_ARGUMENT');
  return { outputId: fields.outputId as string, maxKeys: maxKeys as number, completedGroupLimit: completedGroupLimit as number };
}
