# acerola-ticket

MVP para validar uma ideia com gente de verdade usando, construído a partir de um template de código com padrão consistente.

Foi feito para ser usado **com o Claude Code no VS Code**. Você descreve o que o sistema precisa fazer, em português; o Claude constrói seguindo as regras deste repositório. As regras não dependem de você decorar nada: elas estão escritas para o Claude (`CLAUDE.md`), viram passo a passo nas skills (`.claude/skills/`) e são conferidas por máquina (lint, testes, commit).

O template já vem com uma funcionalidade de exemplo — **Tarefas** — funcionando de ponta a ponta: banco, API, tela, testes e dados de teste. Ela é o molde para as próximas. Quando não servir mais, peça ao Claude: **"remove o exemplo de tarefas"**.

---

## O que você precisa ter instalado

| Ferramenta                            | Versão              | Para quê                                            |
| ------------------------------------- | ------------------- | --------------------------------------------------- |
| **Node.js**                           | **24 LTS** (não 25) | Roda o sistema                                      |
| **Git**                               | qualquer recente    | Guarda o histórico das mudanças                     |
| **VS Code**                           | qualquer recente    | Onde você trabalha                                  |
| **Claude Code** (extensão do VS Code) | —                   | Quem constrói com você                              |
| **Tower**                             | qualquer recente    | Ver o histórico e as branches (Git-Flow) — opcional |
| **Python**                            | 3.12                | Usado por algumas ferramentas do Claude             |

O banco é **Postgres na Neon** (nuvem) — não precisa instalar nada localmente, mas precisa de
uma conta na Neon e de internet para rodar até em desenvolvimento. Veja "Variáveis de ambiente"
mais abaixo.

Para conferir, abra o terminal do VS Code (`Ctrl+'`) e rode:

```bash
node -v # precisa começar com v24
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
cd acerola/dashboard # o sistema fica uma pasta abaixo da raiz
npm install # baixa as dependências (demora alguns minutos na primeira vez)
npm run seed:all # cria o banco e grava os dados de teste
npm run dev # sobe o sistema
```

Abra **<http://localhost:5176>**. A documentação da API fica em **<http://localhost:3336/docs>**.

</details>

---

## Como pedir as coisas ao Claude

Fale do **resultado**, não do código:

> **"Quero cadastrar clientes com nome, telefone e cidade, e ver a lista filtrando por cidade."**

> **"Na tela de clientes, quero um botão para exportar a lista."**

> **"Preciso de dados de teste com uns 20 clientes de cidades diferentes."**

> **"Deu esse erro quando cliquei em salvar: (cole o erro aqui)"**

### As skills

Skills são receitas prontas. O Claude usa sozinho quando o pedido combina, e você também pode chamar pelo nome, com `/`:

| Skill                | Para quê                                                                  |
| -------------------- | ------------------------------------------------------------------------- |
| `/comecar`           | Primeiro uso: instala, sobe o sistema e explica o que tem aqui            |
| `/renomear-projeto`  | Coloca o nome do seu MVP no título das telas e no README                  |
| `/nova-feature`      | Uma funcionalidade inteira: banco, API, tela, testes e seed               |
| `/componente-ui`     | Um componente de tela novo, com story e teste                             |
| `/ui-padrao`         | As regras de visual e de texto — cores, estados, botões, mensagens        |
| `/banco-de-dados`    | Criar ou mudar tabela, gerar migration, recriar o banco                   |
| `/dados-de-teste`    | Criar ou mudar os dados de teste (seeds)                                  |
| `/git-commit`        | Salvar o trabalho no histórico, no formato certo                          |
| `/git-fluxo`         | O ciclo de toda mudança: branch de feature → trabalho → seu OK → develop  |
| `/resolver-conflito` | Explica e resolve conflito pela tela afetada, com quem mudou e quando     |
| `/verificar`         | Conferir se está tudo pronto para entregar (lint, testes, build)          |
| `/remover-exemplo`   | Tirar a feature de exemplo de Tarefas                                     |
| `/socorro`           | Os problemas mais comuns e como resolver                                  |
| `/limites-do-mvp`    | O que o MVP não faz e a quem pedir                                        |
| `/suporte`           | Erro grande: para, guarda o trabalho e prepara o relatório para o suporte |

