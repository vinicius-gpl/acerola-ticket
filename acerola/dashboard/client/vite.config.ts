import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
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
  /* A porta do Nest não é segredo e não é `VITE_`: ela serve só para montar o alvo do
     proxy. Deixá-la configurável evita editar este arquivo quando a 3333 está ocupada. */
  const apiPort = env.VITE_API_PORT || '3333';

  return {
    plugins: [
      /* Tailwind v4 entra como PLUGIN do Vite, e não como plugin do PostCSS: no v4 a
         configuração é o próprio CSS (`@theme` em `lib/theme/tokens.css`), e não existe
         mais `tailwind.config.ts`. */
      tailwindcss(),
      TanStackRouterVite({
        routesDirectory: 'src/routes',
        generatedRouteTree: 'src/routeTree.gen.ts',
      }),
      react(),
    ],
    resolve: {
      /* O client lê o `shared` pelo CÓDIGO-FONTE, não pelo `dist`. O `dist` é CommonJS
         porque o Nest precisa dele assim, e CommonJS dentro de um bundle de navegador vira
         interop frágil: o Rollup deixa de enxergar os exports nomeados e o build quebra com
         "não é exportado por" em um símbolo que existe. Pelo fonte, o HMR atravessa o pacote. */
      alias: {
        /* `fileURLToPath`, e não `URL.pathname`: no Windows o `pathname` devolve
           "/C:/Users/..." com barra na frente, e o caminho não resolve. O sintoma é uma
           tela preta, sem erro visível — o módulo simplesmente não carrega. */
        '@template/shared': SHARED_SRC,
        /* Só existe para o CLI do shadcn resolver import — ele gera código com "@/...".
           O resto do app continua com import relativo, que é a convenção daqui. */
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
