# Migração de design

Uma linha por fase da quitação da dívida de design (regras em `.claude/hooks/design/design-rules.mjs`,
skills `design-system` e `ui-standards`). A baseline só diminui.

| Fase | PR | Baseline antes → depois | Pendências |
|---|---|---|---|
| 1 — hooks e pastas de lib (`hook-location`, `lib-folder`) | [#23](https://github.com/vinicius-gpl/acerola-ticket/pull/23) | 690 → 682 | nenhuma |
| 2 — componentes de feature na rota (`feature-component-in-lib`) | [#24](https://github.com/vinicius-gpl/acerola-ticket/pull/24) | 682 → 612 | teste intermitente `masks the WhatsApp number` em `acerola-open-ticket-form` (já existia) |
| 3 — prefixo nos genéricos (`component-prefix`, `component-siblings`) | [#25](https://github.com/vinicius-gpl/acerola-ticket/pull/25) | 612 → 566 | nenhuma |
| 4 — tokens (`raw-palette`, `arbitrary-font-size`, `radius-by-role`, `shadow-scale`) | [#26](https://github.com/vinicius-gpl/acerola-ticket/pull/26) | 566 → 11 | subtítulo do cabeçalho do painel do agent segue em `text-[11px]` (em 12px quebra a linha em 1100px); prints feitos pelo Storybook, não pelo `npm run dev` (máquina sem `.env`) |
| 5 — rota só compõe (`route-markup`, `route-height`) | [#27](https://github.com/vinicius-gpl/acerola-ticket/pull/27) | 11 → 7 | bateria completa e prints não foram refeitos nesta fase (só os testes dos componentes novos e o typecheck do agent) |
