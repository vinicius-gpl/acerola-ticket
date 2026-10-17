# Bot de WhatsApp

O bot é o programa que conversa com o WhatsApp. Ele fica **inteiro** em `acerola/dashboard/bot/`
e é separado do resto: o servidor de chamados não conhece o WhatsApp, só a API HTTP do bot.

## O que ele faz

- **Vínculo.** Admin e super admin vinculam o próprio número em **Meu Perfil**, lendo um QR code.
- **Chamado pelo site.** No `/support`, quem abre escolhe com quem quer falar, entre quem atende
  a área. O escolhido vira o responsável e, se a pessoa pediu aviso, o WhatsApp dele manda o
  "recebi o seu chamado".
- **Chamado pronto.** Na ficha do chamado, **Avisar no WhatsApp** envia pelo número do
  responsável. Quando nem entra na fila (sem vínculo, pessoa não pediu aviso), a tela diz o
  motivo e oferece o link para enviar à mão.
- **Fila de saída.** Os avisos de chamado ("recebi o seu chamado", "ficou pronto") não saem na
  hora: entram na tabela `whatsapp_messages` como `pending`, e o entregador do servidor
  (`WhatsappOutboxService`) os manda a cada 5 segundos — **no máximo um por número por volta**,
  para o ritmo parecer de gente. Bot fora do ar ou celular desconectado: tenta de novo com espera
  crescente (30 s, 1 min, 2 min… até 30 min), por até 1 dia. Limite do dia esgotado: o "recebi"
  é descartado (amanhã ele não diz nada) e o "pronto" fica para as 8h do dia seguinte. Telefone
  sem WhatsApp ou número desvinculado: para na hora. A ficha do chamado mostra cada aviso (na
  fila, enviado, não saiu, descartado) e oferece **Reenviar** para o que parou. As respostas
  da conversa (`/chamado`, `/acesso`) não passam pela fila: o bot responde na hora.
- **Conversa que sobrevive a reinício.** O pedido de acesso em andamento fica no banco
  (`whatsapp_conversations`) e a lista de conversas abertas fica no bot, cifrada, em
  `BOT_DATA_DIR/.conversations`. Reiniciar o servidor ou o bot no meio do `/acesso` não faz a
  pessoa perder o que já respondeu.
- **Sem mensagem lida duas vezes.** O bot manda ao servidor o identificador de cada mensagem, e o
  servidor guarda os que já leu por 1 dia (`whatsapp_inbound_messages`, só o identificador, nunca
  o texto). A mesma mensagem entregue de novo pelo WhatsApp (numa reconexão) é ignorada, sem
  fechar a conversa.
- **Chamado a partir do WhatsApp.** Quem manda `/chamado` para o número de um responsável
  recebe UMA mensagem com um link assinado. O link abre o `/support` (depois do login, se a
  pessoa ainda não entrou — o convite atravessa o login) já com o responsável, o telefone de
  quem escreveu e, quando o responsável atende uma área só, a área. O chamado é
  preenchido na tela, e a confirmação com o protocolo chega pelo WhatsApp do responsável.
  O link vale 30 minutos e não pode ser alterado: a assinatura é conferida pelo servidor.
- **Link de consulta.** Toda mensagem de um chamado ("recebi o seu chamado", "ficou pronto")
  leva um link assinado que abre direto AQUELE chamado na consulta, sem digitar protocolo —
  depois do login, e só para quem abriu o chamado ou atende uma área dele. Não vence. Trocar o
  número dentro do link não abre o chamado de outra pessoa: a assinatura deixa de conferir.
- **Textos.** O super admin edita cada mensagem em **Meu Perfil › Textos do bot**, com variáveis
  entre chaves duplas (`{{protocolo}}`) e prévia.
- **Limite.** Cada número manda no máximo `WHATSAPP_DAILY_LIMIT` mensagens automáticas por dia
  (padrão 100). Em 70% a pessoa é avisada no próprio WhatsApp e no perfil; no teto, o sistema
  para de enviar por ela até o dia seguinte.
- **Limite por quem escreve.** Um mesmo número manda ao bot de um responsável no máximo
  `BOT_INBOUND_LIMIT` mensagens (padrão 20) a cada `BOT_INBOUND_WINDOW_MINUTES` minutos (padrão
  10), contando só comandos e respostas de conversa aberta. Acima disso o bot fica em silêncio
  com aquele número, sem aviso, até a janela andar — assim quem dispara `/chamado` sem parar não
  gasta o limite do dia de quem atende. Conversa comum nunca conta.

### O que o bot lê

O número vinculado é o WhatsApp de alguém, e quase tudo o que chega nele não é chamado. O bot só
encaminha ao servidor a mensagem que é **exatamente** `/chamado`. Todo o resto fica no bot e é
descartado. Ele só responde em conversa privada — nunca em grupo — e ignora mensagem com mais
de 2 minutos, para não responder em lote ao voltar de uma queda.

O link das mensagens usa o `APP_PUBLIC_URL` do servidor: ele precisa ser um endereço que quem
recebe consiga abrir. Sem a variável, vale a primeira origem de `API_CORS_ORIGIN` — que na
máquina de desenvolvimento é `localhost`, e só abre nela.

## Ligar o servidor ao bot

No `server/.env`, aponte para o bot e repita o token dele:

```bash
BOT_API_URL=http://127.0.0.1:4005
BOT_API_TOKEN=<o mesmo BOT_API_TOKEN do bot/.env>
```

No `bot/.env`, diga ao bot onde fica o servidor — é para lá que ele leva o `/chamado`:

```bash
BOT_SERVER_URL=http://127.0.0.1:3005/api
```

