/** Fixed manual address; tests retain their independent ephemeral loopback ports. */
export function demoOptions(args) {
  const serve = args.includes('--serve');
  let port = serve ? 54545 : 0;
  const rest = args.filter(arg => arg !== '--serve');
  if (rest.length) {
    if (!serve || rest.length !== 2 || rest[0] !== '--port' || !/^\d+$/.test(rest[1]) ||
      Number(rest[1]) < 1 || Number(rest[1]) > 65535) {
      throw Error('Usage: npm run demo:next -- --port <1..65535>');
    }
    port = Number(rest[1]);
  }
  return { serve, host: serve ? 'localhost' : '127.0.0.1', port };
}
