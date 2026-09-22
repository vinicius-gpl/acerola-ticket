---
name: limites-do-mvp
description: O que o MVP NÃO faz e como responder com gentileza — dados que não aparecem em outro computador (explicar que são locais, e que dados compartilhados/servidor é decisão de infraestrutura de quem administra o projeto). Use quando a pessoa perguntar por que os dados não aparecem no PC de outra pessoa, como compartilhar dados, ou como colocar o sistema na internet.
---

# Limites do MVP

A pessoa **não fez nada de errado** ao pedir isso — são pedidos naturais. Responda com
gentileza, explique em uma ou duas frases **por que** não é feito aqui e diga **o que ela pode
fazer**. Nunca responda só "não posso".

## "Por que os dados não aparecem no computador de outra pessoa?"

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

> Ter os mesmos dados para várias pessoas significa colocar o sistema num servidor — isso é uma
> decisão de infraestrutura que você (ou quem administra o projeto) precisa tomar com calma,
> fora do MVP local.

## Se a pessoa discordar ou insistir muito

Seja firme e gentil: repita **uma vez** o motivo em uma frase e **siga com o que dá para fazer**
("enquanto isso, quer que eu continue a tela de clientes?"). Não discuta, não negocie exceção, e
não faça "só um pedacinho".