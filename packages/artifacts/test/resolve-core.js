import { registerHooks } from 'node:module';
import { URL } from 'node:url';

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'event-driven-design/model') {
      return next(new URL('../../../dist/esm/model/index.js', import.meta.url).href, context);
    }
    return next(specifier, context);
  },
});
