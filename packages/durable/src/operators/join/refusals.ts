export const joinRefusals = ['INVALID_PACKET', 'DUPLICATE_KEY', 'JOIN_GROUP_COMPLETED', 'JOIN_CAPACITY', 'JOIN_HISTORY_CAPACITY'] as const;

export function isJoinRefusal(code: string): code is typeof joinRefusals[number] {
  return joinRefusals.some(refusal => refusal === code);
}
