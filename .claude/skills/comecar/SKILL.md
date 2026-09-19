---
name: comecar
description: Primeiro uso do projeto — confere Node/Git, instala dependências, cria o banco com os dados de teste, sobe o sistema e apresenta a estrutura para quem nunca programou. Use quando a pessoa acabou de clonar, pergunta "como rodo isso?", "por onde começo?" ou o sistema nunca foi instalado nesta máquina.
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
cd template
npm install
```

Demora alguns minutos na primeira vez. Avise antes. Avisos `deprecated` são normais; erro de
`better-sqlite3` → skill `socorro`.

O `npm install` também prepara o git desta máquina: liga as travas de branch e configura o
Git-Flow do **Tower** (main, develop, `feature/`…). Se o repositório não tem git (`git status`
falha na raiz — projeto baixado em .zip), avise a pessoa: o fluxo de trabalho depende de clonar
pelo GitHub ou pelo Tower. Não crie a `main` por conta própria.

## 3. Banco e dados de teste

```bash
npm run seed:all
```

Cria `server/data/app.db`, as tabelas e as tarefas de exemplo.

## 4. Subir

Rode `npm run dev` **em segundo plano** (ele não termina). Espere aparecer
`API em http://localhost:3333/api` e o Vite em `:5173`.

Diga à pessoa:
- **O sistema:** http://localhost:5173
- **A documentação da API (Swagger):** http://localhost:3333/docs
- Para parar: `Ctrl+C` no terminal onde está rodando.

Se puder, abra no navegador e confira que a lista de tarefas aparece.

## 5. Apresentar o projeto (curto)

Explique em até 10 linhas, em português simples:

- O sistema tem **três partes**: `shared` (as regras e os formatos dos dados, usados pelas
  outras duas), `server` (a API, que guarda no banco) e `client` (as telas).
- O banco é um **arquivo** (SQLite) em `server/data/app.db`. Não vai para o git; os **dados de
  teste** vão, em `scripts/seed/`.
- **Tarefas** é um exemplo completo, para servir de molde. Dá para remover depois
  (`remover-exemplo`).
- Não tem login, e não vai ter aqui: o acesso é feito pelo auth-forward, gerenciado pelo
  suporte. Todo mundo entra como "Usuário de desenvolvimento".
- Os dados ficam **só neste computador**.
- Algo grande deu errado? O contato do suporte está em `SUPORTE.md`.
- Ela pode pedir coisas em linguagem normal. Dê 2 exemplos de pedido, usando a ideia do MVP
  dela se você souber qual é.

## 6. Próximo passo

Sugira, nesta ordem:
1. `renomear-projeto` — colocar o nome do MVP no título das telas.
2. Descrever a primeira mudança — você cria a branch de feature sozinho (`git-fluxo`) e ela
   aprova no fim, quando estiver funcionando.
3. Se ela usa o Tower: ele já mostra o Git-Flow configurado, e as branches que você criar
   aparecem lá.
