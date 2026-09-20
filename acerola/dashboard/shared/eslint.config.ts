import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * As regras do CONTRIBUTING que são verificáveis por máquina. Elas não são
 * preferência de estilo: cada uma trava um defeito que já custou caro em outro projeto da casa.
 */
export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'reports/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
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

      // Catch vazio era o que transformava a recusa do servidor em "não está
      // salvando", sem nada para investigar.
      'no-empty': ['error', { allowEmptyCatch: false }],

      // Seção 10 — export nomeado sempre.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportDefaultDeclaration',
          message: 'Export nomeado sempre. `export default` só onde o framework exige.',
        },
      ],

      /* Arquivo de barril é proibido. Ele esconde de quem lê o import de onde o
         código vem, e é assim que um projeto chega a um estado em que
         "tudo alcança tudo": mexer num filtro quebrava uma busca. Import aponta
         para o arquivo, sempre. */
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
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': 'error',
    },
  },
  {
    files: ['**/*.test.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
  {
    files: ['*.config.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
);
