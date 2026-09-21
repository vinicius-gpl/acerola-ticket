import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Além das regras gerais do CONTRIBUTING, aqui vivem as três separações que a seção 3 e a
 * seção 5 não negociam:
 *
 *  - componente baixado (`lib/components/ui`) nunca é importado fora de `lib/components`;
 *  - componente de UI nunca busca o próprio dado;
 *  - view-model nunca desenha.
 */
const DATA_HOOKS = ['createQuery', 'createMutation', 'createInfiniteQuery', 'createQueries'];

const NO_BARREL = {
  paths: [
    {
      name: '.',
      message: 'Barril é proibido: importe o arquivo, não a pasta.',
    },
    {
      name: '..',
      message: 'Barril é proibido: importe o arquivo, não a pasta.',
    },
  ],
  patterns: [
    {
      group: ['**/index', '**/index.ts'],
      message: 'Barril é proibido: importe o arquivo, não a pasta.',
    },
  ],
};

export default tseslint.config(
  {
    /* `lib/components/ui` é território do CLI (shadcn-svelte) — não editamos ali, então
       também não cobramos nosso lint de um arquivo que a CLI sobrescreve inteiro a cada
       `add`. É também o único lugar onde `index.ts` é permitido: a CLI só sabe gerar
       barril, e brigar com ela custaria a capacidade de atualizar componente. */
    ignores: [
      'dist/**',
      'coverage/**',
      'storybook-static/**',
      '.svelte-kit/**',
      'src/lib/components/ui/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelte.configs.recommended,
  {
    files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.svelte'],
      },
    },
  },
  {
    /* As rotas ainda são strings soltas (`/tasks`) — a rota tipada do SvelteKit, que esta
       regra cobra, chega junto com a conversão de `src/routes/` na próxima etapa. */
    files: ['**/*.svelte'],
    rules: { 'svelte/no-navigation-without-resolve': 'off' },
  },
  {
    files: ['src/**/*.{ts,tsx,svelte}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    rules: {
      // Seção 2 — early return, nunca if/else alinhado.
      'no-else-return': ['error', { allowElseIf: false }],
      complexity: ['error', 10],
      'max-depth': ['error', 2],
      'no-empty': ['error', { allowEmptyCatch: false }],

      'no-restricted-imports': [
        'error',
        {
          ...NO_BARREL,
          patterns: [
            ...NO_BARREL.patterns,
            {
              group: ['**/lib/components/ui/**'],
              message:
                'Componente baixado só é importado de dentro de `lib/components`. Envolva-o num componente nosso.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportDefaultDeclaration',
          message: 'Export nomeado sempre. `export default` só onde o framework exige.',
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
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    // `lib/components` é a fronteira: é o único lugar que pode encostar no baixado.
    files: ['src/lib/components/**/*.{ts,svelte}'],
    ignores: ['src/lib/components/ui/**'],
    rules: { 'no-restricted-imports': ['error', NO_BARREL] },
  },
  {
    /* Seção 3 — a view é função pura de props. Hook de dado aqui é o defeito que torna a
       tela impossível de atualizar por linha e impossível de testar sem subir rede. */
    files: ['src/lib/components/**/*.svelte'],
    ignores: ['src/lib/components/ui/**', 'src/lib/components/**/*.stories.svelte'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...DATA_HOOKS.map((hook) => ({
          selector: `CallExpression[callee.name='${hook}']`,
          message: `\`${hook}\` é do view-model. O componente de UI recebe data, state e actions por props.`,
        })),
        {
          selector: "CallExpression[callee.name='goto']",
          message: 'Navegação vem por `actions`, montada no view-model.',
        },
      ],
    },
  },
  {
    // Seção 3 — o hook é o oposto do componente: estado e dados, e zero template.
    files: ['src/lib/hooks/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportDefaultDeclaration',
          message: 'Export nomeado sempre.',
        },
      ],
    },
  },
  {
    // A rota só compõe; o Storybook e as configs exigem `export default`.
    files: [
      'src/routes/**/*.svelte',
      '**/*.stories.svelte',
      '**/*.stories.tsx',
      '.storybook/**/*.ts',
      '*.config.ts',
    ],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    files: ['**/*.test.{ts,tsx}'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
);
