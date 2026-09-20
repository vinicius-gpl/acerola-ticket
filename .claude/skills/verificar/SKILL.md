---
name: verificar
description: Confere se o trabalho está pronto para entregar pelo Definition of Done — lint, typecheck, testes de unidade, E2E da API, build, stories dos componentes novos, idioma, segredos e dados reais. Use antes de terminar uma feature, antes de abrir PR, quando a pessoa pergunta "está pronto?", "funciona?", ou depois de qualquer mudança grande.
---

# Verificar

Rode tudo em `acerola/dashboard/`. Pare no primeiro vermelho, corrija, e rode de novo desde aquele passo.
**Não diga que está pronto sem ter visto cada passo passar.**

## 1. Máquina

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e -w server
npm run build
```

O que costuma quebrar e como resolver:

| Erro | Causa comum | Correção |
|---|---|---|
| `complexity ... Maximum allowed is 10` | muitos `??`/`?:` numa função | extraia `resolve*`/`build*` ou um subcomponente |
| `no-else-return` / `max-depth` | `if/else` alinhado | early return |
| `useQuery ... é do view-model` | hook de dado em `lib/ui` | mover para o view-model, passar por props |
| `Componente baixado só é importado de dentro de lib/ui` | import de `vendor` fora de `lib/ui` | usar/criar primitivo |
| `Barril é proibido` | import de pasta/`index` | importar o arquivo |
| `Controller fala com o service` | controller importando repository | passar pelo service |
| Teste de migration falhando (`open-database.util.test`) | migration não gerada ou quebrada | `banco-de-dados` |
| `Cannot find module '@template/shared/...'` no server | shared não compilado | `npm run build -w @template/shared` |

**Nunca "resolva" desligando a regra**, com `eslint-disable`, `@ts-ignore`, `any` ou apagando
teste. Se o erro não é do código da feature (ou só some mexendo em configuração protegida),
é caso de **`suporte`**.

## 2. Olho (o que máquina nenhuma confere)

Revise o `git diff` do trabalho:

- [ ] **Componente novo/alterado em `lib/ui/` tem `.stories.tsx`** com estados e caso limite.
- [ ] **Lógica nova tem teste feliz e triste**; escalada de privilégio (viewer escrevendo,
      autoria no corpo) testada quando mexeu em permissão.
- [ ] **Idioma:** nenhum texto em inglês que aparece na tela (rótulo, botão, erro, mensagem de
      Zod, `aria-label`); nenhum português em log, `throw new Error` interno, `describe`/`it`.
- [ ] **Endpoint novo** com `@ApiOperation` e tipo de resposta.
- [ ] **Tabela mudou** → migration gerada e commitada junto; seed atualizado.
- [ ] **Props** em `data`/`ui`/`state`/`actions`; nada em `lib/vendor/` editado.
- [ ] **Nenhum segredo** (`.env`, chave, token) e **nenhum dado real** de pessoa/cliente em
      código, seed, story ou teste.
- [ ] Variável de ambiente nova → `.env.example` atualizado.
- [ ] `npm audit` sem alto/crítico novo (se instalou dependência).

## 3. Ver funcionando (quando mudou tela ou API)

```bash
npm run seed:all
npm run dev      # em segundo plano
```

Abra http://localhost:5173 e faça o fluxo principal da mudança, incluindo **um erro** (campo
vazio, ação sem permissão). Confira o console do navegador sem erro.

## 4. Relatório

Para a pessoa, em português simples: o que foi conferido, o que passou, o que **não** foi
possível conferir e por quê. Nunca "está tudo certo" se algum passo foi pulado.
