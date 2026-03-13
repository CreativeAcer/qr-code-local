#Requires -Version 5.0
Write-Host "=== QR Generator — Developer Setup ===" -ForegroundColor Cyan

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host ""
    Write-Host "Node.js is not installed." -ForegroundColor Yellow
    Write-Host "Install via winget:"
    Write-Host "  winget install OpenJS.NodeJS.LTS"
    Write-Host ""
    Write-Host "Or download from https://nodejs.org"
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Node.js: $(node -v)"
Write-Host "npm:     $(npm -v)"

Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Green
npm install

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Run the app:"
Write-Host "  npm start"
Write-Host ""
Read-Host "Press Enter to exit"
