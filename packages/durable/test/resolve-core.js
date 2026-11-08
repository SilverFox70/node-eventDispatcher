import { registerHooks } from 'node:module';
import { URL } from 'node:url';

const entries = new Map([
  ['event-driven-design', 'index.js'],
  ['event-driven-design/model', 'model/index.js'],
  ['event-driven-design/testing', 'testing/index.js'],
  ['event-driven-design/task-profile', 'runtime/task-profile.js'],

]);
registerHooks({
  resolve(specifier, context, next) {
    const entry = entries.get(specifier);
    if (entry) return next(new URL('../../../dist/esm/' + entry, import.meta.url).href, context);
    return next(specifier, context);
  },
});
