import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Além das regras gerais do CONTRIBUTING, aqui vivem as três separações que a seção 3 e a
 * seção 5 não negociam:
 *
 *  - componente baixado nunca é importado fora de `lib/ui`;
 *  - componente de UI nunca busca o próprio dado;
 *  - view-model nunca desenha.
 */
const DATA_HOOKS = ['useQuery', 'useMutation', 'useInfiniteQuery', 'useSuspenseQuery'];

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
      group: ['**/index', '**/index.ts', '**/index.tsx'],
      message: 'Barril é proibido: importe o arquivo, não a pasta.',
    },
  ],
};

export default tseslint.config(
  {
    /* `lib/vendor` é território do CLI (shadcn) — a seção 5 do CONTRIBUTING proíbe
       editar ali, então também não cobramos nosso lint de um arquivo que a CLI sobrescreve
       inteiro a cada `add`. */
    ignores: [
      'dist/**',
      'coverage/**',
      'storybook-static/**',
      'src/routeTree.gen.ts',
      'src/lib/vendor/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,

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
              group: ['**/lib/vendor/**'],
              message:
                'Componente baixado só é importado de dentro de `lib/ui`. Envolva-o num primitivo nosso.',
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
    // `lib/ui` é a fronteira: é o único lugar que pode encostar no vendor.
    files: ['src/lib/ui/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', NO_BARREL] },
  },
  {
    /* Seção 3 — a view é função pura de props. Hook de dado aqui é o defeito que torna a
       tela impossível de atualizar por linha e impossível de testar sem subir rede. */
    files: ['src/lib/ui/**/*.tsx'],
    ignores: ['src/lib/ui/**/*.stories.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...DATA_HOOKS.map((hook) => ({
          selector: `CallExpression[callee.name='${hook}']`,
          message: `\`${hook}\` é do view-model. O componente de UI recebe data, state e actions por props.`,
        })),
        {
          selector: "CallExpression[callee.name='useNavigate']",
          message: 'Navegação vem por `actions`, montada no view-model.',
        },
        {
          selector: 'ExportDefaultDeclaration',
          message: 'Export nomeado sempre.',
        },
      ],
    },
  },
  {
    // Seção 3 — o view-model é o oposto: estado e dados, e zero JSX.
    files: ['src/lib/view-models/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXElement',
          message: 'View-model não desenha. Zero JSX.',
        },
        {
          selector: 'ExportDefaultDeclaration',
          message: 'Export nomeado sempre.',
        },
      ],
    },
  },
  {
    // A rota só compõe; o Storybook e as configs exigem `export default`.
    files: ['src/routes/**/*.tsx', '**/*.stories.tsx', '.storybook/**/*.ts', '*.config.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    files: ['**/*.test.{ts,tsx}'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
);
