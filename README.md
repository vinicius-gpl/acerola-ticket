# Template de MVP

Um ponto de partida para construir um **MVP** — a primeira versão de um sistema, para validar
uma ideia com gente de verdade usando — num padrão consistente de código.

Foi feito para ser usado **com o Claude Code no VS Code**. Você descreve o que o sistema
precisa fazer, em português; o Claude constrói seguindo as regras deste repositório. As regras
não dependem de você decorar nada: elas estão escritas para o Claude (`CLAUDE.md`), viram
passo a passo nas skills (`.claude/skills/`) e são conferidas por máquina (lint, testes,
commit).

O template já vem com uma funcionalidade de exemplo — **Tarefas** — funcionando de ponta a
ponta: banco, API, tela, testes e dados de teste. Ela é o molde para as próximas. Quando não
servir mais, peça ao Claude: *"remove o exemplo de tarefas"*.

---

## O que você precisa ter instalado

| Ferramenta | Versão | Para quê |
|---|---|---|
| **Node.js** | **24 LTS** (não 25) | Roda o sistema |
| **Git** | qualquer recente | Guarda o histórico das mudanças |
| **VS Code** | qualquer recente | Onde você trabalha |
| **Claude Code** (extensão do VS Code) | — | Quem constrói com você |
| **Tower** | qualquer recente | Ver o histórico e as branches (Git-Flow) — opcional |
| **Python** | 3.12 | Usado por algumas ferramentas do Claude |

Não precisa instalar banco de dados: o **SQLite** é um arquivo, e vem junto.

Para conferir, abra o terminal do VS Code (`Ctrl+'`) e rode:

```bash
node -v    # precisa começar com v24
git --version
```

---

## Criando um MVP a partir deste template

1. No GitHub, abra este repositório e clique em **Use this template → Create a new repository**.
2. Dê o nome do seu MVP e crie.
3. Clone o repositório novo e abra a pasta no VS Code.
4. Abra o Claude Code e digite: **`/comecar`**

A skill `comecar` instala tudo, sobe o sistema, grava os dados de teste e abre no navegador.
Em seguida, peça **`/renomear-projeto`** para o nome do seu MVP aparecer nas telas.

<details>
<summary>Prefere fazer à mão? São quatro comandos.</summary>

```bash
cd template            # o sistema fica uma pasta abaixo da raiz
npm install            # baixa as dependências (demora alguns minutos na primeira vez)
npm run seed:all       # cria o banco e grava os dados de teste
npm run dev            # sobe o sistema
```

Abra **http://localhost:5173**. A documentação da API fica em **http://localhost:3333/docs**.

</details>

---

## Como pedir as coisas ao Claude

Fale do **resultado**, não do código:

> *"Quero cadastrar clientes com nome, telefone e cidade, e ver a lista filtrando por cidade."*

> *"Na tela de clientes, quero um botão para exportar a lista."*

> *"Preciso de dados de teste com uns 20 clientes de cidades diferentes."*

> *"Deu esse erro quando cliquei em salvar: (cole o erro aqui)"*

### As skills

Skills são receitas prontas. O Claude usa sozinho quando o pedido combina, e você também pode
chamar pelo nome, com `/`:

| Skill | Para quê |
|---|---|
| `/comecar` | Primeiro uso: instala, sobe o sistema e explica o que tem aqui |
| `/renomear-projeto` | Coloca o nome do seu MVP no título das telas e no README |
| `/nova-feature` | Uma funcionalidade inteira: banco, API, tela, testes e seed |
| `/componente-ui` | Um componente de tela novo, com story e teste |
| `/ui-padrao` | As regras de visual e de texto — cores, estados, botões, mensagens |
| `/banco-de-dados` | Criar ou mudar tabela, gerar migration, recriar o banco |
| `/dados-de-teste` | Criar ou mudar os dados de teste (seeds) |
| `/git-commit` | Salvar o trabalho no histórico, no formato certo |
| `/git-fluxo` | O ciclo de toda mudança: branch de feature → trabalho → seu OK → develop |
| `/resolver-conflito` | Explica e resolve conflito pela tela afetada, com quem mudou e quando |
| `/verificar` | Conferir se está tudo pronto para entregar (lint, testes, build) |
| `/remover-exemplo` | Tirar a feature de exemplo de Tarefas |
| `/socorro` | Os problemas mais comuns e como resolver |
| `/limites-do-mvp` | O que o MVP não faz (login, dados em outro PC) e a quem pedir |
| `/suporte` | Erro grande: para, guarda o trabalho e prepara o relatório para o suporte |

---

## Estrutura

A raiz do repositório só guarda documentação e configuração de equipe. O sistema inteiro vive
em `template/`.

