const { test } = require('node:test');
const assert = require('node:assert/strict');
const { cpSync, mkdirSync, writeFileSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const { installedPackage } = require('./package-fixture.cjs');

test('consumer recipe gives useful feedback: packed template, types, fake service and runtime refusal', () => {
  const c = installedPackage({ tools: true });
  try {
    const recipe = join(c.fixture, 'recipe'); mkdirSync(recipe);
    cpSync(join(c.installed, 'templates/node'), recipe, { recursive: true });
    writeFileSync(join(recipe, 'package.json'), '{"type":"module"}\n');
    const tsc = join(c.fixture, 'node_modules/typescript/bin/tsc');
    const args = [tsc, '--target', 'ES2022', '--module', 'NodeNext', '--strict', '--types', 'node',
      '--noUncheckedIndexedAccess', '--exactOptionalPropertyTypes', '--resolveJsonModule', '--noEmitOnError',
      '--outDir', 'dist', 'contract.ts', 'node.ts', 'node.test.ts'];
    c.run(process.execPath, args, recipe);
    const passed = c.run(process.execPath, ['--test', '--test-reporter=tap', '--test-timeout=5000', 'dist/node.test.js'], recipe);
    assert.match(passed, /tests 2/); assert.match(passed, /pass 2/);
    const source = join(recipe, 'node.ts'), original = readFileSync(source, 'utf8');
    assert(original.includes('label: profile.label'));
    writeFileSync(source, original.replace('label: profile.label', 'label: 42'));
    const typed = c.attempt(process.execPath, args, recipe);
    assert.equal(typed.status, 1); assert.match(typed.stdout, /TS2322/);
    writeFileSync(source, original); c.run(process.execPath, args, recipe);
    const js = join(recipe, 'dist/node.js'), compiled = readFileSync(js, 'utf8');
    assert(compiled.includes('label: profile.label'));
    writeFileSync(js, compiled.replace('label: profile.label', 'label: 42'));
    const bypass = c.run(process.execPath, ['--input-type=module', '-e', `
      import assert from 'node:assert/strict'; import { packet } from 'event-driven-design';
      import { runNode } from 'event-driven-design/testing'; import { makeLookupNode } from './dist/node.js';
      let calls=0; const node=makeLookupNode({lookup:async()=>{calls++;return {label:'Ada'};}});
      const result=await runNode(node,{inputs:{in:[packet({id:'x'})]}});
      assert.equal(calls,1); assert.equal(result.terminal.code,'OUTPUT_CONTRACT');
      assert.deepEqual(result.outputs.out,[]); console.log('JS bypass: OUTPUT_CONTRACT');
    `], recipe);
    assert.match(bypass, /OUTPUT_CONTRACT/);
  } finally { c.dispose(); }
});

test('agent recipe cannot bypass registry: installed metadata declares no executable capabilities', () => {
  const c = installedPackage();
  try {
    c.run(process.execPath, ['--input-type=module', '-e', `
      import assert from 'node:assert/strict'; import * as f from 'event-driven-design';
      let effects=0; const node=f.defineComponent({ ...f.map(f.jsonContract,f.jsonContract,v=>{effects++;return v;}),
        effects:['profile.read'],requiredDependencies:['lookup'] });
      const registry={'map@1':node}, catalog=f.describeRegistry(registry);
      assert.deepEqual(catalog.components[0].effects,['profile.read']);
      assert.deepEqual(catalog.components[0].requiredDependencies,['lookup']);
      assert.equal(catalog.components[0].in.in.representationId,'json@1');
      const serialized=JSON.stringify(catalog); assert(!serialized.includes('handler')); assert(!serialized.includes('create'));
      const g=f.createGraph(), n=g.add('n',node);g.exposeInput('in',n,'in');g.exposeOutput('out',n,'out');
      for(const component of ['missing@1','map@2']) {
        const spec=JSON.parse(JSON.stringify(g.toSpec()));spec.nodes[0].component=component;assert.equal(f.compileGraph(spec,registry).ok,false);
      }
      assert.equal(f.compileGraph(g.toSpec(),{}).ok,false);
      const model=await import('event-driven-design/model');
      const tampered=JSON.parse(serialized);tampered.components[0].in.in.representationId='custom@1';
      assert.equal(model.validateGraph(g.toSpec(),tampered).ok,false);assert.equal(effects,0);
    `]);
  } finally { c.dispose(); }
});
