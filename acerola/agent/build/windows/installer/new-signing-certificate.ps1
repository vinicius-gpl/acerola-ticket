#Requires -Version 5.1
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$OutputDirectory,
    [Parameter(Mandatory = $true)][Security.SecureString]$Password
)
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$pfx = Join-Path $OutputDirectory 'acerola-agent-signing.pfx'
if (Test-Path -LiteralPath $pfx) { throw 'Já existe uma chave neste diretório. Não substitua o certificado das máquinas.' }
$certificate = New-SelfSignedCertificate -Type Custom -Subject 'CN=Acerola Agent' `
    -FriendlyName 'Acerola Agent internal code signing' -KeyAlgorithm RSA -KeyLength 3072 `
    -HashAlgorithm SHA256 -KeyUsage DigitalSignature -KeyExportPolicy Exportable `
    -CertStoreLocation 'Cert:\CurrentUser\My' -NotAfter (Get-Date).AddYears(5) `
    -TextExtension @('2.5.29.37={text}1.3.6.1.5.5.7.3.3', '2.5.29.19={text}')
try {
    Export-PfxCertificate -Cert $certificate -FilePath $pfx -Password $Password | Out-Null
    Export-Certificate -Cert $certificate -FilePath (Join-Path $OutputDirectory 'publisher.cer') | Out-Null
} finally {
    Remove-Item -LiteralPath "Cert:\CurrentUser\My\$($certificate.Thumbprint)" -Force
}
Write-Host 'Guarde o PFX e a senha nos Secrets do GitHub. Distribua somente publisher.cer.'
