import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const typeScriptFiles = [
  'src/**/*.ts',
  'test/types/**/*.ts',
  'test/types/**/*.mts',
  'test/types/**/*.cts',
  'templates/node/**/*.ts'
];

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**'] },
  {
    ...js.configs.recommended,
    files: ['scripts/**/*.mjs', 'test/**/*.js', 'examples/**/*.cjs', 'benchmark/**/*.cjs', 'test/node-template-fixture.cjs'],
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
