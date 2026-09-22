---
name: comecar
description: Primeiro uso do projeto — confere Node/Git, instala dependências, ajuda a configurar as credenciais da Neon (banco) e do Cloudflare R2 (arquivos), cria os dados de teste, sobe o sistema e apresenta a estrutura para quem nunca programou. Use quando a pessoa acabou de clonar, pergunta "como rodo isso?", "por onde começo?" ou o sistema nunca foi instalado nesta máquina.
---

# Começar

Objetivo: em poucos minutos a pessoa vê o sistema rodando no navegador e entende, sem jargão,
o que tem no projeto.

## 1. Conferir o ambiente

Rode e interprete para a pessoa:

```bash
node -v
npm -v
git --version
```

- **Node precisa ser 24.x.** Se for 25, 23, 22 ou menor: explique que o projeto exige o Node 24
  LTS e peça para instalar (https://nodejs.org → versão LTS 24, ou `mise install` se ela usa
  mise). Um aviso `EBADENGINE` no install é sintoma disso. Não siga com outra versão sem avisar.
- Sem Git: peça para instalar antes (https://git-scm.com).

## 2. Instalar

```bash
cd acerola/dashboard
npm install
```

Demora alguns minutos na primeira vez. Avise antes. Avisos `deprecated` são normais.

O `npm install` também prepara o git desta máquina: liga as travas de branch e configura o
Git-Flow do **Tower** (main, develop, `feature/`…). Se o repositório não tem git (`git status`
falha na raiz — projeto baixado em .zip), avise a pessoa: o fluxo de trabalho depende de clonar
pelo GitHub ou pelo Tower. Não crie a `main` por conta própria.

## 3. Banco e arquivos (Neon e Cloudflare R2)

O banco é o Postgres da **Neon** e os arquivos vão para o **Cloudflare R2** — os dois exigem
credencial, e o server recusa subir sem ela.

```bash
cp server/.env.example server/.env
```

Ajude a pessoa a preencher, no `server/.env` que acabou de criar:
- `DATABASE_URL` — no painel da Neon: o projeto → "Connection string" → a de "Pooled connection".
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` — no painel da
  Cloudflare, seção R2.

Se ela ainda não tem conta na Neon ou na Cloudflare, isso é criar a conta antes de continuar —
avise que é um passo de infraestrutura, não do Claude.

## 4. Dados de teste

```bash
npm run seed:all
```

Cria as tabelas no banco e grava as tarefas de exemplo.

## 5. Subir

Rode `npm run dev` **em segundo plano** (ele não termina). Espere aparecer
`API em http://localhost:3336/api` e o Vite em `:5176`.

Diga à pessoa:
- **O sistema:** http://localhost:5176
- **A documentação da API (Swagger):** http://localhost:3336/docs
- Para parar: `Ctrl+C` no terminal onde está rodando.

Se puder, abra no navegador e confira que a lista de tarefas aparece.

## 6. Apresentar o projeto (curto)

Explique em até 10 linhas, em português simples:

- O sistema tem **três partes**: `shared` (as regras e os formatos dos dados, usados pelas
  outras duas), `server` (a API, que guarda no banco) e `client` (as telas).
- O banco é o **Postgres da Neon** — remoto, não um arquivo na máquina. As credenciais ficam no
  `server/.env`, que não vai para o git; os **dados de teste** vão, em `scripts/seed/`.
- **Tarefas** é um exemplo completo, para servir de molde. Dá para remover depois
  (`remover-exemplo`).
- Não tem login por padrão: todo mundo entra como "Usuário de desenvolvimento". Se a ideia
  precisar de login, é só pedir.
- Quem usar a mesma `DATABASE_URL` vê os mesmos dados — não é automático que cada máquina
  tenha os seus.
- Algo grande der errado (projeto não sobe, banco quebrado), a skill `suporte` entra em ação:
  ela para, guarda o trabalho e prepara um relatório do problema pra você investigar com calma.
- Ela pode pedir coisas em linguagem normal. Dê 2 exemplos de pedido, usando a ideia do MVP
  dela se você souber qual é.

## 7. Próximo passo

Sugira, nesta ordem:
1. `renomear-projeto` — colocar o nome do MVP no título das telas.
2. Descrever a primeira mudança — você cria a branch de feature sozinho (`git-fluxo`) e ela
   aprova no fim, quando estiver funcionando.
3. Se ela usa o Tower: ele já mostra o Git-Flow configurado, e as branches que você criar
   aparecem lá.
