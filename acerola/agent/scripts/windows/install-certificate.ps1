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

function Request-CertificateAdministrator([string]$ScriptPath, [System.Collections.IDictionary]$Parameters) {
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

function Install-PublisherCertificate([string]$CertificatePath) {
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
}


function Install-LocalMsi([string]$MsiPath) {
    if (-not $MsiPath) {
        $file = Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.msi' -File | Select-Object -First 1
        if ($file) { $MsiPath = $file.FullName }
    }
    if (-not $MsiPath) { throw 'Baixe o instalador MSI e mantenha-o na mesma pasta deste script.' }
    $process = Start-Process -FilePath "$env:SystemRoot/System32/msiexec.exe" `
        -ArgumentList "/i `"$MsiPath`" /qn /norestart REBOOT=ReallySuppress" -Wait -PassThru
    if ($process.ExitCode -notin @(0, 3010)) { throw "A instalação do MSI falhou com código $($process.ExitCode)." }
}

if (Request-CertificateAdministrator $PSCommandPath $PSBoundParameters) { exit 0 }

if ($isCi) {
    Install-PublisherCertificate $CertificatePath
    exit 0
}

# O download do dashboard contém MSI, CER e este script; a configuração vem dentro do MSI.
$configureScript = Join-Path $PSScriptRoot 'configure-machine.ps1'
if (-not (Test-Path -LiteralPath $configureScript)) {
    Install-PublisherCertificate $CertificatePath
    Install-LocalMsi $MsiPath
    $configureScript = Join-Path $env:ProgramFiles 'Acerola/Agent/configure-machine.ps1'
    $MsiPath = ''
}
& $configureScript -ServerUrl $ServerUrl -Token $Token -CertificatePath $CertificatePath -MsiPath $MsiPath
