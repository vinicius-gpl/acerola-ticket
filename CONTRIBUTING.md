# Contribuindo

Este documento não é sobre preferência de estilo. Cada regra aqui existe para evitar defeitos, regressões e decisões inconsistentes no sistema.

Quando a regra for verificável por máquina, ela é lint, teste ou gate de CI. Quando não for, ela é revisão de PR.

> **Trabalhando com o Claude?** Você não precisa decorar nada disto. O `CLAUDE.md` manda o Claude seguir este documento, e as skills em `.claude/skills/` fazem o passo a passo de cada tarefa comum. Este arquivo é a referência para quando alguém — pessoa ou Claude — tiver dúvida sobre o porquê.

---

## 0. A prioridade

**Código funcional vem primeiro.** Elegância que não roda vale zero. Se a escolha for entre entregar funcionando com uma abstração a menos e entregar bonito com um risco a mais, entrega funcionando.

Este é um template de **MVP**: o objetivo é validar uma ideia com gente de verdade usando. O padrão existe para que o MVP que der certo não precise ser jogado fora para virar produto.

---

## 1. Idioma

A régua é uma só: **o usuário vê, é português. O usuário não vê, é inglês.** Comentário é a única exceção — ele é português mesmo estando no código.

| O quê                                                                                  | Idioma                                                        |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Nome de variável, função, classe, tipo, arquivo, pasta, branch, tabela, coluna, rota   | **Inglês**                                                    |
| `console.log`, `Logger`, mensagem de log, nome de métrica                              | **Inglês**                                                    |
| `throw new Error(...)` interno, mensagem de exceção, texto de `assert`                 | **Inglês**                                                    |
| `describe` / `it` de teste, nome de story do Storybook                                 | **Inglês**                                                    |
| Comentário no código                                                                   | **Português (pt-BR)**                                         |
| Texto na tela: rótulo, título, botão, placeholder, `aria-label`, `title`, estado vazio | **Português (pt-BR)**                                         |
| Mensagem de erro mostrada ao usuário                                                   | **Português (pt-BR)**                                         |
| Mensagem de commit e descrição de PR                                                   | **Português (pt-BR)**                                         |
| Documentação (`.md`)                                                                   | **Português (pt-BR)**, com identificadores técnicos em inglês |

O teste que resolve qualquer dúvida: **esse texto pode aparecer na tela de quem usa o sistema?** Se pode, é português. Se ele só existe para quem programa — log, stack trace, nome de teste, chave de objeto —, é inglês.

Comentário explica **por quê**, nunca **o quê**.

---

## 2. Early return — nunca `if/else` alinhado

Sem exceção. Condição que não se aplica sai da função na hora.

Guarda primeiro, caminho feliz por último e sem indentação.

No template Svelte, mostre cedo os estados de carregamento, erro e vazio com `{#if}`, e deixe o conteúdo principal por último, sem aninhamento.

**Lint:** `no-else-return`, `complexity: ['error', 10]`, `max-depth: ['error', 2]`.

---

## 3. MVVM — hook nunca encosta em template

A camada de apresentação não sabe de onde o dado vem. O hook não sabe como o dado é desenhado. Os dois se encontram na rota.

```text
routes/tasks/+page.svelte         → compõe: chama o hook, passa para o componente
lib/hooks/use-…/use-….svelte.ts   → estado, efeitos, queries, mutations, handlers. ZERO template.
lib/components/…/….svelte         → função pura de props → template. ZERO hook de dado.
```

Permitido dentro de um componente de UI:

* `$props()`;
* `$derived()` de cálculo puro de apresentação;
* `$state()` de estado puramente visual, como mostrar/esconder senha.

Proibido:

* `createQuery`, `createMutation`, `createInfiniteQuery`, `createQueries`;
* `goto` (navegação direta — vem por `actions`, montada no hook);
* `$effect` que busca dado.

**Lint:** `no-restricted-syntax` recusa `createQuery`/`createMutation`/`goto` em `lib/components/**` (fora de `lib/components/ui/`) e cobra export nomeado em `lib/hooks/**`.

---

## 4. Props semanticamente separadas

Toda prop entra em um de quatro grupos. Nada de prop solta na raiz.

