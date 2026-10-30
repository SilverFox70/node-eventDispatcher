import { rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

// Only generated distribution output is removed; source and local artifacts survive.
rmSync('dist', { recursive: true, force: true });
for (const [format, type] of [['esm', 'module'], ['cjs', 'commonjs']]) {
  execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', `tsconfig.${format}.json`], { stdio: 'inherit' });
  mkdirSync(`dist/${format}`, { recursive: true });
  writeFileSync(`dist/${format}/package.json`, JSON.stringify({ type }) + '\n');
}
