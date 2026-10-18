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

# Funções permanecem neste arquivo porque ele também é distribuído sozinho na release.
function Request-Administrator([string]$ScriptPath, [System.Collections.IDictionary]$Parameters) {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    if ($principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { return $false }
    if ($Parameters.Token -is [Security.SecureString]) {
        throw 'Execute o PowerShell como Administrador para fornecer uma chave segura.'
    }
    $arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`""
    foreach ($key in $Parameters.Keys) {
        $value = $Parameters[$key]
        if ($value -is [switch]) {
            if ($value.IsPresent) { $arguments += " -$key" }
            continue
        }
        $escaped = "$value".Replace('"', '`"')
        $arguments += " -$key `"$escaped`""
    }
    Start-Process powershell.exe -ArgumentList $arguments -Verb RunAs
    return $true
}

function ConvertTo-PlainToken($Token) {
    if ($Token -isnot [Security.SecureString]) { return "$Token".Trim().Trim("'`"") }
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token)
    try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}

function Read-MachineToken($Token) {
    $plainToken = ConvertTo-PlainToken $Token
    if ($plainToken -eq '__TOKEN__') { $plainToken = '' }
    if ([string]::IsNullOrWhiteSpace($plainToken)) {
        $plainToken = (Read-Host 'Cole o token do computador gerado no dashboard').Trim().Trim("'`"")
    }
    if ([string]::IsNullOrWhiteSpace($plainToken)) { throw 'A chave (token) da máquina está vazia.' }
    return $plainToken
}

function Resolve-ServerOrigin([string]$ServerUrl) {
    if ($ServerUrl -eq '__SERVER_URL__') { $ServerUrl = '' }
    if ([string]::IsNullOrWhiteSpace($ServerUrl)) {
        $path = Join-Path $env:ProgramData 'AcerolaAgent/machine.json'
        if (Test-Path -LiteralPath $path) {
            $ServerUrl = (Get-Content -LiteralPath $path -Raw | ConvertFrom-Json).serverUrl
        }
    }
    if ([string]::IsNullOrWhiteSpace($ServerUrl)) {
        $ServerUrl = Read-Host 'Informe o endereço do painel (ex.: https://acerola.exemplo.com)'
    }
    $uri = [Uri]$ServerUrl.Trim()
    if (-not $uri.IsAbsoluteUri -or $uri.Scheme -notin @('http', 'https') -or $uri.UserInfo) {
        throw 'Informe a origem HTTP ou HTTPS do dashboard, sem credenciais.'
    }
    return $uri.GetLeftPart([UriPartial]::Authority)
}

function Find-Msi([string]$MsiPath, [string]$ScriptDirectory) {
    if ($MsiPath -and (Test-Path -LiteralPath $MsiPath)) { return $MsiPath }
    foreach ($filter in @('acerola-agent-*-x64.msi', '*.msi')) {
        $found = Get-ChildItem -LiteralPath $ScriptDirectory -Filter $filter -File | Select-Object -First 1
        if ($found) { return $found.FullName }
    }
    return ''
}

function Get-ReleaseMsi([string]$ServerUrl, [string]$Token) {
    $release = Invoke-RestMethod -Uri "$ServerUrl/api/agent/releases/latest" `
        -Headers @{ Authorization = "Bearer $Token" } -Method Get -TimeoutSec 15
    if (-not $release.url) { throw 'Nenhum instalador está disponível no painel.' }
    $path = Join-Path $env:TEMP "acerola-agent-$($release.version)-x64.msi"
    Invoke-WebRequest -Uri $release.url -OutFile $path -UseBasicParsing
    if ($release.sha256) {
        $actual = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash
        if ($actual -ne $release.sha256) {
            Remove-Item -LiteralPath $path -Force
            throw 'O hash SHA256 do instalador baixado não confere.'
        }
    }
    return $path
}

function Find-PublicCertificate([string]$CertificatePath, [string]$targetMsi, [string]$scriptDir) {
    if ($CertificatePath -and (Test-Path -LiteralPath $CertificatePath)) { return $CertificatePath }
    $candidate = Join-Path $scriptDir 'publisher.cer'
    if (Test-Path -LiteralPath $candidate) { return $candidate }
    if (-not $targetMsi) { return '' }
    $signature = Get-AuthenticodeSignature -FilePath $targetMsi
    if (-not $signature.SignerCertificate) { return '' }
    $path = Join-Path $env:TEMP 'acerola-publisher.cer'
    Export-Certificate -Cert $signature.SignerCertificate -FilePath $path -Force | Out-Null
    return $path
}

function Import-PublicCertificate([string]$certFile) {
    if (-not $certFile) { return }
    $certificate = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($certFile)
    try {
        if ($certificate.HasPrivateKey) { throw 'Use somente o certificado público .cer.' }
        if ($certificate.NotAfter -le (Get-Date)) { throw 'O certificado está vencido.' }
        Import-Certificate -FilePath $certFile -CertStoreLocation 'Cert:\LocalMachine\Root' | Out-Null
        Import-Certificate -FilePath $certFile -CertStoreLocation 'Cert:\LocalMachine\TrustedPublisher' | Out-Null
    } finally { $certificate.Dispose() }
}

function Install-AgentMsi([string]$targetMsi) {
    if (-not $targetMsi) { return }
    if (-not (Test-Path -LiteralPath $targetMsi)) { throw 'O instalador MSI não foi encontrado.' }
    Write-Host '[2/4] Instalando pacote MSI do agente...' -ForegroundColor Cyan
    $process = Start-Process -FilePath "$env:SystemRoot\System32\msiexec.exe" `
        -ArgumentList "/i `"$targetMsi`" /qn /norestart REBOOT=ReallySuppress" -Wait -PassThru
    if ($process.ExitCode -notin @(0, 3010)) {
        throw "A instalação do MSI falhou com código $($process.ExitCode)."
    }
}

function Get-CertificateFingerprint($Certificate) {
    if (-not $Certificate) { return '' }
    $sha = [Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString($sha.ComputeHash($Certificate.RawData))).Replace('-', '').ToLowerInvariant() }
    finally { $sha.Dispose() }
}

function Get-SignerFingerprint([string]$certFile, [string]$scriptDir) {
    if ($certFile -and (Test-Path -LiteralPath $certFile)) {
        $certificate = New-Object Security.Cryptography.X509Certificates.X509Certificate2($certFile)
        try { return Get-CertificateFingerprint $certificate }
        finally { $certificate.Dispose() }
    }
    foreach ($directory in @($scriptDir, (Join-Path $env:ProgramFiles 'Acerola/Agent'))) {
        $path = Join-Path $directory 'acerola-agent-service.exe'
        if (Test-Path -LiteralPath $path) {
            $signature = Get-AuthenticodeSignature -FilePath $path
            return Get-CertificateFingerprint $signature.SignerCertificate
        }
    }
    return ''
}

function Assert-RegularPath([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) { return }
    if ((Get-Item -LiteralPath $Path -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) {
        throw 'Existe um link inesperado na pasta do agente. Peça ao TI para verificar.'
    }
}

function Set-AdministratorOwner([string]$Path) {
    $owner = (Get-Acl -LiteralPath $Path).GetOwner([Security.Principal.SecurityIdentifier]).Value
    if ($owner -in @('S-1-5-18', 'S-1-5-32-544')) { return }
    & "$env:SystemRoot/System32/takeown.exe" /F $Path /A | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Não consegui ajustar o proprietário da configuração.' }
}

function Set-MachinePermissions([string]$Path, [switch]$Directory) {
    Set-AdministratorOwner $Path
    $grants = @('*S-1-5-18:F', '*S-1-5-32-544:F', '*S-1-5-32-545:R')
    if ($Directory) { $grants = @('*S-1-5-18:(OI)(CI)F', '*S-1-5-32-544:(OI)(CI)F', '*S-1-5-32-545:(OI)(CI)RX') }
    & "$env:SystemRoot/System32/icacls.exe" $Path /inheritance:r /grant $grants | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Não consegui proteger as permissões da configuração.' }
}

function Initialize-MachineDirectory {
    $directory = Join-Path $env:ProgramData 'AcerolaAgent'
    Assert-RegularPath $directory
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
    foreach ($name in @('machine.json', 'machine.json.tmp', 'updates')) {
        Assert-RegularPath (Join-Path $directory $name)
    }
    Set-MachinePermissions $directory -Directory
    return $directory
}

function Protect-MachineToken([string]$plainToken) {
    Add-Type -AssemblyName System.Security
    $bytes = [Text.Encoding]::UTF8.GetBytes($plainToken)
    try {
        $cipher = [Security.Cryptography.ProtectedData]::Protect($bytes, $null, [Security.Cryptography.DataProtectionScope]::LocalMachine)
    } finally {
        [Array]::Clear($bytes, 0, $bytes.Length)
        $bytes = $null
        $plainToken = $null
    }
    return [Convert]::ToBase64String($cipher)
}

function Save-MachineConfiguration([string]$Directory, [string]$ServerUrl, [string]$TokenCipher, [string]$Fingerprint, [bool]$AutoUpdate) {
    $config = @{ serverUrl = $ServerUrl; tokenCipher = $TokenCipher; signerSha256 = $Fingerprint; autoUpdate = $AutoUpdate }
    $path = Join-Path $Directory 'machine.json'
    [IO.File]::WriteAllText("$path.tmp", ($config | ConvertTo-Json), (New-Object Text.UTF8Encoding($false)))
    Set-MachinePermissions "$path.tmp"
    Move-Item -LiteralPath "$path.tmp" -Destination $path -Force
    Get-ChildItem -LiteralPath $Directory -Force | ForEach-Object { Set-AdministratorOwner $_.FullName }
    return $path
}

function Start-AgentDesktop([string]$Directory) {
    $logPath = Join-Path $Directory 'service.log'
    $deadline = (Get-Date).AddSeconds(6)
    while ((Get-Date) -lt $deadline) {
        if (Test-Path -LiteralPath $logPath) {
            if ((Get-Content -LiteralPath $logPath -Raw) -match 'service: reporting configured') { break }
        }
        Start-Sleep -Milliseconds 250
    }
    $path = Join-Path $env:ProgramFiles 'Acerola/Agent/Acerola Agent.exe'
    if (-not (Test-Path -LiteralPath $path)) { return }
    if (Get-Process -Name 'Acerola Agent' -ErrorAction SilentlyContinue) { return }
    Start-Process -FilePath $path
}

function Invoke-MachineSetup([string]$ServerUrl, $Token, [string]$CertificatePath, [string]$MsiPath, [bool]$DisableAutoUpdate, [bool]$Automated, [string]$ScriptDirectory) {
    $plainToken = Read-MachineToken $Token
    try {
        $origin = Resolve-ServerOrigin $ServerUrl
        $msi = Find-Msi $MsiPath $ScriptDirectory
        if (-not $Automated) {
            if (-not $msi -and -not (Get-Service -Name 'AcerolaAgent' -ErrorAction SilentlyContinue)) {
                $msi = Get-ReleaseMsi $origin $plainToken
            }
        }
        $certificate = Find-PublicCertificate $CertificatePath $msi $ScriptDirectory
        Import-PublicCertificate $certificate
        if (-not $Automated) { Install-AgentMsi $msi }
        $fingerprint = Get-SignerFingerprint $certificate $ScriptDirectory
        $directory = Initialize-MachineDirectory
        $cipher = Protect-MachineToken $plainToken
        $autoUpdate = (-not $DisableAutoUpdate) -and (-not [string]::IsNullOrWhiteSpace($fingerprint))
        $path = Save-MachineConfiguration $directory $origin $cipher $fingerprint $autoUpdate
        Restart-Service -Name 'AcerolaAgent'
        if ($Automated) { return }
        Start-AgentDesktop $directory
        Write-Host "Agente configurado. Arquivo gravado: $path" -ForegroundColor Green
        Read-Host 'Pressione ENTER para concluir' | Out-Null
    } finally { $plainToken = $null }
}

$isAutomated = ($env:GITHUB_ACTIONS -eq 'true') -or ($env:CI -eq 'true') -or $DisableAutoUpdate.IsPresent -or ($Token -is [Security.SecureString])
if (Request-Administrator $PSCommandPath $PSBoundParameters) { exit 0 }
try {
    Invoke-MachineSetup -ServerUrl $ServerUrl -Token $Token -CertificatePath $CertificatePath -MsiPath $MsiPath `
        -DisableAutoUpdate $DisableAutoUpdate.IsPresent -Automated $isAutomated -ScriptDirectory $PSScriptRoot
} catch {
    if ($isAutomated) { throw }
    Write-Host "ERRO: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host 'Pressione ENTER para fechar' | Out-Null
    exit 1
}
