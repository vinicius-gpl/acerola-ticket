# Roadmap

O que esta fase **não** faz de propósito, e a direção prevista para quando isso entrar em pauta.
Nada aqui está implementado — é só o plano, para quem for continuar não precisar redescobrir as
decisões.

## Envio remoto de dados

Hoje o agente é 100% local: coleta métricas e as mostra na própria máquina, ponto final. A
próxima fase deve adicionar um cliente que envie snapshots periódicos para um servidor central.

Direção prevista:
- Autenticação por **token** (não usuário/senha) — um token por agente, provisionado na
  instalação, permite revogar uma máquina sem afetar as outras.
- Reaproveitar o `metrics.Broadcaster` já existente: o cliente remoto vira só mais um assinante
  (`Subscribe()`), do mesmo jeito que o painel web e a bandeja já são hoje. Não deve exigir mexer
  no `Collector`.
- Intervalo de envio provavelmente mais espaçado que o 1s do painel local (ex: a cada 30s–1min),
  para não gerar tráfego/custo desnecessário num parque de muitas máquinas.

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

## Autenticação do painel web

O painel local hoje não pede login — está protegido só por escutar em `127.0.0.1`. Isso deixa de
ser suficiente no momento em que o painel precisar ser acessível de outra máquina da rede (ex:
suporte remoto olhando o dashboard sem estar fisicamente na máquina). Quando isso entrar em pauta,
precisa de autenticação antes de abrir a porta para além do localhost — não antes disso.