| Grupo     | Contém                                                            | Nunca contém         |
| --------- | ----------------------------------------------------------------- | -------------------- |
| `data`    | Valores de domínio a exibir                                       | Callback, classe CSS |
| `ui`      | Só aparência: `variant`, `size`, `tone`, `align`, `className`     | Dado, callback       |
| `state`   | Estado de interação: `isLoading`, `isDisabled`, `isOpen`, `error` | Dado de domínio      |
| `actions` | Só callbacks, sempre `on*`                                        | Qualquer outra coisa |

A exceção é `children` (`Snippet`), que fica na raiz — é como o Svelte compõe.

Booleano de estado usa prefixo `is`/`has`. Callback usa prefixo `on`. O handler que o view-model expõe usa o mesmo nome do callback que consome.

---

## 5. Componente baixado nunca mora com componente próprio

```text
lib/components/ui/    ⛔ território do CLI do shadcn-svelte. NÃO EDITE.
lib/components/<nome>/ ✅ nosso. Uma pasta por componente: ActionButton, TextField, StatusBadge, EmptyState, TaskListView, AppShell…
```

O `components.json` aponta a saída para `lib/components/ui`.

Rodar `npx shadcn-svelte@latest add <nome>` (dentro de `client/`) sobrescreve aquela pasta — e é para sobrescrever mesmo.

Precisa mudar um componente baixado? **Não edite.** Crie um componente nosso em `lib/components/` que envolve o baixado e aplica nossas variantes com `tv()`.

O app importa o nosso; ninguém importa `lib/components/ui/` diretamente fora de `lib/components/`.

**Lint:** `no-restricted-imports` bloqueia `lib/components/ui/**` fora de `lib/components/**`.

---

## 6. Storybook para 100% dos componentes

Componente em `lib/components/` (fora de `lib/components/ui/`) **sem** `.stories.svelte` não entra.

Cada story cobre, no mínimo:

1. **Default** — o uso mais comum.
2. **Todas as variantes** de `ui`.
3. **Estados** — loading, disabled, erro, vazio.
4. **Caso limite** — texto longo que quebra o layout, lista com um item só.

Componente de rota e view-model não têm story — não são componentes de UI reaproveitáveis.

---

## 7. Teste do caminho feliz e do caminho triste, sempre

Todo PR com lógica traz os dois.

Nos arquivos de teste, os dois ficam marcados com `// feliz` e `// triste`.

O que precisa de teste:

* regra de negócio;
* schema;
* view-model;
* mapper;
* service;
* policy de acesso;
* qualquer correção de bug;
* autenticação;
* autorização;
* sessão;
* escalada de privilégio.

O que não precisa:

* arquivo gerado;
* re-export;
* story.

**Toda escalada de privilégio tem teste.** Perfil somente leitura tentando escrever, identidade pela metade, autoria enviada no corpo: cada uma é uma linha trocada que passa na revisão sem ninguém ver.

**Níveis:** unitário (Vitest), componente (Vitest + Testing Library), E2E da API (Vitest + Supertest contra o banco de teste na Neon, `TEST_DATABASE_URL`), E2E da web (Playwright), mutação (Stryker).

---

## 8. Backend

* **Subpasta por papel dentro do módulo.** `controller/`, `service/`, `repository/`, `mapper/`, `dto/` — cada arquivo mora na subpasta do papel que ele cumpre. Só o `<feature>.module.ts` fica fora, na raiz do módulo: é ele que aponta para todo o resto e funciona como o índice da pasta. Teste mora junto do que testa.

* **Módulo novo é registrado em `app.module.ts`.** Esquecer é o motivo nº 1 de "a rota dá 404".

* **Um caminho de escrita por dado.** Toda escrita de uma entidade passa pelo `service` dela. Controller não fala com repository, repository não tem regra.

* **Contrato antes do código.** O schema Zod vive em `shared/` (pacote `@template/shared`) e é importado pela API (DTO + Swagger via `nestjs-zod`) e pela web. Um schema, duas pontas.

* **Swagger é obrigatório.** Endpoint sem `@ApiOperation` e sem tipo de resposta não entra.

