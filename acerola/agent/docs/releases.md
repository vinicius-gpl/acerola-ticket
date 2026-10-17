# Releases e atualização automática do agente

O formato distribuído é **MSI x64**, para Windows 10 1809 ou superior e Windows 11. Não depende
da Microsoft Store. O certificado é autoassinado e fixo entre releases. O TI instala e configura
uma vez com administrador; depois o serviço pode atualizar sem janela, UAC ou login de usuário.

## Tag de release do agente

`agent/v1.2.3` valida e compila o agente, gera o MSI assinado, o certificado público e os
scripts, e envia os arquivos ao **mesmo bucket privado do Cloudflare R2 que o dashboard já usa**
(pela API compatível com S3); não cria outro bucket.
Depois faz o bump de versão em `main` e `develop`.

Não há canal no meio, sufixo, prerelease nem zeros à esquerda. `agent/prod/v1.2.3`, `v1.2.3` e
`agent/v01.2.3` não são releases válidas. Para MSI, major e minor vão até 255; patch até 65535.
A tag precisa apontar para um commit que pertença ao histórico de `origin/main`.

Depois de integrar esta implementação na main, crie a tag na main atualizada:

```bash
git switch main
git pull --ff-only
git tag agent/v0.2.0
git push origin agent/v0.2.0
```

A fonte da versão é a tag. A CI aplica a versão **antes** do build. Depois da publicação cria
um commit `[chore](agent): Atualiza versão para … [skip ci]` nas duas branches.
O commit contém só os arquivos de versão. A tag original não é movida: aponta para o código-fonte
antes do bump, como no fluxo de referência do `acerola-reader`.

O agente atualiza `wails.json`, `src-go/version/version.go`, `svelte/package.json` e seu lockfile.
Não altera versões de dependências. O bump tenta push normal até três
vezes em checkouts temporários, sem force push ou rebase; nunca diminui uma versão mais recente.

As releases do agente são serializadas; publique uma tag por vez e aguarde o término antes da
próxima (GitHub conserva só uma execução pendente por grupo). Não reutilize uma tag para outros bytes.

## Configuração do GitHub, uma vez

Em **Settings → Secrets and variables → Actions**, configure:

| Tipo | Nome | Conteúdo |
|---|---|---|
| Secret | `AGENT_SIGNING_PFX_BASE64` | PFX autoassinado em Base64, com a chave privada |
| Secret | `AGENT_SIGNING_PASSWORD` | Senha do PFX |
| Secret | `R2_ACCESS_KEY_ID` | Token do R2 com escrita no bucket do projeto |
| Secret | `R2_SECRET_ACCESS_KEY` | Segredo desse token |
| Secret opcional | `DEPLOY_KEY` | Chave SSH com escrita, autorizada a fazer bump em main/develop |
| Variable | `R2_ACCOUNT_ID` | ID da conta da Cloudflare (o endereço do R2 é montado a partir dele) |
| Variable | `R2_BUCKET` | Nome do bucket privado usado pelo backend |

Sem `DEPLOY_KEY`, o bump usa `GITHUB_TOKEN` com `contents: write`. Branch protegida exige
configurar a identidade de automação autorizada na proteção. Uma chave SSH não ignora proteção
sozinha. O job falha se o push for recusado; nunca muda a proteção automaticamente.

O token do R2 precisa ler e escrever no bucket; nunca é embutido no agente. Use a mesma conta e
o mesmo bucket do `server/.env` do dashboard (`R2_ACCOUNT_ID`, `R2_BUCKET`). Os artefatos ficam
em `agent/releases/<versão>/` dentro desse bucket. O GitHub Actions apenas executa a compilação e
transfere artefatos entre seus jobs; a distribuição dos arquivos é feita pelo R2.

### Gerar o certificado autoassinado persistente

Em um Windows confiável, rode uma única vez. Não gere outro certificado a cada tag.

```powershell
$password = Read-Host 'Senha da chave de assinatura' -AsSecureString
.\acerola\agent\build\windows\installer\new-signing-certificate.ps1 `
    -OutputDirectory "$env:USERPROFILE\acerola-signing" -Password $password
```

Guarde `acerola-agent-signing.pfx` e a senha em um cofre. Para cadastrar o PFX no GitHub sem
imprimir o segredo no terminal (com `gh` já autenticado):

```powershell
$pfx = "$env:USERPROFILE\acerola-signing\acerola-agent-signing.pfx"
[Convert]::ToBase64String([IO.File]::ReadAllBytes($pfx)) |
    gh secret set AGENT_SIGNING_PFX_BASE64 --repo vinicius-gpl/acerola-ticket
