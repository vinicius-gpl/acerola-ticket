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

### 2. Grave a configuração na máquina

Arquivo `%APPDATA%\Acerola Agent\config.json`:

```json
{
  "serverUrl": "https://painel.da.empresa",
  "token": "o-token-que-o-painel-mostrou",
  "intervalSeconds": 30
}
```

- `serverUrl` aceita o endereço como você o tem na mão: `http://`, `https://`, `ws://` ou
  `wss://`. Ele é convertido, e o caminho `/agent` é completado quando falta.
- `intervalSeconds` é opcional (padrão 30). Fora da faixa de 5s a 5min, o valor é preso na
  borda mais próxima — número errado no arquivo não pode fazer a máquina parar de reportar.

### Ou por variável de ambiente

O ambiente **vence** o arquivo, o que permite apontar uma máquina para outro servidor (teste,
homologação) sem reescrever o que o instalador gravou:

```
ACEROLA_SERVER_URL=ws://localhost:3005/agent
ACEROLA_AGENT_TOKEN=o-token
ACEROLA_REPORT_INTERVAL_SECONDS=30
```

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
