import * as root from 'event-driven-design';
import * as model from 'event-driven-design/model';
import * as testing from 'event-driven-design/testing';
void [root, model, testing];
// @ts-expect-error S01 deliberately exports no future runtime API.
root.startNetwork();
