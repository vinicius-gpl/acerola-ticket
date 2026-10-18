#Requires -Version 5.1
[CmdletBinding()]
param(
    [string]$ServerUrl = '',
    $Token = $null,
    [string]$CertificatePath = '',
    [string]$MsiPath = '',
    [switch]$DisableAutoUpdate
)
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$isAutomated = ($env:GITHUB_ACTIONS -eq 'true') -or ($env:CI -eq 'true') -or $DisableAutoUpdate.IsPresent -or ($Token -is [Security.SecureString])

# Auto-elevação para Administrador via UAC (sem exigir abrir terminal como Admin manualmente)
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

try {
    $scriptDir = $PSScriptRoot
    if ([string]::IsNullOrWhiteSpace($scriptDir)) {
        $scriptDir = (Get-Location).Path
    }

    if (-not $isAutomated) {
        Write-Host "==========================================================" -ForegroundColor Cyan
        Write-Host "       INSTALAÇÃO E CONFIGURAÇÃO DO ACEROLA AGENT           " -ForegroundColor Cyan
        Write-Host "==========================================================" -ForegroundColor Cyan
        Write-Host ""
    }

    # 1. Obtenção do Token (única informação solicitada ao usuário se não informada)
    $plainToken = ""
    if ($Token -is [Security.SecureString]) {
        $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token)
        try {
            $plainToken = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
        } finally {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
        }
    } elseif ($null -ne $Token) {
        $plainToken = "$Token".Trim().Trim("'`"")
    }
    if ($plainToken -eq '__TOKEN__') {
        $plainToken = ""
    }
    if ([string]::IsNullOrWhiteSpace($plainToken)) {
        Write-Host "Cole o token do computador gerado no dashboard:" -ForegroundColor Yellow
        $plainToken = (Read-Host).Trim().Trim("'`"")
    }
    if ([string]::IsNullOrWhiteSpace($plainToken)) {
        throw 'A chave (token) da máquina está vazia.'
    }

    # 2. Resolução automática do ServerUrl e metadados da release
    if ($ServerUrl -eq '__SERVER_URL__') {
        $ServerUrl = ''
    }
    $releaseInfo = $null
    if ([string]::IsNullOrWhiteSpace($ServerUrl)) {
        $candidates = New-Object System.Collections.Generic.List[string]
        $existingConfigPath = Join-Path (Join-Path $env:ProgramData 'AcerolaAgent') 'machine.json'
        if (Test-Path -LiteralPath $existingConfigPath) {
            try {
                $existingCfg = Get-Content -LiteralPath $existingConfigPath -Raw | ConvertFrom-Json
                if ($existingCfg.serverUrl) {
                    [void]$candidates.Add("$($existingCfg.serverUrl)".Trim().TrimEnd('/'))
                }
            } catch {}
        }
        # Só o endereço que esta máquina já usava: nunca se adivinha um domínio, porque o token
        # da máquina vai junto na consulta.
        foreach ($candidateUrl in $candidates) {
            try {
                $resp = Invoke-WebRequest -Uri "$candidateUrl/api/agent/releases/latest" `
                    -Headers @{ Authorization = "Bearer $plainToken" } `
                    -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
                $ServerUrl = $candidateUrl
                if ($resp.StatusCode -eq 200 -and $resp.Content) {
                    $releaseInfo = $resp.Content | ConvertFrom-Json
                }
                break
            } catch {
                $statusCode = $null
                if ($_.Exception.Response) {
                    try { $statusCode = [int]$_.Exception.Response.StatusCode } catch {}
                }
                if ($statusCode -in @(204, 403, 503)) {
                    $ServerUrl = $candidateUrl
                    break
                }
            }
        }
        if ([string]::IsNullOrWhiteSpace($ServerUrl)) {
            Write-Host "Informe o endereço do painel (ex.: https://acerola.exemplo.com):" -ForegroundColor Yellow
            $ServerUrl = Read-Host
        }
    }

    $ServerUrl = $ServerUrl.Trim().TrimEnd('/')
    if (-not ($ServerUrl -match '^https?://')) {
        throw 'Informe a origem HTTP ou HTTPS do dashboard.'
    }
    try {
        $uri = [System.Uri]$ServerUrl
        $ServerUrl = "$($uri.Scheme)://$($uri.Authority)"
    } catch {}

    # 3. Localização ou download automático do MSI se necessário
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

    $serviceInstalled = $null -ne (Get-Service -Name 'AcerolaAgent' -ErrorAction SilentlyContinue)
    if ((-not $targetMsi -or -not (Test-Path -LiteralPath $targetMsi)) -and (-not $serviceInstalled) -and (-not $isAutomated)) {
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

    # 4. Certificado de Assinatura
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
            }
        } catch {}
    }

    if ($certFile -and (Test-Path -LiteralPath $certFile)) {
        try {
            $certificate = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($certFile)
            if ($certificate.HasPrivateKey) { throw 'Use somente o certificado público .cer.' }
            if ($certificate.NotAfter -le (Get-Date)) { throw 'O certificado está vencido.' }
            Import-Certificate -FilePath $certFile -CertStoreLocation 'Cert:\LocalMachine\Root' | Out-Null
            Import-Certificate -FilePath $certFile -CertStoreLocation 'Cert:\LocalMachine\TrustedPublisher' | Out-Null
        } catch {
            if ($isAutomated) { throw }
            Write-Warning "Aviso ao importar certificado: $_"
        }
    }

    # 5. Instalação do MSI (quando presente na pasta ou baixado automaticamente)
    if ($targetMsi -and (Test-Path -LiteralPath $targetMsi) -and (-not $isAutomated)) {
        Write-Host "[2/4] Instalando pacote MSI do agente..." -ForegroundColor Cyan
        $process = Start-Process -FilePath "$env:SystemRoot\System32\msiexec.exe" `
            -ArgumentList "/i `"$targetMsi`" /qn /norestart REBOOT=ReallySuppress" `
            -Wait -PassThru
        if ($process.ExitCode -notin @(0, 3010)) {
            throw "A instalação do MSI falhou com código $($process.ExitCode)."
        }
    }

    $fingerprint = ""
    if ($certFile -and (Test-Path -LiteralPath $certFile)) {
        try {
            $certificate = New-Object Security.Cryptography.X509Certificates.X509Certificate2($certFile)
            $sha = [Security.Cryptography.SHA256]::Create()
            $fingerprint = ([BitConverter]::ToString($sha.ComputeHash($certificate.RawData))).Replace('-', '').ToLowerInvariant()
        } catch {}
    }

    if ([string]::IsNullOrWhiteSpace($fingerprint)) {
        $serviceExe = Join-Path $scriptDir 'acerola-agent-service.exe'
        if (-not (Test-Path -LiteralPath $serviceExe)) {
            $serviceExe = Join-Path $env:ProgramFiles 'Acerola\Agent\acerola-agent-service.exe'
        }
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

    # 6. Criação e permissões do diretório %ProgramData%\AcerolaAgent
    if (-not $isAutomated) {
        Write-Host "[3/4] Gravando configuração segura da máquina..." -ForegroundColor Cyan
    }
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
        & "$env:SystemRoot\System32\takeown.exe" /F "$directory" /A | Out-Null
    }
    & "$env:SystemRoot\System32\icacls.exe" "$directory" /inheritance:r /grant "*S-1-5-18:(OI)(CI)F" "*S-1-5-32-544:(OI)(CI)F" "*S-1-5-32-545:(OI)(CI)RX" | Out-Null

    # 7. Cifra DPAPI LocalMachine e gravação de machine.json com dono Administrators
    Add-Type -AssemblyName System.Security
    $bytes = [Text.Encoding]::UTF8.GetBytes($plainToken)
    try {
        $cipher = [Security.Cryptography.ProtectedData]::Protect($bytes, $null, [Security.Cryptography.DataProtectionScope]::LocalMachine)
    } finally {
        [Array]::Clear($bytes, 0, $bytes.Length)
        $bytes = $null
        $plainToken = $null
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
    & "$env:SystemRoot\System32\takeown.exe" /F "$path.tmp" /A | Out-Null
    & "$env:SystemRoot\System32\icacls.exe" "$path.tmp" /inheritance:r /grant "*S-1-5-18:F" "*S-1-5-32-544:F" "*S-1-5-32-545:R" | Out-Null
    Move-Item -LiteralPath "$path.tmp" -Destination $path -Force

    Get-ChildItem -LiteralPath $directory -Force -ErrorAction SilentlyContinue | ForEach-Object {
        $itemOwner = (Get-Acl -LiteralPath $_.FullName).GetOwner([Security.Principal.SecurityIdentifier]).Value
        if ($itemOwner -notin @('S-1-5-18', 'S-1-5-32-544')) {
            & "$env:SystemRoot\System32\takeown.exe" /F "$($_.FullName)" /A | Out-Null
        }
    }

    # 8. Reinicialização do serviço e abertura do agente
    if (-not $isAutomated) {
        Write-Host "[4/4] Iniciando serviço AcerolaAgent e conectando ao painel..." -ForegroundColor Cyan
    }
    Restart-Service -Name 'AcerolaAgent'

    if (-not $isAutomated) {
        $logPath = Join-Path $directory 'service.log'
        $deadline = (Get-Date).AddSeconds(6)
        while ((Get-Date) -lt $deadline) {
            if ((Test-Path -LiteralPath $logPath) -and ((Get-Content -LiteralPath $logPath -Raw -ErrorAction SilentlyContinue) -match 'service: reporting configured')) {
                break
            }
            Start-Sleep -Milliseconds 250
        }

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
    } else {
        Write-Host 'Agente configurado. A coleta e a atualização funcionam mesmo antes do login.'
    }
} catch {
    if ($isAutomated) {
        throw
    }
    Write-Host ""
    Write-Host "ERRO: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Read-Host "Pressione ENTER para fechar"
    exit 1
}
