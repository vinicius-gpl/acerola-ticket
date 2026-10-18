#Requires -Version 5.1
[CmdletBinding()]
param(
    [string]$ServerUrl = '__SERVER_URL__',
    $Token = '__TOKEN__',
    [string]$CertificatePath = '',
    [string]$MsiPath = '',
    [switch]$DisableAutoUpdate
)
$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'configure-machine.ps1') @PSBoundParameters
