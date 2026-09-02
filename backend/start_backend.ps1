
[CmdletBinding()]
param(
    [string]$HostAddress = "0.0.0.0",
    [int]$Port = 8000,
    [switch]$Reload
)

$ErrorActionPreference = "Stop"

# Always run from the backend directory so imports such as `from config import ...`
# and the relative SQLite DATABASE_URL resolve consistently.
$BackendDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $BackendDirectory

$PythonCommand = Get-Command python -ErrorAction SilentlyContinue
if (-not $PythonCommand) {
    throw "Python tidak ditemukan di PATH. Install Python 3.10+ lalu buka terminal baru."
}

Write-Host "Backend directory : $BackendDirectory"
Write-Host "API address       : http://$HostAddress`:$Port"
Write-Host "Health endpoint   : http://localhost`:$Port/health"

$UvicornArguments = @(
    "-m", "uvicorn", "main:app",
    "--host", $HostAddress,
    "--port", $Port
)

if ($Reload) {
    $UvicornArguments += "--reload"
}

& $PythonCommand.Source @UvicornArguments
exit $LASTEXITCODE