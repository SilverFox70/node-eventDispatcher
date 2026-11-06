import { execFileSync } from 'node:child_process';
import { copyFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const directory = new URL('./dist/', import.meta.url);
rmSync(directory, { recursive: true, force: true });
execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', process.argv[2] ?? 'tsconfig.json'], { stdio: 'inherit' });
copyFileSync(new URL('./src/styles.css', import.meta.url), new URL('styles.css', directory));