```
template/                              # raiz do repositório git
├── README.md · CONTRIBUTING.md        # para pessoas
├── CLAUDE.md                          # para o Claude
├── .claude/skills/                    # as receitas do Claude
├── .github/                           # CI e modelo de PR
├── .vscode/                           # configuração e extensões recomendadas
│
└── template/                          # o sistema — "npm install" roda aqui
    ├── package.json                   # workspaces: shared, server, client
    │
    ├── shared/                        # @template/shared — o CONTRATO entre API e tela
    │   └── src/
    │       ├── domain/                # regra de negócio pura (testável sem nada)
    │       └── schemas/               # schemas Zod: validação na API e no formulário
    │
    ├── server/                        # API NestJS
    │   ├── drizzle/                   # migrations versionadas (geradas)
    │   ├── data/                      # o arquivo SQLite (NÃO versionado)
    │   ├── test/                      # E2E da API
    │   └── src/
    │       ├── modules/<feature>/     # controller/ service/ repository/ mapper/ dto/
    │       └── lib/
    │           ├── auth/              # identidade (mock) + guard de papel
    │           ├── config/            # variáveis de ambiente (Zod)
    │           ├── db/                # SQLite, tabelas Drizzle, tradução de erro
    │           ├── http/              # formato único de erro
    │           └── policy/            # quem pode o quê
    │
    ├── client/                        # tela React
    │   ├── e2e/                       # E2E da web (Playwright)
    │   └── src/
    │       ├── routes/                # uma pasta por tela — só composição
    │       └── lib/
    │           ├── vendor/ui/         # ⛔ componentes baixados do shadcn — não se edita
    │           ├── ui/primitives/     # nossos componentes indivisíveis
    │           ├── ui/composers/      # nossos componentes compostos (telas)
    │           ├── ui/navigation.ts   # o menu lateral
    │           ├── view-models/       # estado e dados de cada tela — zero JSX
    │           ├── api/               # chamadas à API
    │           ├── theme/tokens.css   # cores e tipografia da marca
    │           └── brand/             # nome do projeto na barra lateral
    │
    ├── scripts/seed/<entidade>/       # dados de teste versionados
    └── docker/                        # uma imagem: API + tela na mesma porta
```

---

## Stack

| Camada | Escolha |
|---|---|
| **Backend** | NestJS 11 + Swagger (`nestjs-zod`) |
| **Banco** | **SQLite** via **Drizzle ORM** (`better-sqlite3`) |
| **Frontend** | React 19 + Vite + TypeScript |
| **Rotas / Dados / Formulários** | TanStack Router · Query · Form |
| **Validação** | Zod — o mesmo schema na API e na tela |
| **UI** | shadcn/ui + Tailwind v4 · ícones Lucide · animação GSAP |
| **Documentação de UI** | Storybook |
| **Testes** | Vitest · Testing Library · Supertest · Playwright · Stryker |
| **Qualidade** | ESLint + Prettier · commitlint + husky |

### Por que SQLite

Um MVP precisa rodar na máquina de quem está validando a ideia, **sem instalar nem configurar
um servidor de banco**. O SQLite é um arquivo: `npm run dev` e está no ar. As tabelas são
criadas sozinhas quando o sistema sobe, e `npm run db:reset` recomeça do zero.

O Drizzle mantém a porta aberta: as tabelas são TypeScript e as regras moram no código, então
trocar para Postgres quando o MVP virar produto é trocar o dialeto e regenerar as migrations —
não reescrever o sistema.

---

## Comandos

Todos rodam dentro de `template/`:

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe API (:3333) e tela (:5173), recarregando a cada mudança |
| `npm run seed:all` | Grava os dados de teste (pode rodar quantas vezes quiser) |
| `npm run db:reset` | **Apaga** o banco e recria com os dados de teste |
| `npm run db:generate` | Gera a migration depois de mudar uma tabela |
| `npm run db:studio` | Abre o Drizzle Studio para olhar o banco |
| `npm test` | Testes de unidade e de componente |
| `npm run test:e2e` | E2E da API e da tela (a tela pede `npx playwright install chromium` uma vez) |
| `npm run test:mutation` | Stryker — lento de propósito |
| `npm run lint` / `npm run format` | ESLint / Prettier |
| `npm run typecheck` | Confere os tipos do TypeScript |
| `npm run build` | Build de produção |
| `npm run storybook` | Catálogo de componentes em :6006 |

### Docker

```bash
cd template
docker compose -f docker/compose.yml up --build
```

Uma imagem só: o Nest serve `/api` **e** a tela na porta 3333. O arquivo do SQLite fica num
volume — sem ele, cada `up --build` apagaria os dados.

---

## O que o MVP não faz

