---
name: ui-padrao
description: O padrão de UI/UX do projeto — tokens de cor, estrutura de toda tela, estados obrigatórios (carregando, erro, vazio, filtrado), texto de tela em português, botões, formulários, confirmação, acessibilidade e movimento. Consulte sempre que for desenhar ou revisar uma tela, escrever texto que aparece para o usuário ou quando a pessoa pedir algo "mais bonito" ou "mais claro".
---

# Padrão de UI/UX

O objetivo não é enfeitar: é que **todo MVP feito com este template pareça o mesmo sistema** e
que a pessoa nunca fique sem saber o que aconteceu.

## Marca e cores

Tudo vem de `client/src/lib/theme/tokens.css`. **Nunca escreva hex no componente.** As cores
de `--brand-*` são um ponto de partida neutro — trocar a marca de um MVP é trocar só esses
valores, nesse arquivo.

| Uso | Classe |
|---|---|
| Ação principal, menu | `bg-brand-blue-800` (hover `bg-brand-blue-900`) |
| Acento | `bg-brand-yellow-500` — com parcimônia |
| Texto principal / secundário / apagado | `text-ink-900` / `text-ink-700` / `text-ink-500` |
| Borda | `border-ink-300` ou `border-border` |
| Superfície de cartão | `bg-card` |
| Erro | `text-destructive`, `border-destructive`, `ErrorState` |
| Situação | via `StatusBadge` com tom do domínio: `neutral`, `info`, `success`, `warning`, `danger`, `brand` |

O nome do projeto (`BrandMark`) é só texto, na cor `text-sidebar-foreground`. Ícones:
**Lucide, sempre**; emoji não é ícone. Raios: `rounded-lg` em cartão e campo, `rounded-full`
em selo.

## Estrutura de toda tela

```
PageHeader (título h1 + uma linha do que é a tela + ações à direita)
Barra de filtros (busca + selects), quando é lista
Aviso de falha de ação (ErrorState inline), quando houver
Corpo
```

Largura: `mx-auto w-full max-w-5xl px-4 sm:px-6`. Espaço entre blocos: `gap-5`.
Uma ação principal por tela (azul). As outras são `secondary` ou `ghost`.

## O corpo, sempre nesta ordem (early return)

1. **Carregando** → esqueleto com a forma do conteúdo (`Skeleton`). Nunca "nenhum registro".
2. **Erro** → `ErrorState` com título ("A lista não carregou"), o motivo que veio da API e
   "Tentar de novo".
3. **Vazio de verdade** → `EmptyState` dizendo o que está vazio + o próximo passo + botão de
   criar.
4. **Filtro escondeu tudo** → `EmptyState` "Nenhum X encontrado" + "Limpar filtros".
5. **Conteúdo** → com contagem ("12 de 40 clientes") e aviso se a lista foi cortada.

## Texto de tela

- **Português do Brasil**, frase curta, sem jargão técnico. "Não consegui salvar" em vez de
  "Erro 500".
- **Botão diz o verbo**: "Criar cliente", "Salvar", "Excluir pedido". Nunca "OK", "Sim",
  "Enviar dados".
- **Erro diz o motivo e o que fazer**: "Informe o telefone", "Esse e-mail já está cadastrado.
  Abra o cadastro existente em vez de criar outro."
- **Vazio diz o próximo passo**: "Nenhum cliente ainda. Cadastre o primeiro para começar."
- Títulos em sentença ("Novo cliente"), não Title Case.
- Datas por `formatDate`/`formatDateTime` (`lib/utils/format-date.util.ts`) → `14/09/2026`.
- Números com `toLocaleString('pt-BR')`. Dinheiro com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.

## Formulário

- Em modal (`Dialog`) para cadastro curto; em tela própria se tiver mais de ~8 campos.
- Rótulo acima do campo, **erro colado embaixo do campo** (nunca só um resumo no topo).
- Erro aparece depois que a pessoa **sai do campo** ou **tenta enviar** — nunca na primeira letra.
- Enter envia (`<form onSubmit>`). O botão de enviar trava e diz "Salvando…".
- Recusa do servidor aparece **dentro** do formulário, que **continua aberto** com o que foi
  digitado.
- Primeiro campo com foco automático.

## Ações destrutivas

Excluir, arquivar, enviar sem volta → `ConfirmDialog` com título em pergunta ("Excluir este
cliente?"), descrição com o nome do registro e "Não dá para desfazer.", botão `danger` com o
verbo. Enquanto confirma, nada fecha.

## Listas

- Cartões empilhados (`TaskListView`) para até ~5 informações por item; tabela
  (`vendor/ui/table` envolvido num compositor) quando a pessoa compara colunas.
- Ações do item à direita, como ícone `ghost` com `aria-label` (o nome aparece na dica).
- Texto longo quebra linha (`break-words`), nunca empurra os botões.
- Item concluído/inativo: `text-ink-500`, sem sumir.

## Acessibilidade (não é opcional)

- Tudo operável no teclado; foco sempre visível (já vem do `tokens.css`).
- Campo com rótulo ligado; erro com `aria-invalid`/`aria-describedby`; falha com `role="alert"`.
- Botão só de ícone tem `aria-label`. Ícone decorativo tem `aria-hidden`.
- Contraste: texto sobre azul é branco; nunca `text-ink-500` sobre `bg-ink-100` em informação
  importante.

## Movimento

Só pelas funções de `lib/motion/motion.util.ts` (`fadeInUp`, `staggerIn`, `countTo`…): curtas
(< 350ms) e **desligadas** quando o sistema operacional pede menos movimento. Animação explica o
que mudou de lugar; não é enfeite.

## Responsivo

Tudo precisa funcionar em 400px de largura: filtros empilham (`flex-col sm:flex-row`), ações do
`PageHeader` descem, grade de `StatCard` vira uma coluna.
