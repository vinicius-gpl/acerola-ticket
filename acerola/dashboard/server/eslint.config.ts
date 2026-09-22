import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * As regras do CONTRIBUTING que são verificáveis por máquina, mais as que valem só para o
 * backend: controller não fala com repository, só o `DbModule` abre o banco, e barril é
 * proibido.
 */
const NO_BARREL_PATTERN = {
  group: ['**/index', '**/index.ts'],
  message: 'Barril é proibido: importe o arquivo, não a pasta.',
};

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'reports/**', 'drizzle/**', 'data/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // Seção 2 — early return, nunca if/else alinhado.
      'no-else-return': ['error', { allowElseIf: false }],
      complexity: ['error', 10],
      'max-depth': ['error', 2],

      /* Catch vazio é o que transforma a recusa do banco em "não está salvando", sem nada
         para investigar. Erro do banco não vira 200 (seção 8). */
      'no-empty': ['error', { allowEmptyCatch: false }],

      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportDefaultDeclaration',
          message: 'Export nomeado sempre. `export default` só onde o framework exige.',
        },
      ],

      /* Barril esconde de onde o código vem, e é assim que um projeto chega ao estado em que
         tudo alcança tudo. Import aponta para o arquivo. */
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: '.', message: 'Barril é proibido: importe o arquivo, não a pasta.' },
            { name: '..', message: 'Barril é proibido: importe o arquivo, não a pasta.' },
          ],
          patterns: [
            {
              group: ['**/index', '**/index.ts', '**/index.js'],
              message: 'Barril é proibido: importe o arquivo, não a pasta.',
            },
          ],
        },
      ],

      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': 'error',
    },
  },
  {
    /* Só o `DbModule` abre o banco. Uma segunda conexão aberta em outro lugar não passa
       pelas migrations nem pelos PRAGMAs de lá — e é assim que uma chave estrangeira deixa
       de ser verificada sem ninguém perceber. */
    files: ['src/**/*.ts'],
    ignores: ['src/lib/db/**', 'src/**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'postgres',
              message: 'A conexão vem do DbModule, injetada pelo token DB.',
            },
          ],
          patterns: [NO_BARREL_PATTERN],
        },
      ],
    },
  },
  {
    /* Seção 8 — um caminho de escrita por dado. Toda escrita de uma entidade passa
       pelo service dela: controller não fala com repository, repository não tem regra. */
    files: ['src/modules/**/*.controller.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/*.repository', '**/*.repository.ts'],
              message: 'Controller fala com o service. O repository é do service.',
            },
            NO_BARREL_PATTERN,
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.test.ts', '**/*.e2e.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },
  {
    files: ['*.config.ts'],
    languageOptions: { parserOptions: { projectService: false } },
    rules: { 'no-restricted-syntax': 'off', '@typescript-eslint/no-floating-promises': 'off' },
  },
);