* **Quem editou vem da identidade**, nunca do corpo da requisição. `createdBy` e `updatedBy` são carimbados no mapper a partir da identidade autenticada. O cliente nunca pode escolher ou sobrescrever a identidade de quem realizou a operação.

### Autenticação e autorização

* `AuthenticationMiddleware` resolve e valida a identidade da requisição.
* `RolesGuard` (`@Roles('admin')`) responde se a requisição entra na rota.
* `lib/policy` responde o que aquela identidade pode fazer sobre determinado dado.
* A policy é fechada por padrão: nenhuma função devolve `true` por omissão.
* Toda escalada de privilégio possui teste.
* Uma requisição sem identidade válida recebe `401`.
* Uma identidade autenticada sem permissão recebe `403`.
* Nunca confiar em identidade enviada livremente pelo cliente para determinar acesso.

### Login

**Login pode existir no MVP.**

Quando a feature exigir autenticação própria, o sistema pode possuir:

* tela de login;
* cadastro de usuário;
* sessão;
* logout;
* recuperação de acesso;
* gerenciamento de credenciais;
* roles;
* permissões.

Esses recursos seguem a mesma separação de `controller`, `service`, `repository`, `mapper`, `dto`, `policy` e testes das demais features.

**A estratégia de autenticação deve ser explícita.**

O projeto pode utilizar:

* autenticação própria;
* provedor externo;
* `auth-forward`.

Antes de criar outro mecanismo, o Claude deve verificar qual mecanismo já existe no projeto.

Não deve introduzir dois mecanismos de autenticação concorrentes sem necessidade.

### Sessão

**Sessão nunca é persistida em `localStorage`.**

Credenciais, tokens de sessão e informações equivalentes não podem ser armazenados no navegador de forma que uma pessoa possa herdar a sessão de outra em máquina compartilhada.

Quando houver sessão baseada em cookie, utilizar as proteções adequadas ao ambiente, incluindo:

* `HttpOnly`;
* `Secure` quando aplicável;
* política `SameSite` compatível com o fluxo.

### Credenciais

**Credenciais nunca são armazenadas em texto puro.**

Senhas devem utilizar mecanismo de hash apropriado e nunca devem aparecer em:

* logs;
* seeds;
* fixtures;
* respostas da API;
* mensagens de erro.

### Autenticação ≠ autorização

Login não concede autorização por si só.

Autenticação responde **quem é a pessoa**.

`RolesGuard` responde **se a pessoa pode entrar na rota**.

`lib/policy` responde **o que a pessoa pode fazer sobre determinado dado**.

### Testes obrigatórios de autenticação

Toda mudança de autenticação exige, no mínimo:

* login válido;
* credencial inválida;
* requisição sem autenticação;
* sessão inválida ou expirada;
* logout;
* usuário autenticado sem permissão;
* tentativa de escalada de privilégio;
* identidade enviada pelo cliente sendo ignorada quando contradiz a identidade autenticada.

### Banco: Postgres (Neon) + Drizzle

* **A tabela é TypeScript.** Uma por arquivo, em `server/src/lib/db/schema/<nome>.schema.ts`, registrada em `lib/db/drizzle-schema.ts`.

* **Mudou a tabela?** `npm run db:generate`. O `drizzle-kit` escreve a migration em `server/drizzle/`. A migration é versionada; migration já commitada nunca é editada — mudança nova é migration nova.

* **As migrations são aplicadas sozinhas** quando o server sobe e quando um seed roda.

* **O banco é o Postgres da Neon, remoto.** A conexão é a `DATABASE_URL` do `server/.env` — sem ela, o server recusa subir. É compartilhado por natureza: quem usa a mesma connection string vê os mesmos dados.

* `npm run db:reset` apaga e recria com os seeds — no banco apontado por `DATABASE_URL`.

* **Dados de autenticação são tratados como dados sensíveis.** Seeds podem criar usuários de desenvolvimento somente com credenciais explicitamente fictícias e documentadas. Nenhuma senha real, token real ou credencial de produção entra no repositório.

---

## 9. Seeds — dados de teste

Seeds são **scripts versionados**, uma pasta por entidade, nunca dados embutidos no app.

