import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const typeScriptFiles = [
  'src/**/*.ts',
  'packages/editor/src/**/*.ts',
  'packages/editor/src/**/*.tsx',
  'packages/artifacts/src/**/*.ts',
  'packages/durable/src/**/*.ts',
  'test/types/**/*.ts',
  'test/types/**/*.mts',
  'test/types/**/*.cts',
  'templates/node/**/*.ts',
  'fixtures/next-consumer/app/**/*.ts',
  'fixtures/next-consumer/app/**/*.tsx',
  'fixtures/next-consumer/lib/**/*.ts'
];

export default tseslint.config(
  { ignores: ['dist/**', 'packages/editor/dist/**', 'packages/artifacts/dist/**', 'packages/durable/dist/**', 'coverage/**', 'fixtures/next-consumer/.next/**', 'fixtures/next-consumer/node_modules/**'] },
  {
    ...js.configs.recommended,
    files: ['packages/artifacts/test/**/*.js', 'packages/artifacts/test/**/*.cjs', 'packages/durable/test/**/*.js', 'packages/durable/test/**/*.cjs', 'scripts/**/*.mjs', 'test/**/*.js', 'examples/**/*.cjs', 'benchmark/**/*.cjs', 'test/node-template-fixture.cjs', 'test/package-fixture.cjs', 'test/next/**/*.cjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        require: 'readonly',
        __dirname: 'readonly'
      }
    }
  },
  ...tseslint.configs.recommended.map(config => ({
    ...config,
    files: typeScriptFiles
  })),
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'MetaProperty[meta.name="import"]',
          message: 'import.meta is incompatible with the CommonJS build.'
        },
        {
          selector: 'AwaitExpression:not(:function *)',
          message: 'Top-level await is incompatible with the CommonJS build.'
        }
      ]
    }
  }
);
