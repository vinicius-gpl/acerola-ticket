# Migração de design

Uma linha por fase da quitação da dívida de design (regras em `.claude/hooks/design/design-rules.mjs`,
skills `design-system` e `ui-standards`). A baseline só diminui.

| Fase | PR | Baseline antes → depois | Pendências |
|---|---|---|---|
| 1 — hooks e pastas de lib (`hook-location`, `lib-folder`) | [#23](https://github.com/vinicius-gpl/acerola-ticket/pull/23) | 690 → 682 | nenhuma |
| 2 — componentes de feature na rota (`feature-component-in-lib`) | [#24](https://github.com/vinicius-gpl/acerola-ticket/pull/24) | 682 → 612 | teste intermitente `masks the WhatsApp number` em `acerola-open-ticket-form` (já existia) |