---

## Estrutura

A raiz do repositório só guarda documentação e configuração de equipe. O sistema inteiro vive em `acerola/dashboard/`.

```text
acerola-ticket/                         # raiz do repositório git
├── README.md · CONTRIBUTING.md         # para pessoas
├── CLAUDE.md                           # para o Claude
├── .claude/skills/                     # as receitas do Claude
├── .github/                            # CI e modelo de PR
├── .vscode/                            # configuração e extensões recomendadas
│
└── acerola/
    └── dashboard/                      # o sistema — "npm install" roda aqui
        ├── package.json                # workspaces: shared, server, client
        │
        ├── shared/                     # @template/shared — o CONTRATO entre API e tela
        │   └── src/
        │       ├── domain/             # regra de negócio pura (testável sem nada)
        │       └── schemas/            # schemas Zod: validação na API e no formulário
        │
        ├── server/                     # API NestJS
        │   ├── drizzle/                # migrations versionadas (geradas)
        │   ├── test/                   # E2E da API
        │   └── src/
        │       ├── modules/<feature>/  # controller/ service/ repository/ mapper/ dto/
        │       └── lib/
        │           ├── auth/            # autenticação e identidade
        │           ├── config/          # variáveis de ambiente (Zod)
        │           ├── db/              # conexão Postgres (Neon), tabelas Drizzle
        │           ├── storage/         # arquivos no Cloudflare R2
        │           ├── http/            # formato único de erro
        │           └── policy/          # quem pode o quê
        │
        ├── client/                      # tela SvelteKit
        │   ├── e2e/                     # E2E da web (Playwright)
        │   └── src/
        │       ├── routes/              # uma pasta por tela — só composição
        │       └── lib/
        │           ├── components/ui/   # ⛔ componentes baixados do shadcn-svelte — não se edita
        │           ├── components/      # nossos componentes (um por pasta)
        │           ├── navigation/      # o menu lateral
        │           ├── hooks/           # estado e dados de cada tela — sem marcação
        │           ├── api/             # chamadas à API
        │           ├── theme/tokens.css # cores e tipografia da marca
        │           └── brand/            # nome do projeto na barra lateral
        │
        ├── scripts/seed/<entidade>/     # dados de teste versionados
        └── docker/                      # uma imagem: API + tela na mesma porta
```

---

## Stack

| Camada                          | Escolha                                                     |
| ------------------------------- | ----------------------------------------------------------- |
| **Backend**                     | NestJS 11 + Swagger (`nestjs-zod`)                          |
| **Banco**                       | **Postgres** na **Neon** via **Drizzle ORM**                |
| **Arquivos**                    | Cloudflare R2 (compatível com S3)                            |
| **Frontend**                    | SvelteKit (Svelte 5) + Vite + TypeScript                     |
| **Dados / Formulários**         | TanStack Query · Form (versões Svelte)                       |
| **Validação**                   | Zod — o mesmo schema na API e na tela                       |
| **UI**                          | shadcn-svelte + Tailwind v4 · ícones Lucide · animação GSAP |
| **Documentação de UI**          | Storybook                                                   |
| **Testes**                      | Vitest · Testing Library · Supertest · Playwright · Stryker |
| **Qualidade**                   | ESLint + Prettier · commitlint + husky                      |

### Por que Postgres na Neon

O Drizzle mantém as tabelas em TypeScript e as regras no código, então o banco cresce com o MVP
sem reescrever nada — só migrations novas. A Neon dá um Postgres de verdade desde o primeiro
dia (inclusive branches de banco para teste), ao custo de precisar de conta e internet mesmo em
desenvolvimento: sem `DATABASE_URL` no `.env`, o server recusa subir.

---

## Comandos

Todos rodam dentro de `acerola/dashboard/`:

