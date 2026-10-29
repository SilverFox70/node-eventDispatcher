#!/usr/bin/env node
/** Offline integrity check for repository guidance; not a behavioral/runtime gate. */
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--root')) {
  process.stderr.write('Usage: node scripts/check-agent-guidance.mjs [--root DIRECTORY]\n');
  process.exit(2);
}
const root = path.resolve(args[1] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const failures = [];
const problem = (message) => failures.push(message);
const relative = (file) => path.relative(root, file).split(path.sep).join('/');
async function exists(file) {
  try { await stat(file); return true; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}
async function markdownFiles(dir) {
  if (!(await exists(dir))) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return markdownFiles(file);
    return entry.isFile() && entry.name.endsWith('.md') ? [file] : [];
  }));
  return nested.flat();
}
async function main() {
  const entrypoints = ['AGENTS.md', 'CLAUDE.md', 'docs/AGENT_FILES.md',
    'docs/DEVELOPMENT_GUIDELINES.md', 'docs/architecture/README.md',
    'docs/runbooks/README.md'];
  for (const file of entrypoints) {
    if (!(await exists(path.join(root, file)))) problem(`Missing entry point: ${file}`);
  }
  const directories = ['docs/agent-rules', 'docs/architecture', 'docs/runbooks',
    'docs/cursor_plans', '.agents/skills'];
  const files = new Set(entrypoints.filter((f) => f.endsWith('.md')).map((f) => path.join(root, f)));
  if (await exists(path.join(root, 'README.md'))) files.add(path.join(root, 'README.md'));
  for (const dir of directories) {
    for (const file of await markdownFiles(path.join(root, dir))) files.add(file);
  }
  let checkedLinks = 0;
  for (const file of [...files].sort()) {
    if (!(await exists(file))) continue;
    const source = (await readFile(file, 'utf8')).replace(/```[\s\S]*?```/g, '');
    for (const match of source.matchAll(/!?\[[^\]]*\]\(([^)\n]+)\)/g)) {
      let target = match[1].trim();
      if (target.startsWith('<')) target = target.slice(1, target.indexOf('>'));
      else target = target.split(/\s+"/)[0];
      if (!target || target.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('//')) continue;
      let destination;
      try { destination = decodeURIComponent(target.split('#')[0]); }
      catch { problem(`${relative(file)}: malformed local link ${target}`); continue; }
      checkedLinks++;
      if (!(await exists(path.resolve(path.dirname(file), destination)))) {
        problem(`${relative(file)}: broken local link ${target}`);
      }
    }
  }

  const dir = path.join(root, 'docs/cursor_plans/fbp-slices');
  const manifestFile = path.join(dir, 'manifest.json');
  if (!(await exists(manifestFile))) problem('Missing slice manifest');
  else {
    const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
    const slices = manifest.slices;
    if (!Array.isArray(slices) || !slices.length) throw new Error('Slice manifest must have a nonempty slices array');
    const index = await readFile(path.join(dir, 'INDEX.md'), 'utf8');
    const ids = new Set();
    const branches = new Set();
    const master = await readFile(path.join(root, 'docs/cursor_plans/fbp-foundation-plan.md'), 'utf8');
    const conditions = new Set([...master.matchAll(/^\| (C\d+) \|/gm)].map((m) => m[1]));
    const referenced = new Set();
    for (let i = 0; i < slices.length; i++) {
      const slice = slices[i];
      if (ids.has(slice.id)) problem(`Duplicate slice ID: ${slice.id}`);
      ids.add(slice.id);
      if (branches.has(slice.branch)) problem(`Duplicate branch: ${slice.branch}`);
      branches.add(slice.branch);
      if (slice.order !== i || slice.id !== `S${String(i).padStart(2, '0')}`) problem(`Invalid slice order/ID: ${slice.id}`);
      if (slice.previous !== (slices[i - 1]?.id ?? null)) problem(`Wrong predecessor: ${slice.id}`);
      if (slice.next !== (slices[i + 1]?.id ?? null)) problem(`Wrong next slice: ${slice.id}`);
      if (!slice.branch?.startsWith('codex/')) problem(`Unexpected branch prefix: ${slice.id}`);
      if (slice.execution_status === 'merged' && !/^[a-f0-9]{7,40}$/i.test(slice.merge_sha ?? '')) problem(`Merged slice lacks commit receipt: ${slice.id}`);
      const planFile = path.join(dir, slice.plan);
      if (!(await exists(planFile))) { problem(`Missing slice plan: ${slice.plan}`); continue; }
      const plan = await readFile(planFile, 'utf8');
      if (!plan.includes(slice.branch)) problem(`Branch mismatch in ${slice.plan}`);
      if (!index.includes(slice.plan) || !index.includes(slice.branch)) problem(`Index missing slice plan/branch: ${slice.id}`);
      const tasks = [...plan.matchAll(/^### (S\d+\.[A-Z]) — /gm)].map((m) => m[1]);
      if (!tasks.length || new Set(tasks).size !== tasks.length || tasks.some((t) => !t.startsWith(`${slice.id}.`))) problem(`Invalid task IDs: ${slice.id}`);
      for (const condition of slice.conditions ?? []) {
        referenced.add(condition);
        if (!conditions.has(condition)) problem(`Unknown condition ${condition} in ${slice.id}`);
      }
    }
    const owners = manifest.condition_final_owners ?? {};
    for (const condition of conditions) {
      if (!referenced.has(condition)) problem(`No contributing slice for ${condition}`);
      if (!ids.has(owners[condition])) problem(`No valid final owner for ${condition}`);
    }
    for (const condition of Object.keys(owners)) {
      if (!conditions.has(condition)) problem(`Unknown condition owner entry: ${condition}`);
    }
    process.stdout.write(`Checked ${files.size} Markdown files, ${checkedLinks} local links, ${slices.length} slices and ${conditions.size} condition owners.\n`);
  }
  if (failures.length) {
    process.stderr.write(failures.map((f) => `ERROR: ${f}`).join('\n') + '\n');
    process.exitCode = 1;
  } else process.stdout.write('Agent guidance integrity: PASS (links/order only; no runtime or semantic verification claimed).\n');
}
main().catch((error) => {
  process.stderr.write(`ERROR: guidance check could not complete: ${error.message}\n`);
  process.exitCode = 1;
});