```text
scripts/seed/

├── seed.util.ts
├── seed-all.ts
└── tasks/
    ├── tasks.data.ts
    └── seed-tasks.ts
```

Regras:

* **Idempotente.** Rodar duas vezes dá o mesmo resultado.
* **Ordem de dependência.** Quem é referenciado vem antes.
* **Nunca roda em produção.**
* **Imprime o que gravou.**
* **Dado inventado, sempre.**
* **Inclui casos limite.**
* Usuários de teste podem existir.
* Senhas de teste devem ser fictícias.
* Nenhuma credencial real entra no seed.

---

## 10. Nomes de arquivo

| Tipo           | Padrão                                      | Exemplo                                                |
| -------------- | ------------------------------------------- | ------------------------------------------------------- |
| Componente     | `lib/components/<nome>/<nome>.svelte`       | `lib/components/task-list-view/task-list-view.svelte`  |
| Story          | `<nome>.stories.svelte`                     | `task-list-view.stories.svelte`                        |
| Hook (view-model) | `lib/hooks/use-<nome>/use-<nome>.svelte.ts` | `lib/hooks/use-task-list/use-task-list.svelte.ts`   |
| Teste          | `<arquivo>.test.ts`                         | `task-status.util.test.ts`     |
| E2E            | `<fluxo>.e2e.ts`                            | `tasks.e2e.ts`                 |
| Módulo Nest    | `<feature>.<papel>.ts`                      | `tasks.service.ts`             |
| Schema Zod     | `<nome>.schema.ts`                          | `task.schema.ts`               |
| Tabela Drizzle | `<nome-no-plural>.schema.ts`                | `tasks.schema.ts`              |
| Util puro      | `<nome>.util.ts`                            | `format-date.util.ts`          |
| Seed           | `seed-<entidade>.ts` + `<entidade>.data.ts` | `seed-tasks.ts`                |

Export nomeado sempre. `export default` só onde o framework exige.

Arquivo de barril (`index.ts` que re-exporta) é proibido.

---

## 11. Commits

Formato obrigatório:

```text
[tipo](local): Mensagem
```

Exemplos:

```text
[feat](backend): Endpoint de listagem de tarefas com filtro por situação
[fix](web): Erro do formulário some quando o título é corrigido
[refactor](web): Extrai view-model da tela de tarefas
[test](backend): Caminho triste da edição feita por perfil de consulta
[chore](docker): Sobe o Node da imagem para a 24 LTS
```

Tipos:

| Tipo       | Quando                             |
| ---------- | ---------------------------------- |
| `feat`     | Funcionalidade nova                |
| `fix`      | Correção de defeito                |
| `refactor` | Muda a forma, não o comportamento  |
| `test`     | Só teste                           |
| `docs`     | Só documentação                    |
| `style`    | Só formatação                      |
| `perf`     | Ganho de desempenho                |
| `build`    | Build, dependências, empacotamento |
| `ci`       | Pipeline                           |
| `chore`    | Manutenção                         |

Local:

| Local       | Alcance                     |
| ----------- | --------------------------- |
| `backend`   | `acerola/dashboard/server/` |
| `web`       | `acerola/dashboard/client/` |
| `db`        | Banco, migrations e seeds   |
| `contracts` | `acerola/dashboard/shared/` |
| `docker`    | `acerola/dashboard/docker/` |
| `ci`        | `.github/`                  |
| `docs`      | `.md` na raiz               |
| `deps`      | Atualização de dependência  |
| `claude`    | `.claude/` e `CLAUDE.md`    |

Mensagem em português, primeira letra maiúscula, sem ponto final, descrevendo **o que a mudança faz**.

`[fix](backend): Alterações no service` é ruim.

`[fix](backend): Corrige rejeição de sessão expirada` é melhor.

Uma mudança que toca dois locais são dois commits. Se não der para separar, use o local mais relevante — nunca `[feat](backend,web)`.

`--no-verify` é proibido.

---

## 12. Branches — Gitflow

O fluxo é o Git-Flow.

