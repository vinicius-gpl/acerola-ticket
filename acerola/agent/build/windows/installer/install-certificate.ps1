#Requires -Version 5.1
[CmdletBinding()]
param(
    [string]$CertificatePath = (Join-Path $PSScriptRoot 'publisher.cer'),
    [string]$ServerUrl = '',
    $Token = $null,
    [string]$MsiPath = '',
    [switch]$CertificateOnly
)
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$isCi = ($env:GITHUB_ACTIONS -eq 'true') -or ($env:CI -eq 'true') -or $CertificateOnly.IsPresent

# Auto-elevação para Administrador via UAC (sem #Requires -RunAsAdministrator)
$currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($currentIdentity)
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Solicitando permissões de Administrador (UAC)..." -ForegroundColor Yellow
    $argsList = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    foreach ($key in $PSBoundParameters.Keys) {
        $val = $PSBoundParameters[$key]
        if ($val -is [switch]) {
            if ($val.IsPresent) { $argsList += " -$key" }
        } elseif ($val -isnot [Security.SecureString]) {
            $escaped = "$val".Replace('"', '`"')
            $argsList += " -$key `"$escaped`""
        }
    }
    Start-Process powershell.exe -ArgumentList $argsList -Verb RunAs
    exit 0
}

if ($isCi) {
    $certificate = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($CertificatePath)
    if ($certificate.HasPrivateKey) { throw 'Use somente o certificado público .cer.' }
    if ($certificate.NotAfter -le (Get-Date)) { throw 'O certificado está vencido.' }
    $eku = $certificate.Extensions | Where-Object { $_.Oid.Value -eq '2.5.29.37' }
    if (-not $eku -or @($eku.EnhancedKeyUsages | Where-Object { $_.Value -eq '1.3.6.1.5.5.7.3.3' }).Count -eq 0) {
        throw 'O certificado precisa permitir assinatura de código.'
    }
    Import-Certificate -FilePath $CertificatePath -CertStoreLocation 'Cert:\LocalMachine\Root' | Out-Null
    Import-Certificate -FilePath $CertificatePath -CertStoreLocation 'Cert:\LocalMachine\TrustedPublisher' | Out-Null
    Write-Host 'Certificado de assinatura instalado para este computador.'
    exit 0
}

# Quando executado pelo usuário na máquina, executa o fluxo completo (Certificado + MSI + Token + machine.json + Serviço)
try {
    $scriptDir = $PSScriptRoot
    if ([string]::IsNullOrWhiteSpace($scriptDir)) {
        $scriptDir = (Get-Location).Path
    }

    $configureScript = Join-Path $scriptDir 'configure-machine.ps1'
    if (Test-Path -LiteralPath $configureScript) {
        & $configureScript -ServerUrl $ServerUrl -Token $Token -CertificatePath $CertificatePath -MsiPath $MsiPath
        exit $LASTEXITCODE
    }

    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host "       INSTALAÇÃO E CONFIGURAÇÃO DO ACEROLA AGENT           " -ForegroundColor Cyan
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host ""

    $plainToken = "$Token".Trim().Trim("'`"")
    if ([string]::IsNullOrWhiteSpace($plainToken) -or $plainToken -eq '__TOKEN__') {
        Write-Host "Cole o token do computador gerado no dashboard:" -ForegroundColor Yellow
        $plainToken = (Read-Host).Trim().Trim("'`"")
    }
    if ([string]::IsNullOrWhiteSpace($plainToken)) {
        throw 'A chave (token) da máquina está vazia.'
    }

    $releaseInfo = $null
    # Nunca se adivinha um domínio: o token da máquina só vai para o painel informado.
    if ([string]::IsNullOrWhiteSpace($ServerUrl) -or $ServerUrl -eq '__SERVER_URL__') {
        Write-Host "Informe o endereço do painel (ex.: https://acerola.exemplo.com):" -ForegroundColor Yellow
        $ServerUrl = Read-Host
    }
    $ServerUrl = $ServerUrl.Trim().TrimEnd('/')

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
                $releaseInfo = Invoke-RestMethod -Uri "$ServerUrl/api/agent/releases/latest" `
                    -Headers @{ Authorization = "Bearer $plainToken" } `
                    -Method Get -TimeoutSec 15 -ErrorAction Stop
            } catch {}
        }
        if ($releaseInfo -and $releaseInfo.url) {
            $downloadedMsi = Join-Path $env:TEMP "acerola-agent-$($releaseInfo.version)-x64.msi"
            Write-Host "[1/4] Baixando instalador Acerola Agent $($releaseInfo.version)..." -ForegroundColor Cyan
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

    $certFile = $CertificatePath
    if (([string]::IsNullOrWhiteSpace($certFile) -or -not (Test-Path -LiteralPath $certFile)) -and $targetMsi -and (Test-Path -LiteralPath $targetMsi)) {
        try {
            $sig = Get-AuthenticodeSignature -FilePath $targetMsi
            if ($sig -and $sig.SignerCertificate) {
                $extracted = Join-Path $env:TEMP 'acerola-publisher.cer'
                Export-Certificate -Cert $sig.SignerCertificate -FilePath $extracted -Force | Out-Null
                $certFile = $extracted
            }
        } catch {}
    }

    if ($certFile -and (Test-Path -LiteralPath $certFile)) {
        $certificate = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($certFile)
        if ($certificate.HasPrivateKey) { throw 'Use somente o certificado público .cer.' }
        if ($certificate.NotAfter -le (Get-Date)) { throw 'O certificado está vencido.' }
        Import-Certificate -FilePath $certFile -CertStoreLocation 'Cert:\LocalMachine\Root' | Out-Null
        Import-Certificate -FilePath $certFile -CertStoreLocation 'Cert:\LocalMachine\TrustedPublisher' | Out-Null
        Write-Host "[1/4] Certificado de assinatura instalado." -ForegroundColor Green
    }

    if ($targetMsi -and (Test-Path -LiteralPath $targetMsi)) {
        Write-Host "[2/4] Instalando pacote MSI do agente..." -ForegroundColor Cyan
        $process = Start-Process -FilePath "$env:SystemRoot\System32\msiexec.exe" `
            -ArgumentList "/i `"$targetMsi`" /qn /norestart REBOOT=ReallySuppress" `
            -Wait -PassThru
        if ($process.ExitCode -notin @(0, 3010)) {
            throw "A instalação do MSI falhou com código $($process.ExitCode)."
        }
    }

    Write-Host "[3/4] Gravando configuração segura da máquina..." -ForegroundColor Cyan
    $directory = Join-Path $env:ProgramData 'AcerolaAgent'
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
    $dirOwner = (Get-Acl -LiteralPath $directory).GetOwner([Security.Principal.SecurityIdentifier]).Value
    if ($dirOwner -notin @('S-1-5-18', 'S-1-5-32-544')) {
        & "$env:SystemRoot\System32\takeown.exe" /F "$directory" /A | Out-Null
    }
    & "$env:SystemRoot\System32\icacls.exe" "$directory" /inheritance:r /grant "*S-1-5-18:(OI)(CI)F" "*S-1-5-32-544:(OI)(CI)F" "*S-1-5-32-545:(OI)(CI)RX" | Out-Null

    Add-Type -AssemblyName System.Security
    $bytes = [Text.Encoding]::UTF8.GetBytes($plainToken)
    try {
        $cipher = [Security.Cryptography.ProtectedData]::Protect($bytes, $null, [Security.Cryptography.DataProtectionScope]::LocalMachine)
    } finally {
        [Array]::Clear($bytes, 0, $bytes.Length)
        $bytes = $null
        $plainToken = $null
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
        $serviceExe = Join-Path $env:ProgramFiles 'Acerola\Agent\acerola-agent-service.exe'
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

    $config = @{
        serverUrl = $ServerUrl
        tokenCipher = [Convert]::ToBase64String($cipher)
        signerSha256 = $fingerprint
        autoUpdate = (-not [string]::IsNullOrWhiteSpace($fingerprint))
    }
    $json = $config | ConvertTo-Json
    $path = Join-Path $directory 'machine.json'
    [IO.File]::WriteAllText("$path.tmp", $json, (New-Object Text.UTF8Encoding($false)))
    & "$env:SystemRoot\System32\takeown.exe" /F "$path.tmp" /A | Out-Null
    & "$env:SystemRoot\System32\icacls.exe" "$path.tmp" /inheritance:r /grant "*S-1-5-18:F" "*S-1-5-32-544:F" "*S-1-5-32-545:R" | Out-Null
    Move-Item -LiteralPath "$path.tmp" -Destination $path -Force

    Write-Host "[4/4] Iniciando serviço AcerolaAgent e conectando ao painel..." -ForegroundColor Cyan
    Restart-Service -Name 'AcerolaAgent'
    $desktopExe = Join-Path $env:ProgramFiles 'Acerola\Agent\Acerola Agent.exe'
    if ((Test-Path -LiteralPath $desktopExe) -and -not (Get-Process -Name 'Acerola Agent' -ErrorAction SilentlyContinue)) {
        try { Start-Process -FilePath $desktopExe } catch {}
    }

    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "         AGENTE ACEROLA CONFIGURADO COM SUCESSO!            " -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "Arquivo gravado: $path" -ForegroundColor Green
    Write-Host "Painel conectado: $ServerUrl" -ForegroundColor Green
    Write-Host ""
    Read-Host "Pressione ENTER para concluir"
} catch {
    Write-Host ""
    Write-Host "ERRO: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Read-Host "Pressione ENTER para fechar"
    exit 1
}
