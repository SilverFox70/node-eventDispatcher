import { joinByKey, contract, jsonContract, createGraph, type Values, type JoinOptions } from 'event-driven-design';
import { z } from 'zod';
const number = contract('join-number@1', z.number());
const text = contract('join-text@1', z.string());
const options: JoinOptions = { outputId: 'typed-product@1', maxKeys: 2, completedGroupLimit: 3 };
const join = joinByKey({ amount: number, label: text }, options);
const value: Values<typeof join.out>['out'] = { amount: 2, label: 'ok' };
const graph = createGraph(), handle = graph.add('join', join);
graph.exposeInput('amount', handle, 'amount'); graph.exposeOutput('result', handle, 'out');
void [value, join.in.amount, join.out.out];
// @ts-expect-error Output properties keep the individual input contract types.
const bad: Values<typeof join.out>['out'] = { amount: 'wrong', label: 'ok' };
// @ts-expect-error Every declared input contributes one required output property.
const missing: Values<typeof join.out>['out'] = { amount: 1 };
// @ts-expect-error Composed output has exact input names.
const extra: Values<typeof join.out>['out'] = { amount: 1, label: 'ok', other: true };
// @ts-expect-error Exact input ports remain checked by the builder.
graph.exposeInput('unknown', handle, 'missing');
// @ts-expect-error Join requires an explicit output contract identity.
joinByKey({ a: number, b: number }, {});
// @ts-expect-error Port definitions must be contracts.
joinByKey({ a: number, b: 'wrong' }, { outputId: 'bad@1' });
const arbitrary = joinByKey({ data: jsonContract, label: text }, { outputId: 'json-product@1' });
const jsonValue: Values<typeof arbitrary.out>['out'] = { data: { list: [null, true, 1] }, label: 'ok' };
void [bad, missing, extra, jsonValue, arbitrary];
