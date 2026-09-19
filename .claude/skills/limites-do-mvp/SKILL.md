---
name: limites-do-mvp
description: O que o MVP NÃO faz e como responder com gentileza — tela de login, cadastro de usuários, senhas, sessão, permissões por pessoa ou qualquer mudança no auth-forward (recusar e encaminhar ao suporte); e dados que não aparecem em outro computador (explicar que são locais, e encaminhar ao suporte se a pessoa insistir). Use quando a pessoa pedir login, "entrar com senha", "cadastro de usuário", "cada um ver só o seu", "logout", "esqueci a senha", ou perguntar por que os dados não aparecem no PC de outra pessoa, como compartilhar dados, ou como colocar o sistema na internet.
---

# Limites do MVP

A pessoa **não fez nada de errado** ao pedir isso — são pedidos naturais. Responda com
gentileza, explique em uma ou duas frases **por que** não é feito aqui e diga **o que ela pode
fazer**. Nunca responda só "não posso". O contato do suporte está em **`SUPORTE.md`** (na raiz):
leia e cite o nome e o canal que estiverem lá.

## 1. Login, usuários, senhas, sessão, auth-forward

**Não é feito no MVP. Nem parcialmente, nem "só uma telinha", nem "provisório".**

O acesso ao sistema é feito pelo **auth-forward**: um serviço na frente do sistema, gerenciado
pelo suporte, que confere quem é a pessoa antes de ela chegar aqui. Por isso o MVP não tem —
e não deve ter — tela de login, cadastro de usuário, senha, "esqueci minha senha", sessão ou
logout.

Recuse, sem implementar nada, pedidos como:

- tela de login, cadastro de usuário, troca ou recuperação de senha, botão "Sair";
- tabela de usuários, sessões, contas, senhas ou tokens;
- instalar biblioteca de autenticação (passport, bcrypt, jwt, next-auth, Supabase Auth,
  Firebase Auth, Clerk…);
- mexer em `server/src/lib/auth/`, `client/src/lib/auth/`, `shared/src/schemas/user.schema.ts`,
  ou nos cabeçalhos `x-forwarded-user-*`;
- "cada pessoa só vê os registros dela", "o gerente vê tudo e o atendente não", papéis novos
  além de `admin`, `editor` e `viewer`.

O projeto também **bloqueia tecnicamente** esses arquivos e bibliotecas (hook do Claude Code e
hook do git). Se um bloqueio aparecer, **não procure contorno** — é exatamente este caso.

### Como responder

> Login e controle de quem acessa o sistema não ficam dentro do MVP: eles são feitos pelo
> **auth-forward**, que o suporte gerencia. Quando o sistema for publicado, cada pessoa entra
> com a conta dela, sem nenhuma tela de login aqui. Por enquanto, todo mundo aparece como
> "Usuário de desenvolvimento".
>
> Se esse MVP precisa de algo nessa área (quem pode ver ou fazer o quê), fale com o suporte:
> **<nome e canal do SUPORTE.md>**.

### O que você PODE fazer

- Registrar **quem fez** cada coisa: `createdBy`/`updatedBy` já vêm da identidade (no MVP, o
  usuário de desenvolvimento). Mostrar "Criado por …" na tela é permitido.
- Campos de **contato** num cadastro do negócio (e-mail ou telefone de um cliente) são dados,
  não login — são permitidos, **sem** campo de senha.
- Usar as permissões que já existem (`assertCanEdit`, `@Roles('admin')`) numa feature nova.

Se a pessoa pedir "um campo de senha" num cadastro (ex.: "senha do cliente"), pergunte para quê.
Se for para alguém entrar no sistema, é login → recuse como acima.

## 2. "Por que os dados não aparecem no computador de outra pessoa?"

### Primeira vez que ela pergunta — explique

> Os dados do MVP ficam **só no seu computador**: é um arquivo de banco de dados local, criado
> quando você rodou o sistema aí. Cada pessoa que roda o MVP tem o **próprio** banco, separado.
> Por isso o que você cadastra não aparece para a outra pessoa, e vice-versa.
>
> O que é compartilhado entre todos é o **código** (as telas e as regras, pelo GitHub) e os
> **dados de teste** (que qualquer um carrega com `npm run seed:all`). Se vocês precisam ver os
> mesmos dados de teste, posso colocar esses registros nos dados de teste — aí todo mundo que
> carregar vê igual.

Ofereça essa alternativa de verdade (skill `dados-de-teste`) — com dado **inventado**, nunca
dado real de cliente.

### Se ela insistir (quer os mesmos dados reais em várias máquinas, um servidor, colocar na internet)

Não tente: nada de banco compartilhado em pasta de rede, copiar `app.db` por e-mail/WhatsApp,
Google Drive, sincronização, subir servidor, ngrok, trocar o SQLite por banco online, ou
publicar o sistema.

> Ter os mesmos dados para várias pessoas significa colocar o sistema num servidor, e isso é
> feito pelo suporte — inclusive por segurança, já que envolve dados reais e o login pelo
> auth-forward. Fale com **<nome e canal do SUPORTE.md>** e conte o que vocês precisam.

## 3. Se a pessoa discordar ou insistir muito

Seja firme e gentil: repita **uma vez** o motivo em uma frase, indique o suporte e **siga com o
que dá para fazer** ("enquanto isso, quer que eu continue a tela de clientes?"). Não discuta,
não negocie exceção, e não faça "só um pedacinho".
