# Roadmap

O que o agente **ainda não** faz de propósito, e a direção prevista para quando isso entrar em
pauta — para quem for continuar não precisar redescobrir as decisões. O que já saiu do plano fica
marcado como **feito**, com o link para a documentação de verdade.

## Envio remoto de dados — **feito**

O agente reporta ao painel central por WebSocket, com token por máquina. Como configurar, o que
cada código de recusa significa e como conferir estão em [ENVIO-REMOTO.md](ENVIO-REMOTO.md).

O que continua valendo do plano original: o envio é só mais um assinante do `metrics.Broadcaster`
(nada mudou no `Collector`), e a cadência é bem mais espaçada que o 1s do dashboard local —
30s por padrão.

## Persistência local em caso de falha de rede

Consequência direta do item acima: se o agente vai depender de rede para reportar, precisa
aguentar ficar sem rede sem perder dados nem travar.

Direção prevista:
- Fila local em disco (ex: SQLite ou arquivo append-only) para snapshots que falharam ao enviar.
- Política de retenção (não guardar indefinidamente se o servidor ficar fora do ar por dias).
- Reenvio em lote quando a rede voltar, com backoff.

## Rodar como Windows Service

Hoje o agente é um processo comum (primeiro plano ou minimizado na bandeja) — precisa de alguém
logado para rodar. Um agente de provisionamento/monitoramento de verdade deve rodar antes do
login, sobreviver a logoff, e reiniciar sozinho se cair.

Direção prevista:
- `github.com/kardianos/service` (já escolhido, citado no pedido original) para abstrair a
  instalação/registro como serviço do Windows sem escrever a integração SCM na mão.
- A bandeja provavelmente deixa de ser o modo padrão de execução (serviços do Windows não têm
  sessão interativa) e vira uma UI opcional, iniciada à parte pelo usuário logado, que conversa
  com o serviço em background (o painel web já serve bem esse papel, sem mudança).
- Ícone monocromático (`icons/ic_launcher_monochrome.svg`, já convertido para SVG mas não usado
  hoje) é candidato natural para uma bandeja em modo "serviço rodando", separado do ícone colorido
  de "app interativo aberto".
- **Cuidado com o token (`src-go/secret`):** o cofre do sistema (Credential Manager/Keychain) é
  POR USUÁRIO. Hoje isso não importa porque quem grava e quem lê o token é a mesma conta logada.
  Um serviço roda sob outra conta (geralmente `LocalSystem`) e não vai enxergar o que a pessoa
  logada salvou — o agente subiria como serviço e pareceria "nunca configurado". Resolver isto é
  parte do design do serviço, não um detalhe a parte: ou o serviço grava o token na conta dele
  (reconfigurar na instalação do serviço), ou ele deixa de usar o cofre por usuário e passa a usar
  algo no escopo da máquina (ex: DPAPI em modo `LOCAL_MACHINE`, ou o cofre do Windows para a conta
  de serviço). Decidir os dois pontos juntos, não um depois do outro.

## Autenticação do painel web

O painel local hoje não pede login — está protegido só por escutar em `127.0.0.1`. Isso deixa de
ser suficiente no momento em que o painel precisar ser acessível de outra máquina da rede (ex:
suporte remoto olhando o dashboard sem estar fisicamente na máquina). Quando isso entrar em pauta,
precisa de autenticação antes de abrir a porta para além do localhost — não antes disso.
