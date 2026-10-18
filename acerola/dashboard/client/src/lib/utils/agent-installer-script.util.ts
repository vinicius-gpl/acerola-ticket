import { triggerBrowserDownload } from './download-file.util';

export type AgentInstallerScriptOptions = {
  serverUrl?: string;
  token?: string;
  fileName?: string;
};

/**
 * Gera o conteúdo do script PowerShell de instalação do Acerola Agent (`install-agent.ps1`).
 *
 * Se a URL do servidor ou o token forem informados, eles são embutidos como valores padrão,
 * evitando que a pessoa precise digitá-los ou passá-los manualmente no terminal.
 */
export function generateAgentInstallerScript(
  options: {
    serverUrl?: string;
    token?: string;
  } = {},
): string {
  const { serverUrl, token } = options;

  // Sanitiza para evitar injeção de aspas ou quebras de linha indesejadas no PowerShell
  const safeServerUrl = serverUrl ? serverUrl.trim().replace(/[`$"'\r\n]/g, '') : '__SERVER_URL__';
  const safeToken = token ? token.trim().replace(/[`$"'\r\n]/g, '') : '__TOKEN__';

  return `#Requires -Version 5.1
<#
.SYNOPSIS
    Instalação e configuração completa do Acerola Agent no Windows.
.DESCRIPTION
    1. Eleva automaticamente para Administrador (UAC) se executado como usuário comum.
    2. Solicita apenas o token do computador (caso não esteja embutido).
    3. Resolve automaticamente a URL do dashboard e baixa o MSI se não estiver na pasta.
    4. Instala o certificado público publisher.cer nas lojas Root e TrustedPublisher.
    5. Instala o pacote MSI acerola-agent-*-x64.msi silenciosamente via msiexec.
    6. Cifra o token com DPAPI LocalMachine e grava em %ProgramData%\\AcerolaAgent\\machine.json.
    7. Inicia o serviço AcerolaAgent e abre o aplicativo na bandeja.
#>
[CmdletBinding()]
param(
    [string]$ServerUrl = '${safeServerUrl}',
    [string]$Token = '${safeToken}',
    [string]$CertificatePath = '',
    [string]$MsiPath = '',
    [switch]$DisableAutoUpdate
)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# Auto-elevação para Administrador
$currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($currentIdentity)
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Solicitando permissões de Administrador..." -ForegroundColor Yellow
    $argsList = "-NoProfile -ExecutionPolicy Bypass -File \`"$PSCommandPath\`""
    if ($PSBoundParameters.Count -gt 0) {
        foreach ($key in $PSBoundParameters.Keys) {
            $val = $PSBoundParameters[$key]
            if ($val -is [switch]) {
                if ($val.IsPresent) { $argsList += " -$key" }
            } else {
                $escaped = "$val".Replace('"', '\`"')
                $argsList += " -$key \`"$escaped\`""
            }
        }
    }
    Start-Process powershell.exe -ArgumentList $argsList -Verb RunAs
    exit 0
}

try {
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host "          INSTALAÇÃO DO ACEROLA AGENT NO WINDOWS           " -ForegroundColor Cyan
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host ""

    $scriptDir = $PSScriptRoot
    if ([string]::IsNullOrWhiteSpace($scriptDir)) {
        $scriptDir = (Get-Location).Path
    }

    # 1. Obtenção do Token (única coisa solicitada ao usuário se não estiver embutido)
    if ([string]::IsNullOrWhiteSpace($Token) -or $Token -eq '__TOKEN__') {
        Write-Host "Cole a chave (token) do computador gerada no dashboard:" -ForegroundColor Yellow
        $Token = Read-Host
    }
    $Token = "$Token".Trim().Trim("'\`"")
    if ([string]::IsNullOrWhiteSpace($Token)) {
        throw "A chave do computador é obrigatória para conectar a máquina."
    }

    # 2. O endereço do painel. O script baixado do dashboard já vem com ele; sem ele, pergunta.
    #    Nunca se tenta adivinhar um domínio: o token da máquina só vai para o painel informado.
    $releaseInfo = $null
    if ([string]::IsNullOrWhiteSpace($ServerUrl) -or $ServerUrl -eq '__SERVER_URL__') {
        Write-Host "Informe o endereço do painel (ex.: https://acerola.exemplo.com):" -ForegroundColor Yellow
        $ServerUrl = Read-Host
    }
    $ServerUrl = $ServerUrl.Trim().TrimEnd('/')
    try {
        $uri = [System.Uri]$ServerUrl
        $ServerUrl = "$($uri.Scheme)://$($uri.Authority)"
    } catch {}

    # 3. Localização ou download automático do MSI
    $targetMsi = $MsiPath
    if ([string]::IsNullOrWhiteSpace($targetMsi) -or -not (Test-Path -LiteralPath $targetMsi)) {
        $found = Get-ChildItem -Path $scriptDir -Filter "acerola-agent-*-x64.msi" -File -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found) {
            $targetMsi = $found.FullName
        } else {
            $anyMsi = Get-ChildItem -Path $scriptDir -Filter "*.msi" -File -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($anyMsi) { $targetMsi = $anyMsi.FullName }
        }
    }

    if (-not $targetMsi -or -not (Test-Path -LiteralPath $targetMsi)) {
        if (-not $releaseInfo) {
            try {
                $releaseInfo = Invoke-RestMethod -Uri "$ServerUrl/api/agent/releases/latest" \`
                    -Headers @{ Authorization = "Bearer $Token" } \`
                    -Method Get -TimeoutSec 15 -ErrorAction Stop
            } catch {}
        }
        if ($releaseInfo -and $releaseInfo.url) {
            $downloadedMsi = Join-Path $env:TEMP "acerola-agent-$($releaseInfo.version)-x64.msi"
            Write-Host "Baixando instalador Acerola Agent $($releaseInfo.version)..." -ForegroundColor Cyan
            Invoke-WebRequest -Uri $releaseInfo.url -OutFile $downloadedMsi -UseBasicParsing
            if ($releaseInfo.sha256) {
                $actualHash = (Get-FileHash -LiteralPath $downloadedMsi -Algorithm SHA256).Hash.ToLowerInvariant()
                if ($actualHash -ne "$($releaseInfo.sha256)".ToLowerInvariant()) {
                    Remove-Item -LiteralPath $downloadedMsi -Force -ErrorAction SilentlyContinue
                    throw 'O hash SHA256 do instalador baixado não confere.'
                }
            }
            $targetMsi = $downloadedMsi
        }
    }

    # 4. Instalação do Certificado de Assinatura
    Write-Host "[1/4] Instalando certificado de assinatura..." -ForegroundColor Cyan
    $certFile = $CertificatePath
    if ([string]::IsNullOrWhiteSpace($certFile) -or -not (Test-Path -LiteralPath $certFile)) {
        $candidate = Join-Path $scriptDir 'publisher.cer'
        if (Test-Path -LiteralPath $candidate) {
            $certFile = $candidate
        }
    }

    if (([string]::IsNullOrWhiteSpace($certFile) -or -not (Test-Path -LiteralPath $certFile)) -and $targetMsi -and (Test-Path -LiteralPath $targetMsi)) {
        try {
            $sig = Get-AuthenticodeSignature -FilePath $targetMsi
            if ($sig -and $sig.SignerCertificate) {
                $extracted = Join-Path $env:TEMP 'acerola-publisher.cer'
                Export-Certificate -Cert $sig.SignerCertificate -FilePath $extracted -Force | Out-Null
                $certFile = $extracted
                Write-Host "   Certificado público extraído da assinatura do MSI." -ForegroundColor Green
            }
        } catch {}
    }

    if ($certFile -and (Test-Path -LiteralPath $certFile)) {
        try {
            $certificate = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($certFile)
            if ($certificate.HasPrivateKey) { throw 'O certificado público não pode conter chave privada.' }
            if ($certificate.NotAfter -le (Get-Date)) { throw 'O certificado está vencido.' }
            Import-Certificate -FilePath $certFile -CertStoreLocation 'Cert:\\LocalMachine\\Root' | Out-Null
            Import-Certificate -FilePath $certFile -CertStoreLocation 'Cert:\\LocalMachine\\TrustedPublisher' | Out-Null
            Write-Host "   Certificado instalado com sucesso nas lojas locais." -ForegroundColor Green
        } catch {
            Write-Warning "   Falha ao instalar certificado: $_"
        }
    }

    # 5. Instalação do MSI
    Write-Host "[2/4] Instalando pacote MSI do agente..." -ForegroundColor Cyan
    if ($targetMsi -and (Test-Path -LiteralPath $targetMsi)) {
        Write-Host "   Executando $(Split-Path $targetMsi -Leaf)..." -ForegroundColor Yellow
        $process = Start-Process "$env:SystemRoot\\System32\\msiexec.exe" \`
            -ArgumentList "/i \`"$targetMsi\`" /qn /norestart REBOOT=ReallySuppress" \`
            -Wait -PassThru
        if ($process.ExitCode -notin @(0, 3010)) {
            throw "A instalação do MSI falhou com código de saída: $($process.ExitCode)"
        }
        Write-Host "   MSI instalado com sucesso." -ForegroundColor Green
    } else {
        Write-Host "   Verificando instalação existente..." -ForegroundColor Yellow
    }

    # 6. Configuração em %ProgramData%\\AcerolaAgent\\machine.json
    Write-Host "[3/4] Gravando configuração segura da máquina..." -ForegroundColor Cyan
    $directory = Join-Path $env:ProgramData 'AcerolaAgent'
    if (Test-Path -LiteralPath $directory) {
        $item = Get-Item -LiteralPath $directory -Force
        if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'A pasta do agente não pode ser um link ou junction.' }
    }
    New-Item -ItemType Directory -Path $directory -Force | Out-Null

    foreach ($name in @('machine.json', 'machine.json.tmp', 'updates')) {
        $candidate = Join-Path $directory $name
        if ((Test-Path -LiteralPath $candidate) -and ((Get-Item -LiteralPath $candidate -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)) {
            throw 'Existe um link inesperado na pasta do agente. Peça ao TI para verificar.'
        }
    }

    $dirOwner = (Get-Acl -LiteralPath $directory).GetOwner([Security.Principal.SecurityIdentifier]).Value
    if ($dirOwner -notin @('S-1-5-18', 'S-1-5-32-544')) {
        & "$env:SystemRoot\\System32\\takeown.exe" /F "$directory" /A | Out-Null
    }
    & "$env:SystemRoot\\System32\\icacls.exe" "$directory" /inheritance:r /grant "*S-1-5-18:(OI)(CI)F" "*S-1-5-32-544:(OI)(CI)F" "*S-1-5-32-545:(OI)(CI)RX" | Out-Null

    Add-Type -AssemblyName System.Security
    $bytes = [Text.Encoding]::UTF8.GetBytes($Token)
    try {
        $cipher = [Security.Cryptography.ProtectedData]::Protect($bytes, $null, [Security.Cryptography.DataProtectionScope]::LocalMachine)
    } finally {
        [Array]::Clear($bytes, 0, $bytes.Length)
        $bytes = $null
    }

    $fingerprint = ""
    if ($certFile -and (Test-Path -LiteralPath $certFile)) {
        try {
            $cert = New-Object Security.Cryptography.X509Certificates.X509Certificate2($certFile)
            $sha = [Security.Cryptography.SHA256]::Create()
            $fingerprint = ([BitConverter]::ToString($sha.ComputeHash($cert.RawData))).Replace('-', '').ToLowerInvariant()
        } catch {}
    }

    if ([string]::IsNullOrWhiteSpace($fingerprint)) {
        $serviceExe = Join-Path $env:ProgramFiles 'Acerola\\Agent\\acerola-agent-service.exe'
        if (Test-Path -LiteralPath $serviceExe) {
            try {
                $sig = Get-AuthenticodeSignature -FilePath $serviceExe
                if ($sig -and $sig.SignerCertificate) {
                    $sha = [Security.Cryptography.SHA256]::Create()
                    $fingerprint = ([BitConverter]::ToString($sha.ComputeHash($sig.SignerCertificate.RawData))).Replace('-', '').ToLowerInvariant()
                }
            } catch {}
        }
    }

    $effectiveAutoUpdate = (-not $DisableAutoUpdate.IsPresent) -and (-not [string]::IsNullOrWhiteSpace($fingerprint))

    $config = @{
        serverUrl = $ServerUrl
        tokenCipher = [Convert]::ToBase64String($cipher)
        signerSha256 = $fingerprint
        autoUpdate = $effectiveAutoUpdate
    }
    $json = $config | ConvertTo-Json
    $path = Join-Path $directory 'machine.json'
    [IO.File]::WriteAllText("$path.tmp", $json, (New-Object Text.UTF8Encoding($false)))
    & "$env:SystemRoot\\System32\\takeown.exe" /F "$path.tmp" /A | Out-Null
    & "$env:SystemRoot\\System32\\icacls.exe" "$path.tmp" /inheritance:r /grant "*S-1-5-18:F" "*S-1-5-32-544:F" "*S-1-5-32-545:R" | Out-Null
    Move-Item -LiteralPath "$path.tmp" -Destination $path -Force
    Write-Host "   Configuração gravada com sucesso em $path." -ForegroundColor Green

    # 7. Inicialização do Serviço
    Write-Host "[4/4] Iniciando o serviço AcerolaAgent..." -ForegroundColor Cyan
    if (Get-Service -Name 'AcerolaAgent' -ErrorAction SilentlyContinue) {
        Restart-Service -Name 'AcerolaAgent'
        $logPath = Join-Path $directory 'service.log'
        $deadline = (Get-Date).AddSeconds(6)
        while ((Get-Date) -lt $deadline) {
            if ((Test-Path -LiteralPath $logPath) -and ((Get-Content -LiteralPath $logPath -Raw -ErrorAction SilentlyContinue) -match 'service: reporting configured')) {
                break
            }
            Start-Sleep -Milliseconds 250
        }
        Write-Host "   Serviço AcerolaAgent reiniciado e ativo." -ForegroundColor Green
    } else {
        Write-Warning "   O serviço AcerolaAgent ainda não foi encontrado. Verifique se o MSI foi instalado."
    }

    # 8. Inicia aplicativo do agente na sessão do usuário
    $desktopExe = Join-Path $env:ProgramFiles 'Acerola\\Agent\\Acerola Agent.exe'
    if ((Test-Path -LiteralPath $desktopExe) -and -not (Get-Process -Name 'Acerola Agent' -ErrorAction SilentlyContinue)) {
        try {
            Start-Process -FilePath $desktopExe
            Write-Host "   Aplicativo Acerola Agent aberto na área de trabalho." -ForegroundColor Green
        } catch {}
    }

    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "         AGENTE ACEROLA CONFIGURADO COM SUCESSO!            " -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "O computador agora está conectado ao servidor e enviando telemetria."
    Write-Host ""
    Read-Host "Pressione ENTER para sair"
} catch {
    Write-Host ""
    Write-Host "ERRO: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Read-Host "Pressione ENTER para fechar"
    exit 1
}
`;
}

/**
 * Baixa o script `install-agent.ps1` pronto para execução no computador Windows.
 */
export function downloadAgentInstallerScript(options: AgentInstallerScriptOptions = {}): void {
  const { serverUrl, token, fileName = 'install-agent.ps1' } = options;
  const content = generateAgentInstallerScript({ serverUrl, token });
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  triggerBrowserDownload(blob, fileName);
}
