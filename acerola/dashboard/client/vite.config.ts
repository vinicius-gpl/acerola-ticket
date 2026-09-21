import { fileURLToPath } from 'node:url';

import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';

/**
 * Em desenvolvimento a web fala com `/api` no MESMO host, e o Vite encaminha para o Nest.
 *
 * Isso vale mais do que economizar uma variável: sem proxy, o navegador faz requisição
 * entre origens diferentes, e aí toda falha de CORS chega à tela como "erro de rede" — a
 * mesma mensagem genérica de quando a API está fora do ar. Com o proxy, erro de rede em
 * desenvolvimento é erro de rede de verdade.
 *
 * Em produção não há proxy: a API e o client saem da MESMA imagem, na mesma porta.
 */
const SHARED_SRC = fileURLToPath(new URL('../shared/src', import.meta.url));
const CLIENT_DIR = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, CLIENT_DIR, '');
  const apiPort = env.VITE_API_PORT || '3333';

  return {
    plugins: [
      tailwindcss(),
      sveltekit(),
    ],
    resolve: {
      alias: {
        'lucide-svelte': '@lucide/svelte',
        '@template/shared': SHARED_SRC,
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
    preview: { port: 5174, strictPort: true },
    build: { outDir: 'dist', sourcemap: true },
  };
});
