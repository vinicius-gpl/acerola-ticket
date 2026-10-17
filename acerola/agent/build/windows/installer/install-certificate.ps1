#Requires -Version 5.1
#Requires -RunAsAdministrator
[CmdletBinding()]
param([string]$CertificatePath = (Join-Path $PSScriptRoot 'publisher.cer'))
$ErrorActionPreference = 'Stop'
$certificate = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($CertificatePath)
if ($certificate.HasPrivateKey) { throw 'Use somente o certificado público .cer.' }
if ($certificate.NotAfter -le (Get-Date)) { throw 'O certificado está vencido.' }
$eku = $certificate.Extensions | Where-Object { $_.Oid.Value -eq '2.5.29.37' }
if (-not $eku -or @($eku.EnhancedKeyUsages | Where-Object { $_.Value -eq '1.3.6.1.5.5.7.3.3' }).Count -eq 0) {
    throw 'O certificado precisa permitir assinatura de código.'
}
# A assinatura Authenticode autoassinada exige confiança local. Não importa chave privada.
Import-Certificate -FilePath $CertificatePath -CertStoreLocation 'Cert:\LocalMachine\Root' | Out-Null
Import-Certificate -FilePath $CertificatePath -CertStoreLocation 'Cert:\LocalMachine\TrustedPublisher' | Out-Null
Write-Host 'Certificado de assinatura instalado para este computador.'