# O comando abaixo pede o valor sem incluí-lo na linha de comando:
gh secret set AGENT_SIGNING_PASSWORD --repo vinicius-gpl/acerola-ticket
```

Somente `publisher.cer`, que não contém a chave privada, acompanha as releases. As assinaturas
usam SHA256 e timestamp. A chave privada existe apenas nos Secrets e temporariamente no runner
que assina. CI de PR usa uma chave descartável, sem acessar a chave de release.

Antes de o certificado vencer, planeje a troca de confiança e do fingerprint nas máquinas com o
TI. Uma nova chave não será aceita silenciosamente pelo atualizador antigo. O certificado HTTPS
do servidor é outro certificado: o Windows também precisa confiar na CA da rede interna.

## Primeira instalação no Windows 10/11

Baixe da mesma versão no bucket do dashboard o `.msi`, `publisher.cer`, `install-certificate.ps1` e
`configure-machine.ps1`. Use PowerShell **como administrador**, na pasta dos arquivos. A primeira
importação de confiança é uma ação explícita do TI; depois as atualizações são silenciosas.

```powershell
# A exceção vale só para este processo, para executar o primeiro script antes de confiar nele.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\install-certificate.ps1

$installer = Start-Process "$env:SystemRoot\System32\msiexec.exe" `
    -ArgumentList '/i "acerola-agent-0.2.0-x64.msi" /qn /norestart REBOOT=ReallySuppress' `
    -Wait -PassThru
if ($installer.ExitCode -notin @(0, 3010)) { throw "Instalação falhou: $($installer.ExitCode)" }