| Comando                           | O que faz                                                                    |
| --------------------------------- | ---------------------------------------------------------------------------- |
| `npm run dev`                     | Sobe API (:3336) e tela (:5176), recarregando a cada mudança                 |
| `npm run seed:all`                | Grava os dados de teste (pode rodar quantas vezes quiser)                    |
| `npm run db:reset`                | **Apaga** os dados na Neon e recria com os dados de teste                    |
| `npm run db:generate`             | Gera a migration depois de mudar uma tabela                                  |
| `npm run db:studio`               | Abre o Drizzle Studio para olhar o banco                                     |
| `npm test`                        | Testes de unidade e de componente                                            |
| `npm run test:e2e`                | E2E da API e da tela (a tela pede `npx playwright install chromium` uma vez) |
| `npm run test:mutation`           | Stryker — lento de propósito                                                 |
| `npm run lint` / `npm run format` | ESLint / Prettier                                                            |
| `npm run typecheck`               | Confere os tipos do TypeScript                                               |
| `npm run build`                   | Build de produção                                                            |
| `npm run storybook`               | Catálogo de componentes em :6006                                             |

### Docker

```bash
cd acerola/dashboard
docker compose -f docker/compose.yml up --build
```

Uma imagem só: o Nest serve `/api` **e** a tela na mesma porta. O banco (Neon) e os arquivos
(R2) são remotos, então não há volume de dados — o container precisa só das variáveis do
`server/.env` (`DATABASE_URL`, `R2_*`) para subir.

---

## Autenticação e autorização

O MVP **pode ter login, usuários, sessões e permissões** quando a ideia exigir isso.

A autenticação identifica quem está fazendo a requisição. A autorização determina o que essa pessoa pode fazer.

O sistema pode utilizar autenticação própria, um provedor externo ou `auth-forward`, conforme a necessidade do projeto. Antes de criar ou alterar o mecanismo de autenticação, o Claude deve verificar o que já existe no projeto e evitar criar mecanismos concorrentes sem necessidade.

Quando houver autenticação, as responsabilidades são separadas:

* `AuthenticationMiddleware` resolve e valida a identidade da requisição.
* `RolesGuard` controla acesso às rotas conforme os papéis.
* `lib/policy` determina o que aquela identidade pode fazer sobre cada dado.
* Uma requisição sem identidade válida recebe `401`.
* Uma identidade autenticada sem permissão recebe `403`.
* A identidade usada para auditoria vem da autenticação, nunca de campos enviados livremente pelo cliente.

Login não concede autorização automaticamente. Mesmo autenticado, o usuário continua sujeito aos papéis e às policies.

Sessões não devem ser armazenadas em `localStorage`. Quando baseadas em cookie, devem usar as proteções adequadas ao ambiente, incluindo `HttpOnly`, `Secure` quando aplicável e `SameSite` compatível com o fluxo.

Senhas devem ser armazenadas somente por meio de mecanismo de hash apropriado. Nunca devem aparecer em texto puro em banco, logs, seeds, fixtures, respostas da API ou mensagens de erro.

Mudanças de autenticação devem possuir testes para login válido, credencial inválida, requisição sem autenticação, sessão inválida ou expirada, logout, usuário sem permissão, tentativa de escalada de privilégio e tentativa de substituir a identidade autenticada por dados enviados pelo cliente.

---

## O que o MVP não faz

* **Isolamento de dados não é automático.** O banco é o Postgres da Neon — compartilhado por
  natureza. Quem usa a mesma `DATABASE_URL` vê os mesmos dados. Para cada pessoa ter o próprio
  banco de trabalho, cada uma precisa da própria connection string (por exemplo, uma branch de
  banco na Neon), configurada no `server/.env` de cada máquina.

* **Infraestrutura de produção automaticamente.** O template fornece a aplicação e o suporte à autenticação, mas publicação, domínio, proxy, secrets e demais recursos de produção precisam ser configurados conforme o ambiente.

* **Consertar a estrutura sem aprovação.** Se algo grande quebrar (não instala, não abre, o banco não carrega), o Claude para, guarda o seu trabalho e prepara um relatório para você investigar com calma.

