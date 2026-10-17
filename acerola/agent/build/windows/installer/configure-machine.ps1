#Requires -Version 5.1
#Requires -RunAsAdministrator
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][uri]$ServerUrl,
    [Parameter(Mandatory = $true)][Security.SecureString]$Token,
    [string]$CertificatePath = (Join-Path $PSScriptRoot 'publisher.cer'),
    [switch]$DisableAutoUpdate
)
$ErrorActionPreference = 'Stop'
if ($ServerUrl.Scheme -ne 'https' -or $ServerUrl.UserInfo -or $ServerUrl.Query -or $ServerUrl.Fragment -or $ServerUrl.AbsolutePath -ne '/') {
    throw 'Informe a origem HTTPS do dashboard, sem caminho, credenciais ou parâmetros.'
}
& (Join-Path $PSScriptRoot 'install-certificate.ps1') -CertificatePath $CertificatePath
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
# Define a ACL antes de gravar qualquer credencial; não herda permissões de usuários comuns.
$acl = New-Object Security.AccessControl.DirectorySecurity
$acl.SetAccessRuleProtection($true, $false)
$acl.SetOwner((New-Object Security.Principal.SecurityIdentifier('S-1-5-32-544')))
foreach ($sid in @('S-1-5-18', 'S-1-5-32-544')) {
    $identity = New-Object Security.Principal.SecurityIdentifier($sid)
    $rule = New-Object Security.AccessControl.FileSystemAccessRule($identity, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
    $acl.AddAccessRule($rule)
}
Set-Acl -LiteralPath $directory -AclObject $acl
Add-Type -AssemblyName System.Security
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Token)
try {
    $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    if ([string]::IsNullOrWhiteSpace($plain)) { throw 'A chave da máquina está vazia.' }
    $bytes = [Text.Encoding]::UTF8.GetBytes($plain)
    $cipher = [Security.Cryptography.ProtectedData]::Protect($bytes, $null, [Security.Cryptography.DataProtectionScope]::LocalMachine)
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    if ($bytes) { [Array]::Clear($bytes, 0, $bytes.Length) }
    $plain = $null
}
$certificate = New-Object Security.Cryptography.X509Certificates.X509Certificate2($CertificatePath)
$sha = [Security.Cryptography.SHA256]::Create()
$fingerprint = ([BitConverter]::ToString($sha.ComputeHash($certificate.RawData))).Replace('-', '').ToLowerInvariant()
$config = @{
    serverUrl = $ServerUrl.AbsoluteUri.TrimEnd('/')
    tokenCipher = [Convert]::ToBase64String($cipher)
    signerSha256 = $fingerprint
    autoUpdate = -not $DisableAutoUpdate.IsPresent
}
$json = $config | ConvertTo-Json
$path = Join-Path $directory 'machine.json'
[IO.File]::WriteAllText("$path.tmp", $json, (New-Object Text.UTF8Encoding($false)))
$fileAcl = Get-Acl -LiteralPath "$path.tmp"
$fileAcl.SetOwner((New-Object Security.Principal.SecurityIdentifier('S-1-5-32-544')))
Set-Acl -LiteralPath "$path.tmp" -AclObject $fileAcl
Move-Item -LiteralPath "$path.tmp" -Destination $path -Force
Restart-Service -Name 'AcerolaAgent'
Write-Host 'Agente configurado. A coleta e a atualização funcionam mesmo antes do login.'
