---
name: ui-standards
description: O padrão de UI/UX do projeto — tokens de cor, estrutura de toda tela, estados obrigatórios (carregando, erro, vazio, filtrado), texto de tela em português, botões, formulários, confirmação, acessibilidade e movimento. Consulte sempre que for desenhar ou revisar uma tela, escrever texto que aparece para o usuário ou quando a pessoa pedir algo "mais bonito" ou "mais claro".
---

# Padrão de UI/UX

Onde cada arquivo mora, prefixo `acerola-*` e o que a rota pode fazer: skill `design-system`.
Os nomes abaixo (`PageHeader`, `ErrorState`…) são os componentes `acerola-*` correspondentes
(`acerola-page-header`, `acerola-error-state`…).

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
- **Todo campo tem `h-10`** (input, select, input-group, date-picker, pastilhas, botão de
  enviar) — vem do componente `acerola-*`, nunca de classe na tela. Textarea usa `min-h-*`.
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
- **Tabela responsiva (tabela → cartão):** Até o tablet (`< xl`, 1280px) toda tabela densa vira cartão empilhado (`xl:hidden`, `data-slot="*-cards-mobile"`). As 2-3 informações cruciais ficam em destaque no topo (identificador, título, status com `StatusBadge` e responsável), o restante fica contextualizado no corpo com rótulo descritivo e as ações ficam acessíveis diretamente por toque. Só no computador (`hidden xl:block`, `data-slot="*-table-desktop"`) aparece a tabela completa, com `overflow-x-auto`.

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
`PageHeader` descem, grade de `StatCard` vira uma coluna, e tabelas de listas alternam de linhas
horizontais para cartões empilhados (`xl:hidden`).

São três faixas, e o tablet conta como celular:

| Largura | Barra lateral | Lista |
|---|---|---|
| até 1023px (celular e tablet em pé) | gaveta, por cima | cartão |
| 1024px a 1279px (tablet deitado) | fixa, 256px | cartão |
| 1280px ou mais (computador) | fixa, 256px | tabela |

**Nada rola para o lado, nunca.** Duas regras que sustentam isso:

- **Pastilha de escolha quebra linha, não vira tira rolante.** Grupo de opções (situação,
  urgência, categoria) usa `flex-wrap`; nunca `overflow-x-auto`. Esconder a última opção atrás
  de um arrastão lateral é esconder uma escolha — vale para a barra de filtro e para o
  formulário dentro do diálogo.
- **Quem rola é a caixa da tabela, não a página.** A área de conteúdo precisa de `min-w-0`
  (está no `SidebarInset` do `app-shell`) para encolher abaixo da largura natural da tabela.
  Sem isso o `overflow-x-auto` da tabela não serve para nada e a página inteira arrasta.
- **A barra lateral não pode comer a largura do tablet.** O ponto de corte entre gaveta e
  barra fixa é 1024px: vem do `sidebar` do shadcn (`lib/hooks/ui/`, do CLI); o resto da tela
  mede largura com `lib/hooks/use-media-query/` passando o breakpoint. Com ela fixa em 768px sobravam
  494px de conteúdo, e as regras de CSS continuavam medindo os 768px da janela — daí título
  espremido e tabela mostrando 3 das 8 colunas.