# Copie a chave do computador cadastrado no dashboard. Não a escreva no comando ou num log.
$token = Read-Host 'Chave deste computador' -AsSecureString
.\configure-machine.ps1 -ServerUrl 'https://acerola.exemplo.com' -Token $token
```

A máquina precisa ter o runtime Microsoft Edge WebView2 para a **interface** Wails. O serviço
não usa WebView2 e funciona antes do login. A bandeja inicia no próximo login, pelo registro de
inicialização do Windows. Não é necessário reiniciar o computador para iniciar o serviço.

O script importa o certificado público nas lojas locais `Root` e `TrustedPublisher`, usadas
pela assinatura Authenticode. Faça isso somente com o certificado que o TI gerou e conferiu.
Ele grava `%ProgramData%\AcerolaAgent\machine.json` com:

- origem HTTPS do dashboard, sem caminho, query ou credenciais;
- token cifrado com DPAPI LocalMachine;
- SHA256 do certificado de assinatura fixado pelo TI;
- `autoUpdate: true` (use `-DisableAutoUpdate` no provisionamento para desativar).

A pasta não herda permissões de usuários comuns: só SYSTEM e administradores leem/escrevem.
O serviço recusa links/junctions e arquivos de máquina que não pertençam a SYSTEM ou ao grupo Administradores.
DPAPI LocalMachine permite ao serviço abrir o token sem depender do usuário que configurou.
Não se copia automaticamente o cofre de uma sessão humana para SYSTEM: instalações antigas
precisam deste provisionamento inicial uma vez. Configuração e identidade são preservadas nos
upgrades e na desinstalação, para permitir recuperação; a limpeza definitiva é ação explícita do TI.

## Serviço e atualização

`AcerolaAgent`, executado como LocalSystem, coleta e envia métricas pelo WebSocket já existente.
A bandeja mantém as métricas locais, mas não abre outra conexão de telemetria quando o serviço
está instalado. A tela mostra “Gerenciado pelo TI” e não oferece um segundo formulário de conexão.
A configuração de envio dessa instalação deve ser feita pelo script do TI.

Ao iniciar, e depois a cada hora, o serviço consulta `GET /api/agent/releases/latest` com o token
da máquina em `Authorization: Bearer`. A API usa a autenticação já existente dos computadores;
chave inválida/revogada recebe 401 e computador bloqueado recebe 403. Sem release, recebe 204.
O backend devolve versão, tamanho, SHA256 e uma URL temporária do MSI no bucket privado.

O atualizador:

1. Não segue redirecionamento na consulta autenticada; nunca envia o token ao storage.
2. Só considera uma versão estritamente maior, com download HTTPS de até 512 MB.
3. Baixa em arquivo temporário e confere tamanho e SHA256.
4. Confere Authenticode e o SHA256 do certificado fixado na instalação inicial.
5. Chama `msiexec /qn /norestart REBOOT=ReallySuppress` em processo separado.

O MSI para o serviço, fecha a bandeja se estiver aberta, substitui arquivos e inicia o serviço
novo. O instalador continua vivo quando o serviço antigo é parado. A bandeja volta no próximo
login; a coleta e a telemetria voltam com o serviço, sem login. Não há reinicialização forçada
do computador. Código 3010 indica que o Windows deixou alguma operação pendente de reboot.

Sem rede ou download válido, mantém a versão atual e tenta novamente após cinco minutos. Depois
de entregar um pacote ao MSI, guarda um recuo de uma hora em disco para evitar ciclo caso a
instalação falhe e reinicie a versão antiga. O Windows Installer faz rollback transacional de
falhas de instalação; isso não garante detectar automaticamente defeitos funcionais de uma
versão que instalou com sucesso. Para revertê-la, publique uma versão maior com a correção.

O dashboard passa a receber a nova versão no `hello`/snapshots existentes. Os detalhes de falhas
de update ficam nos logs locais; ainda não há uma tela de acompanhamento das instalações.

## R2 e proxy

O histórico fica em `agent/releases/<versão>/`, com MSI, CER, scripts, `SHA256SUMS` e manifest.
O ponteiro `agent/latest.json` só muda depois do upload de todos os arquivos. Reexecutar o job de
publicação com o mesmo artefato é permitido; bytes diferentes na mesma versão são recusados.
Se precisar reconstruir um instalador já publicado, crie outra versão.

O proxy/forwardAuth deve deixar passar **somente** `/agent` e `GET /api/agent/releases/latest`
para autenticação pela própria aplicação, sem exigir cookie humano ou redirecionar ao login.
Preserve o cabeçalho Authorization e mantenha HTTPS e o limite geral da API. Não abra todas as
rotas `/api/computers`. As credenciais do R2 não passam pelo proxy para o agente.


## Diagnóstico e validação

```powershell
Get-Service AcerolaAgent
Get-Content "$env:ProgramData\AcerolaAgent\service.log" -Tail 50
Get-Content "$env:ProgramData\AcerolaAgent\updates\install.log" -Tail 100
```

O log do serviço gira no início quando ultrapassa 5 MB. Não registra token nem URL assinada.
O log verbose do Windows Installer ajuda a identificar código 1618 (outro instalador ativo),
1603 (falha de instalação) ou necessidade de reboot. A repetição respeita o recuo de uma hora.

`Tests/Agent` compila o aplicativo e o serviço no Windows, testa regras de tag/bump,
gera MSI no Ubuntu, assina com certificado descartável e instala/inicia/desinstala num runner
Windows limpo. Releases usam a mesma construção com o certificado persistente. Antes de liberar
para todo o parque, valide o primeiro upgrade entre duas versões em máquinas de teste Windows
10 e 11, com e sem usuário logado e com a rede indisponível no boot.

## Download no dashboard e versão LTS

O menu **Agente Windows** aparece em Infraestrutura e Sistema. A sessão precisa ter
um desses módulos. O inventário permanece restrito à Infraestrutura. A página baixa
separadamente o MSI, `publisher.cer` e `install-certificate.ps1`. O backend gera links
temporários no mesmo bucket privado do R2 usado pelo dashboard.

Abaixo da LTS, **Todas as versões** lista cada versão publicada no R2 (as pastas de
`agent/releases/`, até as 30 mais novas), com a LTS marcada, e baixa os mesmos três arquivos de
qualquer uma delas — é o caminho para voltar uma máquina para a versão anterior.

Publicar `agent/vX.Y.Z` arquiva os arquivos, sem promover automaticamente uma LTS.
Depois de validar a versão, execute **Release/Agent LTS** no GitHub Actions,
informando a tag publicada. Alternativamente, com as variáveis `R2_*` do mesmo bucket
no ambiente e o SDK instalado pelo lockfile do dashboard:

```sh
mise run agent:promote-lts -- agent/v1.2.3
```

A promoção confere a existência dos arquivos e a integridade do MSI e certificado
antes de atualizar `agent/lts.json`. Não aceita reduzir a versão da LTS. Os arquivos
anteriores são preservados. O dashboard e o atualizador das máquinas consultam essa
mesma LTS; sem ela, o dashboard mostra indisponibilidade e o agente não atualiza.
O endpoint `/api/agent/releases/latest` mantém o nome, mas seleciona a LTS.

Na primeira instalação, mantenha os três arquivos na mesma pasta. Abra o PowerShell
como administrador nessa pasta e execute:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\install-certificate.ps1
```

Depois execute o MSI. Para conectar a máquina, use `configure-machine.ps1`, instalado
em `C:\Program Files\Acerola\Agent`, com a URL e a chave fornecidas pela Infraestrutura,
conforme o provisionamento descrito acima.
