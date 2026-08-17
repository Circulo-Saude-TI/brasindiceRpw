# Gera o build de producao do Angular e empacota em brasindice-rpw.war,
# com o conteudo de dist/brasindice-rpw/browser (index.html, JS, CSS,
# favicon, media, WEB-INF/web.xml) direto na raiz do .war.
#
# Uso:
#   powershell -ExecutionPolicy Bypass -File scripts\build-war.ps1

$ErrorActionPreference = "Stop"

$root       = Split-Path -Parent $PSScriptRoot
$browserDir = Join-Path $root "dist\brasindice-rpw\browser"
$warPath    = Join-Path $root "dist\brasindice-rpw\brasindice-rpw.war"

Write-Host "Rodando 'npm run build'..."
Push-Location $root
try {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "Build do Angular falhou (exit code $LASTEXITCODE)."
    }
} finally {
    Pop-Location
}

if (-not (Test-Path $browserDir)) {
    throw "Pasta de build nao encontrada: $browserDir"
}

if (Test-Path $warPath) {
    Remove-Item $warPath -Force
}

Write-Host "Empacotando $browserDir\* em $warPath ..."
Compress-Archive -Path (Join-Path $browserDir "*") -DestinationPath $warPath -Force

# Renomeia para .war (Compress-Archive so aceita .zip como extensao de saida
# em algumas versoes do PowerShell 5.1; o Rename garante o nome final certo).
if (-not (Test-Path $warPath)) {
    $zipPath = [System.IO.Path]::ChangeExtension($warPath, "zip")
    if (Test-Path $zipPath) {
        Rename-Item $zipPath (Split-Path $warPath -Leaf)
    }
}

Write-Host ""
Write-Host "OK: $warPath"
Write-Host "Contexto esperado no Tomcat: /brasindice-rpw/ (nome do arquivo = context path)."
