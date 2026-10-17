# syntax=docker/dockerfile:1
# A imagem do bot de WhatsApp — separada da imagem do sistema DE PROPÓSITO.
#
# O Baileys depende de código GPL-3.0 (libsignal). Mantê-lo num programa e numa imagem à parte é
# o que deixa o resto do projeto MIT: a imagem do sistema (dockerfile) não leva nada daqui.
#
# O contexto do build é a pasta `bot/` (ver compose.yml).
FROM node:24-bookworm-slim AS build
WORKDIR /bot
COPY package.json package-lock.json .npmrc ./
RUN --mount=type=cache,id=acerola-npm,target=/root/.npm,sharing=locked npm ci --prefer-offline --ignore-scripts
COPY . .
RUN npm run build && npm prune --omit=dev --omit=peer --ignore-scripts

FROM node:24-bookworm-slim AS app
WORKDIR /bot
ENV NODE_ENV=production
COPY --from=build /bot/package.json package.json
COPY --from=build /bot/node_modules node_modules
COPY --from=build /bot/dist dist
# As conexões cifradas ficam num volume, e o processo não roda como root.
RUN mkdir /data && chown node:node /data
USER node
ENV BOT_DATA_DIR=/data
EXPOSE 4005
# Consulta HTTP interna; falhas e timeouts ficam no histórico de saúde do Docker.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "Promise.all(['http://127.0.0.1:' + (process.env.BOT_PORT || 4005) + '/health'].map(async (url) => { const response = await fetch(url, { signal: AbortSignal.timeout(3000), redirect: 'error' }); if (!response.ok) throw new Error(url + ': HTTP ' + response.status); })).then(() => process.exit(0)).catch((error) => { console.error(error.message); process.exit(1); })"

CMD ["node", "dist/main.js"]