| Branch             | Quem mexe                          | Sai de    | Volta para         |
| ------------------ | ---------------------------------- | --------- | ------------------ |
| `main`             | Só quem administra o projeto       | —         | —                  |
| `develop`          | Todo mundo, só por merge `--no-ff` | `main`    | —                  |
| `feature/<nome>`   | Todo mundo                         | `develop` | `develop`          |
| `bugfix/<nome>`    | Todo mundo                         | `develop` | `develop`          |
| `release/<versão>` | Só quem administra                 | —         | `main` e `develop` |
| `hotfix/<versão>`  | Só quem administra                 | —         | `main` e `develop` |

Nome de branch em inglês, kebab-case.

Exemplo:

```text
feature/user-authentication
feature/login-screen
bugfix/session-expiration
```

### O ciclo de toda mudança

1. Toda mudança de código nasce numa `feature/` ou `bugfix/`, criada a partir da `develop` atualizada.
2. O trabalho é commitado na branch.
3. No fim, a `develop` é trazida para a branch.
4. Conflitos são resolvidos na branch.
5. Verificação e sistema rodando.
6. A pessoa que pediu confere e dá o OK.
7. `git merge --no-ff` da branch na `develop`.
8. Envio da `develop`.
9. Branch apagada.

---

## 13. Versões — só o que ainda tem suporte

**Zero tolerância com dependência fora de suporte.**

O runtime:

```json
"engines": {
  "node": ">=24.0.0 <25.0.0",
  "npm": ">=10"
}
```

Na dúvida, o major mais novo que funciona.

Antes de abrir PR:

```bash
npm outdated --workspaces --include-workspace-root
npm audit
```

Uma dependência travada deve possuir motivo documentado.

Nunca utilizar `--force` ou `legacy-peer-deps` para esconder conflito de dependências.

---

## 14. Definition of Done

O PR só entra com tudo marcado:

* [ ] Commits no formato `[tipo](local): Mensagem`
* [ ] Branch `feature/` ou `bugfix/` saiu de `develop`
* [ ] `develop` foi trazida para a branch no fim
* [ ] A pessoa que pediu conferiu e deu o OK
* [ ] Merge na `develop` com `--no-ff`
* [ ] `npm run lint` verde
* [ ] `npm run typecheck` verde
* [ ] `npm test` verde
* [ ] `npm audit` sem nada alto ou crítico não documentado
* [ ] Caminho feliz e caminho triste testados
* [ ] Story para todo primitivo/compositor novo ou alterado
* [ ] Endpoint novo documentado no Swagger
* [ ] Mudança de banco com migration gerada e seed atualizado
* [ ] Nenhum hook de dado dentro de componente de UI
* [ ] Props agrupadas em `data` / `ui` / `state` / `actions`
* [ ] Nenhum `else` alinhado
* [ ] Nada editado dentro de `lib/components/ui/`
* [ ] `.env.example` atualizado se entrou variável nova
* [ ] Nenhuma chave ou dado real de cliente no diff
* [ ] Idioma conferido
* [ ] Mudança de autenticação possui testes de sucesso e falha
* [ ] Rotas protegidas retornam `401` sem autenticação
* [ ] Usuário autenticado sem permissão recebe `403`
* [ ] Credenciais não são persistidas em `localStorage`
* [ ] Senhas não são armazenadas em texto puro

---

## 15. Travas — não remova sem conversar

Cada uma existe para impedir regressões conhecidas.

* **Falha de gravação precisa aparecer na tela**, em vermelho, com o motivo, até resolver.
* Vazio só é vazio depois que a consulta terminou.
* Vazio de verdade não é o mesmo que filtro sem resultado.
* Lista nunca é truncada calada.
* Data inválida vira `null`.
* **Sessão nunca é persistida em `localStorage`.**
* **Identidade pela metade é recusada.**
* Automação não chuta.
* Botão que grava trava enquanto grava.
* Regra de unicidade mora no banco.
* Credenciais nunca aparecem em logs.
* Senhas nunca são armazenadas em texto puro.
* Autorização nunca depende somente da interface.
* Toda operação protegida valida a identidade no backend.

---

## 16. Trabalhando com o Claude

* **Descreva o resultado, não o código.** O Claude traduz o pedido no caminho inteiro: contrato → banco → API → tela → testes → seed.

* **Uma coisa de cada vez.** Uma feature por branch, um pedido por conversa quando possível.

