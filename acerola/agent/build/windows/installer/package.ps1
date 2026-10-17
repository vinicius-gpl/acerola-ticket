#Requires -Version 7.0
[CmdletBinding()]
param([Parameter(Mandatory = $true)][string]$Version)
$ErrorActionPreference = 'Stop'
if ($Version -notmatch '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$') { throw 'Invalid release version' }
if (-not $env:AGENT_SIGNING_PFX_BASE64 -or -not $env:AGENT_SIGNING_PASSWORD) { throw 'Configure AGENT_SIGNING_PFX_BASE64 and AGENT_SIGNING_PASSWORD first' }
$agent = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
# O MSI já veio do wixl; nenhuma chave privada sai deste runner.
$output = Join-Path $agent 'build/release'
New-Item -ItemType Directory -Path $output -Force | Out-Null
$signTool = Get-ChildItem "${env:ProgramFiles(x86)}\Windows Kits\10\bin\*\x64\signtool.exe" |
    Sort-Object { [version]$_.Directory.Parent.Name } -Descending | Select-Object -First 1
if (-not $signTool) { throw 'Windows SDK SignTool was not found' }
$pfxPath = Join-Path $env:RUNNER_TEMP 'acerola-signing.pfx'
$certificate = $null
try {
    [IO.File]::WriteAllBytes($pfxPath, [Convert]::FromBase64String($env:AGENT_SIGNING_PFX_BASE64))
    $password = ConvertTo-SecureString $env:AGENT_SIGNING_PASSWORD -AsPlainText -Force
    $certificate = Import-PfxCertificate -FilePath $pfxPath -Password $password -CertStoreLocation 'Cert:\CurrentUser\My'
    if (-not $certificate.HasPrivateKey -or $certificate.NotAfter -le (Get-Date)) { throw 'Signing key is absent or expired' }
    function Sign-File([string]$Path) {
        & $signTool.FullName sign /fd SHA256 /sha1 $certificate.Thumbprint /tr 'http://timestamp.digicert.com' /td SHA256 $Path
        if ($LASTEXITCODE -ne 0) { throw "Signing failed: $Path" }
    }
    $publicCertificate = Join-Path $output 'publisher.cer'
    Export-Certificate -Cert $certificate -FilePath $publicCertificate | Out-Null
    Import-Certificate -FilePath $publicCertificate -CertStoreLocation 'Cert:\LocalMachine\Root' | Out-Null
    Import-Certificate -FilePath $publicCertificate -CertStoreLocation 'Cert:\LocalMachine\TrustedPublisher' | Out-Null
    foreach ($script in @('install-certificate.ps1', 'configure-machine.ps1')) {
        $signature = Set-AuthenticodeSignature -FilePath (Join-Path $output $script) -Certificate $certificate -HashAlgorithm SHA256 -TimestampServer 'http://timestamp.digicert.com'
        if ($signature.Status -ne 'Valid') { throw "Script signing failed: $script ($($signature.Status))" }
    }
    $msi = Join-Path $output "acerola-agent-$Version-x64.msi"
    Sign-File $msi
    Export-Certificate -Cert $certificate -FilePath (Join-Path $output 'publisher.cer') | Out-Null
    $artifacts = @{}
    foreach ($entry in @{ msi = "acerola-agent-$Version-x64.msi"; certificate = 'publisher.cer' }.GetEnumerator()) {
        $path = Join-Path $output $entry.Value
        $artifacts[$entry.Key] = @{
            key = "agent/releases/$Version/$($entry.Value)"
            sha256 = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()
            sizeBytes = (Get-Item -LiteralPath $path).Length
        }
    }
    @{ version = $Version; publishedAt = [DateTime]::UtcNow.ToString('o'); artifacts = $artifacts } |
        ConvertTo-Json -Depth 5 | Set-Content (Join-Path $output 'latest.json') -Encoding utf8NoBOM
    Get-ChildItem $output -File | Where-Object { $_.Name -ne 'SHA256SUMS' -and $_.Extension -ne '.wixpdb' } | ForEach-Object {
        "$((Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant())  $($_.Name)"
    } | Set-Content (Join-Path $output 'SHA256SUMS') -Encoding utf8NoBOM
} finally {
    if (Test-Path -LiteralPath $pfxPath) { Remove-Item -LiteralPath $pfxPath -Force }
    if ($certificate) { Remove-Item -LiteralPath "Cert:\CurrentUser\My\$($certificate.Thumbprint)" -Force }
}
