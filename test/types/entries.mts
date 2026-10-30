import * as root from 'event-driven-design';
import * as model from 'event-driven-design/model';
import * as testing from 'event-driven-design/testing';
void [root, model, testing];
// @ts-expect-error Future graph runtime APIs are not implemented yet.
root.startNetwork();

const dispatcher: root.Dispatcher = root.createDispatcher({ logLimit: 2 });
dispatcher.on('typed', (value: number, label: string) => { void [value, label]; });
dispatcher.emit('typed', [2, 'label']);
// @ts-expect-error Event names must be strings.
dispatcher.on(42, () => {});
// @ts-expect-error Listeners must be callable.
dispatcher.once('bad', 42);
// @ts-expect-error logLimit must be numeric.
root.createDispatcher({ logLimit: '2' });
