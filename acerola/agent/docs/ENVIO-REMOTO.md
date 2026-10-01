# Envio remoto — o agente reportando ao painel central

O agente continua fazendo tudo o que fazia sozinho. O envio é uma camada a mais, **opcional**:
sem configuração, nada disso sobe e a bandeja segue local, como antes.

Quem faz o trabalho é `src-go/reporting`, e ele é só mais um assinante do `metrics.Broadcaster`
(`Subscribe()`), do mesmo jeito que a janela do próprio agente — a coleta não muda nem fica mais
cara por existir envio.

## Como o painel e o agente conversam

O contrato é o de `acerola/dashboard/shared/src/schemas/agent-snapshot.schema.ts`. Os nomes dos
campos são as tags `json` da `metrics.Snapshot`, então nada é remodelado antes de sair daqui.

1. O agente abre um WebSocket em `/agent` do dashboard.
2. Manda `{"type":"hello","token":"…","agentVersion":"…"}`. **O token vai no corpo, nunca na
   URL** — endereço de WebSocket aparece em log de proxy, e token em log é token vazado.
3. O servidor responde `{"type":"welcome"}` e a partir daí aceita `{"type":"snapshot", …}`.
4. O agente manda a primeira leitura na hora e depois uma a cada intervalo configurado.

"Online" no painel é ter esta conexão aberta agora — não é campo salvo. Máquina que perdeu
energia aparece offline sozinha.

### Quando o servidor recusa

| Código | O que é | O que o agente faz |
|---|---|---|
| `4001` | Token inválido | Desiste. Reconectar não conserta configuração errada. |
| `4003` | Máquina bloqueada pelo TI | Continua tentando, no intervalo máximo (5 min). |
| outros | Queda comum de rede/servidor | Tenta de novo, dobrando a espera de 5s até 5 min. |

## Como configurar uma máquina

### 1. Cadastre o computador no painel

No dashboard, **Inventário → Cadastrar computador**. Ao salvar, ele mostra o **token desta
máquina uma única vez** — só o hash fica no banco, igual a senha. Copie ali.

### 2. Cole a chave no agente

Na máquina, abra o agente pela bandeja do Windows — clique no ícone, ou clique com o botão
direito e escolha **Abrir Dashboard**. O card **Painel central** está nas duas telas. Nele:

1. confira o **endereço do painel** (aceita `http://`, `https://`, `ws://` ou `wss://` — o
   caminho `/agent` é completado sozinho);
2. cole a **chave desta máquina** no campo (ele é de senha: não fica à mostra);
3. **Salvar**.

O card diz na hora em que pé está: *Não configurado* · *Conectando…* · *Conectado* · *Chave
recusada* · *Bloqueada pelo TI*.

### Como a chave fica guardada

No **cofre de credenciais do sistema operacional** — Credential Manager no Windows, Keychain no
macOS (ver `src-go/secret`) — e não mais num arquivo. O `%APPDATA%\Acerola Agent\config.json`
guarda só o endereço do painel e o intervalo; a chave em si nunca passa por ali.

O cofre é por **usuário do sistema**, amarrado à conta que salvou. Na prática:

- copiar o `config.json` para outro computador **não** leva a chave junto — não há nada nele
  para levar;
- outro usuário do mesmo computador **não** enxerga o que foi salvo;
- e a chave nunca aparece em texto puro em disco, nem cifrada por conta própria — quem guarda é
  o sistema operacional, do mesmo jeito que ele guarda a senha de um site no navegador.

**Instalação vinda de uma versão anterior a este cofre:** a primeira vez que o agente novo lê um
`config.json` com a chave ainda cifrada à moda antiga, ele migra sozinho — decifra, grava no
cofre, e apaga o campo do arquivo. Não é preciso reconfigurar nada à mão. Se o arquivo vier de
outra máquina (a cifra antiga não abre), o agente diz que a chave salva não pode ser lida ali,
em vez de ficar tentando calado.

### Para instalação em massa: variável de ambiente

O ambiente **vence** o arquivo, o que permite provisionar muitas máquinas de uma vez ou apontar
uma para outro servidor (teste, homologação) sem abrir a tela:

```
ACEROLA_SERVER_URL=ws://localhost:3005/agent
ACEROLA_AGENT_TOKEN=o-token
ACEROLA_REPORT_INTERVAL_SECONDS=30
```

Aqui o token fica em texto puro na variável — é o preço de não ter ninguém na máquina para
digitar. Para uma instalação feita por pessoa, o campo da tela é o caminho.

## Como conferir se está funcionando

O agente registra no log o que decidiu:

- `reporting: not configured, running locally only (…)` — não achou configuração nenhuma.
- `reporting: sending snapshots to … every 30s` — conectado e enviando.
- `reporting: giving up, fix the agent configuration: …` — token recusado.

No painel, a máquina aparece **Online** no Inventário em poucos segundos, com a versão do agente
na ficha.

## O que ainda não faz

Se a rede cair, as leituras daquele período **se perdem** — não há fila em disco. É o próximo
passo previsto em [ROADMAP.md](ROADMAP.md).
