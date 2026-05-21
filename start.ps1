$ErrorActionPreference = "Continue"

Write-Host "=== AzubiManager Start ===" -ForegroundColor Cyan

# 0. Docker API-Container stoppen (falls vorhanden)
$apiContainer = docker ps -a --filter "name=azubimanager-api" --format "{{.Names}}" 2>$null
if ($apiContainer) {
    Write-Host "[0/3] Stoppe Docker API-Container..." -ForegroundColor Yellow
    docker stop azubimanager-api | Out-Null
    Write-Host "  Docker API-Container gestoppt" -ForegroundColor Green
}

# 1. Docker DB starten
Write-Host "[1/3] Starte Datenbank..." -ForegroundColor Yellow
$db = docker ps -a --filter "name=azubimanager-db" --format "{{.Names}}" 2>$null
if ($db) {
    docker start azubimanager-db
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  DB-Container gestartet" -ForegroundColor Green
    } else {
        Write-Host "  FEHLER: DB-Container konnte nicht gestartet werden." -ForegroundColor Red
    }
} else {
    Write-Host "  DB-Container nicht gefunden. Bitte 'docker compose up -d db' ausführen." -ForegroundColor Red
}

# 2. Backend starten (neues Fenster)
Write-Host "[2/3] Starte Backend..." -ForegroundColor Yellow
$env:ConnectionStrings__DefaultConnection = "Server=localhost,1433;Database=AzubiManagerDb;User Id=sa;Password=AzubiManager2024!;TrustServerCertificate=True;"
$env:Jwt__Key = "AzubiManagerSuperGeheimerSchluesselMindestens32ZeichenLangFuerJwtHmacSha256"
$env:Jwt__Issuer = "AzubiManager"
$env:Jwt__Audience = "AzubiManagerUsers"
$backendDir = Join-Path $PSScriptRoot "AzubiManager.Api"
Start-Process cmd.exe -ArgumentList "/c title AzubiManager Backend && dotnet run --urls http://0.0.0.0:5112 || (echo FEHLER & pause)" -WorkingDirectory $backendDir
Write-Host "  Backend gestartet (Port 5112)" -ForegroundColor Green

Start-Sleep -Seconds 3

# 3. Frontend starten (neues Fenster)
Write-Host "[3/3] Starte Frontend..." -ForegroundColor Yellow
$frontendDir = Join-Path $PSScriptRoot "azubi-frontend"
Start-Process cmd.exe -ArgumentList "/c title AzubiManager Frontend && npm run dev || (echo FEHLER & pause)" -WorkingDirectory $frontendDir
Write-Host "  Frontend gestartet (Port 5173)" -ForegroundColor Green

Write-Host ""
Write-Host "=== Alles gestartet ===" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "Backend:  http://localhost:5112" -ForegroundColor White
Write-Host ""
Write-Host "Fenster einfach schließen zum Beenden." -ForegroundColor Gray
pause
