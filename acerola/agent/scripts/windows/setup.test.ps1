#Requires -Version 7.0
# Extrai só funções: os testes nunca elevam privilégios nem alteram a máquina.
$ErrorActionPreference = 'Stop'
function Assert-Equal($Actual, $Expected) {
    if ($Actual -cne $Expected) { throw "Expected '$Expected', got '$Actual'" }
}
function Assert-Throws([scriptblock]$Action) {
    try { & $Action } catch { return }
    throw 'Expected an error, got success'
}

foreach ($file in Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.ps1') {
    $tokens = $null
    $parseErrors = $null
    $ast = [Management.Automation.Language.Parser]::ParseFile($file.FullName, [ref]$tokens, [ref]$parseErrors)
    if ($parseErrors) { throw "Invalid PowerShell syntax in $($file.Name): $parseErrors" }
    $functions = $ast.FindAll({ param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] }, $true)
    foreach ($function in $functions) {
        $decisions = $function.Body.FindAll({ param($node)
            ($node -is [Management.Automation.Language.IfStatementAst]) -or
            ($node -is [Management.Automation.Language.LoopStatementAst]) -or
            ($node -is [Management.Automation.Language.CatchClauseAst]) -or
            (($node -is [Management.Automation.Language.BinaryExpressionAst]) -and $node.Operator -in @('And', 'Or', 'Xor'))
        }, $true)
        $complexity = 1
        foreach ($decision in $decisions) {
            if ($decision -is [Management.Automation.Language.IfStatementAst]) {
                $complexity += $decision.Clauses.Count
                continue
            }
            $complexity++
        }
        if ($complexity -gt 10) { throw "Complexity exceeds 10: $($file.Name)/$($function.Name)" }
        if ($file.Name -eq 'configure-machine.ps1') { . ([scriptblock]::Create($function.Extent.Text)) }
    }
}

# feliz: entrada fornecida, incluindo SecureString, não pede dados no terminal.
Assert-Equal (Read-MachineToken " 'fixture-token' ") 'fixture-token'
$secure = ConvertTo-SecureString 'fixture-token' -AsPlainText -Force
Assert-Equal (Read-MachineToken $secure) 'fixture-token'
Assert-Equal (Resolve-ServerOrigin 'https://dashboard.example.test/path') 'https://dashboard.example.test'
Assert-Equal (Resolve-ServerOrigin 'http://localhost:3000') 'http://localhost:3000'
# triste: recusa origens inválidas e uma chave vazia após a pergunta.
Assert-Throws { Resolve-ServerOrigin 'file:///tmp/agent' }
Assert-Throws { Resolve-ServerOrigin 'https://user:password@dashboard.example.test' }
function Read-Host { return '' }
Assert-Throws { Read-MachineToken '' }

$directory = Join-Path ([IO.Path]::GetTempPath()) ([guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $directory | Out-Null
try {
    # feliz: prioriza MSI explícito e depois o padrão do agente.
    $msi = Join-Path $directory 'acerola-agent-1.2.3-x64.msi'
    [IO.File]::WriteAllText($msi, 'fixture')
    Assert-Equal (Find-Msi '' $directory) $msi
    Assert-Equal (Find-Msi $msi $directory) $msi
    $emptyDirectory = Join-Path $directory 'empty'
    New-Item -ItemType Directory -Path $emptyDirectory | Out-Null
    Assert-Equal (Find-Msi '' $emptyDirectory) ''

    # feliz: grava o contrato sem expor o token puro e protege o temporário antes da troca.
    $script:protectedPath = ''
    function Set-MachinePermissions([string]$Path) { $script:protectedPath = $Path }
    function Set-AdministratorOwner([string]$Path) {}
    $path = Save-MachineConfiguration $directory 'https://dashboard.example.test' 'encrypted-fixture' 'fingerprint' $false
    $config = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
    Assert-Equal $config.tokenCipher 'encrypted-fixture'
    Assert-Equal $config.autoUpdate $false
    Assert-Equal $script:protectedPath "$path.tmp"
    Assert-Equal (Test-Path -LiteralPath "$path.tmp") $false

    # triste: não publica configuração se não consegue proteger as permissões.
    function Set-MachinePermissions([string]$Path) { throw 'fixture permission failure' }
    Assert-Throws { Save-MachineConfiguration $emptyDirectory 'https://dashboard.example.test' 'cipher' '' $false }
    Assert-Equal (Test-Path -LiteralPath (Join-Path $emptyDirectory 'machine.json')) $false
} finally {
    Remove-Item -LiteralPath $directory -Recurse -Force
    $secure.Dispose()
}
Write-Output 'PowerShell syntax, function complexity and setup tests passed.'