- **Login, usuários e senhas.** O acesso é feito pelo **auth-forward**, gerenciado pelo
  suporte. O MVP não tem tela de login e não terá — todo mundo aparece como "Usuário de
  desenvolvimento". Se o seu MVP precisa de algo sobre quem pode ver ou fazer o quê, fale com o
  suporte.
- **Os mesmos dados em vários computadores.** O banco é um arquivo **no seu computador**. O
  que você cadastra não aparece para outra pessoa. O que todos compartilham é o código e os
  dados de teste. Servidor e dados compartilhados são com o suporte.
- **Consertar a estrutura.** Se algo grande quebrar (não instala, não abre, o banco não carrega),
  o Claude para, guarda o seu trabalho e prepara um relatório para o suporte.

O contato do suporte está em **[`SUPORTE.md`](./SUPORTE.md)**.

### Como a identidade funciona (para quem administra)

Toda requisição entra como uma pessoa fixa de desenvolvimento, com papel `admin`
(`server/src/lib/auth/identity.provider.ts`). Em produção, o auth-forward injeta
`x-forwarded-user-{id,email,name,role}`. Os papéis são `admin`, `editor` e `viewer`, e as
permissões moram em `server/src/lib/policy/`.

**Antes de publicar um MVP:** colocá-lo atrás do auth-forward, remover o `MOCK_IDENTITY`,
garantir que o container só é alcançável pelo proxy e trocar os dados de teste por dados reais
fora do git.

---

## Variáveis de ambiente

Nada é obrigatório para rodar na sua máquina: todo valor tem padrão. Os exemplos ficam em
`server/.env.example` e `client/.env.example` — copie para `.env` só quando precisar trocar
algo.

> **Segredo nunca em variável `VITE_`.** Tudo que tem esse prefixo vai para o navegador e é
> público. Chave de API, senha, token: só no `server/.env`.

---

## Versões

Node na linha **LTS, com a faixa fechada** — `>=24.0.0 <25.0.0`. As travas (ESLint 9,
TypeScript 5, NestJS 11) e o motivo de cada uma estão na
[seção 13 do CONTRIBUTING](CONTRIBUTING.md#13-versões--só-o-que-ainda-tem-suporte).

---

## Fluxo de trabalho

O fluxo é o **Git-Flow do Tower**. O `npm install` já configura o Git-Flow no repositório, e o
Tower abre com tudo inicializado.

**Como é na prática — você não precisa fazer nada disso à mão:**

1. Você pede uma mudança ao Claude.
2. Ele cria uma branch `feature/…` a partir da `develop` e trabalha nela. A versão principal
   não é afetada.
3. Quando termina, ele traz as novidades da `develop`, confere tudo, sobe o sistema e mostra
   como testar.
4. Ele pergunta: **"Está funcionando do jeito que você queria?"**
5. **Só com o seu OK** ele junta na `develop` (`merge --no-ff`) e envia para o GitHub.

Se duas pessoas mexeram na mesma parte, o Claude explica o conflito pela tela, por exemplo:
*"na tela Clientes, dia 14/09, a Ana mudou o botão de cadastro; nesta mudança, colocamos o
filtro por cidade no mesmo lugar"*. Ele mantém as duas mudanças quando dá, e pergunta quando
não dá.

**A `main` é de quem administra o projeto.** O git recusa commit, merge e envio para ela em
qualquer outra máquina, com uma mensagem em português dizendo o que fazer.

**Commits: `[tipo](local): Mensagem`**, verificados no hook de `commit-msg`. Os detalhes estão
no [`CONTRIBUTING.md`](./CONTRIBUTING.md), seções 11 e 12.

---

## Para quem administra

**Preencha o [`SUPORTE.md`](./SUPORTE.md)** com o seu nome e canal de contato: o Claude usa esse
arquivo sempre que encaminha alguém ao suporte.

Uma vez, na **sua** máquina, para poder mexer na `main`, nos arquivos de login/auth-forward e na
estrutura do projeto:

```bash
git config project.admin true
```

A chave fica só no `.git/config` do seu clone — não é versionada e não libera mais ninguém.
Ela libera as duas travas: o hook do git e o hook do Claude Code.

As listas do que é protegido ficam em `template/scripts/git/protected-*.txt` (§17 do
CONTRIBUTING).

No GitHub, proteja a `main` (o hook local não pega merge *fast-forward*, e quem tem o clone
pode desligar hooks): **Settings → Branches → Add branch ruleset** para `main`, com
*Restrict updates* e *Require a pull request before merging*, liberando só você. Marque também
o repositório como **Template repository** (Settings → General).

Versões: a partir da `develop`, pelo Git-Flow do Tower (*Start Release* / *Finish Release*),
com tag `v<versão>`.