* **Login e dados compartilhados fazem parte do sistema quando solicitados.** Se a pessoa pedir tela de login, cadastro de usuário, logout, sessão, recuperação de acesso, controle de permissões ou compartilhamento de dados entre computadores, o Claude deve implementar a feature seguindo a arquitetura existente.

* **Antes de alterar autenticação, o Claude deve inspecionar a implementação atual.** Deve identificar:

  1. onde a identidade é resolvida;
  2. como a sessão é mantida;
  3. onde as credenciais são armazenadas;
  4. como roles e policies funcionam;
  5. quais rotas já exigem autenticação;
  6. quais arquivos de autenticação são protegidos por hooks.

* **Não criar uma segunda autenticação sem necessidade.** Se já existir um mecanismo funcional, o Claude deve estendê-lo.

* **Toda alteração de autenticação precisa de testes.** Login funcionando visualmente não é suficiente.

* **Credenciais nunca devem ser inventadas para produção.** Para desenvolvimento, o Claude pode utilizar usuários e senhas fictícios documentados em seed ou `.env.example`.

* **Erro grande não é remendado.** Se o problema está na estrutura do projeto, o Claude para, guarda o trabalho e prepara um relatório.

* **Toda mudança vira uma branch sozinha.** O Claude cria a `feature/` ou `bugfix/`, trabalha nela e, no fim, pergunta se está funcionando.

* **Só com o OK da pessoa** ele junta na `develop`.

* **Peça para ver funcionando.** "Roda e me mostra" é um pedido válido.

* **Erro na tela ou no terminal?** Copie e cole a mensagem inteira.

* **O Claude não publica nada sozinho.** Push, PR, deploy e apagar o banco sempre passam por uma pergunta antes.

---

## 17. Autenticação e suporte

### Identidade

A identidade pode ser fornecida por:

1. autenticação própria;
2. provedor externo;
3. `auth-forward`.

O mecanismo utilizado deve ser identificado pelo projeto antes de qualquer alteração.

Não assumir `auth-forward` se ele não estiver efetivamente configurado.

### Usuários

Quando autenticação própria fizer parte do produto, o sistema pode possuir:

* tabela de usuários;
* credenciais;
* sessões;
* roles;
* permissões;
* recuperação de acesso;
* rotas autenticadas.

Esses dados devem possuir migrations, schemas, services, policies e testes próprios.

### Arquivos protegidos

A proteção de estrutura continua ativa para:

* `CLAUDE.md`;
* `CONTRIBUTING.md`;
* `.claude/`;
* `.github/`;
* hooks;
* `scripts/git/`;
* configurações de ESLint;
* TypeScript;
* Vitest;
* Stryker;
* commitlint;
* Docker;
* abertura do banco;
* tratamento de erro HTTP.

**Arquivos de autenticação não são automaticamente proibidos de editar.**

O Claude pode alterar:

* `lib/auth`;
* schemas de usuário;
* tabelas de usuário e sessão;
* services de autenticação;
* controllers de autenticação;
* rotas de login;
* componentes de login;
* bibliotecas de autenticação;

quando isso fizer parte da tarefa solicitada.

A alteração deve estar em uma branch apropriada e possuir os testes correspondentes.

### Erro estrutural

Problemas normais de implementação de login, sessão, usuário ou autorização devem ser investigados e corrigidos pelo Claude.

Somente erros estruturais que impeçam o desenvolvimento ou exijam alteração das regras protegidas do projeto devem ser encaminhados ao suporte.

---

## Regra final

O Claude pode criar, alterar e testar **login, usuários, sessões e autorização**.

Ele não pode:

* ignorar autenticação;
* confiar em identidade enviada pelo cliente;
* armazenar senha em texto puro;
* armazenar sessão em `localStorage`;
* conceder privilégio pelo frontend;
* criar uma segunda estratégia de autenticação sem necessidade;
* inserir credenciais reais no repositório;
* remover os testes de segurança;
* alterar as travas estruturais do projeto apenas para fazer uma feature passar.

**O objetivo é permitir que o Claude implemente autenticação de ponta a ponta sem transformar autenticação em uma área proibida do projeto.**