Opcionais no `server/.env`: `WHATSAPP_DAILY_LIMIT` (padrão 100) e `APP_PUBLIC_URL`, o endereço
público da tela, usado nos links das mensagens (sem ele, vale a primeira origem de
`API_CORS_ORIGIN`).

Sem essas duas variáveis o sistema funciona inteiro; o cartão de WhatsApp do perfil só avisa que
a integração não foi configurada. O servidor guarda em `whatsapp_connections` **quem** vinculou
e **qual número** — a conexão em si nunca sai do bot.

## Por que é um programa à parte

1. **Troca futura.** Hoje quem fala com o WhatsApp é o [Baileys](https://github.com/WhiskeySockets/Baileys),
   que não é oficial. No dia em que a API oficial do WhatsApp entrar, troca-se só a camada de
   transporte do bot (`src/modules/sessions/`); o servidor e a tela não mudam.
2. **Licença.** O Baileys depende de código GPL-3.0 (`libsignal`). Num programa à parte — com
   instalação, processo e imagem Docker próprios — essa licença não alcança o resto do projeto,
   que é MIT. Detalhes em `THIRD-PARTY-NOTICES.md`.

Por isso o bot **não** é um workspace do `package.json` da raiz: tem `package.json` e
`package-lock.json` próprios, e o `npm install` do painel não instala nada dele.

## Rodar na sua máquina

O bot sobe junto com o resto:

```bash
cd acerola/dashboard
cp bot/.env.example bot/.env   # uma vez: preencha BOT_API_TOKEN e BOT_SESSION_KEY
npm run dev                    # API :3005 + tela :5005 + bot :4005
```

O `npm run dev` confere as dependências do bot antes de subir (e as instala na primeira vez).
Sem o `bot/.env` o bot não sobe e diz, no terminal, qual variável falta — o resto do sistema
funciona normalmente.

Cada porta é trocada no `.env` do próprio programa:

| Programa | Porta padrão | Onde trocar |
|---|---|---|
| API (Nest) | 3005 | `API_PORT`, em `server/.env` |
| Tela (Vite) | 5005 | `VITE_PORT`, em `client/.env` |
| Bot | 4005 | `BOT_PORT`, em `bot/.env` |

Trocou a porta do bot? Troque junto o `BOT_API_URL` em `server/.env`, que é por onde o servidor
o encontra. Trocou a da API? O mesmo vale para `VITE_API_PORT`, em `client/.env`.

Para subir só o bot: `npm run dev:bot`. Para conferir lint, tipos e testes dele: `npm run bot:check`.

## Rodar com Docker

```bash
cd acerola/dashboard
docker compose -f docker/compose.yml --profile whatsapp up --build
```

O bot tem o único volume do projeto (`bot-data`): as conexões cifradas dos números vinculados.
Perder o volume não perde dado de chamado — só obriga cada pessoa a ler o QR code de novo.
O sistema roda com **uma instância só** do bot: a conexão com o WhatsApp fica viva dentro dele.

## A API

Tudo, menos `/health`, exige `Authorization: Bearer <BOT_API_TOKEN>`. O `:id` é o id do usuário
dono do número.

| Chamada | O que faz |
|---|---|
| `GET /health` | Está de pé? Sem token. |
| `GET /sessions/:id` | Situação do vínculo: `disconnected`, `pairing` (com o `qr`) ou `connected` (com o `phone`). |
| `POST /sessions/:id/link` | Começa o vínculo. O QR code aparece na situação alguns segundos depois. |
| `DELETE /sessions/:id` | Desvincula: encerra no WhatsApp e apaga a conexão guardada. |
| `POST /sessions/:id/messages` | Manda texto: `{ "to": "5562999990001", "text": "..." }`. |

Respostas de erro do envio: `409` (`not_connected`) quando o número não está conectado, `422`
(`recipient_not_found`) quando o destino não tem WhatsApp.

## Segurança

- **A API não fica na internet.** O bot escuta só em `127.0.0.1` por padrão; no Docker, só na
  rede interna do compose. Quem tem o `BOT_API_TOKEN` manda mensagem pelo WhatsApp de qualquer
  pessoa vinculada.
- **A conexão é cifrada em disco** (AES-256-GCM, chave em `BOT_SESSION_KEY`). Quem tem esses
  dados é aquele WhatsApp: lê e manda mensagem como a pessoa. Nem o nome dos arquivos revela
  telefone.
- **Trocar `BOT_SESSION_KEY` invalida todos os vínculos.**
- **Banimento.** O Baileys não é oficial, e o WhatsApp pode banir números que usam automação.
  O teto de mensagens por pessoa, os alertas e o ritmo da fila de saída (uma mensagem por número
  a cada 5 s) ficam no servidor.

## Onde fica cada coisa

```
bot/src/main.ts                    sobe o bot: lê o ambiente, liga as peças e escuta
bot/src/lib/config/                variáveis de ambiente, validadas na subida (env.schema.ts)
bot/src/lib/http/                  a API que o servidor chama e o envio do /chamado ao servidor
bot/src/lib/storage/               onde a conexão fica guardada (cifrada)
bot/src/modules/sessions/          a porta do WhatsApp e quem a atende hoje (Baileys) — a parte que será trocada
bot/src/modules/conversations/     o porteiro: o que sai do bot para o servidor
```

É o mesmo desenho do servidor (`lib/<infra>/` e `modules/<assunto>/`), com os mesmos sufixos
de arquivo: `.schema.ts` para contrato, `.type.ts` para tipo e `.util.ts` para função — cada
um com o `.test.ts` ao lado.
