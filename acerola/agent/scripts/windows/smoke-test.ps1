#Requires -Version 5.1
# O runner testa instalação real, coleta sem configuração e desinstalação, sem tocar no parque.
[CmdletBinding()]
param([Parameter(Mandatory = $true)][string]$MsiPath, [switch]$ProvisionOnly)
$ErrorActionPreference = 'Stop'
# msiexec rejeita caminhos com separadores misturados, aceitos pelo PowerShell.
$MsiPath = [IO.Path]::GetFullPath((Get-Item -LiteralPath $MsiPath).FullName).Replace('/', '\')
if ($ProvisionOnly) {
    $token = ConvertTo-SecureString 'fixture-provisioning-token' -AsPlainText -Force
    & (Join-Path $PSScriptRoot 'configure-machine.ps1') -ServerUrl 'https://127.0.0.1:1' `
        -Token $token -CertificatePath (Join-Path (Split-Path $MsiPath) 'publisher.cer') -DisableAutoUpdate
    exit 0
}
function Invoke-Msi([string]$Operation) {
    $log = Join-Path $env:TEMP "acerola-smoke-$($Operation.TrimStart('/')).log"
    $process = Start-Process -FilePath "$env:SystemRoot\System32\msiexec.exe" -ArgumentList @($Operation, "`"$MsiPath`"", '/qn', '/norestart', '/L*v', "`"$log`"") -Wait -PassThru
    if ($process.ExitCode -notin @(0, 3010)) {
        Get-Content $log
        throw "Windows Installer returned $($process.ExitCode)"
    }
}
Invoke-Msi '/i'
try {
    $service = Get-Service 'AcerolaAgent'
    $service.WaitForStatus('Running', [TimeSpan]::FromSeconds(30))
    $exe = Join-Path $env:ProgramFiles 'Acerola\Agent\acerola-agent-service.exe'
    if (-not (Test-Path $exe)) { throw 'Service executable was not installed' }
    $acl = Get-Acl (Join-Path $env:ProgramData 'AcerolaAgent')
    if ($acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne 'S-1-5-18') { throw 'Machine directory must be owned by SYSTEM' }
    if (-not $acl.AreAccessRulesProtected) { throw 'Machine directory must not inherit user permissions' }
    # Provisiona com o PowerShell 5.1 do Windows 10/11, não apenas com pwsh 7 do runner.
    & "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass `
        -File $PSCommandPath -MsiPath $MsiPath -ProvisionOnly
    if ($LASTEXITCODE -ne 0) { throw 'Windows PowerShell provisioning failed' }
    $logPath = Join-Path $env:ProgramData 'AcerolaAgent\service.log'
    $deadline = (Get-Date).AddSeconds(20)
    while ((Get-Date) -lt $deadline -and (Get-Content $logPath -Raw) -notmatch 'service: reporting configured') {
        Start-Sleep -Milliseconds 200
    }
    $serviceLog = Get-Content $logPath -Raw
    if ($serviceLog -notmatch 'service: reporting configured') { throw 'Service could not decrypt the provisioned machine identity' }
    if ($serviceLog -match 'fixture-provisioning-token') { throw 'Machine credential leaked to service log' }
} finally {
    Invoke-Msi '/x'
}
if (Get-Service 'AcerolaAgent' -ErrorAction SilentlyContinue) { throw 'Service was not removed' }