### Como a identidade funciona

A identidade depende da estratégia de autenticação configurada para o projeto.

Em desenvolvimento, o projeto pode utilizar uma identidade mock explicitamente configurada para testes. Em ambientes com autenticação própria, a identidade é resolvida pelo mecanismo de login e sessão. Em ambientes com `auth-forward`, a identidade pode ser fornecida pelo proxy autenticador.

Os papéis e permissões são definidos pelo projeto e ficam sob responsabilidade de `server/src/lib/policy/`.

**Antes de publicar um MVP:** utilizar um mecanismo de autenticação adequado ao ambiente, remover identidades mock quando não forem mais necessárias, garantir que o container só seja alcançável pela infraestrutura prevista e trocar dados de teste por dados reais fora do git.

---

## Variáveis de ambiente

Nada é obrigatório para rodar na sua máquina: todo valor tem padrão. Os exemplos ficam em `server/.env.example` e `client/.env.example` — copie para `.env` só quando precisar trocar algo.

> **Segredo nunca em variável `VITE_`.** Tudo que tem esse prefixo vai para o navegador e é público. Chave de API, senha, token: só no `server/.env`.

---

## Versões

Node na linha **LTS, com a faixa fechada** — `>=24.0.0 <25.0.0`. As travas (ESLint 9, TypeScript 5, NestJS 11) e o motivo de cada uma estão na [seção 13 do CONTRIBUTING](CONTRIBUTING.md#13-versões--só-o-que-ainda-tem-suporte).

---

## Fluxo de trabalho

O fluxo é o **Git-Flow do Tower**. O `npm install` já configura o Git-Flow no repositório, e o Tower abre com tudo inicializado.

**Como é na prática — você não precisa fazer nada disso à mão:**

1. Você pede uma mudança ao Claude.

2. Ele cria uma branch `feature/…` a partir da `develop` e trabalha nela. A versão principal não é afetada.

3. Quando termina, ele traz as novidades da `develop`, confere tudo, sobe o sistema e mostra como testar.

4. Ele pergunta: **"Está funcionando do jeito que você queria?"**

5. **Só com o seu OK** ele junta na `develop` (`merge --no-ff`) e envia para o GitHub.

Se duas pessoas mexeram na mesma parte, o Claude explica o conflito pela tela, por exemplo:

*"na tela Clientes, dia 14/09, a Ana mudou o botão de cadastro; nesta mudança, colocamos o filtro por cidade no mesmo lugar"*.

Ele mantém as duas mudanças quando dá, e pergunta quando não dá.

**A `main` é de quem administra o projeto.** O git recusa commit, merge e envio para ela em qualquer outra máquina, com uma mensagem em português dizendo o que fazer.

**Commits:** `[tipo](local): Mensagem`, verificados no hook de `commit-msg`. Os detalhes estão no [`CONTRIBUTING.md`](./CONTRIBUTING.md), seções 11 e 12.

---

## Para quem administra

Uma vez, na **sua** máquina, para poder mexer na `main` e na estrutura do projeto (regras de lint, hooks, CI, Docker…):

```bash
git config project.admin true
```

A chave fica só no `.git/config` do seu clone — não é versionada e não libera mais ninguém.

Ela libera as duas travas: o hook do git e o hook do Claude Code.

A lista do que é protegido fica em `acerola/dashboard/scripts/git/protected-structure.txt` (§17 do CONTRIBUTING). Login e autenticação não fazem mais parte dessa lista — ver CONTRIBUTING §17.

No GitHub, proteja a `main` (o hook local não pega merge **fast-forward**, e quem tem o clone pode desligar hooks): **Settings → Branches → Add branch ruleset** para `main`, com **Restrict updates** e **Require a pull request before merging**, liberando só você. Marque também o repositório como **Template repository** (Settings → General).

Versões: a partir da `develop`, pelo Git-Flow do Tower (**Start Release** / **Finish Release**), com tag `v<versão>`.
