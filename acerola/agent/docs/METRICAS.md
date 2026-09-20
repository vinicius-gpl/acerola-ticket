# Métricas coletadas

Duas categorias, com propósitos diferentes:

- **Inventário** (`metrics.Inventory`): fatos sobre a máquina que quase não mudam durante uma
  execução. É o que aparece na bandeja e no card "Inventário" do painel. Serve para
  **provisionamento** — decidir o que instalar, dimensionar recursos, identificar o equipamento
  num parque de máquinas.
- **Métricas ao vivo** (`metrics.Snapshot`): o que muda a cada segundo. Serve para
  **diagnóstico/observação em tempo real** — só faz sentido no painel web, com histórico.

## Inventário (bandeja + card "Inventário" do painel)

| Campo | Fonte (gopsutil) | Por que é relevante para provisionamento |
|---|---|---|
| Hostname | `host.Info()` | Identifica a máquina num inventário. |
| Sistema operacional / plataforma / versão | `host.Info()` | Decide compatibilidade de software a instalar. |
| Versão do kernel | `host.Info()` | Diagnóstico de compatibilidade mais fino (drivers, builds específicos). |
| Arquitetura (`amd64`, `arm64`...) | `host.Info().KernelArch` | Decide qual binário/instalador enviar para a máquina. |
| Modelo de CPU | `cpu.Info()` | Dimensionamento: a máquina aguenta a carga prevista? |
| Núcleos lógicos / físicos | `cpu.Info()`, `cpu.Counts()` | Dimensionamento de paralelismo (ex: quantos workers rodar). |
| Memória total | `mem.VirtualMemory()` | Dimensionamento: cabe a carga de trabalho prevista? |
| MAC address | `net.Interfaces()` | Identificador de hardware estável, útil para inventário mesmo se o IP mudar (DHCP). |
| IP local | `net.Interfaces()` | Necessário para acessar/provisionar a máquina pela rede. |
| Disco total / livre | `disk.Partitions()` + `disk.Usage()` | Decide se há espaço para instalar algo antes de tentar. |
| Uptime / ligado desde | `host.Info()` | Sinal indireto de manutenção pendente (ex: atualização pedindo reinício há dias). |

MAC e IP só consideram a **primeira interface de rede ativa, não-loopback, com endereço IPv4** —
critério documentado em `internal/metrics/collector.go` (`primaryInterface`). Numa máquina com
várias interfaces (Wi-Fi + Ethernet + VPN), isso escolhe "a que a máquina está realmente usando
para ser alcançada na rede", que é o dado útil para provisionamento; não listamos todas as
interfaces no inventário para não poluir a bandeja com ruído (a lista completa de tráfego por
interface está nas métricas ao vivo, abaixo).

Disco total/livre no inventário são a **soma de todas as partições físicas locais** (exclui
unidades óticas vazias e it. `disk.Partitions(false)` já filtra montagens virtuais). É o número
que responde "cabe mais alguma coisa nesta máquina?" de forma direta.

## Métricas ao vivo (painel web, `metrics.Snapshot`)

| Métrica | Fonte | Onde aparece |
|---|---|---|
| CPU total e por núcleo (%) | `cpu.Percent(0, ...)` | gráfico de série temporal + barrinhas por núcleo |
| Memória usada/livre/total, % de uso | `mem.VirtualMemory()` | gráfico + texto |
| Swap usada/total, % de uso | `mem.SwapMemory()` | texto |
| Uso por partição (total/usado/livre/%) | `disk.Partitions()` + `disk.Usage()` | barras por volume |
| Taxa de leitura/escrita em disco (bytes/s) | `disk.IOCounters()`, com taxa calculada entre duas amostras | gráfico |
| Taxa de download/upload por interface ativa (bytes/s) | `net.IOCounters(true)`, com taxa calculada entre duas amostras | gráfico (soma de todas as interfaces ativas) |
| Top processos por CPU (PID, nome, CPU%, mem%, memória) | `process.Processes()` | tabela |

As taxas de disco e rede não existem prontas no gopsutil — ele só expõe contadores cumulativos
(bytes desde o boot). O `Collector` guarda a amostra anterior e o instante em que foi tirada, e
calcula `(atual - anterior) / tempo_decorrido` a cada tick do `Broadcaster` — por isso a primeira
amostra depois de o agente iniciar sempre mostra taxa zero (ainda não há uma amostra anterior para
comparar).

A lista de processos é limitada a `topProcessCount` (25, definido em `cmd/agent/main.go`),
ordenada por uso de CPU. Processos que o agente não consegue inspecionar (permissão negada,
processo que terminou durante a varredura — comum no Windows para processos de sistema) são
ignorados silenciosamente; isso é esperado, não um erro do agente.

## Por que a lista de processos não entra no inventário nem na bandeja

É a métrica mais cara de coletar (percorre todos os processos do sistema) e a que menos importa
para "que máquina é essa e como está equipada" — ela responde "o que está rodando agora", uma
pergunta de diagnóstico, não de inventário. Por isso só o painel web pede processos ao
`Broadcaster`; a bandeja atualiza os rótulos usando `Broadcaster.Latest()`, que já vem pronto do
mesmo tick, sem custo extra.
