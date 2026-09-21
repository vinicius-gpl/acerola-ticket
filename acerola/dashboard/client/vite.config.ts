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
  const apiPort = env.VITE_API_PORT || '3336';

  return {
    plugins: [tailwindcss(), sveltekit()],
    resolve: {
      alias: {
        'lucide-svelte': '@lucide/svelte',
        '@template/shared': SHARED_SRC,
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5176,
      /* Porta ocupada não derruba o Vite: ele procura a próxima livre e imprime qual pegou.
         Aqui isso é seguro, e na API não seria — ninguém aponta para a porta da TELA, então
         trocá-la não quebra nada; a tela é que aponta para a API (ver o proxy abaixo), e por
         isso o server avisa alto quando muda de porta. */
      strictPort: false,
      proxy: {
        '/api': {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
    preview: { port: 5177, strictPort: false },
    build: { outDir: 'dist', sourcemap: true },
  };
});
